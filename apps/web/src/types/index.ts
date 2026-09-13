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
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  draft_action?: AiActionDraft | null;
  timestamp: string;
}
