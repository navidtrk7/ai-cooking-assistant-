from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apps.api.app.core.config import settings
from apps.api.app.api.v1.routes import router as api_v1_router

app = FastAPI(
    title=settings.app_name,
    version=settings.app_version,
    description="سرویس هوشمند دستیار آشپزخانه خانواده ایرانی مبتنی بر FastAPI و Ollama",
    openapi_url=f"{settings.api_prefix}/openapi.json",
    docs_url=f"{settings.api_prefix}/docs",
    redoc_url=f"{settings.api_prefix}/redoc"
)

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include v1 routes
app.include_router(api_v1_router, prefix=settings.api_prefix)

@app.get("/")
async def root():
    return {
        "app": settings.app_name,
        "version": settings.app_version,
        "docs": f"{settings.api_prefix}/docs"
    }
