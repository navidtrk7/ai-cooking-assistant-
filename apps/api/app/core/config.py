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

settings = Settings()
