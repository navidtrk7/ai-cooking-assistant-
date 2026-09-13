import uuid
from typing import List
from fastapi import APIRouter, HTTPException
from apps.api.app.schemas.schemas import (
    Household, HealthPreferences, PantryItem, PantryCreate,
    Recipe, RecommendationFilter, RecommendationResponse,
    ChatMessage, AiChatResponse, AiActionDraft
)
from apps.api.app.data.seed_data import DEFAULT_HOUSEHOLD, INITIAL_PANTRY_ITEMS, INITIAL_RECIPES
from apps.api.app.ai.ollama_adapter import ollama_service
from apps.api.app.ai.recommender import recommender_engine

router = APIRouter()

# In-memory working state
household_db = DEFAULT_HOUSEHOLD
pantry_db: List[PantryItem] = INITIAL_PANTRY_ITEMS.copy()
recipes_db: List[Recipe] = INITIAL_RECIPES.copy()

# ----------------- SYSTEM HEALTH -----------------
@router.get("/health")
async def check_health():
    ollama_ok = await ollama_service.check_health()
    return {
        "status": "healthy",
        "ollama_active": ollama_ok,
        "active_models": [ollama_service.primary_model, ollama_service.fallback_model]
    }

# ----------------- HOUSEHOLD & HEALTH -----------------
@router.get("/household", response_model=Household)
async def get_household():
    return household_db

@router.put("/household/health", response_model=HealthPreferences)
async def update_health_preferences(prefs: HealthPreferences):
    household_db.health = prefs
    return household_db.health

# ----------------- PANTRY INVENTORY -----------------
@router.get("/pantry", response_model=List[PantryItem])
async def get_pantry():
    return pantry_db

@router.post("/pantry", response_model=PantryItem)
async def add_pantry_item(item_in: PantryCreate):
    new_item = PantryItem(
        id=f"p-{uuid.uuid4().hex[:6]}",
        name=item_in.name,
        category=item_in.category,
        quantity=item_in.quantity,
        unit=item_in.unit,
        expiry_days_left=item_in.expiry_days_left,
        is_expiring_soon=(item_in.expiry_days_left <= 3)
    )
    pantry_db.insert(0, new_item)
    return new_item

@router.delete("/pantry/{item_id}")
async def delete_pantry_item(item_id: str):
    global pantry_db
    before_len = len(pantry_db)
    pantry_db = [p for p in pantry_db if p.id != item_id]
    if len(pantry_db) == before_len:
        raise HTTPException(status_code=404, detail="مورد یافت نشد")
    return {"status": "deleted", "item_id": item_id}

# ----------------- RECIPES -----------------
@router.get("/recipes", response_model=List[Recipe])
async def list_recipes():
    return recipes_db

@router.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: str):
    recipe = next((r for r in recipes_db if r.id == recipe_id), None)
    if not recipe:
        raise HTTPException(status_code=404, detail="دستور پخت یافت نشد")
    return recipe

# ----------------- RECOMMENDATIONS -----------------
@router.post("/recommendations", response_model=RecommendationResponse)
async def get_recommendations(filters: RecommendationFilter = None):
    return recommender_engine.get_recommendations(pantry=pantry_db, filters=filters)

# ----------------- AI ASSISTANT & CHAT -----------------
@router.post("/assistant/chat", response_model=AiChatResponse)
async def chat_with_assistant(msg: ChatMessage, context: str = "خانه"):
    return await ollama_service.chat(user_message=msg.content, current_page_context=context)

@router.post("/assistant/confirm-action")
async def confirm_action(draft: AiActionDraft):
    """
    Executes a previously drafted AI action upon explicit human confirmation.
    """
    if draft.action_type == "add_pantry":
        p = draft.payload
        new_item = PantryItem(
            id=f"p-{uuid.uuid4().hex[:6]}",
            name=p.get("name", "ماده جدید"),
            category=p.get("category", "یخچال"),
            quantity=float(p.get("quantity", 1)),
            unit=p.get("unit", "عدد"),
            expiry_days_left=int(p.get("expiry_days_left", 5)),
            is_expiring_soon=False
        )
        pantry_db.insert(0, new_item)
        return {"success": True, "message": f"«{new_item.name}» با موفقیت به موجودی اضافه شد.", "item": new_item}

    return {"success": True, "message": "عملیات با تأیید شما ثبت شد."}
