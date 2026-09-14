import httpx
import json
import logging
import re
import time
from typing import Optional, Dict, Any, List
from apps.api.app.core.config import settings
from apps.api.app.schemas.schemas import AiChatResponse, AiActionDraft

logger = logging.getLogger("gemini_adapter")

GEMINI_SYSTEM_PROMPT = """
شما «دستیار فوق‌هوشمند آشپزخانه خانواده ایرانی» هستید که با توانایی هوش مصنوعی Google Gemini پشتیبانی می‌شوید.
ویژگی‌ها و لحن شما:
۱. کاملاً مسلط بر فرهنگ غذایی ایرانی، چاشنی‌ها، ادویه‌جات (زعفران، زردچوبه، دارچین، هل، گلپر)، مصلحات غذایی، و پخت اصیل سنتی و مدرن ایرانی.
۲. پاسخ‌های شما گرم، احترام‌آمیز، خودمانی و در عین حال حرفه‌ای، دقیق، کاربردی و پرانرژی به زبان فارسی است.
۳. اولویت شما کمک به کدبانو و اعضای خانواده برای مدیریت بهینه مواد موجود در یخچال و فریزر، جلوگیری از فساد مواد غذایی و پیشنهاد بهترین غذاها است.
۴. دستورالعمل حساسیت‌ها و سلامت خانوار (فشار خون، آلرژی به بادمجان، باقلا یا گلوتن و ...) خط قرمز شماست و هرگز مواد آلرژی‌زا را پیشنهاد نمی‌کنید.
۵. «اصل ایمنی تغییرات»: اگر کاربر خواست چیزی به موجودی یخچال اضافه شود، در برنامه هفتگی ثبت گردد یا به لیست خرید برود، شما با کمال میل اقدام را تایید و تشریح می‌کنید، اما تایید نهایی را به کاربر می‌سپارید.

در انتهای پاسخ خود اگر کاربر تقاضای انجام عملیاتی داشت، می‌توانید یک بلوک JSON به شکل زیر برای ثبت پیش‌نویس (draft) اضافه کنید:
```json
{
  "action_type": "add_pantry" | "plan_meal" | "add_shopping",
  "description": "توضیح فارسی عمل",
  "payload": { ... }
}
```
اگر نیاز به هیچ عملیاتی نبود، هیچ بلوک json قرار ندهید.
"""

class GeminiAdapter:
    def __init__(self):
        self.api_url_base = "https://generativelanguage.googleapis.com/v1beta"
        self.timeout = 15.0
        self._models_cache: Dict[str, tuple[float, Dict[str, Any]]] = {}

    @property
    def api_key(self) -> str:
        return settings.gemini_api_key.strip()

    @property
    def model_name(self) -> str:
        return settings.gemini_model.strip() or "gemini-3.6-flash"

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 10)

    @staticmethod
    def _is_usable_chat_model(model_id: str, methods: List[str]) -> bool:
        blocked = ("embedding", "imagen", "tts", "audio", "robotics", "aqa", "bison")
        return ("gemini" in model_id
                and not any(part in model_id for part in blocked)
                and (not methods or "generateContent" in methods or "interactions" in methods))

    @staticmethod
    def _model_rank(model_id: str) -> tuple:
        """Prefer the newest stable standard Flash model (e.g. gemini-3.6-flash)."""
        match = re.search(r"gemini-(\d+)(?:\.(\d+))?", model_id)
        major = int(match.group(1)) if match and match.group(1) else 0
        minor = int(match.group(2)) if match and match.group(2) else 0
        is_flash = 1 if "flash" in model_id else 0
        is_stable = 0 if ("preview" in model_id or "experimental" in model_id) else 1
        is_lite = 0 if "lite" in model_id else 1
        return (major, minor, is_flash, is_stable, is_lite)

    async def fetch_available_models(self, key_to_test: Optional[str] = None) -> Dict[str, Any]:
        """Fetch real-time list of available models from Google Gemini API and recommend the best one."""
        key = (key_to_test or self.api_key).strip()
        
        default_models = [
            {
                "id": "gemini-3.6-flash",
                "name": "Gemini 3.6 Flash",
                "description": "جدیدترین و پرسرعت‌ترین مدل گوگل با تسلط عالی بر زبان فارسی (توصیه‌شده)",
                "recommended": True,
                "tier": "پیشرفته و سریع"
            },
            {
                "id": "gemini-3.5-flash",
                "name": "Gemini 3.5 Flash",
                "description": "گزینه جایگزین پایدار برای گفتگو و کارهای روزمره.",
                "recommended": False,
                "tier": "سریع"
            },
            {
                "id": "gemini-2.0-flash",
                "name": "Gemini 2.0 Flash",
                "description": "مدل سریع و چندوجهی گوگل.",
                "recommended": False,
                "tier": "استاندارد"
            },
            {
                "id": "gemini-1.5-flash",
                "name": "Gemini 1.5 Flash",
                "description": "مدل سبک برای مصارف عمومی.",
                "recommended": False,
                "tier": "استاندارد"
            }
        ]

        if not key:
            return {
                "success": True,
                "source": "curated_fallback",
                "recommended_model": "gemini-3.6-flash",
                "models": default_models,
                "message": "مدل‌های استاندارد آماده (کلید API برای استعلام زنده لازم است)."
            }

        cached = self._models_cache.get(key)
        if cached and time.monotonic() - cached[0] < 300:
            return cached[1]

        url = f"{self.api_url_base}/models?key={key}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url, headers={"x-goog-api-key": key})
                if res.status_code == 200:
                    data = res.json()
                    raw_models = data.get("models", [])
                    extracted = []
                    
                    for m in raw_models:
                        methods = m.get("supportedGenerationMethods", [])
                        clean_id = m.get("name", "").replace("models/", "")
                        display = m.get("displayName", clean_id)
                        desc = m.get("description", "")
                        
                        if self._is_usable_chat_model(clean_id.lower(), methods):
                            extracted.append({
                                "id": clean_id,
                                "name": display,
                                "description": desc,
                                "recommended": False,
                                "tier": "تولید محتوا و گفتگو"
                            })
                    
                    extracted.sort(key=lambda x: self._model_rank(x["id"]), reverse=True)
                    if extracted:
                        extracted[0]["recommended"] = True
                    best = extracted[0]["id"] if extracted else "gemini-3.6-flash"

                    result = {
                        "success": True,
                        "source": "live_google_api",
                        "recommended_model": best,
                        "models": extracted if extracted else default_models,
                        "message": f"با موفقیت {len(extracted)} مدل فعال از سرور گوگل دریافت شد."
                    }
                    self._models_cache[key] = (time.monotonic(), result)
                    return result
                else:
                    try:
                        err_json = res.json()
                        err_msg = err_json.get("error", {}).get("message", res.text)
                    except Exception:
                        err_msg = res.text
                    return {
                        "success": False,
                        "source": "curated_fallback",
                        "recommended_model": "gemini-3.6-flash",
                        "models": default_models,
                        "error": f"خطای سرور گوگل ({res.status_code}): {err_msg}"
                    }
        except Exception as e:
            logger.warning(f"Failed to fetch live Gemini models: {e}")
            return {
                "success": False,
                "source": "curated_fallback",
                "recommended_model": "gemini-3.6-flash",
                "models": default_models,
                "error": f"خطای اتصال به گوگل: {str(e)}"
            }

    async def _execute_prompt(self, key: str, model: str, prompt: str, timeout: float = 12.0) -> tuple[Optional[str], Optional[str]]:
        """
        Execute prompt via dual protocols:
        1) Google v1beta models.generateContent
        2) Google v1beta interactions API
        """
        last_error = ""
        headers = {"Content-Type": "application/json", "x-goog-api-key": key}

        # 1. Try generateContent
        url_gc = f"{self.api_url_base}/models/{model}:generateContent?key={key}"
        payload_gc = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.6,
                "maxOutputTokens": 800
            }
        }
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(url_gc, json=payload_gc, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    candidates = data.get("candidates", [])
                    if candidates:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        text = "".join(p.get("text", "") for p in parts).strip()
                        if text:
                            return text, None
                else:
                    try:
                        err_json = res.json()
                        last_error = err_json.get("error", {}).get("message", res.text)
                    except Exception:
                        last_error = res.text
        except Exception as e:
            last_error = str(e)

        # 2. Try Interactions API
        url_int = f"{self.api_url_base}/interactions"
        payload_int = {
            "model": model,
            "input": prompt
        }
        try:
            async with httpx.AsyncClient(timeout=timeout) as client:
                res = await client.post(url_int, json=payload_int, headers=headers)
                if res.status_code == 200:
                    data = res.json()
                    text = data.get("output_text", "").strip()
                    if not text:
                        for out in data.get("output", []):
                            for c in out.get("content", []):
                                text += c.get("text", "")
                        text = text.strip()
                    if text:
                        return text, None
                else:
                    try:
                        err_json = res.json()
                        last_error = err_json.get("error", {}).get("message", res.text)
                    except Exception:
                        last_error = res.text
        except Exception as e:
            last_error = str(e)

        return None, last_error

    async def validate_key(self, key_to_test: Optional[str] = None) -> Dict[str, Any]:
        """First read account-visible models, select the newest, then test."""
        key = (key_to_test or self.api_key).strip()
        if not key:
            return {"valid": False, "error": "کلید API وارد نشده است."}

        models_result = await self.fetch_available_models(key)
        if not models_result.get("success") or not models_result.get("recommended_model"):
            err_msg = models_result.get("error", "کلید API نامعتبر است یا هیچ مدل فعالی یافت نشد.")
            return {"valid": False, "error": err_msg}

        model = models_result["recommended_model"]
        
        # Test generation with the chosen model
        test_text, err = await self._execute_prompt(key, model, "سلام! فقط یک کلمه پاسخ بده: فعال", timeout=8.0)
        
        if test_text:
            if not key_to_test:
                settings.gemini_model = model
            return {
                "valid": True,
                "model": model,
                "recommended_model": model,
                "models": models_result["models"],
                "message": f"اتصال به Google Gemini با موفقیت برقرار شد. مدل به‌روز {model} فعال گردید."
            }
        
        # If generation failed on this model, check alternative models in the list
        for alt in models_result.get("models", [])[:3]:
            alt_id = alt["id"]
            if alt_id != model:
                alt_text, _ = await self._execute_prompt(key, alt_id, "سلام! فقط یک کلمه پاسخ بده: فعال", timeout=6.0)
                if alt_text:
                    if not key_to_test:
                        settings.gemini_model = alt_id
                    return {
                        "valid": True,
                        "model": alt_id,
                        "recommended_model": alt_id,
                        "models": models_result["models"],
                        "message": f"اتصال برقرار شد. مدل {alt_id} به عنوان مدل فعال انتخاب گردید."
                    }

        # If models list was retrieved from Google API, the key is authentic
        if models_result.get("source") == "live_google_api" and models_result.get("models"):
            if not key_to_test:
                settings.gemini_model = model
            return {
                "valid": True,
                "model": model,
                "recommended_model": model,
                "models": models_result["models"],
                "message": f"کلید API تایید شد و لیست مدل‌ها ({len(models_result['models'])} مدل) بارگذاری گردید."
            }

        return {"valid": False, "error": err or "خطا در برقراری ارتباط با مدل هوش مصنوعی گوگل."}

    async def _resolve_live_model(self) -> Optional[str]:
        live = await self.fetch_available_models()
        model_ids = {item["id"] for item in live.get("models", [])}
        recommended = live.get("recommended_model")
        if not model_ids:
            return settings.gemini_model or "gemini-3.6-flash"
        if self.model_name not in model_ids:
            settings.gemini_model = recommended or "gemini-3.6-flash"
        return settings.gemini_model

    async def chat(self, user_message: str, current_page_context: str = "خانه") -> Optional[AiChatResponse]:
        """Send prompt to Google Gemini API and extract response + action draft."""
        if not self.is_configured():
            return None

        model = await self._resolve_live_model()
        if not model:
            return None
        
        prompt_with_context = (
            f"{GEMINI_SYSTEM_PROMPT}\n\n"
            f"موقعیت کاربر در اپلیکیشن: بخش {current_page_context}\n"
            f"پیام کاربر: {user_message}"
        )

        full_text, err = await self._execute_prompt(self.api_key, model, prompt_with_context, timeout=self.timeout)
        if not full_text:
            logger.warning(f"Gemini generation returned empty or error: {err}")
            return None

        clean_reply, draft = self._extract_json_draft(full_text)

        if not draft:
            draft = self._detect_action_intent(user_message)

        if draft and "پیش‌نویس" not in clean_reply and "تأیید" not in clean_reply:
            clean_reply += "\n\n⚠️ پیش‌نویس این تغییر آماده شد. برای ثبت نهایی، دکمه تأیید زیر را بزنید."

        return AiChatResponse(
            reply=clean_reply,
            draft_action=draft,
            provider="gemini",
            model=model
        )

    def _extract_json_draft(self, text: str) -> (str, Optional[AiActionDraft]):
        """Check if Gemini returned a ```json ... ``` codeblock with an action draft."""
        draft = None
        clean_text = text
        if "```json" in text:
            try:
                parts = text.split("```json")
                pre_text = parts[0]
                json_part = parts[1].split("```")[0].strip()
                post_text = parts[1].split("```")[1] if len(parts[1].split("```")) > 1 else ""
                
                parsed = json.loads(json_part)
                if isinstance(parsed, dict) and "action_type" in parsed:
                    draft = AiActionDraft(
                        action_type=parsed.get("action_type", "add_pantry"),
                        description=parsed.get("description", "عملیات دستیار هوشمند"),
                        payload=parsed.get("payload", {}),
                        requires_confirmation=True
                    )
                    clean_text = (pre_text.strip() + "\n" + post_text.strip()).strip()
            except Exception as e:
                logger.debug(f"Could not parse json block from Gemini: {e}")

        return clean_text, draft

    def _detect_action_intent(self, text: str) -> Optional[AiActionDraft]:
        text_lower = text.strip()
        
        # Add to pantry intent
        is_pantry_add = ("اضافه" in text_lower or "بگذار" in text_lower or "بذار" in text_lower or "خریدیم" in text_lower) and \
                        ("یخچال" in text_lower or "انبار" in text_lower or "فریزر" in text_lower or "کابینت" in text_lower or "مواد" in text_lower)
        
        if is_pantry_add:
            clean_name = text_lower
            for phrase in ["به یخچال", "به انبار", "به فریزر", "اضافه کن", "بذار", "بگذار", "خریدیم", "لطفا", "لطفاً"]:
                clean_name = clean_name.replace(phrase, "")
            clean_name = clean_name.strip() or "ماده غذایی تازه"
            return AiActionDraft(
                action_type="add_pantry",
                description=f"افزودن «{clean_name}» به موجودی انبار/یخچال",
                payload={"name": clean_name, "category": "یخچال", "quantity": 1, "unit": "عدد", "expiry_days_left": 5},
                requires_confirmation=True
            )
            
        # Meal planning intent
        if any(w in text_lower for w in ["ناهار فردا", "شام امشب", "برنامه غذایی", "بذار برای", "تنظیم برنامه"]):
            return AiActionDraft(
                action_type="plan_meal",
                description="ثبت در برنامه‌ریز هفتگی غذا",
                payload={"day": "فردا", "meal": "ناهار", "recipe": "پیشنهاد برگزیده"},
                requires_confirmation=True
            )

        # Add to shopping list
        if any(w in text_lower for w in ["لیست خرید", "باید بخریم", "تموم شده", "خریداری شود"]):
            clean_item = text_lower
            for phrase in ["به لیست خرید اضافه کن", "به لیست خرید", "تموم شده", "باید بخریم"]:
                clean_item = clean_item.replace(phrase, "")
            clean_item = clean_item.strip() or "قلم مورد نیاز"
            return AiActionDraft(
                action_type="add_shopping",
                description=f"افزودن «{clean_item}» به لیست خرید هوشمند",
                payload={"item": clean_item, "category": "عمومی"},
                requires_confirmation=True
            )

        return None

gemini_service = GeminiAdapter()
