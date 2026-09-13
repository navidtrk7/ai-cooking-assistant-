# طراحی فنی برای Web Coding در Anti-Gravity

## معماری

Modular Monolith: یک API، یک پایگاه داده اصلی و Worker پس‌زمینه از یک کدبیس. این تصمیم برای MVP سرعت، سادگی Debug و قابلیت توسعه توسط Vibe Coding را متعادل می‌کند.

```text
React PWA
  ├─ Assistant UI / Offline Cache
  └─ REST API
       ├─ Identity & Household
       ├─ Pantry / Recipes / Planning
       ├─ Recommendation Rules
       ├─ Shopping / Retailer Adapter
       ├─ Import Worker
       └─ AI Gateway → Ollama یا Provider اختیاری
                         ↓
                    PostgreSQL
```

## Front-end

| حوزه | انتخاب |
|---|---|
| زبان | TypeScript |
| UI | React + Vite |
| مسیر | React Router |
| Style | Tailwind CSS + CSS Variables |
| State سرور | TanStack Query |
| فرم | React Hook Form + Zod |
| نمودار | Recharts |
| آفلاین | Dexie + IndexedDB + Vite PWA |
| تست | Vitest + Testing Library + Playwright |

### ساختار Front-end

```text
apps/web/src/
  app/            # Router, providers, theme
  features/       # assistant, pantry, recipes, planning, shopping
  components/ui/  # Button, Card, Badge, Sheet, Chart
  components/app/ # Sidebar, AssistantFab, VoiceBar
  lib/            # api-client, money, date, RTL utilities
  offline/        # outbox, sync, IndexedDB
```

### قواعد UI

- RTL از سطح `html` اعمال شود.
- Vazirmatn محلی و fallback مناسب.
- دکمه AI شناور در همه صفحات؛ Bottom Sheet وابسته به Context صفحه.
- Theme با CSS Variables و `data-theme`؛ نه کلاس‌های پراکنده.
- متن AI، Transcript و خطاها قابل انتخاب و کپی باشند.

## Back-end

| حوزه | انتخاب |
|---|---|
| API | FastAPI + Pydantic |
| Data | PostgreSQL + SQLAlchemy 2 + Alembic |
| Authentication | Session Cookie امن + Argon2 |
| Job | Worker مبتنی بر جدول Job در PostgreSQL |
| File | Storage Adapter خصوصی |
| AI | Provider Adapter برای Ollama و Provider ابری اختیاری |
| تست | pytest + httpx + Testcontainers یا PostgreSQL تست |

### ماژول‌ها

```text
apps/api/app/
  modules/
    identity/ households/ profiles/ health_rules/
    catalog/ recipes/ nutrition/ pantry/
    recommendations/ meal_plans/ cooking/
    shopping/ retailers/ imports/ reports/ notifications/
    ai_gateway/ audit/
```

## مدل داده کلیدی

| موجودیت | نکته طراحی |
|---|---|
| `households`, `memberships` | مرز مجوز داده |
| `health_rules`, `rule_versions` | منشأ و نسخه قاعده |
| `ingredients`, `ingredient_aliases` | مترادف فارسی و نگاشت استاندارد |
| `recipes`, `recipe_versions`, `recipe_items` | رسپی قابل بازتولید |
| `pantry_lots`, `stock_movements` | موجودی به‌صورت گردش، نه عدد مبهم |
| `planned_meals`, `stock_reservations` | جلوگیری از مصرف دوباره مواد رزرو‌شده |
| `recommendation_runs` | دلایل و ورودی رتبه‌بندی |
| `shopping_lists`, `purchases` | نیاز خرید در برابر کالای دریافتی |
| `price_observations` | قیمت همراه مکان و زمان مشاهده |
| `audit_events` | رویدادهای حساس |

## APIهای اولیه

```text
POST /api/v1/households
POST /api/v1/members/{id}/health-rules
POST /api/v1/pantry/lots
POST /api/v1/pantry/movements
POST /api/v1/recommendations
POST /api/v1/recommendations/{id}/spin
POST /api/v1/meal-plans
POST /api/v1/shopping-lists/generate
POST /api/v1/cooking-sessions
POST /api/v1/imports/receipts
POST /api/v1/assistant/parse
POST /api/v1/sync/push
GET  /api/v1/sync/pull
```

## امنیت و حریم خصوصی

- تمام Queryهای خصوصی باید `household_id` و مجوز عضویت را بررسی کنند.
- PostgreSQL RLS یک لایه دفاع دوم باشد.
- عملیات موجودی، ثبت فاکتور و پایان پخت باید `Idempotency-Key` داشته باشند.
- فایل‌ها خصوصی، محدود و پس از اعتبارسنجی ذخیره شوند.
- URL خارجی برای واردکردن رسپی در برابر SSRF محافظت شود.
- داده سلامت و کلیدهای Provider وارد Log عادی نشوند.

## استقرار

```text
Docker Compose
  caddy | web | api | worker | postgres | ollama(optional)
```

سه محیط مستقل: Development، Staging و Production. قبل از Production، Backup و بازیابی واقعی تست شوند.
