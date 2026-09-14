import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Header
from apps.api.app.schemas.schemas import (
    Household, HealthPreferences, PantryItem, PantryCreate,
    Recipe, RecommendationFilter, RecommendationResponse, RecommendationFeedback,
    DietaryConstraint, MemberNutritionGoal, MemberFoodPreference, HouseholdFoodPolicy, Member,
    ChatMessage, AiChatResponse, AiActionDraft, AiStatusResponse, AiConfigUpdate
)
from apps.api.app.data.seed_data import DEFAULT_HOUSEHOLD, INITIAL_PANTRY_ITEMS, INITIAL_RECIPES
from apps.api.app.data.catalog import get_recipe_catalog
from apps.api.app.ai.ollama_adapter import ollama_service
from apps.api.app.ai.gemini_adapter import gemini_service
from apps.api.app.ai.recommender import recommender_engine
from apps.api.app.ai.manager import ai_manager

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

from apps.api.app.core.auth import (
    USERS_DB, PASSWORDS_DB, User, LoginRequest, RegisterRequest,
    OtpRequest, OtpVerifyRequest, authenticate_user, register_user, DEMO_OTP
)

# ----------------- AUTHENTICATION & USER MANAGEMENT -----------------
@router.post("/auth/login")
async def login(req: LoginRequest):
    user = authenticate_user(req.username_or_phone, req.password, req.otp_code)
    if not user:
        raise HTTPException(status_code=401, detail="نام کاربری، رمز عبور یا کد تایید نادرست است.")
    return {
        "success": True,
        "token": f"auth-{user.id}-{uuid.uuid4().hex[:8]}",
        "user": user,
        "message": f"خوش آمدید، {user.full_name}!"
    }

@router.post("/auth/register")
async def register(req: RegisterRequest):
    try:
        new_user = register_user(req)
        return {
            "success": True,
            "token": f"auth-{new_user.id}-{uuid.uuid4().hex[:8]}",
            "user": new_user,
            "message": "ثبت‌نام با موفقیت انجام شد."
        }
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/auth/request-otp")
async def request_otp(req: OtpRequest):
    phone = req.phone_number.strip()
    if len(phone) < 10:
        raise HTTPException(status_code=400, detail="شماره موبایل وارد شده معتبر نیست.")
    return {
        "success": True,
        "phone_number": phone,
        "demo_code": DEMO_OTP,
        "message": f"کد تایید پیامک شد. (حالت دمو: کد تایید {DEMO_OTP} است)"
    }

@router.post("/auth/verify-otp")
async def verify_otp(req: OtpVerifyRequest):
    user = authenticate_user(req.phone_number, otp_code=req.code)
    if not user:
        raise HTTPException(status_code=400, detail=f"کد تایید اشتباه است. (در حالت دمو از {DEMO_OTP} استفاده کنید)")
    return {
        "success": True,
        "token": f"auth-{user.id}-{uuid.uuid4().hex[:8]}",
        "user": user,
        "message": f"احراز هویت با موفقیت انجام شد. خوش آمدید {user.full_name}"
    }

@router.get("/auth/users", response_model=List[User])
async def list_users():
    return list(USERS_DB.values())

class CreateUserAdminRequest(BaseModel):
    full_name: str
    username: str
    phone_number: str
    password: str = "123"
    role: str = "member"

@router.post("/auth/users", response_model=User)
async def create_user_by_admin(req: CreateUserAdminRequest):
    reg = RegisterRequest(
        full_name=req.full_name,
        phone_number=req.phone_number,
        username=req.username,
        password=req.password
    )
    user = register_user(reg)
    user.role = req.role
    return user

# ----------------- SYSTEM HEALTH & AI STATUS -----------------
@router.get("/health")
async def check_health():
    ai_status = await ai_manager.get_status()
    return {
        "status": "healthy",
        "ai": ai_status,
        "ollama_active": ai_status.ollama_active,
        "gemini_configured": ai_status.gemini_configured,
        "active_provider": ai_status.active_provider,
        "active_model": ai_status.active_model,
        "active_models": [ai_status.gemini_model, ai_status.ollama_model]
    }

@router.get("/ai/status", response_model=AiStatusResponse)
async def get_ai_status():
    return await ai_manager.get_status()

@router.post("/ai/config")
async def update_ai_config(cfg: AiConfigUpdate):
    return await ai_manager.update_config(cfg)

class TestKeyRequest(BaseModel):
    api_key: Optional[str] = None

@router.post("/ai/test-key")
async def test_ai_key(req: TestKeyRequest):
    return await ai_manager.test_gemini_connection(req.api_key)

@router.get("/ai/models")
async def get_gemini_models():
    return await ai_manager.get_gemini_models()

@router.post("/ai/models")
async def fetch_gemini_models(req: TestKeyRequest):
    return await ai_manager.get_gemini_models(req.api_key)

# ----------------- HOUSEHOLD & HEALTH -----------------
@router.get("/household", response_model=Household)
async def get_household():
    return household_db

@router.get("/household/members", response_model=List[Member])
async def get_household_members():
    return household_db.members

@router.put("/household/policies", response_model=HouseholdFoodPolicy)
async def update_household_policies(policies: HouseholdFoodPolicy):
    household_db.policies = policies
    return household_db.policies

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

@router.get("/recipes/catalog")
async def list_recipe_catalog(category: Optional[str] = None, occasion: Optional[str] = None):
    catalog = get_recipe_catalog()
    if category:
        catalog = [item for item in catalog if item["category"] == category]
    if occasion:
        catalog = [item for item in catalog if occasion in item["occasion"]]
    return {"count": len(catalog), "items": catalog}

@router.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str):
    clean_id = recipe_id.strip()
    
    # 1. Direct match (case-insensitive)
    recipe = next((r for r in recipes_db if r.id.lower() == clean_id.lower()), None)
    if recipe:
        return recipe

    # 2. Number-based match: IR001, IR1, rec-1, or 1
    digits = "".join(ch for ch in clean_id if ch.isdigit())
    if digits:
        num = int(digits)
        target_ir = f"IR{num:03d}".lower()
        target_rec = f"rec-{num}".lower()
        recipe = next((r for r in recipes_db if r.id.lower() in (target_ir, target_rec)), None)
        if recipe:
            return recipe

    # 3. Match by title keyword
    recipe = next((r for r in recipes_db if clean_id in r.title or r.title in clean_id), None)
    if recipe:
        return recipe

    raise HTTPException(status_code=404, detail="دستور پخت یافت نشد")

# ----------------- RECOMMENDATIONS (CRITICAL: ALLERGEN HARD FILTER & 5-STAGE) -----------------
@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(filters: RecommendationFilter = None):
    clean_pantry = pantry_db.copy()
    try:
        return recommender_engine.get_recommendations(
            pantry=clean_pantry, filters=filters, household=household_db, health=household_db.health
        )
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

@router.post("/recommendations/feedback")
async def register_recommendation_feedback(feedback: RecommendationFeedback):
    recipe = next((r for r in recipes_db if r.id.lower() == feedback.recipe_id.lower()), None)
    recipe_name = recipe.title if recipe else feedback.recipe_id

    # 1. Action: "cooked" -> deduct from pantry & log history
    if feedback.action == "cooked":
        if recipe:
            for ing in recipe.ingredients:
                for p in pantry_db:
                    if ing.name in p.name or p.name in ing.name:
                        p.quantity = max(0.0, round(p.quantity - 0.3, 2))
                        if p.usable_quantity is not None:
                            p.usable_quantity = max(0.0, round(p.usable_quantity - 0.3, 2))
        return {
            "status": "success",
            "action": "cooked",
            "message": f"غذا «{recipe_name}» پخته شد و اقلام مرتبط از انبار کسر گردید."
        }

    # 2. Action: "liked" -> increase preference
    elif feedback.action == "liked":
        for member in household_db.members:
            pref = next((p for p in member.food_preferences if p.target_code == recipe_name), None)
            if pref:
                pref.preference_score = min(5, pref.preference_score + 1)
                pref.source = "behavioral"
            else:
                member.food_preferences.append(
                    MemberFoodPreference(
                        id=f"pref-{uuid.uuid4().hex[:6]}",
                        member_id=member.id,
                        target_type="recipe",
                        target_code=recipe_name,
                        preference_score=4,
                        source="behavioral"
                    )
                )
        return {
            "status": "success",
            "action": "liked",
            "message": f"علاقه خانواده به «{recipe_name}» در هوش مصنوعی ثبت شد."
        }

    # 3. Action: "missing" -> note missing ingredients
    elif feedback.action == "missing":
        return {
            "status": "success",
            "action": "missing",
            "message": f"کسری موجودی برای «{recipe_name}» علامت‌گذاری شد تا در پیشنهادات آتی لحاظ شود."
        }

    # 4. Action: "expensive" -> note budget feedback
    elif feedback.action == "expensive":
        return {
            "status": "success",
            "action": "expensive",
            "message": f"بازخورد هزینه برای «{recipe_name}» در تنظیمات بودجه اعمال شد."
        }

    # 5. Action: "dislike" -> set negative preference
    elif feedback.action == "dislike":
        for member in household_db.members:
            pref = next((p for p in member.food_preferences if p.target_code == recipe_name), None)
            if pref:
                pref.preference_score = max(-5, pref.preference_score - 3)
            else:
                member.food_preferences.append(
                    MemberFoodPreference(
                        id=f"pref-{uuid.uuid4().hex[:6]}",
                        member_id=member.id,
                        target_type="recipe",
                        target_code=recipe_name,
                        preference_score=-4,
                        source="explicit"
                    )
                )
        return {
            "status": "success",
            "action": "dislike",
            "message": f"غذا «{recipe_name}» از اولویت پیشنهادات خارج شد."
        }

    return {"status": "success", "message": "بازخورد دریافت شد."}

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

@router.post("/receipts/{receipt_id}/confirm")
async def confirm_receipt(receipt_id: str, items: List[dict]):
    """Only user-selected draft rows are turned into stock movements."""
    added = []
    for item in items:
        if not item.get("checked", True):
            continue
        new_item = PantryItem(
            id=f"p-{uuid.uuid4().hex[:6]}", name=item["name"],
            category=item.get("category", "یخچال"), quantity=float(item.get("quantity", 1)),
            unit=item.get("unit", "عدد"), expiry_days_left=int(item.get("expiry_days_left", 5)),
            is_expiring_soon=False,
        )
        pantry_db.insert(0, new_item)
        added.append(new_item.name)
    return {"success": True, "message": f"{len(added)} قلمِ تأییدشده به موجودی افزوده شد.", "added": added}

# ----------------- FAMILY TASKS -----------------
@router.get("/family-tasks")
async def get_family_tasks():
    return family_tasks_db

# ----------------- AI ASSISTANT & CHAT -----------------
@router.post("/assistant/chat", response_model=AiChatResponse)
async def chat_with_assistant(msg: ChatMessage, context: str = "خانه"):
    return await ai_manager.chat(user_message=msg.content, current_page_context=context)

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

    if draft.action_type == "add_shopping":
        item = draft.payload
        new_item = {
            "id": f"s-{uuid.uuid4().hex[:6]}", "name": item.get("item", "قلم مورد نیاز"),
            "amount": item.get("amount", "۱ عدد"), "category": item.get("category", "عمومی"),
            "checked": False, "estimated_price": 0,
        }
        shopping_list_db.insert(0, new_item)
        return {"success": True, "message": f"«{new_item['name']}» به فهرست خرید افزوده شد.", "item": new_item}

    if draft.action_type == "plan_meal":
        payload = draft.payload
        plan = meal_plan_db[0]
        meal = payload.get("meal", "ناهار")
        if meal == "شام":
            plan["dinner"] = payload.get("recipe", "پیشنهاد برگزیده")
        else:
            plan["lunch"] = payload.get("recipe", "پیشنهاد برگزیده")
        return {"success": True, "message": "وعده پیشنهادی پس از تأیید شما در برنامه ثبت شد."}

    return {"success": True, "message": "عملیات با تأیید شما ثبت شد."}
