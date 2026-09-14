import httpx
import json
import logging
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
        self.api_url_base = "https://generativelanguage.googleapis.com/v1beta/models"
        self.timeout = 15.0

    @property
    def api_key(self) -> str:
        return settings.gemini_api_key.strip()

    @property
    def model_name(self) -> str:
        return settings.gemini_model.strip() or "gemini-1.5-flash"

    def is_configured(self) -> bool:
        return bool(self.api_key and len(self.api_key) > 10)

    async def fetch_available_models(self, key_to_test: Optional[str] = None) -> Dict[str, Any]:
        """Fetch real-time list of available models from Google Gemini API and recommend the best one."""
        key = (key_to_test or self.api_key).strip()
        
        # Fallback curated models list if key is missing or network is offline
        default_models = [
            {
                "id": "gemini-2.5-flash",
                "name": "Gemini 2.5 Flash",
                "description": "نسل جدید و فوق‌سریع گوگل با تسلط عالی بر زبان فارسی و کمترین تاخیر (توصیه شده برای دستیار آشپزخانه)",
                "recommended": True,
                "tier": "پیشرفته و سریع"
            },
            {
                "id": "gemini-2.0-flash",
                "name": "Gemini 2.0 Flash",
                "description": "مدل چندوجهی با زمان پاسخ‌دهی آنی و دقت بالا در استخراج مواد اولیه",
                "recommended": False,
                "tier": "سریع"
            },
            {
                "id": "gemini-1.5-flash",
                "name": "Gemini 1.5 Flash",
                "description": "مدل پایدار و سبک برای کارهای روزمره و چت آشپزی",
                "recommended": False,
                "tier": "استاندارد"
            },
            {
                "id": "gemini-1.5-pro",
                "name": "Gemini 1.5 Pro",
                "description": "مدل قدرتمند برای استدلال‌های پیچیده و برنامه‌ریزی جامع رژیم‌های درمانی",
                "recommended": False,
                "tier": "استدلال عمیق"
            }
        ]

        if not key:
            return {
                "success": True,
                "source": "curated_fallback",
                "recommended_model": "gemini-2.5-flash",
                "models": default_models,
                "message": "مدل‌های استاندارد آماده (کلید API برای استعلام زنده لازم است)."
            }

        url = f"https://generativelanguage.googleapis.com/v1beta/models?key={key}"
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                res = await client.get(url)
                if res.status_code == 200:
                    data = res.json()
                    raw_models = data.get("models", [])
                    extracted = []
                    
                    for m in raw_models:
                        methods = m.get("supportedGenerationMethods", [])
                        if "generateContent" in methods:
                            clean_id = m.get("name", "").replace("models/", "")
                            display = m.get("displayName", clean_id)
                            desc = m.get("description", "")
                            
                            # Filter for relevant gemini chat/content models
                            if "gemini" in clean_id.lower() and not "embedding" in clean_id.lower():
                                is_rec = clean_id in ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"]
                                extracted.append({
                                    "id": clean_id,
                                    "name": display,
                                    "description": desc,
                                    "recommended": is_rec,
                                    "tier": "تولید محتوا و گفتگو"
                                })
                    
                    # Sort so recommended flash models appear first
                    extracted.sort(key=lambda x: (not x["recommended"], not "flash" in x["id"]))
                    
                    best = "gemini-2.5-flash" if any(x["id"] == "gemini-2.5-flash" for x in extracted) else (
                        extracted[0]["id"] if extracted else "gemini-1.5-flash"
                    )

                    return {
                        "success": True,
                        "source": "live_google_api",
                        "recommended_model": best,
                        "models": extracted if extracted else default_models,
                        "message": f"با موفقیت {len(extracted)} مدل فعال از سرور گوگل دریافت شد."
                    }
                else:
                    return {
                        "success": False,
                        "source": "curated_fallback",
                        "recommended_model": "gemini-2.5-flash",
                        "models": default_models,
                        "error": f"خطا در دریافت لیست مدل‌ها از گوگل (کد {res.status_code})"
                    }
        except Exception as e:
            logger.warning(f"Failed to fetch live Gemini models: {e}")
            return {
                "success": False,
                "source": "curated_fallback",
                "recommended_model": "gemini-2.5-flash",
                "models": default_models,
                "error": f"خطای اتصال به گوگل: {str(e)}"
            }

    async def validate_key(self, key_to_test: Optional[str] = None) -> Dict[str, Any]:
        """Test if the provided or stored Gemini API key is valid and working."""
        key = (key_to_test or self.api_key).strip()
        if not key:
            return {"valid": False, "error": "کلید API وارد نشده است."}

        url = f"{self.api_url_base}/{self.model_name}:generateContent?key={key}"
        payload = {
            "contents": [
                {"role": "user", "parts": [{"text": "سلام! فقط یک کلمه پاسخ بده: فعال"}]}
            ],
            "generationConfig": {"maxOutputTokens": 10}
        }
        try:
            async with httpx.AsyncClient(timeout=8.0) as client:
                res = await client.post(url, json=payload)
                if res.status_code == 200:
                    return {"valid": True, "model": self.model_name, "message": "اتصال به Google Gemini با موفقیت برقرار شد."}
                else:
                    try:
                        err_json = res.json()
                        err_msg = err_json.get("error", {}).get("message", res.text)
                    except Exception:
                        err_msg = res.text
                    return {"valid": False, "status_code": res.status_code, "error": f"خطای سرور گوگل ({res.status_code}): {err_msg}"}
        except Exception as e:
            return {"valid": False, "error": f"خطا در برقراری ارتباط شبکه با سرور Gemini: {str(e)}"}

    async def chat(self, user_message: str, current_page_context: str = "خانه") -> Optional[AiChatResponse]:
        """Send prompt to Google Gemini API and extract response + action draft."""
        if not self.is_configured():
            return None

        url = f"{self.api_url_base}/{self.model_name}:generateContent?key={self.api_key}"
        
        prompt_with_context = (
            f"موقعیت کاربر در اپلیکیشن: بخش {current_page_context}\n"
            f"پیام کاربر: {user_message}"
        )

        payload = {
            "system_instruction": {
                "parts": [{"text": GEMINI_SYSTEM_PROMPT}]
            },
            "contents": [
                {
                    "role": "user",
                    "parts": [{"text": prompt_with_context}]
                }
            ],
            "generationConfig": {
                "temperature": 0.6,
                "maxOutputTokens": 800,
            }
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(url, json=payload)
                if res.status_code != 200:
                    logger.warning(f"Gemini API returned status {res.status_code}: {res.text}")
                    return None

                data = res.json()
                candidates = data.get("candidates", [])
                if not candidates:
                    return None

                parts = candidates[0].get("content", {}).get("parts", [])
                full_text = "".join(p.get("text", "") for p in parts).strip()

                if not full_text:
                    return None

                # Extract action JSON block if Gemini generated one
                clean_reply, draft = self._extract_json_draft(full_text)

                # Fallback to heuristic action detection if Gemini didn't format JSON but meant to
                if not draft:
                    draft = self._detect_action_intent(user_message)

                if draft and "پیش‌نویس" not in clean_reply and "تأیید" not in clean_reply:
                    clean_reply += "\n\n⚠️ پیش‌نویس این تغییر آماده شد. برای ثبت نهایی، دکمه تأیید زیر را بزنید."

                return AiChatResponse(
                    reply=clean_reply,
                    draft_action=draft,
                    provider="gemini",
                    model=self.model_name
                )
        except Exception as e:
            logger.error(f"Error querying Gemini API: {e}")
            return None

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
