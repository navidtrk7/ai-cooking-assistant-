export interface MemberHealthProfile {
  height_cm?: number | null;
  weight_kg?: number | null;
  activity_level: string;
  health_data_consent: boolean;
  updated_at: string;
}

export interface MemberNutritionGoal {
  id: string;
  member_id: string;
  goal_type: string;
  priority: number;
  target_value?: number | null;
  target_unit?: string | null;
  is_active: boolean;
}

export interface DietaryConstraint {
  id: string;
  member_id: string;
  constraint_type: string; // allergy, intolerance, medical_limit, diet_pattern, disliked_food, ingredient_avoidance
  target_type: string;
  target_code: string;
  severity: string; // critical, high, medium, low
  rule_mode: string; // exclude, limit, prefer
  max_amount_per_serving?: number | null;
  notes?: string | null;
  is_active: boolean;
}

export interface MemberFoodPreference {
  id: string;
  member_id: string;
  target_type: string;
  target_code: string;
  preference_score: number; // -5 to +5
  confidence: number;
  source: string; // explicit, behavioral, inferred
}

export interface Member {
  id: string;
  name: string;
  role: string;
  avatar_color: string;
  avatar_char: string;
  birth_date?: string | null;
  health_profile?: MemberHealthProfile | null;
  nutrition_goals?: MemberNutritionGoal[];
  dietary_constraints?: DietaryConstraint[];
  food_preferences?: MemberFoodPreference[];
}

export interface HouseholdFoodPolicy {
  weekly_budget_toman: number;
  max_repeat_per_week: Record<string, number>;
  default_servings: number;
  max_weekday_cooking_minutes: number;
  prefer_existing_inventory: boolean;
  avoid_food_waste: boolean;
}

export interface HealthPreferences {
  allergies: string[];
  conditions: string[];
  preferences: string[];
  notes?: string;
}

export interface Household {
  id: string;
  name: string;
  member_count: number;
  members: Member[];
  health: HealthPreferences;
  policies?: HouseholdFoodPolicy;
}

export interface PantryItem {
  id: string;
  ingredient_id?: string | null;
  name: string;
  canonical_name_fa?: string | null;
  category: string;
  location?: string;
  quantity: number;
  usable_quantity?: number | null;
  unit: string;
  expiry_days_left: number;
  is_expiring_soon: boolean;
  confidence_score?: number;
  added_at: string;
}

export interface IngredientItem {
  name: string;
  amount: string;
  in_pantry: boolean;
}

export interface Nutrition {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
}

export interface Recipe {
  id: string;
  title: string;
  category: string;
  prep_time_minutes: number;
  cook_time_minutes: number;
  difficulty: string;
  estimated_cost_toman: number;
  servings: number;
  pantry_match_percent: number;
  match_reasons: string[];
  radar_scores: {
    pantry: number;
    health: number;
    speed: number;
    budget: number;
    taste: number;
  };
  nutrition: Nutrition;
  ingredients: IngredientItem[];
  steps: string[];
}

export interface MissingItemDetail {
  ingredient: string;
  needed: string;
  available: string;
  to_buy: string;
}

export interface SubstitutionOption {
  missing: string;
  alternative: string;
  impact: string;
}

export interface ExplainableRecommendation {
  recipe_id: string;
  recipe_name: string;
  recipe: Recipe;
  score: number;
  confidence: number;
  rank: number;
  tag: string;
  reasons: string[];
  health_notes: string[];
  missing_items: MissingItemDetail[];
  substitutions: SubstitutionOption[];
}

export interface RecipeCatalogItem {
  recipe_id: string; title_fa: string; title_en: string; category: string; region: string;
  main_protein: string; base: string; prep_min: number; cook_min: number; total_min: number;
  cost_tier: string; health_tags: string[]; allergens_or_notes: string;
  medical_caution: string; occasion: string; ingredient_keywords: string[]; quick_variation: string;
}

export interface RecommendationResponse {
  timestamp: string;
  top_recipe: Recipe;
  alternatives: Recipe[];
  ai_reasoning: string;
  excluded_count: number;
  available_count: number;
  recommendations?: ExplainableRecommendation[];
}

export interface AiActionDraft {
  action_type: string;
  description: string;
  payload: Record<string, any>;
  requires_confirmation: boolean;
}

export interface AiChatResponse {
  reply: string;
  draft_action?: AiActionDraft | null;
  provider?: string;
  model?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  draft_action?: AiActionDraft | null;
  timestamp: string;
  provider?: string;
  model?: string;
}

export interface AiStatusResponse {
  active_provider: string;
  active_model: string;
  gemini_configured: boolean;
  gemini_model: string;
  ollama_active: boolean;
  ollama_model: string;
  available_providers: string[];
}

export interface MealPlanDay {
  day: string;
  date: string;
  lunch: string;
  dinner: string;
  calories: number;
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  category: string;
  checked: boolean;
  estimated_price: number;
}

export interface StoreOffer {
  store_name: string;
  price: number;
  available: boolean;
  link: string;
}

export interface ItemStoreComparison {
  item_id: string;
  item_name: string;
  amount: string;
  category: string;
  okala: StoreOffer;
  digikala_jet: StoreOffer;
  snapp_market: StoreOffer;
  best_store: string;
}

export interface StoreInfo {
  name: string;
  slug?: string;
  total_price: number;
  delivery_time: string;
  delivery_fee: number;
  coverage_percent: number;
  link: string;
  bulk_buy_url?: string;
}

export interface StoreComparison {
  observed_time: string;
  stores: StoreInfo[];
  items?: ItemStoreComparison[];
}

export interface PeriodicPurchase {
  id: string;
  title: string;
  amount: string;
  interval_days: number;
  interval_label: string;
  next_due_days: number;
  is_ai_suggested: boolean;
  category: string;
  active: boolean;
}

export interface PantrySyncItem {
  shopping_item_id: string;
  shopping_name: string;
  needed_amount: string;
  pantry_name: string;
  pantry_quantity: number;
  pantry_unit: string;
}


export interface ReceiptItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  price: number;
  checked: boolean;
  expiry_days_left?: number;
}

export interface ReceiptScan {
  receipt_id: string;
  store_name: string;
  date: string;
  total_amount: number;
  items: ReceiptItem[];
}

export interface FamilyTask {
  id: string;
  title: string;
  assigned_to: string;
  reward_points: number;
  is_child_safe: boolean;
  completed: boolean;
}

export interface User {
  id: string;
  username: string;
  phone_number: string;
  full_name: string;
  role: 'super_admin' | 'admin' | 'member';
  is_active: boolean;
  created_at?: string;
}

export interface GeminiModelInfo {
  id: string;
  name: string;
  description: string;
  recommended: boolean;
  tier: string;
}

export interface GeminiModelsResponse {
  success: boolean;
  source: string;
  recommended_model: string;
  models: GeminiModelInfo[];
  message?: string;
  error?: string;
}
