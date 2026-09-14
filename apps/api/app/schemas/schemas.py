from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

# --- Granular Health & Constraint Schemas ---
class MemberHealthProfile(BaseModel):
    height_cm: Optional[float] = None
    weight_kg: Optional[float] = None
    activity_level: str = "moderate"  # low, light, moderate, high
    health_data_consent: bool = True
    updated_at: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))

class MemberNutritionGoal(BaseModel):
    id: str
    member_id: str
    goal_type: str  # weight_loss, higher_protein, lower_sodium, lower_sugar, higher_fiber, child_growth, heart_friendly, general_wellbeing
    priority: int = 3  # 1 to 5
    target_value: Optional[float] = None
    target_unit: Optional[str] = None
    is_active: bool = True

class DietaryConstraint(BaseModel):
    id: str
    member_id: str
    constraint_type: str  # allergy, intolerance, medical_limit, religious, ethical, diet_pattern, disliked_food, ingredient_avoidance
    target_type: str = "ingredient"  # ingredient, ingredient_group, nutrient, recipe_tag
    target_code: str  # e.g., "گردو", "سدیم", "گوشت قرمز", "بادمجان", "سوسیس"
    severity: str = "critical"  # critical, high, medium, low
    rule_mode: str = "exclude"  # exclude, limit, prefer
    max_amount_per_serving: Optional[float] = None
    max_amount_unit: Optional[str] = None
    source: str = "user"  # user, caregiver, clinician, imported
    notes: Optional[str] = None
    is_active: bool = True

class MemberFoodPreference(BaseModel):
    id: str
    member_id: str
    target_type: str = "recipe"  # recipe, ingredient, cuisine, recipe_tag
    target_code: str  # e.g. "قیمه", "فسنجان", "کباب تابه‌ای"
    preference_score: int = 3  # -5 to +5
    confidence: float = 0.9  # 0 to 1
    source: str = "explicit"  # explicit, behavioral, inferred

class Member(BaseModel):
    id: str
    name: str
    role: str
    avatar_color: str = "#2F6B4F"
    avatar_char: str = "ع"
    birth_date: Optional[str] = None
    health_profile: Optional[MemberHealthProfile] = None
    nutrition_goals: List[MemberNutritionGoal] = Field(default_factory=list)
    dietary_constraints: List[DietaryConstraint] = Field(default_factory=list)
    food_preferences: List[MemberFoodPreference] = Field(default_factory=list)

class HouseholdFoodPolicy(BaseModel):
    weekly_budget_toman: int = 8500000
    max_repeat_per_week: Dict[str, int] = Field(default_factory=lambda: {
        "same_recipe": 1,
        "same_protein": 3,
        "rice_based_meal": 4
    })
    default_servings: int = 4
    max_weekday_cooking_minutes: int = 45
    prefer_existing_inventory: bool = True
    avoid_food_waste: bool = True

class HealthPreferences(BaseModel):
    allergies: List[str] = Field(default_factory=list)
    conditions: List[str] = Field(default_factory=list)
    preferences: List[str] = Field(default_factory=list)
    notes: Optional[str] = None

class Household(BaseModel):
    id: str = "household-1"
    name: str = "خانه مددی"
    member_count: int = 4
    members: List[Member] = Field(default_factory=list)
    health: HealthPreferences = Field(default_factory=HealthPreferences)
    policies: HouseholdFoodPolicy = Field(default_factory=HouseholdFoodPolicy)

# --- Canonical Inventory Schemas ---
class CanonicalIngredient(BaseModel):
    id: str
    canonical_name_fa: str
    ingredient_group: str  # poultry, meat, dairy, produce, legumes, grains, spices, pantry
    default_unit: str  # g, ml, piece, pack, tbsp, tsp
    edible_portion_ratio: float = 1.0
    storage_type: str = "fridge"  # fridge, freezer, pantry, fresh
    aliases: List[str] = Field(default_factory=list)
    is_active: bool = True

class InventoryItem(BaseModel):
    id: str
    ingredient_id: Optional[str] = None
    name: str
    canonical_name_fa: Optional[str] = None
    category: str  # e.g., "یخچال", "فریزر", "کابینت", "ادویه‌جات"
    location: str = "fridge"  # fridge, freezer, pantry, counter
    quantity: float
    usable_quantity: Optional[float] = None
    unit: str
    expiry_days_left: int
    is_expiring_soon: bool = False
    confidence_score: float = 1.0
    source: str = "manual"  # manual, voice, receipt_ocr, store_sync
    status: str = "available"  # available, low, expired, consumed
    added_at: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))

class PantryItem(InventoryItem):
    pass

class PantryCreate(BaseModel):
    name: str
    category: str
    quantity: float
    unit: str
    expiry_days_left: int

# --- Recipe Schemas ---
class IngredientItem(BaseModel):
    name: str
    amount: str
    in_pantry: bool = True

class Nutrition(BaseModel):
    calories: int
    protein: str
    carbs: str
    fat: str
    fiber: str

class Recipe(BaseModel):
    id: str
    title: str
    category: str
    prep_time_minutes: int
    cook_time_minutes: int
    difficulty: str  # آسان، متوسط، زمان‌بر
    estimated_cost_toman: int
    servings: int
    pantry_match_percent: int
    match_reasons: List[str]
    radar_scores: Dict[str, int]  # e.g. {"pantry": 95, "health": 85, "speed": 60, "budget": 90, "taste": 92}
    nutrition: Nutrition
    ingredients: List[IngredientItem]
    steps: List[str]

# --- Recommendation Schemas & Explainable Output ---
class MissingItemDetail(BaseModel):
    ingredient: str
    needed: str
    available: str
    to_buy: str

class SubstitutionOption(BaseModel):
    missing: str
    alternative: str
    impact: str

class ExplainableRecommendation(BaseModel):
    recipe_id: str
    recipe_name: str
    recipe: Recipe
    score: int
    confidence: float = 0.92
    rank: int = 1
    tag: str = "بهترین تطابق کلی"  # برترین گزینه، تنوع پروتئین/دسته، گزینه اقتصادی و سریع
    reasons: List[str]
    health_notes: List[str] = Field(default_factory=list)
    missing_items: List[MissingItemDetail] = Field(default_factory=list)
    substitutions: List[SubstitutionOption] = Field(default_factory=list)

class RecommendationFilter(BaseModel):
    max_time_minutes: Optional[int] = None
    max_budget_toman: Optional[int] = None
    target_meal: Optional[str] = "ناهار"  # صبحانه، ناهار، شام
    servings: Optional[int] = 4
    strict_health_filter: bool = True
    must_use_inventory: bool = True
    occasion: Optional[str] = "family_dinner"

class RecommendationResponse(BaseModel):
    timestamp: str
    top_recipe: Recipe
    alternatives: List[Recipe]
    ai_reasoning: str
    excluded_count: int = 0
    available_count: int = 0
    recommendations: List[ExplainableRecommendation] = Field(default_factory=list)

class RecommendationFeedback(BaseModel):
    recipe_id: str
    action: str  # "cooked", "liked", "missing", "expensive", "dislike"
    notes: Optional[str] = None

# --- AI Assistant Schemas ---
class ChatMessage(BaseModel):
    role: str = "user"  # "user" or "assistant"
    content: str
    timestamp: Optional[str] = None

class AiActionDraft(BaseModel):
    action_type: str  # "add_pantry", "plan_meal", "add_shopping"
    description: str
    payload: Dict[str, Any]
    requires_confirmation: bool = True

class AiChatResponse(BaseModel):
    reply: str
    draft_action: Optional[AiActionDraft] = None
    provider: str = "gemini"
    model: str = "gemini-3.6-flash"

class AiStatusResponse(BaseModel):
    active_provider: str
    active_model: str
    gemini_configured: bool
    gemini_model: str
    ollama_active: bool
    ollama_model: str
    available_providers: List[str]

class AiConfigUpdate(BaseModel):
    gemini_api_key: Optional[str] = None
    gemini_model: Optional[str] = None
    ai_provider: Optional[str] = None

# --- Shopping & Store Comparison Schemas ---
class StoreOffer(BaseModel):
    store_name: str
    price: int
    available: bool = True
    link: str

class ItemStoreComparison(BaseModel):
    item_id: str
    item_name: str
    amount: str
    category: str = "عمومی"
    okala: StoreOffer
    digikala_jet: StoreOffer
    snapp_market: StoreOffer
    best_store: str  # "افق کوروش (اکالا)" | "دیجی‌کالا جت" | "اسنپ‌مارکت"

class StoreSummary(BaseModel):
    name: str
    slug: str
    total_price: int
    delivery_time: str
    delivery_fee: int
    coverage_percent: int
    link: str
    bulk_buy_url: str

class DetailedStoreComparison(BaseModel):
    observed_time: str
    stores: List[StoreSummary]
    items: List[ItemStoreComparison]

# --- Periodic Purchases ---
class PeriodicPurchase(BaseModel):
    id: str
    title: str
    amount: str
    interval_days: int
    interval_label: str  # "یک روز در میان", "هفتگی", "هر ۳ روز", "ماهانه"
    next_due_days: int
    is_ai_suggested: bool = False
    category: str = "عمومی"
    active: bool = True

class PeriodicPurchaseCreate(BaseModel):
    title: str
    amount: str
    interval_days: int
    interval_label: str
    category: str = "عمومی"

# --- Pantry Sync ---
class PantrySyncItem(BaseModel):
    shopping_item_id: str
    shopping_name: str
    needed_amount: str
    pantry_name: str
    pantry_quantity: float
    pantry_unit: str

class PantrySyncResponse(BaseModel):
    matches: List[PantrySyncItem]
    message: str

