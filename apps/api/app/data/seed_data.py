from typing import List
from apps.api.app.schemas.schemas import Household, Member, HealthPreferences, PantryItem, Recipe, Nutrition, IngredientItem

DEFAULT_HOUSEHOLD = Household(
    id="household-1",
    name="خانه مددی",
    member_count=4,
    members=[
        Member(id="m1", name="نوید", role="پدر — مدیر خانواده", avatar_color="#2F6B4F", avatar_char="ن"),
        Member(id="m2", name="مریم", role="مادر", avatar_color="#E88B52", avatar_char="م"),
        Member(id="m3", name="آریا", role="کودک — ۸ ساله", avatar_color="#7D6FB5", avatar_char="آ"),
        Member(id="m4", name="مادربزرگ", role="بزرگسال", avatar_color="#528AE8", avatar_char="م"),
    ],
    health=HealthPreferences(
        allergies=["🥜 حساسیت به بادام زمینی", "🥛 حساسیت به لاکتوز"],
        conditions=["🫀 فشار خون ملایم", "👶 تغذیه رشد کودک"],
        preferences=["کم نمک", "بدون سرخ‌کردنی عمیق برای شام"],
        notes="محدودیت‌های ثبت‌شده توسط کاربر بر اساس PRD؛ جایگزین دستور پزشک نیست."
    )
)

INITIAL_PANTRY_ITEMS: List[PantryItem] = [
    PantryItem(id="p1", name="سبزی قورمه سرخ‌شده", category="فریزر", quantity=1.0, unit="بسته", expiry_days_left=2, is_expiring_soon=True),
    PantryItem(id="p2", name="لوبیا قرمز", category="کابینت", quantity=0.8, unit="کیلوگرم", expiry_days_left=90),
    PantryItem(id="p3", name="گوشت خورشتی گوساله", category="فریزر", quantity=0.5, unit="کیلوگرم", expiry_days_left=20),
    PantryItem(id="p4", name="برنج ایرانی طارم", category="کابینت", quantity=4.5, unit="کیلوگرم", expiry_days_left=180),
    PantryItem(id="p5", name="لیمو عمانی", category="کابینت", quantity=1.0, unit="بسته", expiry_days_left=120),
    PantryItem(id="p6", name="تخم مرغ", category="یخچال", quantity=6, unit="عدد", expiry_days_left=3, is_expiring_soon=True),
    PantryItem(id="p7", name="سبزی کوکو تازه", category="یخچال", quantity=0.5, unit="کیلوگرم", expiry_days_left=1, is_expiring_soon=True),
    PantryItem(id="p8", name="گردو خردشده", category="کابینت", quantity=0.2, unit="کیلوگرم", expiry_days_left=60),
    PantryItem(id="p9", name="زرشک پلویی", category="یخچال", quantity=0.3, unit="کیلوگرم", expiry_days_left=45),
    PantryItem(id="p10", name="مرغ تازه خردشده", category="یخچال", quantity=1.2, unit="کیلوگرم", expiry_days_left=2, is_expiring_soon=True),
    PantryItem(id="p11", name="بادمجان قلمی", category="یخچال", quantity=1.0, unit="کیلوگرم", expiry_days_left=4),
    PantryItem(id="p12", name="کشک پاستوریزه", category="یخچال", quantity=0.5, unit="شیشه", expiry_days_left=14),
]

from apps.api.app.data.persian_recipes import ALL_PERSIAN_RECIPES

INITIAL_RECIPES: List[Recipe] = ALL_PERSIAN_RECIPES
