from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
from datetime import datetime

# --- Household & Member Schemas ---
class Member(BaseModel):
    id: str
    name: str
    role: str
    avatar_color: str = "#2F6B4F"
    avatar_char: str = "ع"

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

# --- Pantry Schemas ---
class PantryItem(BaseModel):
    id: str
    name: str
    category: str  # e.g., "یخچال", "فریزر", "کابینت", "ادویه‌جات"
    quantity: float
    unit: str  # e.g., "کیلوگرم", "بسته", "عدد", "گرم"
    expiry_days_left: int
    is_expiring_soon: bool = False
    added_at: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))

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

# --- Recommendation Schemas ---
class RecommendationFilter(BaseModel):
    max_time_minutes: Optional[int] = None
    max_budget_toman: Optional[int] = None
    target_meal: Optional[str] = "ناهار"  # صبحانه، ناهار، شام
    strict_health_filter: bool = True

class RecommendationResponse(BaseModel):
    timestamp: str
    top_recipe: Recipe
    alternatives: List[Recipe]
    ai_reasoning: str

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
