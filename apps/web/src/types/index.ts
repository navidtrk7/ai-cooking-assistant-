export interface Member {
  id: string;
  name: string;
  role: string;
  avatar_color: string;
  avatar_char: string;
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
}

export interface PantryItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  expiry_days_left: number;
  is_expiring_soon: boolean;
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

export interface RecommendationResponse {
  timestamp: string;
  top_recipe: Recipe;
  alternatives: Recipe[];
  ai_reasoning: string;
  excluded_count: number;
  available_count: number;
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

export interface StoreInfo {
  name: string;
  total_price: number;
  delivery_time: string;
  delivery_fee: number;
  coverage_percent: number;
  link: string;
}

export interface StoreComparison {
  observed_time: string;
  stores: StoreInfo[];
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

