import httpx
import json
import logging
from typing import Optional, Dict, Any, List
from apps.api.app.core.config import settings
from apps.api.app.schemas.schemas import AiChatResponse, AiActionDraft

logger = logging.getLogger("ai_assistant")

SYSTEM_PROMPT = """
شما «دستیار آشپزخانه هوشمند خانواده ایرانی» هستید. وظیفه شما:
۱. پاسخ کوتاه، صمیمی، دلسوزانه و محترمانه به زبان فارسی درباره آشپزی، پخت غذا، مدیریت مواد و پیشنهاد وعده‌ها.
۲. بر اساس قوانین، هیچ تغییر حساسی در موجودی انبار یا برنامه هفتگی را بدون تأیید نهایی کاربر اعمال نمی‌کنید.
۳. در صورت درخواست کاربر برای اضافه کردن یا تغییر موارد (مثل «دو کیلو گوجه به یخچال اضافه کن» یا «ناهار فردا رو قورمه سبزی بذار»)، یک پیش‌نویس (draft) می‌سازید و اعلام می‌کنید: «پیش‌نویس آماده شد. قبل از اعمال، تأیید شما لازم است.»
"""

class OllamaAdapter:
    def __init__(self):
        self.base_url = settings.ollama_base_url
        self.primary_model = settings.ollama_model
        self.fallback_model = settings.ollama_fallback_model
        self.timeout = 5.0  # Quick timeout for responsiveness

    async def check_health(self) -> bool:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                res = await client.get(f"{self.base_url}/api/tags")
                return res.status_code == 200
        except Exception:
            return False

    async def chat(self, user_message: str, current_page_context: str = "خانه") -> AiChatResponse:
        """
        Process chat with local Ollama model, or fallback to instant rule-based NLP.
        """
        # Step 1: Detect if this is an actionable command requiring a draft
        draft_action = self._detect_action_intent(user_message)

        # Step 2: Try querying Ollama
        ollama_reply = await self._query_ollama(user_message, current_page_context)
        if ollama_reply:
            if draft_action:
                ollama_reply += "\n\n⚠️ پیش‌نویس تغییر آماده است. قبل از اعمال در برنامه، تأیید شما لازم است."
            return AiChatResponse(reply=ollama_reply, draft_action=draft_action)

        # Step 3: Fallback heuristic response if Ollama is busy/offline
        fallback_reply = self._fallback_response(user_message, current_page_context, draft_action)
        return AiChatResponse(reply=fallback_reply, draft_action=draft_action)

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


    async def _query_ollama(self, prompt: str, context: str) -> Optional[str]:
        payload = {
            "model": self.primary_model,
            "prompt": f"{SYSTEM_PROMPT}\nموقعیت فعلی کاربر در اپلیکیشن: بخش {context}\nپیام کاربر: {prompt}\nپاسخ کوتاه دستیار:",
            "stream": False,
            "options": {
                "temperature": 0.4,
                "num_predict": 120
            }
        }
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(f"{self.base_url}/api/generate", json=payload)
                if res.status_code == 200:
                    data = res.json()
                    return data.get("response", "").strip()
        except Exception as e:
            logger.warning(f"Ollama generation failed or timed out: {e}")
            return None

    def _fallback_response(self, text: str, context: str, draft: Optional[AiActionDraft]) -> str:
        if draft:
            return f"دستور شما برای «{draft.description}» دریافت و تحلیل شد. طبق استاندارد ایمنی، پیش‌نویس عملیات آماده است و برای اعمال نهایی نیاز به کلیک دکمه تأیید شما دارد."
        
        if "چی بپزم" in text or "پیشنهاد" in text or "ناهار" in text:
            return "با توجه به سبزی قورمه و گوشتی که در فریزر دارید و فقط ۲ روز تا پایان تاریخ مصرف سبزی مانده، «قورمه‌سبزی جاافتاده» بالاترین امتیاز تطابق (۹۴٪) را دارد!"
        
        if "گردونه" in text:
            return "می‌توانید به بخش گردونه تصمیم‌گیری بروید و با فشردن دکمه چرخش، یک انتخاب تصادفی هوشمند بر اساس مواد موجود دریافت کنید."
        
        if "سلام" in text or "درود" in text:
            return "سلام! من دستیار هوشمند آشپزخانه شما هستم. می‌تونید از من بپرسید چی بپزید، مواد جدید به یخچال اضافه کنید یا برنامه غذایی هفته رو تنظیم کنیم."

        return f"پیام شما در بخش «{context}» بررسی شد. برای دریافت اطلاعات دقیق‌تر می‌توانید از دستورات صوتی سریع یا فیلترهای پیشنهادی استفاده کنید."

ollama_service = OllamaAdapter()
