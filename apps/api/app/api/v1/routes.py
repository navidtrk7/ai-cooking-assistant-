import uuid
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException, Header
from apps.api.app.schemas.schemas import (
    Household, HealthPreferences, PantryItem, PantryCreate,
    Recipe, RecommendationFilter, RecommendationResponse, RecommendationFeedback,
    DietaryConstraint, MemberNutritionGoal, MemberFoodPreference, HouseholdFoodPolicy, Member,
    ChatMessage, AiChatResponse, AiActionDraft, AiStatusResponse, AiConfigUpdate,
    StoreOffer, ItemStoreComparison, StoreSummary, DetailedStoreComparison,
    PeriodicPurchase, PeriodicPurchaseCreate, PantrySyncItem, PantrySyncResponse
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
    {"id": "s1", "name": "روغن زیتون فرابکر", "amount": "۱ بطری (۱.۵ لیتر)", "category": "خواربار", "checked": False, "estimated_price": 285000},
    {"id": "s2", "name": "شیر کم‌چرب پگاه", "amount": "۲ پاکت (۲ لیتر)", "category": "لبنیات", "checked": False, "estimated_price": 76000},
    {"id": "s3", "name": "پیاز زرد", "amount": "۲ کیلوگرم", "category": "میوه و تره‌بار", "checked": False, "estimated_price": 48000},
    {"id": "s4", "name": "تخم‌مرغ بسته ۲۰ عددی", "amount": "۱ بسته", "category": "پروتئین", "checked": False, "estimated_price": 118000},
    {"id": "s5", "name": "نان سنگک کنجدی", "amount": "۳ عدد", "category": "نان و غلات", "checked": False, "estimated_price": 45000},
]

# Seed Periodic & Scheduled Purchases
periodic_purchases_db = [
    {
        "id": "pp1",
        "title": "شیر کم‌چرب پگاه",
        "amount": "۲ پاکت (۲ لیتر)",
        "interval_days": 2,
        "interval_label": "یک روز در میان",
        "next_due_days": 1,
        "is_ai_suggested": False,
        "category": "لبنیات",
        "active": True
    },
    {
        "id": "pp2",
        "title": "نان سنگک کنجدی تازه",
        "amount": "۳ عدد",
        "interval_days": 3,
        "interval_label": "هر ۳ روز",
        "next_due_days": 2,
        "is_ai_suggested": False,
        "category": "نان و غلات",
        "active": True
    },
    {
        "id": "pp3",
        "title": "تخم‌مرغ محلی تازه (۲۰ عددی)",
        "amount": "۱ بسته",
        "interval_days": 7,
        "interval_label": "هفتگی",
        "next_due_days": 4,
        "is_ai_suggested": True,
        "category": "پروتئین",
        "active": True
    },
    {
        "id": "pp4",
        "title": "روغن زیتون فرابکر ۱.۵ لیتری",
        "amount": "۱ بطری",
        "interval_days": 30,
        "interval_label": "ماهانه",
        "next_due_days": 8,
        "is_ai_suggested": True,
        "category": "خواربار",
        "active": True
    }
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

# ----------------- SHOPPING LIST & SMART ACTIONS -----------------
@router.get("/shopping-list")
async def get_shopping_list():
    return shopping_list_db

class AddShoppingItemRequest(BaseModel):
    name: str
    amount: str = "۱ عدد"
    category: str = "عمومی"
    estimated_price: int = 50000

@router.post("/shopping-list/add")
async def add_shopping_item(item: AddShoppingItemRequest):
    new_item = {
        "id": f"s-{uuid.uuid4().hex[:6]}",
        "name": item.name,
        "amount": item.amount,
        "category": item.category,
        "checked": False,
        "estimated_price": item.estimated_price
    }
    shopping_list_db.insert(0, new_item)
    return new_item

@router.post("/shopping-list/toggle/{item_id}")
async def toggle_shopping_item(item_id: str):
    item = next((s for s in shopping_list_db if s["id"] == item_id), None)
    if not item:
        raise HTTPException(status_code=404, detail="قلم یافت نشد")
    item["checked"] = not item["checked"]
    return item

@router.delete("/shopping-list/{item_id}")
async def delete_shopping_item(item_id: str):
    global shopping_list_db
    shopping_list_db = [s for s in shopping_list_db if s["id"] != item_id]
    return {"success": True, "message": "قلم با موفقیت حذف شد"}

class AddRecipeToShoppingRequest(BaseModel):
    recipe_id: str
    recipe_title: Optional[str] = None
    ingredients: Optional[List[Dict[str, Any]]] = None

@router.post("/shopping-list/add-recipe")
async def add_recipe_to_shopping(req: AddRecipeToShoppingRequest):
    """Shortcut: Add all ingredients from a recipe into the smart shopping list."""
    added = []
    # If ingredients provided directly
    items_to_add = req.ingredients or []
    if not items_to_add:
        # Find recipe in catalog/db
        recipe = next((r for r in recipes_db if r.id == req.recipe_id), None)
        if recipe:
            items_to_add = [{"name": ing.name, "amount": ing.amount} for ing in recipe.ingredients]

    for it in items_to_add:
        name = it.get("name", "ماده اولیه")
        # Check if already in shopping list
        exists = any(s["name"].strip().lower() == name.strip().lower() for s in shopping_list_db)
        if not exists:
            new_item = {
                "id": f"s-{uuid.uuid4().hex[:6]}",
                "name": name,
                "amount": it.get("amount", "۱ واحد"),
                "category": "مواد رسپی",
                "checked": False,
                "estimated_price": it.get("estimated_price", 45000)
            }
            shopping_list_db.append(new_item)
            added.append(new_item["name"])

    return {
        "success": True,
        "message": f"{len(added)} قلم ماده اولیه از رسپی به لیست خرید هوشمند افزوده شد.",
        "added_count": len(added),
        "shopping_list": shopping_list_db
    }

# ----------------- PANTRY SYNC & DEDUPLICATION -----------------
@router.post("/shopping-list/sync-pantry", response_model=PantrySyncResponse)
async def sync_shopping_with_pantry():
    """
    Compare shopping list against pantry/fridge inventory.
    Suggest deducting items that the household already has in stock.
    """
    matches: List[PantrySyncItem] = []
    for s_item in shopping_list_db:
        if s_item.get("checked"):
            continue
        s_name = s_item["name"].strip().lower()
        # Find match in pantry
        for p_item in pantry_db:
            p_name = p_item.name.strip().lower()
            if p_name in s_name or s_name in p_name:
                matches.append(PantrySyncItem(
                    shopping_item_id=s_item["id"],
                    shopping_name=s_item["name"],
                    needed_amount=s_item["amount"],
                    pantry_name=p_item.name,
                    pantry_quantity=p_item.quantity,
                    pantry_unit=p_item.unit
                ))
                break

    msg = f"{len(matches)} قلم از اقلام لیست خرید هم‌اکنون در انبار و یخچال شما موجود است." if matches else "تمام اقلام لیست خرید کسری هستند و در انبار موجود نمی‌باشند."
    return PantrySyncResponse(matches=matches, message=msg)

class DeductPantryRequest(BaseModel):
    item_ids: List[str]

@router.post("/shopping-list/deduct-pantry")
async def deduct_pantry_items(req: DeductPantryRequest):
    """Remove or check off confirmed items that exist in pantry."""
    global shopping_list_db
    count = 0
    for s in shopping_list_db:
        if s["id"] in req.item_ids:
            s["checked"] = True
            count += 1
    return {"success": True, "message": f"{count} قلمِ موجود در انبار از لیست فعال کسر گردید.", "deducted_count": count}

# ----------------- DETAILED 3-STORE PRICE COMPARISON -----------------
@router.get("/stores", response_model=DetailedStoreComparison)
async def get_stores_comparison():
    """
    Itemized 3-Store Comparison:
    Stores: افق کوروش (اکالا) | دیجی‌کالا جت | اسنپ‌مارکت (هایپراستار)
    Returns per-item price, availability, store links, and summary.
    """
    import urllib.parse
    
    items_comp: List[ItemStoreComparison] = []
    
    okala_total = 0
    jet_total = 0
    snapp_total = 0

    okala_avail_count = 0
    jet_avail_count = 0
    snapp_avail_count = 0

    active_items = [it for it in shopping_list_db if not it.get("checked")]
    items_pool = active_items if active_items else shopping_list_db

    for idx, it in enumerate(items_pool):
        base_price = it.get("estimated_price", 60000)
        q = urllib.parse.quote(it["name"])

        # Realistic comparative pricing & availability
        # Store 1: Okala (often discount on staples, occasionally 1 item out of stock)
        okala_price = int(base_price * 0.94 // 1000 * 1000)
        okala_avail = (idx % 6 != 5)
        if okala_avail:
            okala_total += okala_price
            okala_avail_count += 1

        # Store 2: Digikala Jet (fastest delivery, premium selection)
        jet_price = int(base_price * 1.02 // 1000 * 1000)
        jet_avail = True
        jet_total += jet_price
        jet_avail_count += 1

        # Store 3: SnappMarket (Hyperstar bulk pricing)
        snapp_price = int(base_price * 0.96 // 1000 * 1000)
        snapp_avail = (idx % 8 != 7)
        if snapp_avail:
            snapp_total += snapp_price
            snapp_avail_count += 1

        # Determine best price among available
        prices = [
            ("افق کوروش (اکالا)", okala_price, okala_avail),
            ("دیجی‌کالا جت", jet_price, jet_avail),
            ("اسنپ‌مارکت", snapp_price, snapp_avail),
        ]
        avail_prices = [p for p in prices if p[2]]
        best_store = min(avail_prices, key=lambda x: x[1])[0] if avail_prices else "افق کوروش (اکالا)"

        items_comp.append(ItemStoreComparison(
            item_id=it["id"],
            item_name=it["name"],
            amount=it.get("amount", "۱ واحد"),
            category=it.get("category", "عمومی"),
            okala=StoreOffer(
                store_name="افق کوروش (اکالا)",
                price=okala_price,
                available=okala_avail,
                link=f"https://okala.com/search?q={q}"
            ),
            digikala_jet=StoreOffer(
                store_name="دیجی‌کالا جت",
                price=jet_price,
                available=jet_avail,
                link=f"https://jet.digikala.com/search?q={q}"
            ),
            snapp_market=StoreOffer(
                store_name="اسنپ‌مارکت",
                price=snapp_price,
                available=snapp_avail,
                link=f"https://snapp.market/search?q={q}"
            ),
            best_store=best_store
        ))

    total_items = max(len(items_pool), 1)
    okala_cov = int((okala_avail_count / total_items) * 100)
    jet_cov = int((jet_avail_count / total_items) * 100)
    snapp_cov = int((snapp_avail_count / total_items) * 100)

    stores_summary = [
        StoreSummary(
            name="افق کوروش (اکالا)",
            slug="okala",
            total_price=okala_total,
            delivery_time="۴۵ الی ۶۰ دقیقه",
            delivery_fee=18000,
            coverage_percent=okala_cov,
            link="https://okala.com",
            bulk_buy_url="https://okala.com/cart"
        ),
        StoreSummary(
            name="دیجی‌کالا جت",
            slug="digikala_jet",
            total_price=jet_total,
            delivery_time="۳۰ دقیقه اکسپرس",
            delivery_fee=29000,
            coverage_percent=jet_cov,
            link="https://jet.digikala.com",
            bulk_buy_url="https://jet.digikala.com/cart"
        ),
        StoreSummary(
            name="اسنپ‌مارکت (هایپراستار)",
            slug="snapp_market",
            total_price=snapp_total,
            delivery_time="۴۵ دقیقه",
            delivery_fee=24000,
            coverage_percent=snapp_cov,
            link="https://snapp.market",
            bulk_buy_url="https://snapp.market/cart"
        ),
    ]

    return DetailedStoreComparison(
        observed_time="امروز - به‌روزرسانی زنده",
        stores=stores_summary,
        items=items_comp
    )

# ----------------- PERIODIC & SCHEDULED PURCHASES -----------------
@router.get("/periodic-purchases", response_model=List[PeriodicPurchase])
async def get_periodic_purchases():
    return periodic_purchases_db

@router.post("/periodic-purchases", response_model=PeriodicPurchase)
async def create_periodic_purchase(item: PeriodicPurchaseCreate):
    new_p = {
        "id": f"pp-{uuid.uuid4().hex[:6]}",
        "title": item.title,
        "amount": item.amount,
        "interval_days": item.interval_days,
        "interval_label": item.interval_label,
        "next_due_days": item.interval_days,
        "is_ai_suggested": False,
        "category": item.category,
        "active": True
    }
    periodic_purchases_db.append(new_p)
    return new_p

@router.delete("/periodic-purchases/{item_id}")
async def delete_periodic_purchase(item_id: str):
    global periodic_purchases_db
    periodic_purchases_db = [p for p in periodic_purchases_db if p["id"] != item_id]
    return {"success": True, "message": "خرید دوره‌ای حذف شد."}

@router.post("/periodic-purchases/{item_id}/toggle")
async def toggle_periodic_purchase(item_id: str):
    p = next((x for x in periodic_purchases_db if x["id"] == item_id), None)
    if not p:
        raise HTTPException(status_code=404, detail="یافت نشد")
    p["active"] = not p["active"]
    return p

@router.post("/periodic-purchases/apply-due")
async def apply_due_periodic_purchases():
    """Transfer periodic items due today/tomorrow into active shopping list."""
    added = []
    for p in periodic_purchases_db:
        if p.get("active", True) and p.get("next_due_days", 99) <= 2:
            exists = any(s["name"] == p["title"] for s in shopping_list_db)
            if not exists:
                new_item = {
                    "id": f"s-{uuid.uuid4().hex[:6]}",
                    "name": p["title"],
                    "amount": p["amount"],
                    "category": p.get("category", "خرید دوره‌ای"),
                    "checked": False,
                    "estimated_price": 55000
                }
                shopping_list_db.insert(0, new_item)
                added.append(p["title"])
    return {
        "success": True,
        "message": f"{len(added)} قلم از خریدهای دوره‌ای سررسید‌شده به لیست خرید هوشمند اضافه شدند.",
        "added": added
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
