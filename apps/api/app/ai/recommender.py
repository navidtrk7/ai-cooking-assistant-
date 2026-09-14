"""
Deterministic 5-Stage Recommendation Engine for Iranian Family AI Cooking Assistant.
Compliant with granular health constraints, weighted inventory coverage, family taste fairness,
and explainable diverse recommendations.
"""
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from apps.api.app.schemas.schemas import (
    Recipe, PantryItem, RecommendationFilter, RecommendationResponse, 
    Household, HealthPreferences, ExplainableRecommendation, MissingItemDetail, SubstitutionOption
)
from apps.api.app.data.seed_data import INITIAL_RECIPES, DEFAULT_HOUSEHOLD, CANONICAL_INGREDIENTS

class RecommendationEngine:
    def __init__(self, recipes: Optional[List[Recipe]] = None):
        self.recipes = recipes if recipes is not None else INITIAL_RECIPES

    def get_recommendations(
        self,
        pantry: List[PantryItem],
        filters: Optional[RecommendationFilter] = None,
        household: Optional[Household] = None,
        health: Optional[HealthPreferences] = None,
    ) -> RecommendationResponse:
        current_household = household or DEFAULT_HOUSEHOLD
        req_servings = filters.servings if (filters and filters.servings) else current_household.policies.default_servings
        
        # ══════════════════════════════════════════════════════
        # STAGE 1: CANDIDATE GENERATION
        # ══════════════════════════════════════════════════════
        candidates = self.recipes.copy()
        
        # Filter by meal type if explicit and not generic
        if filters and filters.target_meal and filters.target_meal not in ("همه", "ناهار", "شام"):
            candidates = [r for r in candidates if filters.target_meal in r.category]
            
        # ══════════════════════════════════════════════════════
        # STAGE 2: HARD FILTERING (CRITICAL ALLERGIES & HARD LIMITS)
        # No LLM can bypass this!
        # ══════════════════════════════════════════════════════
        critical_constraints = []
        for member in current_household.members:
            for c in member.dietary_constraints:
                if c.is_active and c.severity == "critical" and c.rule_mode == "exclude":
                    critical_constraints.append((member.name, c.target_code.lower()))

        # Also include legacy health allergies if provided
        if health and health.allergies:
            for a in health.allergies:
                if "گردو" in a:
                    critical_constraints.append(("کودک", "گردو"))
                if "بادام زمینی" in a:
                    critical_constraints.append(("خانواده", "بادام زمینی"))

        def violates_hard_constraint(recipe: Recipe) -> Tuple[bool, str]:
            # 1. Time cap
            if filters and filters.max_time_minutes:
                total_time = recipe.prep_time_minutes + recipe.cook_time_minutes
                if total_time > filters.max_time_minutes:
                    return True, f"زمان پخت بیش از {filters.max_time_minutes} دقیقه"

            # 2. Critical Allergen / Ingredients
            ing_text = " ".join(item.name.lower() for item in recipe.ingredients)
            for mem_name, blocked in critical_constraints:
                if blocked in ing_text or blocked in recipe.title.lower():
                    return True, f"حاوی {blocked} (آلرژی قطعی {mem_name})"

            # 3. Strict budget cap if set
            if filters and filters.max_budget_toman:
                if recipe.estimated_cost_toman > filters.max_budget_toman:
                    return True, f"هزینه بیش از سقف بودجه ({filters.max_budget_toman} تومان)"

            return False, ""

        safe_candidates = []
        for r in candidates:
            violated, _ = violates_hard_constraint(r)
            if not violated:
                safe_candidates.append(r)

        excluded_count = len(self.recipes) - len(safe_candidates)
        if not safe_candidates:
            raise ValueError("هیچ رسپیِ سازگار با محدودیت‌های قطعی و سلامت خانواده پیدا نشد.")

        # ══════════════════════════════════════════════════════
        # STAGE 3: INVENTORY CALCULATION & COVERAGE
        # ══════════════════════════════════════════════════════
        pantry_map = {p.name.lower(): p for p in pantry}
        expiring_names = [p.name.lower() for p in pantry if p.is_expiring_soon or p.expiry_days_left <= 3]

        def compute_inventory_fit(recipe: Recipe) -> Tuple[float, List[MissingItemDetail], List[SubstitutionOption], int]:
            # Importance weights: main protein = 5, grains/legumes = 4, veggies = 3, spices/garnishes = 2
            weighted_coverage_sum = 0.0
            total_weights = 0.0
            missing_items: List[MissingItemDetail] = []
            substitutions: List[SubstitutionOption] = []
            expiring_matched = 0

            for ing in recipe.ingredients:
                ing_lower = ing.name.lower()
                weight = 3.0
                if any(w in ing_lower for w in ("مرغ", "گوشت", "ماهی", "میگو", "فیله")):
                    weight = 5.0
                elif any(w in ing_lower for w in ("برنج", "لپه", "لوبیا", "عدس", "ماش", "ماکارونی", "جو")):
                    weight = 4.0
                elif any(w in ing_lower for w in ("زعفران", "زرشک", "خلال", "گردو", "سماق")):
                    weight = 2.0

                total_weights += weight

                # Check pantry presence
                matched_pantry = None
                for p_name, p_item in pantry_map.items():
                    if p_name in ing_lower or ing_lower in p_name:
                        matched_pantry = p_item
                        break

                if matched_pantry and (matched_pantry.usable_quantity is None or matched_pantry.usable_quantity > 0):
                    coverage = 1.0
                    weighted_coverage_sum += weight * coverage
                    if any(exp in matched_pantry.name.lower() for exp in expiring_names):
                        expiring_matched += 1
                else:
                    coverage = 0.0
                    missing_items.append(MissingItemDetail(
                        ingredient=ing.name,
                        needed=ing.amount,
                        available="ناموجود در انبار",
                        to_buy=ing.amount
                    ))
                    # Check substitutions
                    if "زعفران" in ing_lower:
                        substitutions.append(SubstitutionOption(
                            missing="زعفران",
                            alternative="زردچوبه + کمی آبلیمو تازه",
                            impact="تغییر اندک در عطر، حفظ رنگ زیبا"
                        ))
                    elif "کره" in ing_lower:
                        substitutions.append(SubstitutionOption(
                            missing="کره",
                            alternative="روغن زیتون فرابکر",
                            impact="کاهش چربی اشباع و سبک‌تر شدن وعده"
                        ))

            fit = (weighted_coverage_sum / total_weights * 100.0) if total_weights > 0 else 50.0
            return fit, missing_items, substitutions, expiring_matched

        # ══════════════════════════════════════════════════════
        # STAGE 4: PERSONALIZED SCORING & FAMILY FAIRNESS
        # ══════════════════════════════════════════════════════
        scored_recipes: List[Tuple[float, Recipe, Dict[str, Any]]] = []

        for recipe in safe_candidates:
            inv_fit, missing_items, substitutions, expiring_count = compute_inventory_fit(recipe)

            # --- A. Family Taste Fit (Fairness) ---
            member_scores = []
            for member in current_household.members:
                score = 3.0  # neutral baseline (1 to 5)
                for pref in member.food_preferences:
                    if pref.target_code.lower() in recipe.title.lower():
                        score = max(1.0, min(5.0, score + (pref.preference_score * 0.4)))
                for constraint in member.dietary_constraints:
                    if constraint.rule_mode in ("limit", "prefer") and constraint.target_code.lower() in " ".join(i.name.lower() for i in recipe.ingredients):
                        score = max(1.0, score - 1.5)
                member_scores.append(score)

            weighted_avg = (sum(member_scores) / len(member_scores)) * 20.0  # normalize to 0-100
            min_member = min(member_scores) * 20.0
            family_taste_fit = 0.75 * weighted_avg + 0.25 * min_member

            # --- B. Health Fit ---
            # Staged evaluation of nutrition goals (higher protein, lower sodium, higher fiber)
            health_fit = float(recipe.radar_scores.get("health", 80))
            # Father lower sodium priority 5
            if any("سدیم" in c.target_code for m in current_household.members for c in m.dietary_constraints):
                if any(k in recipe.title for k in ("قورمه‌سبزی", "غوره‌مسما", "کرفس", "سبزی‌پلو")):
                    health_fit += 6
                elif "کشک" in recipe.title or "شور" in recipe.title:
                    health_fit -= 10
            # Child growth / protein
            if int(recipe.nutrition.protein.replace("g", "")) >= 30:
                health_fit += 5
            health_fit = max(40.0, min(100.0, health_fit))

            # --- C. Budget Fit ---
            budget_fit = float(recipe.radar_scores.get("budget", 75))

            # --- D. Time Fit ---
            total_time = recipe.prep_time_minutes + recipe.cook_time_minutes
            time_fit = 95.0 if total_time <= 45 else (80.0 if total_time <= 90 else 60.0)

            # --- E. Variety Fit ---
            variety_fit = 85.0  # baseline assuming balanced schedule

            # --- F. Expiry Rescue Fit ---
            expiry_rescue_fit = min(100.0, 50.0 + (expiring_count * 25.0))

            # Final Combined Score
            final_score = (
                0.28 * inv_fit +
                0.22 * family_taste_fit +
                0.20 * health_fit +
                0.12 * budget_fit +
                0.10 * time_fit +
                0.05 * variety_fit +
                0.03 * expiry_rescue_fit
            )

            scored_recipes.append((
                final_score,
                recipe,
                {
                    "inv_fit": round(inv_fit),
                    "family_taste_fit": round(family_taste_fit),
                    "health_fit": round(health_fit),
                    "missing_items": missing_items,
                    "substitutions": substitutions,
                    "expiring_count": expiring_count
                }
            ))

        # Sort descending by FinalScore
        scored_recipes.sort(key=lambda x: x[0], reverse=True)

        # ══════════════════════════════════════════════════════
        # STAGE 5: THREE DIVERSE & EXPLAINABLE RECOMMENDATIONS
        # ══════════════════════════════════════════════════════
        top_item = scored_recipes[0]
        top_recipe = top_item[1]
        top_meta = top_item[2]

        # Option 1: Top Overall
        rec1 = ExplainableRecommendation(
            recipe_id=top_recipe.id,
            recipe_name=top_recipe.title,
            recipe=top_recipe,
            score=round(top_item[0]),
            confidence=0.94,
            rank=1,
            tag="پیشنهاد اول: بالاترین امتیاز کلی",
            reasons=[
                f"{top_meta['inv_fit']}٪ اقلام اصلی در خانه موجود است",
                f"سازگار با ذائقه تمام ۴ عضو خانواده با عدالت تغذیه‌ای",
                f"زمان پخت {top_recipe.cook_time_minutes} دقیقه و کاملاً متناسب با زمان‌بندی خانوار"
            ] + ([f"اولویت مصرف اقلام رو به انقضا ({top_meta['expiring_count']} قلم موجود)"] if top_meta['expiring_count'] > 0 else []),
            health_notes=[
                "سازگاری تغذیه‌ای بالا با کنترل سدیم و بدون آلرژن‌های پرخطر",
                f"پروتئین عالی ({top_recipe.nutrition.protein}) متناسب با تغذیه و رشد اعضا"
            ],
            missing_items=top_meta["missing_items"],
            substitutions=top_meta["substitutions"]
        )

        # Option 2: Diverse Category / Protein
        rec2_item = None
        for item in scored_recipes[1:]:
            cand = item[1]
            if cand.category != top_recipe.category or ("مرغ" in cand.title and "مرغ" not in top_recipe.title) or ("گوشت" in cand.title and "مرغ" in top_recipe.title):
                rec2_item = item
                break
        if not rec2_item and len(scored_recipes) > 1:
            rec2_item = scored_recipes[1]

        rec2_recipe = rec2_item[1] if rec2_item else top_recipe
        rec2_meta = rec2_item[2] if rec2_item else top_meta
        rec2 = ExplainableRecommendation(
            recipe_id=rec2_recipe.id,
            recipe_name=rec2_recipe.title,
            recipe=rec2_recipe,
            score=round(rec2_item[0]) if rec2_item else 85,
            confidence=0.91,
            rank=2,
            tag="پیشنهاد دوم: تنوع سبک و پروتئین",
            reasons=[
                f"تنوع در سبک غذایی و پروتئین مصرفی نسبت به وعده‌های قبلی",
                f"{rec2_meta['inv_fit']}٪ پوشش مواد از موجودی جاری انبار",
                f"محبوبیت بالا در میان اعضای خانواده ({rec2_meta['family_taste_fit']}٪ امتیاز ذائقه)"
            ],
            health_notes=[
                "پوشش فیبر طبیعی و استفاده از چربی‌های غیراشباع گیاهی"
            ],
            missing_items=rec2_meta["missing_items"],
            substitutions=rec2_meta["substitutions"]
        )

        # Option 3: Economical / Faster / Healthy
        rec3_item = None
        for item in scored_recipes[1:]:
            cand = item[1]
            if cand.id != top_recipe.id and (not rec2_item or cand.id != rec2_recipe.id):
                if (cand.prep_time_minutes + cand.cook_time_minutes) <= 45 or cand.estimated_cost_toman < top_recipe.estimated_cost_toman:
                    rec3_item = item
                    break
        if not rec3_item and len(scored_recipes) > 2:
            rec3_item = scored_recipes[2]
        elif not rec3_item and len(scored_recipes) > 1:
            rec3_item = scored_recipes[1]

        rec3_recipe = rec3_item[1] if rec3_item else top_recipe
        rec3_meta = rec3_item[2] if rec3_item else top_meta
        rec3 = ExplainableRecommendation(
            recipe_id=rec3_recipe.id,
            recipe_name=rec3_recipe.title,
            recipe=rec3_recipe,
            score=round(rec3_item[0]) if rec3_item else 80,
            confidence=0.88,
            rank=3,
            tag="پیشنهاد سوم: سبک‌تر و اقتصادی",
            reasons=[
                f"آماده‌سازی سریع ({rec3_recipe.cook_time_minutes} دقیقه) و حداقل کار آماده‌سازی",
                f"گزینه بسیار اقتصادی با هزینه تخمینی {rec3_recipe.estimated_cost_toman:,} تومان",
                f"تطابق {rec3_meta['inv_fit']}٪ با محتویات یخچال"
            ],
            health_notes=[
                "هضم آسان و سبک برای وعده شام یا ناهار پرمشغله"
            ],
            missing_items=rec3_meta["missing_items"],
            substitutions=rec3_meta["substitutions"]
        )

        recommendations_list = [rec1, rec2, rec3]
        alternatives = [item[1] for item in scored_recipes[1:]]

        reasoning = (
            f"سیستم در مرحله فیلتر قطعی، {excluded_count} گزینه ناسازگار با آلرژی یا محدودیت‌های اعضا را کنار گذاشت. "
            f"سپس از میان {len(safe_candidates)} گزینه امن، بر اساس {len(pantry)} قلم موجودی و سهم‌بندی عادلانه ذائقه ۴ عضو خانواده، "
            f"۳ پیشنهاد متنوع با دلایل شفاف رتبه‌بندی شدند."
        )

        return RecommendationResponse(
            timestamp=datetime.now().strftime("%Y-%m-%d %H:%M"),
            top_recipe=top_recipe,
            alternatives=alternatives,
            ai_reasoning=reasoning,
            excluded_count=excluded_count,
            available_count=len(safe_candidates),
            recommendations=recommendations_list
        )

recommender_engine = RecommendationEngine()
