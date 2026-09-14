from pydantic import BaseModel
import os

class Settings(BaseModel):
    app_name: str = "دستیار آشپزخانه خانواده ایرانی (Iranian Family AI Cooking Assistant)"
    app_version: str = "1.0.0"
    api_prefix: str = "/api/v1"
    cors_origins: list[str] = ["*"]
    
    # Ollama Local AI Configuration
    ollama_base_url: str = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
    ollama_model: str = os.getenv("OLLAMA_MODEL", "gemma3:1b")
    ollama_fallback_model: str = os.getenv("OLLAMA_FALLBACK_MODEL", "qwen3-coder:30b")

    # Google Gemini AI Configuration (Default)
    gemini_api_key: str = os.getenv("GEMINI_API_KEY", "")
    # A safe first-run fallback. Once a key is connected, the app reads the
    # account's live model list and selects the newest compatible Flash model.
    gemini_model: str = os.getenv("GEMINI_MODEL", "gemini-3.6-flash")
    ai_provider: str = os.getenv("AI_PROVIDER", "gemini")  # 'gemini', 'ollama', 'auto'

settings = Settings()
