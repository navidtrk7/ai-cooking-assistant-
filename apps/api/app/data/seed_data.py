from typing import List
from apps.api.app.schemas.schemas import (
    Household, Member, HealthPreferences, PantryItem, Recipe, Nutrition, IngredientItem,
    MemberHealthProfile, MemberNutritionGoal, DietaryConstraint, MemberFoodPreference,
    HouseholdFoodPolicy, CanonicalIngredient
)

CANONICAL_INGREDIENTS: List[CanonicalIngredient] = [
    CanonicalIngredient(id="ing-chicken", canonical_name_fa="سینه مرغ", ingredient_group="poultry", default_unit="g", storage_type="fridge", aliases=["مرغ", "فیله مرغ", "سینه مرغ تازه", "تکه‌های مرغ"]),
    CanonicalIngredient(id="ing-beef", canonical_name_fa="گوشت قرمز", ingredient_group="meat", default_unit="g", storage_type="freezer", aliases=["گوشت خورشتی", "گوشت گوساله", "گوشت چرخ‌کرده", "ماهیچه"]),
    CanonicalIngredient(id="ing-rice", canonical_name_fa="برنج ایرانی", ingredient_group="grains", default_unit="g", storage_type="pantry", aliases=["برنج طارم", "برنج", "چلو"]),
    CanonicalIngredient(id="ing-egg", canonical_name_fa="تخم‌مرغ", ingredient_group="dairy", default_unit="piece", storage_type="fridge", aliases=["تخم مرغ", "تخم‌مرغ محلی"]),
    CanonicalIngredient(id="ing-tomato", canonical_name_fa="گوجه‌فرنگی", ingredient_group="produce", default_unit="piece", storage_type="fridge", aliases=["گوجه", "گوجه فرنگی"]),
    CanonicalIngredient(id="ing-onion", canonical_name_fa="پیاز", ingredient_group="produce", default_unit="piece", storage_type="pantry", aliases=["پیاز نگینی", "پیاز داغ", "پیاز سفید"]),
    CanonicalIngredient(id="ing-ghormeh-veg", canonical_name_fa="سبزی قورمه", ingredient_group="produce", default_unit="g", storage_type="freezer", aliases=["سبزی قورمه سرخ‌شده", "سبزی خورشتی"]),
    CanonicalIngredient(id="ing-kuku-veg", canonical_name_fa="سبزی کوکو", ingredient_group="produce", default_unit="g", storage_type="fridge", aliases=["سبزی کوکو تازه"]),
    CanonicalIngredient(id="ing-red-beans", canonical_name_fa="لوبیا قرمز", ingredient_group="legumes", default_unit="g", storage_type="pantry", aliases=["لوبیا قرمز خیسانده"]),
    CanonicalIngredient(id="ing-walnut", canonical_name_fa="گردو", ingredient_group="spices", default_unit="g", storage_type="pantry", aliases=["مغز گردو", "گردوی خردشده"]),
    CanonicalIngredient(id="ing-eggplant", canonical_name_fa="بادمجان", ingredient_group="produce", default_unit="g", storage_type="fridge", aliases=["بادمجان قلمی", "بادمجان سرخ‌شده"]),
    CanonicalIngredient(id="ing-kashk", canonical_name_fa="کشک", ingredient_group="dairy", default_unit="g", storage_type="fridge", aliases=["کشک پاستوریزه", "کشک سنتی"]),
    CanonicalIngredient(id="ing-saffron", canonical_name_fa="زعفران", ingredient_group="spices", default_unit="g", storage_type="pantry", aliases=["زعفران دم‌کرده", "زعفران اعلا"]),
    CanonicalIngredient(id="ing-barberry", canonical_name_fa="زرشک", ingredient_group="spices", default_unit="g", storage_type="fridge", aliases=["زرشک پلویی"]),
]

DEFAULT_HOUSEHOLD = Household(
    id="household-1",
    name="خانه مددی",
    member_count=4,
    policies=HouseholdFoodPolicy(
        weekly_budget_toman=8500000,
        max_repeat_per_week={"same_recipe": 1, "same_protein": 3, "rice_based_meal": 4},
        default_servings=4,
        max_weekday_cooking_minutes=45,
        prefer_existing_inventory=True,
        avoid_food_waste=True
    ),
    members=[
        Member(
            id="m1",
            name="نوید",
            role="owner",
            avatar_color="#2F6B4F",
            avatar_char="ن",
            health_profile=MemberHealthProfile(activity_level="moderate", health_data_consent=True),
            nutrition_goals=[
                MemberNutritionGoal(id="g-1", member_id="m1", goal_type="lower_sodium", priority=5, target_unit="mg", target_value=2000),
                MemberNutritionGoal(id="g-1b", member_id="m1", goal_type="general_wellbeing", priority=3)
            ],
            dietary_constraints=[
                DietaryConstraint(id="c-1", member_id="m1", constraint_type="medical_limit", target_type="nutrient", target_code="سدیم", severity="high", rule_mode="limit", notes="کنترل فشار خون ملایم؛ ترجیح غذاهای کم‌نمک")
            ],
            food_preferences=[
                MemberFoodPreference(id="p-1a", member_id="m1", target_type="recipe", target_code="قورمه‌سبزی", preference_score=5, source="explicit"),
                MemberFoodPreference(id="p-1b", member_id="m1", target_type="recipe", target_code="کباب تابه‌ای", preference_score=4, source="behavioral"),
            ]
        ),
        Member(
            id="m2",
            name="مریم",
            role="adult",
            avatar_color="#E88B52",
            avatar_char="م",
            health_profile=MemberHealthProfile(activity_level="moderate", health_data_consent=True),
            nutrition_goals=[
                MemberNutritionGoal(id="g-2a", member_id="m2", goal_type="weight_maintenance", priority=3),
                MemberNutritionGoal(id="g-2b", member_id="m2", goal_type="higher_fiber", priority=4)
            ],
            dietary_constraints=[
                DietaryConstraint(id="c-2a", member_id="m2", constraint_type="ingredient_avoidance", target_type="ingredient", target_code="سوسیس و کالباس", severity="high", rule_mode="exclude", notes="پرهیز از فرآورده‌های فوق‌فرآوری‌شده"),
                DietaryConstraint(id="c-2b", member_id="m2", constraint_type="disliked_food", target_type="ingredient", target_code="بادمجان", severity="medium", rule_mode="limit", notes="کاهش تمایل به غذاهای سنگین بادمجان‌دار")
            ],
            food_preferences=[
                MemberFoodPreference(id="p-2a", member_id="m2", target_type="recipe", target_code="سبزی‌پلو با ماهی", preference_score=5, source="explicit"),
                MemberFoodPreference(id="p-2b", member_id="m2", target_type="recipe", target_code="میرزا قاسمی", preference_score=-2, source="explicit")
            ]
        ),
        Member(
            id="m3",
            name="آریا",
            role="child",
            birth_date="2018-05-12",
            avatar_color="#7D6FB5",
            avatar_char="آ",
            health_profile=MemberHealthProfile(activity_level="high", health_data_consent=True),
            nutrition_goals=[
                MemberNutritionGoal(id="g-3a", member_id="m3", goal_type="child_growth", priority=4),
                MemberNutritionGoal(id="g-3b", member_id="m3", goal_type="higher_protein", priority=4)
            ],
            dietary_constraints=[
                DietaryConstraint(id="c-3a", member_id="m3", constraint_type="allergy", target_type="ingredient", target_code="گردو", severity="critical", rule_mode="exclude", notes="آلرژی قطعی و شدید به گردو (حذف بدون استثنای فسنجان یا هر غذای گردودار)"),
                DietaryConstraint(id="c-3b", member_id="m3", constraint_type="allergy", target_type="ingredient", target_code="بادام زمینی", severity="critical", rule_mode="exclude", notes="آلرژی قطعی به بادام زمینی")
            ],
            food_preferences=[
                MemberFoodPreference(id="p-3a", member_id="m3", target_type="recipe", target_code="ماکارونی ایرانی", preference_score=5, source="explicit"),
                MemberFoodPreference(id="p-3b", member_id="m3", target_type="recipe", target_code="کباب تابه‌ای", preference_score=4, source="behavioral"),
                MemberFoodPreference(id="p-3c", member_id="m3", target_type="ingredient", target_code="بادمجان", preference_score=-4, source="explicit")
            ]
        ),
        Member(
            id="m4",
            name="مادربزرگ",
            role="adult",
            avatar_color="#528AE8",
            avatar_char="م",
            health_profile=MemberHealthProfile(activity_level="light", health_data_consent=True),
            nutrition_goals=[
                MemberNutritionGoal(id="g-4a", member_id="m4", goal_type="heart_friendly", priority=4),
                MemberNutritionGoal(id="g-4b", member_id="m4", goal_type="general_wellbeing", priority=3)
            ],
            dietary_constraints=[
                DietaryConstraint(id="c-4a", member_id="m4", constraint_type="intolerance", target_type="ingredient", target_code="لاکتوز", severity="high", rule_mode="limit", notes="عدم تحمل لاکتوز و شیر پرچرب")
            ],
            food_preferences=[
                MemberFoodPreference(id="p-4a", member_id="m4", target_type="recipe", target_code="آش رشته", preference_score=4, source="explicit"),
                MemberFoodPreference(id="p-4b", member_id="m4", target_type="recipe", target_code="سوپ جو", preference_score=3, source="behavioral")
            ]
        ),
    ],
    health=HealthPreferences(
        allergies=["🥜 حساسیت به بادام زمینی", "🌰 آلرژی قطعی به گردو (کودک)"],
        conditions=["🫀 فشار خون ملایم (پدر)", "👶 تغذیه رشد کودک"],
        preferences=["کم نمک", "بدون سرخ‌کردنی عمیق برای شام"],
        notes="تفکیک کامل قواعد در سطح اعضا انجام شده و اولویت اول حذف غذاهای ناامن است."
    )
)

INITIAL_PANTRY_ITEMS: List[PantryItem] = [
    PantryItem(id="p1", ingredient_id="ing-ghormeh-veg", name="سبزی قورمه سرخ‌شده", canonical_name_fa="سبزی قورمه", category="فریزر", location="freezer", quantity=1.0, usable_quantity=1.0, unit="بسته", expiry_days_left=2, is_expiring_soon=True, confidence_score=0.95),
    PantryItem(id="p2", ingredient_id="ing-red-beans", name="لوبیا قرمز", canonical_name_fa="لوبیا قرمز", category="کابینت", location="pantry", quantity=0.8, usable_quantity=0.8, unit="کیلوگرم", expiry_days_left=90, confidence_score=1.0),
    PantryItem(id="p3", ingredient_id="ing-beef", name="گوشت خورشتی گوساله", canonical_name_fa="گوشت قرمز", category="فریزر", location="freezer", quantity=0.5, usable_quantity=0.5, unit="کیلوگرم", expiry_days_left=20, confidence_score=0.9),
    PantryItem(id="p4", ingredient_id="ing-rice", name="برنج ایرانی طارم", canonical_name_fa="برنج ایرانی", category="کابینت", location="pantry", quantity=4.5, usable_quantity=4.5, unit="کیلوگرم", expiry_days_left=180, confidence_score=1.0),
    PantryItem(id="p5", name="لیمو عمانی", category="کابینت", location="pantry", quantity=1.0, usable_quantity=1.0, unit="بسته", expiry_days_left=120, confidence_score=1.0),
    PantryItem(id="p6", ingredient_id="ing-egg", name="تخم مرغ", canonical_name_fa="تخم‌مرغ", category="یخچال", location="fridge", quantity=6, usable_quantity=6, unit="عدد", expiry_days_left=3, is_expiring_soon=True, confidence_score=0.95),
    PantryItem(id="p7", ingredient_id="ing-kuku-veg", name="سبزی کوکو تازه", canonical_name_fa="سبزی کوکو", category="یخچال", location="fridge", quantity=0.5, usable_quantity=0.5, unit="کیلوگرم", expiry_days_left=1, is_expiring_soon=True, confidence_score=0.9),
    PantryItem(id="p8", ingredient_id="ing-walnut", name="گردو خردشده", canonical_name_fa="گردو", category="کابینت", location="pantry", quantity=0.2, usable_quantity=0.2, unit="کیلوگرم", expiry_days_left=60, confidence_score=1.0),
    PantryItem(id="p9", ingredient_id="ing-barberry", name="زرشک پلویی", canonical_name_fa="زرشک", category="یخچال", location="fridge", quantity=0.3, usable_quantity=0.3, unit="کیلوگرم", expiry_days_left=45, confidence_score=1.0),
    PantryItem(id="p10", ingredient_id="ing-chicken", name="مرغ تازه خردشده", canonical_name_fa="سینه مرغ", category="یخچال", location="fridge", quantity=1.2, usable_quantity=1.2, unit="کیلوگرم", expiry_days_left=2, is_expiring_soon=True, confidence_score=0.95),
    PantryItem(id="p11", ingredient_id="ing-eggplant", name="بادمجان قلمی", canonical_name_fa="بادمجان", category="یخچال", location="fridge", quantity=1.0, usable_quantity=1.0, unit="کیلوگرم", expiry_days_left=4, confidence_score=0.85),
    PantryItem(id="p12", ingredient_id="ing-kashk", name="کشک پاستوریزه", canonical_name_fa="کشک", category="یخچال", location="fridge", quantity=0.5, usable_quantity=0.5, unit="شیشه", expiry_days_left=14, confidence_score=0.9),
]

from apps.api.app.data.persian_recipes import ALL_PERSIAN_RECIPES

INITIAL_RECIPES: List[Recipe] = ALL_PERSIAN_RECIPES
