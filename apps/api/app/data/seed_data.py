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

INITIAL_RECIPES: List[Recipe] = [
    Recipe(
        id="rec-1",
        title="قورمه‌سبزی جاافتاده سنتی",
        category="خورشت سنتی",
        prep_time_minutes=25,
        cook_time_minutes=150,
        difficulty="متوسط",
        estimated_cost_toman=185000,
        servings=4,
        pantry_match_percent=94,
        match_reasons=[
            "سبزی قورمه موجود در فریزر ۲ روز تا تاریخ مصرف فاصله دارد.",
            "گوشت، لوبیا و برنج در انبار موجود است و نیاز به خرید جدید نیست.",
            "سازگار با محدودیت‌های فشار خون (کم نمک، پخت آرام با عصاره لیمو عمانی)."
        ],
        radar_scores={"pantry": 95, "health": 88, "speed": 55, "budget": 92, "taste": 98},
        nutrition=Nutrition(calories=480, protein="32g", carbs="42g", fat="18g", fiber="8g"),
        ingredients=[
            IngredientItem(name="سبزی قورمه سرخ‌شده", amount="۴۰۰ گرم", in_pantry=True),
            IngredientItem(name="گوشت خورشتی", amount="۳۵۰ گرم", in_pantry=True),
            IngredientItem(name="لوبیا قرمز خیسانده", amount="۱ پیمانه", in_pantry=True),
            IngredientItem(name="پیاز نگینی", amount="۱ عدد بزرگ", in_pantry=True),
            IngredientItem(name="لیمو عمانی", amount="۳ عدد", in_pantry=True),
            IngredientItem(name="روغن و زردچوبه", amount="به مقدار لازم", in_pantry=True),
        ],
        steps=[
            "پیاز را با زردچوبه در قابلمه تفت دهید تا سبک و طلایی شود.",
            "تکه‌های گوشت خورشتی را اضافه کرده و تا تغییر رنگ کامل تفت دهید.",
            "لوبیا قرمز و ۴ لیوان آب جوش اضافه کنید و حرارت را ملایم بگذارید (۱ ساعت پخت).",
            "سبزی قورمه سرخ‌شده و لیمو عمانی‌های چنگال‌زده را به خورشت اضافه کنید.",
            "حرارت را بسیار کم کنید و اجازه دهید خورشت ۲ ساعت آرام ریزجوش بزند تا روغن بیندازد."
        ]
    ),
    Recipe(
        id="rec-2",
        title="زرشک‌پلو با مرغ مجلسی زعفرانی",
        category="پلو و خوراک",
        prep_time_minutes=20,
        cook_time_minutes=60,
        difficulty="آسان",
        estimated_cost_toman=210000,
        servings=4,
        pantry_match_percent=88,
        match_reasons=[
            "مرغ تازه در یخچال رو به انقضا است و باید مصرف شود.",
            "زرشک و برنج طارم باکیفیت در کابینت موجود است.",
            "مورد علاقه تمام اعضای خانواده به ویژه کودک."
        ],
        radar_scores={"pantry": 88, "health": 82, "speed": 75, "budget": 85, "taste": 95},
        nutrition=Nutrition(calories=540, protein="38g", carbs="65g", fat="14g", fiber="3g"),
        ingredients=[
            IngredientItem(name="تکه‌های مرغ", amount="۸۰۰ گرم", in_pantry=True),
            IngredientItem(name="برنج ایرانی", amount="۴ پیمانه", in_pantry=True),
            IngredientItem(name="زرشک پلویی", amount="نصف پیمانه", in_pantry=True),
            IngredientItem(name="زعفران دم‌کرده", amount="۲ قاشق غذاخوری", in_pantry=True),
            IngredientItem(name="کره و خلال پسته", amount="به میزان دلخواه", in_pantry=False),
        ],
        steps=[
            "تکه‌های مرغ را با نمک، فلفل و زعفران آغشته کرده و در تابه سرخ کنید.",
            "سس مرغ را با رب گوجه تفت‌داده، پیاز و یک لیوان آب آماده کرده و روی مرغ بریزید تا مغزپخت شود.",
            "برنج را آبکش و دم کنید.",
            "زرشک را با شعله بسیار کم، کمی شکر و گلاب در کره تفت دهید و با برنج زعفرانی تزیین کنید."
        ]
    ),
    Recipe(
        id="rec-3",
        title="کوکو سبزی تابه‌ای سبک و سریع",
        category="شام سبک",
        prep_time_minutes=15,
        cook_time_minutes=25,
        difficulty="خیلی آسان",
        estimated_cost_toman=85000,
        servings=4,
        pantry_match_percent=98,
        match_reasons=[
            "سبزی کوکو و تخم‌مرغ در یخچال فقط ۱ تا ۲ روز مهلت مصرف دارند.",
            "پخت سریع زیر ۳۰ دقیقه؛ ایده‌آل برای روزهای کاری شلوغ.",
            "غذایی غنی از فیبر و سبزیجات مناسب رژیم کم‌کالری."
        ],
        radar_scores={"pantry": 98, "health": 94, "speed": 95, "budget": 96, "taste": 88},
        nutrition=Nutrition(calories=260, protein="14g", carbs="12g", fat="16g", fiber="7g"),
        ingredients=[
            IngredientItem(name="سبزی کوکو خردشده", amount="۵۰۰ گرم", in_pantry=True),
            IngredientItem(name="تخم‌مرغ", amount="۵ عدد", in_pantry=True),
            IngredientItem(name="سیر رنده‌شده", amount="۲ حبه", in_pantry=True),
            IngredientItem(name="گردو خردشده (اختیاری)", amount="۲ قاشق غذاخوری", in_pantry=True),
            IngredientItem(name="زرشک", amount="۱ قاشق غذاخوری", in_pantry=True),
        ],
        steps=[
            "سبزی کوکو را با تخم‌مرغ‌ها، سیر رنده‌شده، نمک، فلفل و زردچوبه خوب هم بزنید.",
            "گردو و زرشک را در صورت تمایل به مایه اضافه کنید.",
            "روغن را در تابه نچسب داغ کرده و مایه را یکدست پهن کنید.",
            "در تابه را بگذارید تا با شعله ملایم خودش را بگیرد، سپس برش زده و برگردانید تا طرف دیگر برشته شود."
        ]
    ),
    Recipe(
        id="rec-4",
        title="کشک بادمجان اصیل با نعنا داغ",
        category="خوراک سنتی",
        prep_time_minutes=20,
        cook_time_minutes=35,
        difficulty="متوسط",
        estimated_cost_toman=110000,
        servings=4,
        pantry_match_percent=92,
        match_reasons=[
            "بادمجان و کشک در یخچال موجود است.",
            "گزینه گیاهی عالی برای کاهش مصرف گوشت قرمز هفتگی."
        ],
        radar_scores={"pantry": 92, "health": 80, "speed": 82, "budget": 90, "taste": 94},
        nutrition=Nutrition(calories=320, protein="12g", carbs="24g", fat="20g", fiber="9g"),
        ingredients=[
            IngredientItem(name="بادمجان قلمی کبابی یا سرخ‌شده", amount="۱ کیلوگرم", in_pantry=True),
            IngredientItem(name="کشک پاستوریزه کم‌نمک", amount="۴ قاشق غذاخوری", in_pantry=True),
            IngredientItem(name="پیاز داغ و سیر داغ", amount="نصف پیمانه", in_pantry=True),
            IngredientItem(name="نعنا خشک", amount="۲ قاشق غذاخوری", in_pantry=True),
        ],
        steps=[
            "بادمجان‌ها را پخته یا کبابی کرده و با گوشت‌کوب بکوبید.",
            "سیر داغ و پیاز داغ را اضافه کرده و چند دقیقه تفت دهید.",
            "کشک رقیق‌شده با نصف لیوان آب ولرم را اضافه کنید و اجازه دهید روی حرارت کم ۱۰ دقیقه جا بیفتد.",
            "با نعنا داغ و گردوی خردشده تزیین و سرو نمایید."
        ]
    )
]
