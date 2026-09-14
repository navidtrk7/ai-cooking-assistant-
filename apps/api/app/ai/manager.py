import logging
from typing import Optional, Dict, Any, List
from apps.api.app.core.config import settings
from apps.api.app.schemas.schemas import AiChatResponse, AiStatusResponse, AiConfigUpdate
from apps.api.app.ai.gemini_adapter import gemini_service
from apps.api.app.ai.ollama_adapter import ollama_service

logger = logging.getLogger("ai_manager")

class AIManager:
    """
    Unified AI orchestrator supporting Google Gemini, Ollama local LLM,
    and instant rule-based fallback with automated failover.
    """

    async def get_status(self) -> AiStatusResponse:
        gemini_ok = gemini_service.is_configured()
        ollama_ok = await ollama_service.check_health()
        
        provider = settings.ai_provider
        active_provider = "heuristic"
        active_model = "local-rules"

        if provider in ["gemini", "auto"] and gemini_ok:
            active_provider = "gemini"
            active_model = settings.gemini_model
        elif provider in ["ollama", "auto"] and ollama_ok:
            active_provider = "ollama"
            active_model = settings.ollama_model
        elif gemini_ok:
            active_provider = "gemini"
            active_model = settings.gemini_model
        elif ollama_ok:
            active_provider = "ollama"
            active_model = settings.ollama_model

        available = []
        if gemini_ok:
            available.append("gemini")
        if ollama_ok:
            available.append("ollama")
        available.append("heuristic")

        return AiStatusResponse(
            active_provider=active_provider,
            active_model=active_model,
            gemini_configured=gemini_ok,
            gemini_model=settings.gemini_model,
            ollama_active=ollama_ok,
            ollama_model=settings.ollama_model,
            available_providers=available,
        )

    async def chat(self, user_message: str, current_page_context: str = "خانه") -> AiChatResponse:
        preferred = settings.ai_provider.lower()

        # 1. Try Gemini if preferred is gemini or auto
        if preferred in ["gemini", "auto"] and gemini_service.is_configured():
            try:
                gemini_res = await gemini_service.chat(user_message, current_page_context)
                if gemini_res:
                    return gemini_res
            except Exception as e:
                logger.warning(f"Gemini chat failed, falling back: {e}")

        # 2. Try Ollama if preferred is ollama or fallback from Gemini
        if preferred in ["ollama", "auto"] or not gemini_service.is_configured():
            try:
                ollama_res = await ollama_service.chat(user_message, current_page_context)
                # Check if ollama actually generated a response or used its internal fallback
                if ollama_res:
                    ollama_res.provider = "ollama"
                    ollama_res.model = settings.ollama_model
                    return ollama_res
            except Exception as e:
                logger.warning(f"Ollama chat failed, falling back: {e}")

        # 3. Final Heuristic fallback
        draft = gemini_service._detect_action_intent(user_message)
        heuristic_reply = ollama_service._fallback_response(user_message, current_page_context, draft)
        return AiChatResponse(
            reply=heuristic_reply,
            draft_action=draft,
            provider="heuristic",
            model="local-rules"
        )

    async def update_config(self, update: AiConfigUpdate) -> Dict[str, Any]:
        """Update runtime AI configurations."""
        if update.gemini_api_key is not None:
            settings.gemini_api_key = update.gemini_api_key.strip()
        if update.gemini_model is not None:
            settings.gemini_model = update.gemini_model.strip()
        if update.ai_provider is not None:
            settings.ai_provider = update.ai_provider.strip().lower()

        status = await self.get_status()
        return {
            "success": True,
            "message": "تنظیمات هوش مصنوعی با موفقیت بروزرسانی شد.",
            "status": status
        }

    async def test_gemini_connection(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        return await gemini_service.validate_key(api_key)

    async def get_gemini_models(self, api_key: Optional[str] = None) -> Dict[str, Any]:
        return await gemini_service.fetch_available_models(api_key)

ai_manager = AIManager()
