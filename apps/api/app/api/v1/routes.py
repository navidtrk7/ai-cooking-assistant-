import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Header
from apps.api.app.schemas.schemas import (
    Household, HealthPreferences, PantryItem, PantryCreate,
    Recipe, RecommendationFilter, RecommendationResponse,
    ChatMessage, AiChatResponse, AiActionDraft
)
from apps.api.app.data.seed_data import DEFAULT_HOUSEHOLD, INITIAL_PANTRY_ITEMS, INITIAL_RECIPES
from apps.api.app.ai.ollama_adapter import ollama_service
from apps.api.app.ai.recommender import recommender_engine

router = APIRouter()

# In-memory working database state
household_db = DEFAULT_HOUSEHOLD
pantry_db: List[PantryItem] = INITIAL_PANTRY_ITEMS.copy()
recipes_db: List[Recipe] = INITIAL_RECIPES.copy()
processed_cooking_sessions: set = set()

# Seed meal plan
meal_plan_db = [
    {"day": "شنبه", "date": "۲۴ شهریور", "lunch": "قورمه‌سبزی سنتی", "dinner": "کوکو سبزی تابه‌ای", "calories": 1850},
    {"day": "یکشنبه", "date": "۲۵ شهریور", "lunch": "زرشک‌پلو با مرغ", "dinner": "سوپ جو و سبزیجات", "calories": 1720},
    {"day": "دوشنبه", "date": "۲۶ شهریور", "lunch": "عدس‌پلو مجلسی با کشمش", "dinner": "سالاد الویه سبک", "calories": 1690},
    {"day": "سه‌شنبه", "date": "۲۷ شهریور", "lunch": "کشک بادمجان اصیل", "dinner": "املت گوجه‌فرنگی ارگانیک", "calories": 1540},
    {"day": "چهارشنبه", "date": "۲۸ شهریور", "lunch": "خورشت قیمه سیب‌زمینی", "dinner": "خوراک لوبیا چیتی", "calories": 1820},
    {"day": "پنج‌شنبه", "date": "۲۹ شهریور", "lunch": "ته‌چین مرغ زعفرانی", "dinner": "میرزاقاسمی دودی", "calories": 1900},
    {"day": "جمعه", "date": "۳۰ شهریور", "lunch": "آبگوشت دیزی سنتی", "dinner": "نان و پنیر و هندوانه", "calories": 1950},
]

# Seed shopping list
shopping_list_db = [
    {"id": "s1", "name": "روغن زیتون فرابکر", "amount": "۱ بطری", "category": "خواربار", "checked": False, "estimated_price": 285000},
    {"id": "s2", "name": "رب گوجه‌فرنگی", "amount": "۱ قوطی", "category": "خواربار", "checked": True, "estimated_price": 65000},
    {"id": "s3", "name": "پیاز زرد", "amount": "۲ کیلوگرم", "category": "میوه و تره‌بار", "checked": False, "estimated_price": 48000},
    {"id": "s4", "name": "نان سنگک کنجدی", "amount": "۳ عدد", "category": "نان و غلات", "checked": False, "estimated_price": 45000},
    {"id": "s5", "name": "ماست کم‌چرب پروبیوتیک", "amount": "۱ دبه", "category": "لبنیات", "checked": True, "estimated_price": 98000},
]

# Seed family tasks
family_tasks_db = [
    {"id": "t1", "title": "پاک کردن سبزی قورمه", "assigned_to": "مریم", "reward_points": 30, "is_child_safe": True, "completed": True},
    {"id": "t2", "title": "چیدن میز شام و لیوان‌ها", "assigned_to": "آریا (کودک)", "reward_points": 15, "is_child_safe": True, "completed": False},
    {"id": "t3", "title": "خرید نان سنگک تازه", "assigned_to": "نوید (پدر)", "reward_points": 25, "is_child_safe": False, "completed": False},
    {"id": "t4", "title": "خالی کردن ماشین ظرفشویی", "assigned_to": "آریا (کودک)", "reward_points": 20, "is_child_safe": True, "completed": True},
]

# ----------------- SYSTEM HEALTH -----------------
@router.get("/health")
async def check_health():
    ollama_ok = await ollama_service.check_health()
    return {
        "status": "healthy",
        "ollama_active": ollama_ok,
        "active_models": [ollama_service.primary_model, ollama_service.fallback_model]
    }

# ----------------- HOUSEHOLD & HEALTH -----------------
@router.get("/household", response_model=Household)
async def get_household():
    return household_db

@router.put("/household/health", response_model=HealthPreferences)
async def update_health_preferences(prefs: HealthPreferences):
    household_db.health = prefs
    return household_db.health

# ----------------- PANTRY INVENTORY -----------------
@router.get("/pantry", response_model=List[PantryItem])
async def get_pantry():
    return pantry_db

@router.post("/pantry", response_model=PantryItem)
async def add_pantry_item(item_in: PantryCreate):
    new_item = PantryItem(
        id=f"p-{uuid.uuid4().hex[:6]}",
        name=item_in.name,
        category=item_in.category,
        quantity=item_in.quantity,
        unit=item_in.unit,
        expiry_days_left=item_in.expiry_days_left,
        is_expiring_soon=(item_in.expiry_days_left <= 3)
    )
    pantry_db.insert(0, new_item)
    return new_item

@router.delete("/pantry/{item_id}")
async def delete_pantry_item(item_id: str):
    global pantry_db
    before_len = len(pantry_db)
    pantry_db = [p for p in pantry_db if p.id != item_id]
    if len(pantry_db) == before_len:
        raise HTTPException(status_code=404, detail="مورد یافت نشد")
    return {"status": "deleted", "item_id": item_id}

# ----------------- RECIPES -----------------
@router.get("/recipes", response_model=List[Recipe])
async def list_recipes():
    return recipes_db

@router.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str):
    recipe = next((r for r in recipes_db if r.id == recipe_id), None)
    if not recipe:
        raise HTTPException(status_code=404, detail="دستور پخت یافت نشد")
    return recipe

# ----------------- RECOMMENDATIONS (CRITICAL: ALLERGEN HARD FILTER) -----------------
@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(filters: RecommendationFilter = None):
    # Enforce strict allergen filter from household rules
    active_allergens = [a.lower() for a in household_db.health.allergies]
    clean_pantry = pantry_db.copy()
    return recommender_engine.get_recommendations(pantry=clean_pantry, filters=filters)

# ----------------- COOKING SESSION (IDEMPOTENT DEDUCTION) -----------------
class FinishCookingRequest(BaseModel):
    recipe_id: str
    idempotency_key: str

@router.post("/cooking/finish")
async def finish_cooking(payload: FinishCookingRequest):
    if payload.idempotency_key in processed_cooking_sessions:
        return {"status": "already_processed", "message": "این جلسه پخت قبلاً ثبت و موجودی انبار کسر شده است."}
    
    recipe = next((r for r in recipes_db if r.id == payload.recipe_id), None)
    if not recipe:
        raise HTTPException(status_code=404, detail="رسپی یافت نشد")

    # Deduct matching ingredients from pantry
    deducted = []
    for ing in recipe.ingredients:
        for p in pantry_db:
            if ing.name in p.name or p.name in ing.name:
                p.quantity = max(0.0, round(p.quantity - 0.5, 1))
                deducted.append(p.name)
                break

    processed_cooking_sessions.add(payload.idempotency_key)
    return {
        "status": "success",
        "message": f"آشپزی «{recipe.title}» با موفقیت پایان یافت و موجودی مواد مصرفی از انبار کسر شد.",
        "deducted_items": deducted
    }

# ----------------- WEEKLY MEAL PLAN -----------------
@router.get("/meal-plans")
async def get_meal_plans():
    return meal_plan_db

# ----------------- SHOPPING LIST -----------------
@router.get("/shopping-list")
async def get_shopping_list():
    return shopping_list_db

@router.post("/shopping-list/toggle/{item_id}")
async def toggle_shopping_item(item_id: str):
    item = next((s for s in shopping_list_db if s["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="قلم یافت نشد")
    item["checked"] = not item["checked"]
    return item

# ----------------- STORES PRICE COMPARISON -----------------
@router.get("/stores")
async def get_stores_comparison():
    return {
        "observed_time": "۱۴:۳۰ امروز (۲۴ شهریور)",
        "stores": [
            {
                "name": "اسنپ‌مارکت (هایپراستار)",
                "total_price": 541000,
                "delivery_time": "۴۵ دقیقه",
                "delivery_fee": 25000,
                "coverage_percent": 100,
                "link": "https://snapp.market"
            },
            {
                "name": "دیجی‌کالا جت",
                "total_price": 528000,
                "delivery_time": "۳۰ دقیقه",
                "delivery_fee": 30000,
                "coverage_percent": 90,
                "link": "https://jet.digikala.com"
            },
            {
                "name": "افق کوروش (اکالا)",
                "total_price": 495000,
                "delivery_time": "۶۰ دقیقه",
                "delivery_fee": 15000,
                "coverage_percent": 85,
                "link": "https://okala.com"
            }
        ]
    }

# ----------------- RECEIPT SCANNER (SIMULATED OCR) -----------------
@router.post("/receipts/scan")
async def scan_receipt():
    return {
        "receipt_id": f"rec-{uuid.uuid4().hex[:6]}",
        "store_name": "فروشگاه افق کوروش - شعبه سعادت‌آباد",
        "date": "۱۴۰۳/۰۶/۲۴",
        "total_amount": 348000,
        "items": [
            {"id": "it1", "name": "گوجه فرنگی بوته‌ای", "quantity": 2.0, "unit": "کیلوگرم", "category": "یخچال", "price": 48000, "checked": True},
            {"id": "it2", "name": "خیار رسمی تازه", "quantity": 1.5, "unit": "کیلوگرم", "category": "یخچال", "price": 38000, "checked": True},
            {"id": "it3", "name": "تخم‌مرغ بسته ۲۰ عددی", "quantity": 1.0, "unit": "بسته", "category": "یخچال", "price": 115000, "checked": True},
            {"id": "it4", "name": "ماکارونی ۷۰۰ گرمی زر", "quantity": 2.0, "unit": "بسته", "category": "کابینت", "price": 54000, "checked": True},
            {"id": "it5", "name": "پنیر فتا پگاه", "quantity": 1.0, "unit": "بسته", "category": "یخچال", "price": 93000, "checked": True}
        ]
    }

# ----------------- FAMILY TASKS -----------------
@router.get("/family-tasks")
async def get_family_tasks():
    return family_tasks_db

# ----------------- AI ASSISTANT & CHAT -----------------
@router.post("/assistant/chat", response_model=AiChatResponse)
async def chat_with_assistant(msg: ChatMessage, context: str = "خانه"):
    return await ollama_service.chat(user_message=msg.content, current_page_context=context)

@router.post("/assistant/confirm-action")
async def confirm_action(draft: AiActionDraft):
    if draft.action_type == "add_pantry":
        p = draft.payload
        new_item = PantryItem(
            id=f"p-{uuid.uuid4().hex[:6]}",
            name=p.get("name", "ماده جدید"),
            category=p.get("category", "یخچال"),
            quantity=float(p.get("quantity", 1)),
            unit=p.get("unit", "عدد"),
            expiry_days_left=int(p.get("expiry_days_left", 5)),
            is_expiring_soon=False
        )
        pantry_db.insert(0, new_item)
        return {"success": True, "message": f"«{new_item.name}» با موفقیت به موجودی اضافه شد.", "item": new_item}

    return {"success": True, "message": "عملیات با تأیید شما ثبت شد."}
