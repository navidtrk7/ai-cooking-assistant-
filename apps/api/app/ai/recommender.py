from typing import List, Optional
from datetime import datetime
from apps.api.app.schemas.schemas import Recipe, PantryItem, RecommendationFilter, RecommendationResponse, HealthPreferences
from apps.api.app.data.seed_data import INITIAL_RECIPES, INITIAL_PANTRY_ITEMS, DEFAULT_HOUSEHOLD

class RecommendationEngine:
    def __init__(self):
        self.recipes = INITIAL_RECIPES

    def get_recommendations(
        self,
        pantry: List[PantryItem],
        filters: Optional[RecommendationFilter] = None,
        health: Optional[HealthPreferences] = None,
    ) -> RecommendationResponse:
        # These rules are intentionally deterministic. An LLM may explain a choice,
        # but it must never decide whether a hard health restriction can be ignored.
        allergen_aliases = {
            "بادام زمینی": ("بادام زمینی", "peanut"),
            "لاکتوز": ("شیر", "ماست", "پنیر", "کره", "کشک", "خامه", "لبنی"),
        }
        normalized_rules = " ".join((health.allergies if health else [])).lower()
        blocked_terms = tuple(
            alias for rule, aliases in allergen_aliases.items()
            if rule in normalized_rules for alias in aliases
        )

        def is_blocked(recipe: Recipe) -> bool:
            ingredients = " ".join(item.name.lower() for item in recipe.ingredients)
            return any(term in ingredients for term in blocked_terms)

        safe_recipes = [recipe for recipe in self.recipes if not is_blocked(recipe)]
        excluded_count = len(self.recipes) - len(safe_recipes)
        filtered = safe_recipes
        
        # 1. Filter by maximum preparation + cook time if specified
        if filters and filters.max_time_minutes:
            filtered = [r for r in filtered if (r.prep_time_minutes + r.cook_time_minutes) <= filters.max_time_minutes]
            
        # 2. Filter by budget if specified
        if filters and filters.max_budget_toman:
            filtered = [r for r in filtered if r.estimated_cost_toman <= filters.max_budget_toman]
            
        # Never fall back to an unsafe recipe. The caller must communicate that no
        # eligible recipe exists and invite the user to relax a non-health filter.
        if not filtered:
            raise ValueError("هیچ رسپیِ سازگار با محدودیت‌های قطعی خانواده پیدا نشد.")

        # 3. Dynamic scoring based on pantry expiry priority
        scored_recipes = []
        expiring_item_names = [p.name for p in pantry if p.is_expiring_soon or p.expiry_days_left <= 3]

        for rec in filtered:
            # Check how many ingredients match expiring items
            expiring_match_count = sum(
                1 for ing in rec.ingredients 
                if any(exp in ing.name or ing.name in exp for exp in expiring_item_names)
            )
            
            # Boost pantry match score if recipe saves expiring food
            effective_score = rec.pantry_match_percent + (expiring_match_count * 5)
            scored_recipes.append((effective_score, rec))

        # Sort descending by score
        scored_recipes.sort(key=lambda x: x[0], reverse=True)
        
        top_recipe = scored_recipes[0][1]
        alternatives = [item[1] for item in scored_recipes[1:]]

        reasoning = (
            f"غذاهای پیشنهادی بر اساس موجودی {len(pantry)} قلم در انبار و اولویت مصرف "
            f"{len(expiring_item_names)} قلم کالای رو به انقضا (مانند سبزیجات و مرغ تازه) انتخاب شده‌اند. "
            f"محدودیت‌های قطعی خانواده پیش از رتبه‌بندی اعمال شده‌اند؛ "
            f"{excluded_count} گزینه به علت ناسازگاری کنار گذاشته شد."
        )

        return RecommendationResponse(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
            top_recipe=top_recipe,
            alternatives=alternatives,
            ai_reasoning=reasoning,
            excluded_count=excluded_count,
            available_count=len(scored_recipes),
        )

recommender_engine = RecommendationEngine()
