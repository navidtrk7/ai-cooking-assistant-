import React, { useState, useEffect, useRef } from 'react';
import { 
  Home, Compass, RotateCcw, BookOpen, Clock, Calendar, 
  Package, Settings, Mic, Send, Sparkles, Moon, Sun, 
  AlertCircle, ChevronRight, Play, Pause, 
  Check, Plus, Trash2, X, ShoppingCart, Store, Users, 
  BarChart3, Camera, CheckSquare, ArrowUpRight, Flame, 
  Heart, Award, Menu, Music, Volume2, Key, Cpu, Sliders, ExternalLink,
  ShieldCheck, UserCheck
} from 'lucide-react';
import { api } from './services/api';
import type { 
  PantryItem, Recipe, RecommendationResponse, ChatMessage, 
  MealPlanDay, ShoppingItem, StoreComparison, ReceiptScan, FamilyTask,
  AiStatusResponse, User, GeminiModelInfo, RecipeCatalogItem
} from './types';
import { AuthModal } from './components/auth/AuthModal';
import { AdminPanel } from './components/admin/AdminPanel';
import { LandingPage } from './components/public/LandingPage';
import { LoginPage } from './components/public/LoginPage';

export function App() {
  const [currentView, setCurrentView] = useState<string>('landing');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [ollamaActive, setOllamaActive] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<string>('۱۲:۳۰');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  // User Authentication State
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('cooking_user');
    if (saved) {
      try { return JSON.parse(saved); } catch {}
    }
    return null;
  });
  const [authModalOpen, setAuthModalOpen] = useState<boolean>(false);

  const handleUserLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('cooking_user', JSON.stringify(user));
    navigate('home');
  };

  const handleUserLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('cooking_user');
    showToast('از حساب کاربری خارج شدید.');
  };


  // Backend Data States
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [mealPlans, setMealPlans] = useState<MealPlanDay[]>([]);
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);
  const [storesData, setStoresData] = useState<StoreComparison | null>(null);
  const [familyTasks, setFamilyTasks] = useState<FamilyTask[]>([]);
  const [receiptData, setReceiptData] = useState<ReceiptScan | null>(null);
  const [recipeCatalog, setRecipeCatalog] = useState<RecipeCatalogItem[]>([]);
  const [catalogFilter, setCatalogFilter] = useState<string>('همه');
  const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

  // Servings Scaler state
  const [servingsCount, setServingsCount] = useState<number>(4);

  // Cooking Mode Timer state
  const [cookingTimer, setCookingTimer] = useState<number>(15 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);
  const [musicPlaying, setMusicPlaying] = useState<boolean>(false);
  const [musicSeconds, setMusicSeconds] = useState<number>(72);

  // Wheel State
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [wheelSpinning, setWheelSpinning] = useState<boolean>(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);

  // Pantry View State
  const [activePantryTab, setActivePantryTab] = useState<string>('همه');
  const [newPantryName, setNewPantryName] = useState<string>('');
  const [newPantryCategory, setNewPantryCategory] = useState<string>('یخچال');
  const [newPantryDays, setNewPantryDays] = useState<number>(4);


  // Voice Bar & Transcript State (سفر ۱)
  const [voiceRecording, setVoiceRecording] = useState<boolean>(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string>('');
  const [transcriptEditing, setTranscriptEditing] = useState<boolean>(false);
  const voiceRecognitionRef = useRef<any>(null);

  // AI Assistant Drawer State (سفر ۴)
  const [aiDrawerOpen, setAiDrawerOpen] = useState<boolean>(false);
  const [aiInput, setAiInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [showAiSettings, setShowAiSettings] = useState<boolean>(false);
  const [geminiKeyInput, setGeminiKeyInput] = useState<string>('');
  const [geminiModelInput, setGeminiModelInput] = useState<string>('gemini-3.6-flash');
  const [geminiModels, setGeminiModels] = useState<GeminiModelInfo[]>([]);
  const [providerChoice, setProviderChoice] = useState<string>('gemini');
  const [keyTesting, setKeyTesting] = useState<boolean>(false);
  const [keyTestResult, setKeyTestResult] = useState<{ valid: boolean; message?: string; error?: string } | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'سلام! من دستیار هوشمند آشپزخانه شما هستم. با قابلیت اتصال به Google Gemini و مدلهای محلی. هر سؤالی در مورد غذا، پخت، انبارداری و برنامه‌ریزی دارید در خدمتم.',
      timestamp: 'همین الان',
      provider: 'gemini',
      model: 'gemini-3.6-flash'
    }
  ]);


  // Onboarding Step State
  const [obStep, setObStep] = useState<number>(1);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Sync hash routing
  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash.replace(/^#\/?/, '').trim();
      if (hash) setCurrentView(hash);
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  const navigate = (view: string) => {
    setCurrentView(view);
    window.location.hash = view;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setMobileNavOpen(false);
  };

  // Clock updater
  useEffect(() => {
    const update = () => {
      const now = new Date();
      setCurrentTime(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);
    };
    update();
    const timer = setInterval(update, 30000);
    return () => clearInterval(timer);
  }, []);

  // Theme toggle
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  // Load all initial data from FastAPI backend
  useEffect(() => {
    const loadAll = async () => {
      try {
        const health = await api.getHealth();
        setOllamaActive(health.ollama_active);

        api.getAiStatus().then(st => {
          setAiStatus(st);
          setGeminiModelInput(st.gemini_model || 'gemini-3.6-flash');
        }).catch(() => {});

        const [pantryRes, recsRes, plansRes, shopRes, storesRes, tasksRes] = await Promise.all([
          api.getPantry().catch(() => []),
          api.getRecommendations().catch(() => null),
          api.getMealPlans().catch(() => []),
          api.getShoppingList().catch(() => []),
          api.getStoresComparison().catch(() => null),
          api.getFamilyTasks().catch(() => [])
        ]);

        setPantry(pantryRes);
        setRecommendations(recsRes);
        if (recsRes?.top_recipe) setSelectedRecipe(recsRes.top_recipe);
        setMealPlans(plansRes);
        setShoppingList(shopRes);
        setStoresData(storesRes);
        setFamilyTasks(tasksRes);
        api.getRecipeCatalog().then(result => setRecipeCatalog(result.items)).catch(() => undefined);
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    loadAll();
  }, []);

  // Cooking Timer logic
  useEffect(() => {
    let interval: any = null;
    if (timerRunning && cookingTimer > 0) {
      interval = setInterval(() => setCookingTimer(t => t - 1), 1000);
    } else if (cookingTimer === 0 && timerRunning) {
      setTimerRunning(false);
      showToast('⏰ زمان این مرحله پخت به پایان رسید!');
    }
    return () => clearInterval(interval);
  }, [timerRunning, cookingTimer]);

  useEffect(() => {
    if (!musicPlaying) return;
    const interval = setInterval(() => setMusicSeconds(seconds => (seconds + 1) % 240), 1000);
    return () => clearInterval(interval);
  }, [musicPlaying]);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Native browser speech recognition. Text input remains available when the
  // browser does not expose a speech engine (or when the user is offline).
  const handleVoiceMicToggle = () => {
    if (voiceRecording) {
      voiceRecognitionRef.current?.stop();
      setVoiceRecording(false);
      return;
    }
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setTranscriptEditing(true);
      showToast('مرورگر شما ورود صوتی را پشتیبانی نمی‌کند؛ متن فرمان را وارد کنید.');
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = 'fa-IR';
    recognition.interimResults = true;
    recognition.continuous = false;
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results).map((result: any) => result[0].transcript).join('');
      setVoiceTranscript(transcript);
      setTranscriptEditing(true);
    };
    recognition.onerror = () => showToast('دریافت گفتار ناموفق بود؛ می‌توانید متن را وارد کنید.');
    recognition.onend = () => { setVoiceRecording(false); setTranscriptEditing(true); };
    voiceRecognitionRef.current = recognition;
    setVoiceRecording(true);
    recognition.start();
  };

  // Submit Voice Query to AI
  const handleVoiceSubmit = () => {
    if (!voiceTranscript.trim()) return;
    setTranscriptEditing(false);
    setAiInput(voiceTranscript);
    setAiDrawerOpen(true);
  };

  // Spin Wheel Action
  const handleSpinWheel = () => {
    if (wheelSpinning) return;
    setWheelSpinning(true);
    setWheelResult(null);
    const randomDeg = 1440 + Math.floor(Math.random() * 360);
    setWheelRotation(prev => prev + randomDeg);
    setTimeout(() => {
      setWheelSpinning(false);
      // The wheel only receives the same server-approved candidates as the
      // recommendation cards; it cannot reintroduce a health-excluded recipe.
      const candidates = recommendations ? [recommendations.top_recipe, ...recommendations.alternatives] : [];
      const recipe = candidates[Math.floor(Math.random() * candidates.length)];
      if (!recipe) {
        showToast('گزینه مجاز برای گردونه پیدا نشد.');
        return;
      }
      setSelectedRecipe(recipe);
      const chosen = recipe.title;
      setWheelResult(chosen);
      showToast(`🎯 گردونه انتخاب کرد: ${chosen}`);
    }, 2500);
  };

  // Add item to pantry
  const handleAddPantry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPantryName.trim()) return;
    try {
      const added = await api.addPantryItem({
        name: newPantryName,
        category: newPantryCategory,
        quantity: 1,
        unit: 'عدد',
        expiry_days_left: newPantryDays
      });
      setPantry([added, ...pantry]);
      setNewPantryName('');
      showToast(`✓ «${added.name}» به موجودی انبار افزوده شد.`);
    } catch {
      showToast('خطا در ثبت کالا');
    }
  };

  // Delete item from pantry
  const handleDeletePantry = async (id: string, name: string) => {
    try {
      await api.deletePantryItem(id);
      setPantry(pantry.filter(p => p.id !== id));
      showToast(`«${name}» حذف شد.`);
    } catch {
      showToast('خطا در حذف کالا');
    }
  };

  // Finish Cooking Session (Idempotent Stock Deduction)
  const handleFinishCooking = async () => {
    if (!selectedRecipe) return;
    const sessionKey = `cook-${selectedRecipe.id}-${Date.now().toString().slice(0, 8)}`;
    try {
      const res = await api.finishCooking(selectedRecipe.id, sessionKey);
      showToast(`✓ ${res.message}`);
      // Refresh pantry
      const updated = await api.getPantry();
      setPantry(updated);
      navigate('home');
    } catch {
      showToast('خطا در ثبت پایان پخت');
    }
  };

  // Toggle Shopping item
  const handleToggleShopping = async (id: string) => {
    try {
      const updated = await api.toggleShoppingItem(id);
      setShoppingList(shoppingList.map(item => item.id === id ? updated : item));
    } catch {
      showToast('خطا در تغییر وضعیت قلم خرید');
    }
  };

  // Run Receipt Scanner (سفر ۲)
  const handleScanReceipt = async () => {
    showToast('🧾 در حال پردازش تصویر فاکتور با OCR…');
    try {
      const data = await api.scanReceipt();
      setReceiptData(data);
      showToast('✓ اقلام فاکتور با موفقیت استخراج شد.');
    } catch {
      showToast('خطا در خواندن فاکتور');
    }
  };

  // Confirm Receipt Items into Pantry
  const handleConfirmReceiptItems = async () => {
    if (!receiptData) return;
    try {
      const result = await api.confirmReceipt(receiptData);
      showToast(`✓ ${result.message}`);
      setPantry(await api.getPantry());
      setReceiptData(null);
      navigate('pantry');
    } catch {
      showToast('خطا در ثبت اقلام تأییدشده');
    }
  };

  const handleToggleReceiptItem = (id: string) => {
    setReceiptData(current => current ? {
      ...current,
      items: current.items.map(item => item.id === id ? { ...item, checked: !item.checked } : item)
    } : current);
  };

  // Open Recipe from Catalog
  const handleOpenCatalogRecipe = async (recipeId: string) => {
    try {
      const fullRecipe = await api.getRecipeById(recipeId);
      setSelectedRecipe(fullRecipe);
      navigate('recipe');
    } catch {
      showToast('خطا در بارگذاری اطلاعات دستور پخت');
    }
  };

  // AI Chat Submit
  const handleSendAi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim() || isAiLoading) return;

    const userText = aiInput.trim();
    setAiInput('');
    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: userText,
      timestamp: 'همین الان'
    };
    setChatMessages(prev => [...prev, userMsg]);
    setIsAiLoading(true);

    try {
      const res = await api.chatWithAssistant(userText, currentView);
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: res.reply,
        draft_action: res.draft_action,
        provider: res.provider,
        model: res.model,
        timestamp: 'همین الان'
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'متأسفانه در برقراری ارتباط با سرور هوش مصنوعی مشکلی پیش آمد.',
          timestamp: 'همین الان'
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // AI Configuration Handlers
  const handleTestGeminiKey = async () => {
    setKeyTesting(true);
    setKeyTestResult(null);
    try {
      const res = await api.testGeminiKey(geminiKeyInput.trim() || undefined);
      setKeyTestResult(res);
      if (res.valid && res.models?.length) {
        setGeminiModels(res.models);
        setGeminiModelInput(res.recommended_model || res.model || res.models[0].id);
        showToast('اتصال برقرار شد؛ مدل‌های قابل استفاده از حساب شما خوانده شدند.');
      }
    } catch {
      setKeyTestResult({ valid: false, error: 'خطا در ارتباط با سرور بک‌اند' });
    } finally {
      setKeyTesting(false);
    }
  };

  const handleSaveAiConfig = async () => {
    try {
      const res = await api.updateAiConfig({
        gemini_api_key: geminiKeyInput.trim() || undefined,
        gemini_model: geminiModelInput,
        ai_provider: providerChoice
      });
      if (!res?.success) {
        showToast(res?.message || 'تنظیمات ذخیره نشد.');
        return;
      }
      if (res?.status) {
        setAiStatus(res.status);
      }
      showToast('تنظیمات هوش مصنوعی با موفقیت ثبت و ذخیره شد.');
      setShowAiSettings(false);
    } catch {
      showToast('خطا در ذخیره تنظیمات هوش مصنوعی.');
    }
  };

  useEffect(() => {
    if (showAiSettings && geminiModels.length === 0) {
      api.getGeminiModels(geminiKeyInput.trim() || undefined).then(res => {
        if (res?.models?.length) {
          setGeminiModels(res.models);
          if (res.recommended_model && !geminiModelInput) {
            setGeminiModelInput(res.recommended_model);
          }
        }
      }).catch(() => {});
    }
  }, [showAiSettings]);


  // Confirm AI Action (Human-in-the-Loop)
  const handleConfirmAction = async (msgId: string, draft: any) => {
    try {
      const res = await api.confirmAction(draft);
      showToast(res.message);
      if (draft.action_type === 'add_pantry') {
        const updated = await api.getPantry();
        setPantry(updated);
      }
      if (draft.action_type === 'add_shopping') setShoppingList(await api.getShoppingList());
      if (draft.action_type === 'plan_meal') setMealPlans(await api.getMealPlans());
      setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, draft_action: null } : m));
    } catch {
      showToast('خطا در تأیید عملیات');
    }
  };

  const navItems = [
    { id: 'home', label: 'داشبورد خانه', icon: Home },
    ...(currentUser?.role === 'super_admin' ? [
      { id: 'admin', label: 'پنل مدیریت (نوید)', icon: ShieldCheck }
    ] : []),
    { id: 'recommend', label: 'پیشنهاد هوشمند غذا', icon: Compass },
    { id: 'catalog', label: 'فهرست غذاهای ایرانی', icon: BookOpen },
    { id: 'wheel', label: 'گردونه تصمیم‌گیری', icon: RotateCcw },
    { id: 'recipe', label: 'دستور پخت و جزئیات', icon: BookOpen },
    { id: 'cooking', label: 'جلسه آشپزی و تایمر', icon: Clock },
    { id: 'planner', label: 'برنامه‌ریز هفتگی', icon: Calendar },
    { id: 'pantry', label: 'انبار و موجودی یخچال', icon: Package },
    { id: 'receipt', label: 'ثبت و اسکن فاکتور', icon: Camera },
    { id: 'shopping', label: 'لیست خرید هوشمند', icon: ShoppingCart },
    { id: 'stores', label: 'مقایسه فروشگاه‌ها', icon: Store },
    { id: 'family', label: 'خانواده و تقسیم وظایف', icon: Users },
    { id: 'reports', label: 'گزارش‌ها و تحلیل بودجه', icon: BarChart3 },
    { id: 'settings', label: 'تنظیمات و سلامت', icon: Settings },
    { id: 'onboarding', label: 'مسیر آشنایی و ورود', icon: Heart },
  ];

  if (currentView === 'landing') {
    return <LandingPage onStart={() => navigate('home')} onLogin={() => navigate('login')} />;
  }
  if (currentView === 'login') {
    return <LoginPage onSuccess={handleUserLogin} onBack={() => navigate('landing')} />;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl', background: 'var(--bg)' }}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'var(--primary)',
          color: '#FFF',
          padding: '12px 22px',
          borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 2500,
          fontWeight: 700,
          fontSize: 13,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          animation: 'fadeIn 0.2s ease'
        }}>
          <Check size={16} />
          {toastMsg}
        </div>
      )}

      {/* Floating Action Button (FAB) on all pages */}
      <button 
        className="fab-ai"
        onClick={() => setAiDrawerOpen(true)}
        title="گفتگو با دستیار هوشمند آشپزخانه"
      >
        <Sparkles size={24} />
      </button>

      {/* SIDEBAR NAVIGATION */}
      <aside className="sidebar-desktop" style={{
        width: 'var(--sidebar-w)',
        background: 'var(--sidebar-bg)',
        color: '#E8F3EA',
        display: 'flex',
        flexDirection: 'column',
        padding: '20px 16px',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflowY: 'auto',
        borderLeft: '1px solid rgba(255,255,255,0.06)'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, padding: '0 8px' }}>
          <div style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#FFF'
          }}>
            <Sparkles size={22} />
          </div>
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 800, color: '#E8F3EA', lineHeight: 1.3 }}>دستیار آشپزخانه</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{
                width: 7,
                height: 7,
                borderRadius: '50%',
                background: ollamaActive ? '#34D399' : '#FBBF24'
              }} />
              <span style={{ fontSize: 10, color: '#8DB89E' }}>
                {ollamaActive ? 'Ollama AI فعال' : 'حالت لوکال'}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation List */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
          {navItems.map(item => {
            const Icon = item.icon;
            const active = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigate(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '9px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: 'none',
                  background: active ? 'var(--sidebar-active)' : 'transparent',
                  color: active ? '#FFF' : '#C5DAC9',
                  fontWeight: active ? 700 : 500,
                  fontSize: 12.5,
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'all 0.15s'
                }}
              >
                <Icon size={16} opacity={active ? 1 : 0.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer with Theme Switcher and Profile */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: 14, marginTop: 14 }}>
          
          {/* Theme switcher */}
          <div style={{
            display: 'flex',
            gap: 4,
            background: 'rgba(255,255,255,0.06)',
            borderRadius: 'var(--radius-pill)',
            padding: 3,
            marginBottom: 12
          }}>
            <button
              onClick={() => { setTheme('light'); document.documentElement.dataset.theme = 'light'; }}
              style={{
                flex: 1,
                border: 'none',
                background: theme === 'light' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: theme === 'light' ? '#FFF' : '#8DB89E',
                borderRadius: 'var(--radius-pill)',
                padding: '4px 0',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <Sun size={12} /> روز
            </button>
            <button
              onClick={() => { setTheme('dark'); document.documentElement.dataset.theme = 'dark'; }}
              style={{
                flex: 1,
                border: 'none',
                background: theme === 'dark' ? 'rgba(255,255,255,0.15)' : 'transparent',
                color: theme === 'dark' ? '#FFF' : '#8DB89E',
                borderRadius: 'var(--radius-pill)',
                padding: '4px 0',
                fontSize: 11,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 4
              }}
            >
              <Moon size={12} /> شب
            </button>
          </div>

          {/* Profile Card */}
          <div 
            onClick={() => setAuthModalOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255,255,255,0.05)',
              cursor: 'pointer',
              transition: 'background 0.2s'
            }}
            title="کلیک برای مدیریت حساب کاربری یا ورود"
          >
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: currentUser?.role === 'super_admin' ? 'var(--primary)' : 'var(--apricot)',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 14
            }}>
              {currentUser?.full_name ? currentUser.full_name.charAt(0) : 'ن'}
            </div>
            <div style={{ flex: 1, overflow: 'hidden' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#E8F3EA', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {currentUser?.full_name || 'ورود به حساب'}
              </div>
              <div style={{ fontSize: 10, color: '#8DB89E' }}>
                {currentUser?.role === 'super_admin' ? 'مدیر ارشد سیستم' : currentUser ? 'عضو خانواده' : 'مهمان'}
              </div>
            </div>
            {currentUser ? (
              <span style={{
                fontSize: 9,
                fontWeight: 700,
                background: currentUser.role === 'super_admin' ? 'var(--apricot)' : 'linear-gradient(135deg, #C8B8E8, #A99AD0)',
                color: '#FFF',
                padding: '2px 6px',
                borderRadius: 'var(--radius-pill)'
              }}>
                {currentUser.role === 'super_admin' ? 'ادمین' : 'کاربر'}
              </span>
            ) : (
              <span style={{ fontSize: 10, color: 'var(--primary)', fontWeight: 700 }}>ورود</span>
            )}
          </div>

        </div>
      </aside>

      {/* Mobile navigation: four frequent actions plus a full menu. */}
      <nav className="mobile-bottom-bar" aria-label="ناوبری موبایل">
        {[
          { id: 'home', label: 'خانه', icon: Home },
          { id: 'recommend', label: 'غذا', icon: Compass },
          { id: 'shopping', label: 'خرید', icon: ShoppingCart },
          { id: 'planner', label: 'برنامه', icon: Calendar },
        ].map(item => {
          const Icon = item.icon;
          return <button key={item.id} className={currentView === item.id ? 'active' : ''} onClick={() => navigate(item.id)}><Icon size={19}/><span>{item.label}</span></button>;
        })}
        <button className={mobileNavOpen ? 'active' : ''} onClick={() => setMobileNavOpen(v => !v)}><Menu size={19}/><span>بیشتر</span></button>
      </nav>
      {mobileNavOpen && <div className="mobile-menu-sheet">
        {navItems.filter(item => !['home', 'recommend', 'shopping', 'planner'].includes(item.id)).map(item => {
          const Icon = item.icon;
          return <button key={item.id} onClick={() => navigate(item.id)}><Icon size={18}/>{item.label}</button>;
        })}
      </div>}

      {/* MAIN CONTENT AREA */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* TOPBAR WITH SHAMSI DATE, CLOCK AND VOICE HERO BAR */}
        <header className="app-header" style={{
          background: 'var(--surface)',
          borderBottom: '1px solid var(--border)',
          padding: '14px 32px',
          display: 'flex',
          flexDirection: 'column',
          gap: 12
        }}>
          {/* Top Info row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>شنبه، ۲۴ شهریور ۱۴۰۳</span>
                <span>•</span>
                <span>ساعت {currentTime}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {/* User Account Button */}
              <button 
                onClick={() => setAuthModalOpen(true)}
                title="مدیریت حساب کاربری و ورود"
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  padding: '4px 10px', 
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border)',
                  background: 'var(--surface-2)',
                  cursor: 'pointer'
                }}
              >
                <div style={{
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: currentUser?.role === 'super_admin' ? 'var(--primary)' : 'var(--muted)',
                  color: '#fff',
                  fontSize: 11,
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  {currentUser ? currentUser.full_name.charAt(0) : <UserCheck size={12} />}
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>
                  {currentUser ? currentUser.full_name.split(' ')[0] : 'ورود'}
                </span>
                {currentUser?.role === 'super_admin' && (
                  <span style={{ fontSize: 9, background: 'var(--apricot)', color: '#fff', padding: '1px 5px', borderRadius: 8, fontWeight: 800 }}>
                    ادمین
                  </span>
                )}
              </button>

              <button 
                className="btn btn-ghost btn-sm" 
                onClick={toggleTheme}
                title="تغییر حالت شب و روز"
                style={{ padding: '6px 10px', borderRadius: 'var(--radius-pill)' }}
              >
                {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <div className="wave-bars">
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
                <div className="wave-bar" />
              </div>
              <button 
                className="btn btn-primary btn-pill btn-sm"
                onClick={() => setAiDrawerOpen(true)}
                style={{ gap: 6 }}
              >
                <Sparkles size={14} />
                <span>دستیار هوش مصنوعی</span>
              </button>
            </div>
          </div>

          {/* Voice Search Hero Bar (سفر ۱) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-pill)',
            padding: '6px 14px'
          }}>
            <button
              onClick={handleVoiceMicToggle}
              style={{
                border: 'none',
                background: voiceRecording ? 'var(--danger)' : 'var(--primary)',
                color: '#FFF',
                width: 32,
                height: 32,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                flexShrink: 0
              }}
              title="ورود فرمان صوتی"
            >
              <Mic size={16} />
            </button>

            <input 
              type="text"
              placeholder={voiceRecording ? '🎙 در حال گوش دادن به گفتار شما…' : 'به دستیار آشپزخانه بگو: «برای ۶ نفر مهمان دارم، مرغ و برنج هست و غذای کم‌نمک می‌خواهم»...'}
              value={voiceTranscript}
              onChange={(e) => setVoiceTranscript(e.target.value)}
              style={{
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: 13,
                width: '100%',
                color: 'var(--text)'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleVoiceSubmit();
              }}
            />

            {transcriptEditing && (
              <button 
                className="btn btn-primary btn-sm btn-pill"
                onClick={handleVoiceSubmit}
                style={{ fontSize: 11, padding: '4px 12px' }}
              >
                تأیید و جست‌وجو
              </button>
            )}
          </div>
        </header>

        {/* Dynamic Page Views */}
        <div className="app-content" style={{ padding: '28px 32px', flex: 1 }}>

          {/* ════════════════════════════════════════════════════
              0. VIEW: SUPER ADMIN PANEL
             ════════════════════════════════════════════════════ */}
          {currentView === 'admin' && (
            <AdminPanel
              currentUser={currentUser}
              onClose={() => navigate('home')}
              onLogout={handleUserLogout}
              showToast={showToast}
            />
          )}

          {/* ════════════════════════════════════════════════════
              1. VIEW: DASHBOARD HOME
             ════════════════════════════════════════════════════ */}
          {currentView === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Greeting */}
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)' }}>
                  سلام نوید عزیز، امروز چی بپزیم؟ 🍲
                </h1>
                <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
                  بر اساس موجودی انبار، ۴ قلم کالای رو به انقضا و رژیم کم‌نمک خانوار، تصمیم‌های امروز آماده است.
                </p>
              </div>

              {/* Main 2-Column Dashboard Grid */}
              <div className="dashboard-grid">
                
                {/* Left Column: Top Recommendation & Weekly Snapshot */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Card 1: Today's Top Suggestion */}
                  {recommendations?.top_recipe && (
                    <div className="card" style={{ border: '2px solid var(--primary-light-2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className="badge badge-success">پیشنهاد برگزیده هوش مصنوعی</span>
                        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>
                          {recommendations.top_recipe.pantry_match_percent}٪ تطابق
                        </span>
                      </div>

                      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '12px 0 6px' }}>
                        {recommendations.top_recipe.title}
                      </h2>

                      <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
                        {recommendations.top_recipe.match_reasons[0]}
                      </p>

                      <div style={{ display: 'flex', gap: 16, marginTop: 14, fontSize: 12, color: 'var(--muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={14} /> پخت: {recommendations.top_recipe.cook_time_minutes} دقیقه
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Flame size={14} /> کالری: {recommendations.top_recipe.nutrition.calories} کیلوکالری
                        </span>
                        <span>هزینه تخمینی: {recommendations.top_recipe.estimated_cost_toman.toLocaleString('fa-IR')} تومان</span>
                      </div>

                      <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                        <button 
                          className="btn btn-primary"
                          style={{ flex: 1 }}
                          onClick={() => {
                            setSelectedRecipe(recommendations.top_recipe);
                            navigate('recipe');
                          }}
                        >
                          مشاهده دستور پخت کامل
                        </button>
                        <button 
                          className="btn btn-secondary"
                          onClick={() => {
                            setSelectedRecipe(recommendations.top_recipe);
                            navigate('cooking');
                          }}
                        >
                          ورود به پخت با تایمر
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Card 2: Weekly Plan Snapshot */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Calendar size={18} color="var(--primary)" />
                        برنامه غذایی هفته در یک نگاه
                      </h3>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate('planner')}>
                        مشاهده کامل تقویم <ChevronRight size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
                      {mealPlans.slice(0, 4).map((plan, i) => (
                        <div key={i} style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>{plan.day} ({plan.date})</div>
                          <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{plan.lunch}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>شام: {plan.dinner}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 3: Store Price Highlights (سفر ۳) */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Store size={18} color="var(--apricot)" />
                        مقایسه زنده قیمت فروشگاه‌ها
                      </h3>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate('stores')}>
                        جزئیات <ChevronRight size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10 }}>
                      {storesData?.stores.map((s, i) => (
                        <div key={i} style={{ border: '1px solid var(--border)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                          <div style={{ fontSize: 12, fontWeight: 700 }}>{s.name}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--primary)', marginTop: 4 }}>
                            {s.total_price.toLocaleString('fa-IR')} ت
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>ارسال: {s.delivery_time}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                </div>

                {/* Right Column: Pantry Expiry Alerts & Family Chores */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  
                  {/* Card 4: Expiry Alerts */}
                  <div className="card" style={{ borderRight: '4px solid var(--apricot)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                      <AlertCircle size={18} color="var(--apricot)" />
                      <h3 style={{ fontSize: 15, fontWeight: 700 }}>هشدار مواد رو به انقضا</h3>
                    </div>
                    <p style={{ fontSize: 12, color: 'var(--text-2)', marginBottom: 12 }}>
                      این اقلام در ۲ الی ۳ روز آینده منقضی می‌شوند و باید در اولویت مصرف قرار گیرند:
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {pantry.filter(p => p.is_expiring_soon || p.expiry_days_left <= 3).slice(0, 4).map(item => (
                        <div key={item.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 12px',
                          background: 'var(--apricot-light)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700 }}>{item.name}</span>
                          <span className="badge badge-warning">{item.expiry_days_left} روز باقیمانده</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 5: Family Tasks Leaderboard (M08) */}
                  <div className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <Award size={18} color="var(--lavender)" />
                        وظایف امروز آشپزخانه
                      </h3>
                      <button className="btn btn-ghost btn-sm" onClick={() => navigate('family')}>
                        مدیریت <ChevronRight size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {familyTasks.slice(0, 3).map(task => (
                        <div key={task.id} style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px 10px',
                          background: 'var(--surface-2)',
                          borderRadius: 'var(--radius-sm)'
                        }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700 }}>{task.title}</div>
                            <div style={{ fontSize: 10, color: 'var(--muted)' }}>مسئول: {task.assigned_to}</div>
                          </div>
                          <span className="badge badge-ai">+{task.reward_points} امتیاز</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Card 6 & 7: Quick Launchers */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div 
                      className="card" 
                      style={{ cursor: 'pointer', textAlign: 'center', padding: 16 }}
                      onClick={() => navigate('wheel')}
                    >
                      <div style={{ fontSize: 28, marginBottom: 4 }}>🎯</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>گردونه تصمیم</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>انتخاب شانسی</div>
                    </div>

                    <div 
                      className="card" 
                      style={{ cursor: 'pointer', textAlign: 'center', padding: 16 }}
                      onClick={() => navigate('receipt')}
                    >
                      <div style={{ fontSize: 28, marginBottom: 4 }}>🧾</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>اسکن فاکتور</div>
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>ورود با OCR</div>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          )}

          {/* 1.5. VIEW: IRANIAN RECIPE CATALOG */}
          {currentView === 'catalog' && (
            <div style={{ maxWidth: 1120, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div><h1 style={{ fontSize: 24, fontWeight: 800 }}>فهرست غذاهای ایرانی</h1><p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 5 }}>کاتالوگ اولیه شامل {recipeCatalog.length.toLocaleString('fa-IR')} غذا، با زمان، هزینه، مواد کلیدی و هشدارهای اولیه.</p></div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>{['همه', ...Array.from(new Set(recipeCatalog.map(item => item.category)))].map(category => <button key={category} className={`chip ${catalogFilter === category ? 'active' : ''}`} onClick={() => setCatalogFilter(category)}>{category}</button>)}</div>
              <div className="catalog-grid">{recipeCatalog.filter(item => catalogFilter === 'همه' || item.category === catalogFilter).map(item => <article className="card catalog-card" key={item.recipe_id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span className="badge badge-success">{item.category}</span><span style={{ fontSize: 11, color: 'var(--muted)' }}>{item.region}</span></div>
                <h2 style={{ fontSize: 17, margin: '12px 0 6px' }}>{item.title_fa}</h2><p style={{ color: 'var(--text-2)', fontSize: 12 }}>{item.main_protein} • {item.base}</p>
                <div className="catalog-meta"><span>⏱ {item.total_min.toLocaleString('fa-IR')} دقیقه</span><span>{item.cost_tier}</span><span>{item.occasion}</span></div>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 }}>{item.health_tags.map(tag => <span className="catalog-tag" key={tag}>{tag}</span>)}</div>
                {item.allergens_or_notes !== 'ندارد' && <p className="catalog-note">هشدار: {item.allergens_or_notes}</p>}
                <button
                  onClick={() => handleOpenCatalogRecipe(item.recipe_id)}
                  style={{
                    marginTop: 14,
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: 10,
                    border: '1px solid var(--primary)',
                    background: 'var(--primary-light)',
                    color: 'var(--primary)',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  مشاهده دستور پخت و ارزش غذایی <ChevronRight size={14} />
                </button>
              </article>)}</div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              2. VIEW: RECOMMENDATIONS
             ════════════════════════════════════════════════════ */}
          {currentView === 'recommend' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>موتور پیشنهاد هوشمند غذا</h1>
                <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
                  {recommendations?.ai_reasoning}
                </p>
                {recommendations && recommendations.available_count < 3 && (
                  <p style={{ color: 'var(--muted)', fontSize: 12, marginTop: 6 }}>
                    فعلاً {recommendations.available_count.toLocaleString('fa-IR')} گزینه مجاز داریم؛ برای پیشنهادهای بیشتر باید رسپی‌های سازگار دیگری اضافه شود.
                  </p>
                )}
              </div>

              {/* Filters row */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <span className="chip active">همه زمان‌ها</span>
                <span className="chip">سریع (زیر ۳۰ دقیقه)</span>
                <span className="chip">اقتصادی (زیر ۱۰۰ هزار تومان)</span>
                <span className="chip">بدون سرخ‌کردنی عمیق</span>
                <span className="chip">کم‌نمک (فشار خون)</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {recommendations?.top_recipe && (
                  <div className="card" style={{ border: '2px solid var(--primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className="badge badge-success">رتبه ۱ (بهترین تطابق)</span>
                      <span style={{ fontWeight: 800, color: 'var(--primary)', fontSize: 16 }}>
                        {recommendations.top_recipe.pantry_match_percent}٪
                      </span>
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 800 }}>{recommendations.top_recipe.title}</h3>
                    <p style={{ fontSize: 12.5, color: 'var(--text-2)', margin: '8px 0 16px', lineHeight: 1.6 }}>
                      {recommendations.top_recipe.match_reasons[0]}
                    </p>

                    {/* Radar Dimension Scores */}
                    <div style={{ background: 'var(--surface-2)', padding: 12, borderRadius: 'var(--radius-sm)', marginBottom: 16 }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', marginBottom: 6 }}>شاخص‌های ۵ محوره راداری:</div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 6, fontSize: 11.5 }}>
                        <div>انبار: {recommendations.top_recipe.radar_scores.pantry}٪</div>
                        <div>سلامت: {recommendations.top_recipe.radar_scores.health}٪</div>
                        <div>سرعت: {recommendations.top_recipe.radar_scores.speed}٪</div>
                        <div>اقتصادی: {recommendations.top_recipe.radar_scores.budget}٪</div>
                      </div>
                    </div>

                    <button 
                      className="btn btn-primary"
                      style={{ width: '100%' }}
                      onClick={() => {
                        setSelectedRecipe(recommendations.top_recipe);
                        navigate('recipe');
                      }}
                    >
                      مشاهده جزئیات کامل و مقیاس سهم‌ها
                    </button>
                  </div>
                )}

                {recommendations?.alternatives.map(rec => (
                  <div key={rec.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span className="badge badge-ai">گزینه جایگزین</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>{rec.pantry_match_percent}٪ تطابق</span>
                    </div>

                    <h3 style={{ fontSize: 18, fontWeight: 800 }}>{rec.title}</h3>
                    <p style={{ fontSize: 12, color: 'var(--muted)', margin: '6px 0 14px' }}>
                      زمان پخت: {rec.cook_time_minutes} دقیقه • هزینه: {rec.estimated_cost_toman.toLocaleString('fa-IR')} تومان
                    </p>

                    <button 
                      className="btn btn-secondary"
                      style={{ width: '100%', marginTop: 'auto' }}
                      onClick={() => {
                        setSelectedRecipe(rec);
                        navigate('recipe');
                      }}
                    >
                      مشاهده دستور پخت
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              3. VIEW: SMART WHEEL
             ════════════════════════════════════════════════════ */}
          {currentView === 'wheel' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, textAlign: 'center' }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>گردونه هوشمند شانس</h1>
                <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
                  برای پایان دادن به بلاتکلیفی «امروز چی بپزیم»، گردونه را بچرخانید! (فقط غذاهای واجد شرایط)
                </p>
              </div>

              {/* Wheel graphic */}
              <div style={{ position: 'relative', width: 280, height: 280, margin: '14px 0' }}>
                <svg 
                  viewBox="0 0 200 200" 
                  style={{
                    width: '100%',
                    height: '100%',
                    transition: wheelSpinning ? 'transform 2.5s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none',
                    transform: `rotate(${wheelRotation}deg)`
                  }}
                >
                  <circle cx="100" cy="100" r="95" fill="var(--surface)" stroke="var(--border-2)" strokeWidth="4" />
                  <path d="M100 100 L100 5 A95 95 0 0 1 195 100 Z" fill="var(--primary)" opacity="0.9" />
                  <path d="M100 100 L195 100 A95 95 0 0 1 100 195 Z" fill="#E88B52" opacity="0.9" />
                  <path d="M100 100 L100 195 A95 95 0 0 1 5 100 Z" fill="#7D6FB5" opacity="0.9" />
                  <path d="M100 100 L5 100 A95 95 0 0 1 100 5 Z" fill="var(--primary-light-2)" opacity="0.9" />
                  <circle cx="100" cy="100" r="22" fill="var(--bg)" stroke="var(--border-2)" strokeWidth="3" />
                </svg>

                {/* Needle */}
                <div style={{
                  position: 'absolute',
                  top: -10,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '20px solid var(--danger)'
                }} />
              </div>

              <button 
                className="btn btn-primary btn-lg btn-pill"
                onClick={handleSpinWheel}
                disabled={wheelSpinning}
                style={{ padding: '12px 36px', fontSize: 15 }}
              >
                {wheelSpinning ? 'در حال چرخش گردونه…' : '🎯 چرخاندن گردونه تصمیم'}
              </button>

              {wheelResult && (
                <div className="card" style={{ maxWidth: 380, marginTop: 14, animation: 'fadeIn 0.3s ease' }}>
                  <span className="badge badge-success">غذای برگزیده گردونه</span>
                  <h3 style={{ fontSize: 19, fontWeight: 800, margin: '8px 0' }}>{wheelResult}</h3>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('cooking')}
                    style={{ marginTop: 6 }}
                  >
                    رفتن به حالت پخت با این غذا
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              4. VIEW: RECIPE DETAILS & SERVINGS SCALER
             ════════════════════════════════════════════════════ */}
          {currentView === 'recipe' && selectedRecipe && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 820, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                <div>
                  <span className="badge badge-success">{selectedRecipe.category}</span>
                  <h1 style={{ fontSize: 24, fontWeight: 800, marginTop: 6 }}>{selectedRecipe.title}</h1>
                </div>

                {/* Servings Scaler (سفر ۱) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: 'var(--surface)', padding: '6px 14px', borderRadius: 'var(--radius-pill)', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>تعداد نفرات:</span>
                  {[2, 4, 6, 8].map(cnt => (
                    <button
                      key={cnt}
                      onClick={() => setServingsCount(cnt)}
                      style={{
                        border: 'none',
                        background: servingsCount === cnt ? 'var(--primary)' : 'transparent',
                        color: servingsCount === cnt ? '#FFF' : 'var(--text)',
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer'
                      }}
                    >
                      {cnt}
                    </button>
                  ))}
                </div>
              </div>

              {/* Nutrition breakdown cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>کالری سهم</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRecipe.nutrition.calories}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>پروتئین</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRecipe.nutrition.protein}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>کربوهیدرات</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRecipe.nutrition.carbs}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>چربی</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRecipe.nutrition.fat}</div>
                </div>
              </div>

              {/* Ingredients Checklist */}
              <div className="card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>مواد اولیه (متناسب با {servingsCount} نفر):</h3>
                  <span style={{ fontSize: 11, color: 'var(--muted)' }}>تطابق با موجودی خانه</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
                  {selectedRecipe.ingredients.map((ing, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      background: 'var(--surface-2)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{ing.name} ({ing.amount})</span>
                      <span style={{ fontSize: 11, color: ing.in_pantry ? 'var(--primary)' : 'var(--apricot)' }}>
                        {ing.in_pantry ? '✓ در انبار' : 'کسری (خرید)'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>مراحل پخت قدم‌به‌قدم:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedRecipe.steps.map((st, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: 'var(--primary)',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </span>
                      <p style={{ fontSize: 13.5, lineHeight: 1.6 }}>{st}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  className="btn btn-primary btn-lg" 
                  style={{ flex: 1 }}
                  onClick={() => navigate('cooking')}
                >
                  <Play size={16} /> ورود به جلسه آشپزی تعاملی با تایمر
                </button>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════════
              5. VIEW: COOKING MODE (WITH IDEMPOTENT DEDUCTION)
             ════════════════════════════════════════════════════ */}
          {currentView === 'cooking' && selectedRecipe && (
            <div style={{ maxWidth: 1060, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: 20, fontWeight: 800 }}>حالت آشپزی: {selectedRecipe.title}</h1>
                <button className="btn btn-ghost" onClick={() => navigate('recipe')}>بازگشت</button>
              </div>

              <div className="cooking-layout">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Digital Countdown Timer */}
              <div className="card" style={{ textAlign: 'center', padding: 28 }}>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>تایمر هوشمند مرحله پخت</div>
                <div style={{ fontSize: 52, fontWeight: 900, fontFamily: 'monospace', color: 'var(--primary)', letterSpacing: 2 }}>
                  {formatTimer(cookingTimer)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 18 }}>
                  <button 
                    className="btn btn-primary btn-pill" 
                    onClick={() => setTimerRunning(!timerRunning)}
                    style={{ minWidth: 120 }}
                  >
                    {timerRunning ? <Pause size={16} /> : <Play size={16} />}
                    {timerRunning ? 'توقف تایمر' : 'شروع تایمر'}
                  </button>
                  <button 
                    className="btn btn-secondary btn-pill"
                    onClick={() => { setTimerRunning(false); setCookingTimer(15 * 60); }}
                  >
                    تنظیم مجدد (۱۵ دقیقه)
                  </button>
                </div>
              </div>

              {/* Step Instruction Card */}
              <div className="card" style={{ borderRight: '4px solid var(--primary)' }}>
                <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 700, marginBottom: 8 }}>
                  مرحله {activeStepIndex + 1} از {selectedRecipe.steps.length}
                </div>
                <p style={{ fontSize: 17, fontWeight: 600, lineHeight: 1.8 }}>
                  {selectedRecipe.steps[activeStepIndex]}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
                  <button 
                    className="btn btn-secondary"
                    disabled={activeStepIndex === 0}
                    onClick={() => setActiveStepIndex(i => Math.max(0, i - 1))}
                  >
                    مرحله قبلی
                  </button>
                  <button 
                    className="btn btn-primary"
                    disabled={activeStepIndex === selectedRecipe.steps.length - 1}
                    onClick={() => setActiveStepIndex(i => Math.min(selectedRecipe.steps.length - 1, i + 1))}
                  >
                    مرحله بعدی <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Finish cooking button with Idempotent stock deduction */}
              <div className="card" style={{ background: 'var(--primary-light)', borderColor: 'var(--primary-light-2)' }}>
                <h4 style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>پایان پخت و ثبت مصرف:</h4>
                <p style={{ fontSize: 12, color: 'var(--text-2)', margin: '4px 0 14px' }}>
                  با زدن دکمه زیر، مواد اولیه مصرف‌شده با کلید یکتا از انبار کسر می‌شود (بدون کسر تکراری).
                </p>
                <button 
                  className="btn btn-primary"
                  onClick={handleFinishCooking}
                  style={{ width: '100%' }}
                >
                  ✓ پایان موفق آشپزی و کسر از انبار
                </button>
              </div>

              </div>

              <aside className="cooking-status-card">
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 34, height: 34, display: 'grid', placeItems: 'center', borderRadius: 10, background: 'var(--lavender-light)', color: 'var(--lavender)' }}><Music size={18}/></div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800 }}>موسیقیِ آشپزی</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)' }}>{musicPlaying ? 'در حال پخش' : 'متوقف'}</div>
                  </div>
                </div>
                <div style={{ marginTop: 18, fontWeight: 700, fontSize: 13 }}>بی‌کلامِ آرام برای آشپزی</div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>تمرکز • ۴ دقیقه</div>
                <div className="music-progress" aria-label="پیشرفت موسیقی"><span style={{ width: `${(musicSeconds / 240) * 100}%` }} /></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--muted)' }}><span>{formatTimer(musicSeconds)}</span><span>{formatTimer(240 - musicSeconds)}</span></div>
                <button className="btn btn-secondary" style={{ width: '100%', marginTop: 16 }} onClick={() => setMusicPlaying(playing => !playing)}>
                  {musicPlaying ? <Pause size={16}/> : <Play size={16}/>} {musicPlaying ? 'توقف موسیقی' : 'پخش موسیقی'}
                </button>
                <div className="cooking-status-divider" />
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 700 }}><Volume2 size={15} color="var(--primary)"/> وضعیت جلسه</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                  <div className="status-metric"><span>مرحله</span><strong>{activeStepIndex + 1}/{selectedRecipe.steps.length}</strong></div>
                  <div className="status-metric"><span>تایمر</span><strong>{formatTimer(cookingTimer)}</strong></div>
                </div>
                <div className="cooking-status-divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>نقشه راه پخت</div>
                  <span className="badge badge-success">{Math.round(((activeStepIndex + 1) / selectedRecipe.steps.length) * 100)}٪</span>
                </div>
                <ol className="cooking-roadmap">
                  {selectedRecipe.steps.map((step, index) => {
                    const isDone = index < activeStepIndex;
                    const isCurrent = index === activeStepIndex;
                    return (
                      <li key={step} className={isCurrent ? 'current' : isDone ? 'done' : ''}>
                        <span className="roadmap-dot">{isDone ? <Check size={12} /> : index + 1}</span>
                        <span>{step}</span>
                      </li>
                    );
                  })}
                </ol>
              </aside>
              </div>

            </div>
          )}

          {/* ════════════════════════════════════════════════════
              6. VIEW: WEEKLY PLANNER
             ════════════════════════════════════════════════════ */}
          {currentView === 'planner' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>برنامه‌ریز هفتگی غذا (شنبه تا جمعه)</h1>
                <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
                  برنامه وعده‌های خانواده برای جلوگیری از اسراف و بهینه‌سازی خرید
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
                {mealPlans.map((plan, i) => (
                  <div key={i} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--primary)' }}>{plan.day}</span>
                      <span className="badge badge-success">{plan.date}</span>
                    </div>
                    
                    <div style={{ background: 'var(--surface-2)', padding: 10, borderRadius: 'var(--radius-sm)', marginBottom: 8 }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>وعده ناهار:</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{plan.lunch}</div>
                    </div>

                    <div style={{ background: 'var(--surface-2)', padding: 10, borderRadius: 'var(--radius-sm)', marginBottom: 12 }}>
                      <div style={{ fontSize: 10, color: 'var(--muted)' }}>وعده شام:</div>
                      <div style={{ fontSize: 13, fontWeight: 700 }}>{plan.dinner}</div>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11, color: 'var(--muted)' }}>
                      <span>تخمین کالری: {plan.calories}</span>
                      <button 
                        className="btn btn-ghost btn-sm"
                        onClick={() => showToast(`جابه‌جایی برای روز ${plan.day} ذخیره شد.`)}
                      >
                        جابه‌جایی
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              7. VIEW: PANTRY INVENTORY
             ════════════════════════════════════════════════════ */}
          {currentView === 'pantry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800 }}>مدیریت انبار و یخچال</h1>
                  <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
                    لیست تمام اقلام موجود در خانه با تفکیک تاریخ مصرف و هشدارها
                  </p>
                </div>
              </div>

              {/* Add form */}
              <form onSubmit={handleAddPantry} className="card" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="نام ماده (مثلاً: گوجه‌فرنگی تازه)..." 
                  value={newPantryName}
                  onChange={(e) => setNewPantryName(e.target.value)}
                  style={{
                    flex: 2,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 13,
                    minWidth: 180
                  }}
                />
                <select 
                  value={newPantryCategory}
                  onChange={(e) => setNewPantryCategory(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 13
                  }}
                >
                  <option value="یخچال">یخچال</option>
                  <option value="فریزر">فریزر</option>
                  <option value="کابینت">کابینت</option>
                  <option value="ادویه‌جات">ادویه‌جات</option>
                </select>
                <input 
                  type="number" 
                  placeholder="روز ماندگاری" 
                  value={newPantryDays}
                  onChange={(e) => setNewPantryDays(Number(e.target.value))}
                  style={{
                    width: 100,
                    padding: '9px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg)',
                    color: 'var(--text)',
                    fontSize: 13
                  }}
                />
                <button type="submit" className="btn btn-primary" style={{ gap: 6 }}>
                  <Plus size={16} /> افزودن به انبار
                </button>
              </form>

              {/* Tabs */}
              <div style={{ display: 'flex', gap: 8 }}>
                {['همه', 'یخچال', 'فریزر', 'کابینت'].map(tab => (
                  <button 
                    key={tab}
                    className={`chip ${activePantryTab === tab ? 'active' : ''}`}
                    onClick={() => setActivePantryTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              {/* Items List */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
                {pantry
                  .filter(p => activePantryTab === 'همه' || p.category === activePantryTab)
                  .map(item => (
                    <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13.5 }}>{item.name}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          {item.quantity} {item.unit} • بخش {item.category}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span className={`badge ${item.is_expiring_soon || item.expiry_days_left <= 3 ? 'badge-warning' : 'badge-success'}`}>
                          {item.expiry_days_left} روز
                        </span>
                        <button 
                          className="btn btn-ghost"
                          style={{ padding: 6, color: 'var(--danger)' }}
                          onClick={() => handleDeletePantry(item.id, item.name)}
                          title="حذف یا مصرف شد"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              8. VIEW: RECEIPT SCANNER (سفر ۲)
             ════════════════════════════════════════════════════ */}
          {currentView === 'receipt' && (
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>اسکن و ثبت هوشمند فاکتور خرید (OCR)</h1>
                <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
                  تصویر فاکتور را بارگذاری کنید تا اقلام استخراج و پس از تأیید شما به انبار منتقل شوند.
                </p>
              </div>

              {/* Upload Card */}
              <div className="card" style={{ textAlign: 'center', padding: 28, border: '2px dashed var(--border-2)' }}>
                <Camera size={36} color="var(--primary)" style={{ margin: '0 auto 12px' }} />
                <h3 style={{ fontSize: 15, fontWeight: 700 }}>انتخاب تصویر فاکتور یا اسکرین‌شات خرید</h3>
                <p style={{ fontSize: 12, color: 'var(--muted)', margin: '4px 0 16px' }}>
                  پشتیبانی از فرمت‌های JPG و PNG فاکتورهای فروشگاهی
                </p>
                <button className="btn btn-primary" onClick={handleScanReceipt}>
                  استخراج پیش‌نویس اقلام
                </button>
              </div>

              {/* Extracted table */}
              {receiptData && (
                <div className="card" style={{ animation: 'fadeIn 0.3s ease' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700 }}>{receiptData.store_name}</h3>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>تاریخ: {receiptData.date}</div>
                    </div>
                    <span className="badge badge-success">جمع: {receiptData.total_amount.toLocaleString('fa-IR')} تومان</span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {receiptData.items.map(it => (
                      <button key={it.id} onClick={() => handleToggleReceiptItem(it.id)} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 12px',
                        background: 'var(--surface-2)',
                        borderRadius: 'var(--radius-sm)'
                        , border: it.checked ? '1px solid var(--primary)' : '1px solid var(--border)', cursor: 'pointer', opacity: it.checked ? 1 : 0.55, width: '100%', textAlign: 'right', color: 'var(--text)'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <CheckSquare size={16} color={it.checked ? 'var(--primary)' : 'var(--muted)'} />
                          <span style={{ fontSize: 13, fontWeight: 600 }}>{it.name} ({it.quantity} {it.unit})</span>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700 }}>{it.price.toLocaleString('fa-IR')} ت</div>
                      </button>
                    ))}
                  </div>

                  <button 
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: 20 }}
                    onClick={handleConfirmReceiptItems}
                  >
                    ✓ تأیید اقلام و افزودن به موجودی انبار
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              9. VIEW: SMART SHOPPING LIST (سفر ۳)
             ════════════════════════════════════════════════════ */}
          {currentView === 'shopping' && (
            <div style={{ maxWidth: 720, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800 }}>لیست خرید هوشمند مشترک</h1>
                  <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
                    تجمیع‌شده بر اساس برنامه هفتگی و مواد ناموجود در خانه
                  </p>
                </div>
                <button className="btn btn-primary btn-sm" onClick={() => navigate('stores')}>
                  <Store size={15} /> مقایسه قیمت فروشگاه‌ها
                </button>
              </div>

              <div className="card">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {shoppingList.map(item => (
                    <div 
                      key={item.id}
                      onClick={() => handleToggleShopping(item.id)}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 14px',
                        background: item.checked ? 'var(--surface-2)' : 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        cursor: 'pointer',
                        opacity: item.checked ? 0.6 : 1
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <input 
                          type="checkbox" 
                          checked={item.checked} 
                          onChange={() => {}}
                          style={{ cursor: 'pointer' }}
                        />
                        <span style={{
                          fontSize: 13.5,
                          fontWeight: 600,
                          textDecoration: item.checked ? 'line-through' : 'none'
                        }}>
                          {item.name} ({item.amount})
                        </span>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700 }}>
                        {item.estimated_price.toLocaleString('fa-IR')} ت
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 20, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 13, fontWeight: 700 }}>جمع کل تخمینی:</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: 'var(--primary)' }}>
                    {shoppingList.filter(s => !s.checked).reduce((acc, curr) => acc + curr.estimated_price, 0).toLocaleString('fa-IR')} تومان
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              10. VIEW: STORES COMPARISON (سفر ۳)
             ════════════════════════════════════════════════════ */}
          {currentView === 'stores' && storesData && (
            <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>مقایسه قیمت فروشگاه‌های آنلاین</h1>
                <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
                  بر اساس اقلام کسری سبد خرید • مشاهده‌شده در {storesData.observed_time}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16 }}>
                {storesData.stores.map((st, i) => (
                  <div key={i} className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <span className="badge badge-success">{st.coverage_percent}٪ موجودی اقلام</span>
                      <h3 style={{ fontSize: 16, fontWeight: 800, margin: '10px 0 6px' }}>{st.name}</h3>
                      <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--primary)', margin: '8px 0' }}>
                        {st.total_price.toLocaleString('fa-IR')} <span style={{ fontSize: 12 }}>تومان</span>
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        زمان ارسال: {st.delivery_time} • هزینه ارسال: {st.delivery_fee.toLocaleString('fa-IR')} ت
                      </div>
                    </div>

                    <a 
                      href={st.link} 
                      target="_blank" 
                      rel="noreferrer"
                      className="btn btn-secondary"
                      style={{ marginTop: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                    >
                      ورود به فروشگاه (Link-out) <ArrowUpRight size={14} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              11. VIEW: FAMILY & TASKS (M01, M08)
             ════════════════════════════════════════════════════ */}
          {currentView === 'family' && (
            <div style={{ maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>خانواده و تقسیم وظایف آشپزخانه</h1>
                <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
                  مشارکت تمام اعضا در تصمیم‌گیری و آماده‌سازی غذا همراه با بازی‌سازی
                </p>
              </div>

              {/* Members */}
              <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>اعضای خانواده:</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>ن</div>
                    <div><div style={{ fontSize: 13, fontWeight: 700 }}>نوید</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>پدر — مدیر خانواده</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--apricot)', color: '#5C3A1E', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>م</div>
                    <div><div style={{ fontSize: 13, fontWeight: 700 }}>مریم</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>مادر</div></div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--lavender)', color: '#FFF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>آ</div>
                    <div><div style={{ fontSize: 13, fontWeight: 700 }}>آریا</div><div style={{ fontSize: 10, color: 'var(--muted)' }}>کودک — ۸ ساله</div></div>
                  </div>
                </div>
              </div>

              {/* Tasks */}
              <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>چک‌لیست کارهای امروز:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {familyTasks.map(t => (
                    <div key={t.id} style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '10px 14px',
                      background: t.completed ? 'var(--surface-2)' : 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--radius-sm)'
                    }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700 }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, marginTop: 2 }}>
                          <span>مسئول: {t.assigned_to}</span>
                          {t.is_child_safe && <span className="badge badge-success">ایمن برای کودک</span>}
                        </div>
                      </div>
                      <span className="badge badge-ai">+{t.reward_points} امتیاز</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              12. VIEW: REPORTS & ANALYTICS
             ════════════════════════════════════════════════════ */}
          {currentView === 'reports' && (
            <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>گزارش‌ها و تحلیل هوشمند بودجه و سلامت</h1>
                <p style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>
                  روند مصرف ماهانه و انطباق با رژیم‌های سلامت
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }}>
                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>بودجه غذایی ماه جاری (تومان)</h3>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 12, height: 160, paddingBottom: 10 }}>
                    {[
                      { name: 'هفته ۱', val: 1200000, h: 40 },
                      { name: 'هفته ۲', val: 1450000, h: 60 },
                      { name: 'هفته ۳', val: 1100000, h: 35 },
                      { name: 'هفته ۴', val: 1800000, h: 80 },
                    ].map((w, i) => (
                      <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: '100%', height: `${w.h}%`, background: 'var(--primary)', borderRadius: '4px 4px 0 0' }} />
                        <span style={{ fontSize: 11, color: 'var(--muted)' }}>{w.name}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, textAlign: 'center' }}>
                    صرفه‌جویی هوشمند نسبت به ماه قبل: ۱۲٪
                  </div>
                </div>

                <div className="card">
                  <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 14 }}>شاخص‌های سلامت و تنوع غذایی</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span>انطباق با سقف سدیم و نمک:</span>
                        <span style={{ fontWeight: 700, color: 'var(--primary)' }}>۹۲٪</span>
                      </div>
                      <div style={{ width: '100%', height: 8, background: 'var(--surface-2)', borderRadius: 4 }}>
                        <div style={{ width: '92%', height: '100%', background: 'var(--primary)', borderRadius: 4 }} />
                      </div>
                    </div>

                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                        <span>تنوع فیبر و سبزیجات تازه:</span>
                        <span style={{ fontWeight: 700, color: 'var(--apricot)' }}>۸۵٪</span>
                      </div>
                      <div style={{ width: '100%', height: 8, background: 'var(--surface-2)', borderRadius: 4 }}>
                        <div style={{ width: '85%', height: '100%', background: 'var(--apricot)', borderRadius: 4 }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              13. VIEW: SETTINGS
             ════════════════════════════════════════════════════ */}
          {currentView === 'settings' && (
            <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800 }}>تنظیمات و اطلاعات سیستم</h1>
              
              <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>وضعیت مدل‌های هوش مصنوعی (AI Gateway)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>سرور محلی Ollama:</span>
                    <span style={{ fontWeight: 700, color: ollamaActive ? 'var(--primary)' : 'var(--apricot)' }}>
                      {ollamaActive ? 'متصل (localhost:11434)' : 'حالت Fallback فعال'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>مدل اصلی گفتمان:</span>
                    <span style={{ fontFamily: 'monospace' }}>gemma3:1b</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>مدل استدلال و کد:</span>
                    <span style={{ fontFamily: 'monospace' }}>qwen3-coder:30b</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>سرور پایتون FastAPI:</span>
                    <span style={{ fontFamily: 'monospace' }}>port 8200</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>قوانین و محدودیت‌های سلامت خانوار</h3>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="chip active">🥜 حساسیت به بادام زمینی (منع قطعی)</span>
                  <span className="chip active">🥛 حساسیت به لاکتوز (منع قطعی)</span>
                  <span className="chip active">🫀 فشار خون ملایم (ترجیح کم‌نمک)</span>
                </div>
                <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>
                  ثبت‌شده توسط کاربر بر اساس PRD؛ جایگزین نظر پزشک نیست.
                </p>
              </div>
            </div>
          )}

          {/* ════════════════════════════════════════════════════
              14. VIEW: ONBOARDING FLOW
             ════════════════════════════════════════════════════ */}
          {currentView === 'onboarding' && (
            <div style={{ maxWidth: 540, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20, textAlign: 'center' }}>
              
              {obStep === 1 && (
                <div className="card" style={{ padding: 36 }}>
                  <div style={{ fontSize: 44, marginBottom: 12 }}>🍲✨🌿</div>
                  <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 8 }}>هر روز، یک تصمیم خوش‌طعم‌تر</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 24 }}>
                    با توجه به خانواده، موجودی خانه، بودجه و حال‌وهوای امروزتان غذا انتخاب کنید.
                  </p>
                  <button className="btn btn-primary btn-pill btn-lg" style={{ width: '100%' }} onClick={() => setObStep(2)}>
                    شروع کنیم
                  </button>
                  <button className="btn btn-ghost" style={{ marginTop: 10 }} onClick={() => navigate('home')}>
                    قبلاً حساب ساخته‌ام (ورود به خانه)
                  </button>
                </div>
              )}

              {obStep === 2 && (
                <div className="card" style={{ padding: 32, textAlign: 'right' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>خانواده خود را بسازید</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>نام خانواده و اعضا را مشخص کنید.</p>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 600 }}>نام خانواده</label>
                      <input 
                        type="text" 
                        defaultValue="خانه مددی"
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', marginTop: 4 }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="chip">۲ نفر</button>
                      <button className="chip active">۴ نفر</button>
                      <button className="chip">۶ نفر</button>
                    </div>

                    <button className="btn btn-primary btn-pill" style={{ marginTop: 16 }} onClick={() => setObStep(3)}>
                      ساخت پروفایل خانواده و ادامه
                    </button>
                  </div>
                </div>
              )}

              {obStep === 3 && (
                <div className="card" style={{ padding: 32, textAlign: 'right' }}>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>ترجیحات و محدودیت‌های سلامت</h2>
                  <p style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14 }}>محدودیت‌های فعال هرگز وارد پیشنهادها نمی‌شوند.</p>
                  
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18 }}>
                    <span className="chip active">🥜 حساسیت به آجیل</span>
                    <span className="chip active">🥛 حساسیت به لبنیات</span>
                    <span className="chip active">🫀 فشار خون</span>
                    <span className="chip">🩸 دیابت</span>
                  </div>

                  <button className="btn btn-primary btn-pill" onClick={() => setObStep(4)}>
                    ادامه به موجودی اولیه
                  </button>
                </div>
              )}

              {obStep === 4 && (
                <div className="card" style={{ padding: 32, textAlign: 'center' }}>
                  <div style={{ fontSize: 40, marginBottom: 10 }}>🧊🥕🥦</div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>مواد اولیه خانه را ثبت کنید</h2>
                  <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 20 }}>
                    لازم نیست همه موجودی را وارد کنید — چند قلم کالا کافی است.
                  </p>

                  <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 20 }}>
                    <button className="btn btn-secondary btn-pill">📝 ثبت دستی</button>
                    <button className="btn btn-secondary btn-pill">🧾 آپلود فاکتور</button>
                  </div>

                  <button className="btn btn-primary btn-pill btn-lg" style={{ width: '100%' }} onClick={() => navigate('home')}>
                    ورود به داشبورد اصلی
                  </button>
                </div>
              )}

            </div>
          )}

        </div>
      </main>

      {/* ════════════════════════════════════════════════════
          15. CONTEXT-AWARE AI ASSISTANT DRAWER (سفر ۴)
         ════════════════════════════════════════════════════ */}
      {aiDrawerOpen && (
        <div className="ai-overlay" onClick={() => setAiDrawerOpen(false)}>
          <div className="ai-sheet" onClick={(e) => e.stopPropagation()}>
            
            {/* Drawer Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 22px',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--lavender-light)',
                  color: 'var(--lavender)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h3 style={{ fontSize: 14, fontWeight: 800, margin: 0 }}>دستیار هوشمند آشپزخانه</h3>
                    <button 
                      type="button"
                      className={`badge-ai ${aiStatus?.active_provider === 'gemini' ? 'badge-gemini' : aiStatus?.active_provider === 'ollama' ? 'badge-ollama' : 'badge-local'}`}
                      onClick={() => setShowAiSettings(true)}
                      title="کلیک برای تنظیم موتور و کلید Gemini"
                    >
                      <Sparkles size={11} />
                      {aiStatus?.active_provider === 'gemini'
                        ? `Gemini ${(aiStatus?.active_model || 'Flash').replace('gemini-', '')}`
                        : aiStatus?.active_provider === 'ollama'
                        ? `Ollama ${(aiStatus?.active_model || 'Gemma')}`
                        : 'آفلاین'}
                    </button>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>زمینه صفحه جاری: {currentView}</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button 
                  type="button" 
                  className="btn btn-ghost" 
                  onClick={() => setShowAiSettings(true)} 
                  style={{ padding: 6 }}
                  title="تنظیمات هوش مصنوعی"
                >
                  <Sliders size={17} />
                </button>
                <button className="btn btn-ghost" onClick={() => setAiDrawerOpen(false)} style={{ padding: 6 }}>
                  <X size={18} />
                </button>
              </div>
            </div>


            {/* Quick Prompt Chips */}
            <div style={{ display: 'flex', gap: 6, padding: '10px 20px', background: 'var(--surface-2)', overflowX: 'auto' }}>
              <button 
                className="chip"
                onClick={() => setAiInput('چی بپزم؟')}
              >
                امروز چی بپزم؟
              </button>
              <button 
                className="chip"
                onClick={() => setAiInput('به یخچال دو کیلو گوجه اضافه کن')}
              >
                افزودن گوجه به یخچال
              </button>
              <button 
                className="chip"
                onClick={() => setAiInput('ناهار فردا رو قورمه سبزی بذار')}
              >
                تنظیم ناهار فردا
              </button>
            </div>

            {/* Chat Conversation Scroll Area */}
            <div style={{
              padding: 20,
              overflowY: 'auto',
              maxHeight: '48vh',
              display: 'flex',
              flexDirection: 'column',
              gap: 12
            }}>
              {chatMessages.map(msg => (
                <div 
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end',
                    maxWidth: '85%'
                  }}
                >
                  <div style={{
                    padding: '11px 15px',
                    borderRadius: 'var(--radius-md)',
                    background: msg.role === 'user' ? 'var(--primary)' : 'var(--surface-2)',
                    color: msg.role === 'user' ? '#FFF' : 'var(--text)',
                    fontSize: 13.5,
                    lineHeight: 1.6
                  }}>
                    {msg.content}
                  </div>

                  {/* Human-in-the-Loop Confirmation Card */}
                  {msg.draft_action && (
                    <div style={{
                      marginTop: 8,
                      padding: 12,
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--apricot-light)',
                      border: '1px solid var(--apricot)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}>
                      <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--apricot)' }}>
                        ⚠️ تأییدیه انسانی لازم است:
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 600 }}>
                        {msg.draft_action.description}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button 
                          className="btn btn-primary btn-sm"
                          onClick={() => handleConfirmAction(msg.id, msg.draft_action)}
                        >
                          <Check size={14} /> تأیید و ثبت نهایی
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm"
                          onClick={() => {
                            setChatMessages(prev => prev.map(m => m.id === msg.id ? { ...m, draft_action: null } : m));
                            showToast('عملیات لغو شد.');
                          }}
                        >
                          انصراف
                        </button>
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginTop: 4 }}>
                    <span style={{ fontSize: 10, color: 'var(--muted)' }}>
                      {msg.timestamp}
                    </span>
                    {msg.role === 'assistant' && (
                      <span style={{ 
                        fontSize: 9.5, 
                        fontWeight: 700,
                        color: msg.provider === 'gemini' ? 'var(--lavender)' : 'var(--primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 3
                      }}>
                        {msg.provider === 'gemini' ? `✨ Gemini ${(msg.model || 'Flash').replace('gemini-', '')}` : msg.provider === 'ollama' ? `🦙 Ollama` : '⚡ دستیار'}
                      </span>
                    )}
                  </div>

                </div>
              ))}

              {isAiLoading && (
                <div style={{ alignSelf: 'flex-end', fontSize: 12, color: 'var(--muted)', padding: '6px 12px' }}>
                  در حال تفکر با مدل هوش مصنوعی…
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendAi} style={{
              display: 'flex',
              gap: 8,
              padding: '12px 18px',
              borderTop: '1px solid var(--border)',
              background: 'var(--surface)'
            }}>
              <input 
                type="text"
                placeholder="دستور خود را بنویسید (مثلاً: دو کیلو پرتقال به یخچال اضافه کن)..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '9px 14px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg)',
                  color: 'var(--text)',
                  fontSize: 13
                }}
              />
              <button 
                type="submit" 
                className="btn btn-primary btn-pill" 
                style={{ width: 40, height: 40, padding: 0 }}
                disabled={isAiLoading}
              >
                <Send size={16} />
              </button>
            </form>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          16. AI SETTINGS MODAL (GEMINI & OLLAMA CONFIGURATION)
         ════════════════════════════════════════════════════ */}

      {showAiSettings && (
        <div className="modal-backdrop" onClick={() => setShowAiSettings(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--lavender-light)', color: 'var(--lavender)', display: 'grid', placeItems: 'center' }}>
                  <Sparkles size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>تنظیمات هوش مصنوعی دستیار</h3>
                  <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>اتصال به Google Gemini، مدل‌های محلی Ollama یا موتور بومی</p>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowAiSettings(false)} style={{ padding: 6 }}>
                <X size={18} />
              </button>
            </div>

            {/* Provider Selection */}
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, display: 'block', marginBottom: 8 }}>
                موتور هوش مصنوعی پیش‌فرض
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <div 
                  className={`provider-card ${providerChoice === 'auto' ? 'selected' : ''}`}
                  onClick={() => setProviderChoice('auto')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}>
                    <Sparkles size={14} color="var(--primary)" />
                    خودکار (هوشمند)
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>سوییچ خودکار بین Gemini و Ollama</span>
                </div>

                <div 
                  className={`provider-card ${providerChoice === 'gemini' ? 'selected' : ''}`}
                  onClick={() => setProviderChoice('gemini')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}>
                    <Sparkles size={14} color="var(--lavender)" />
                    Google Gemini
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>مدل ابری پرسرعت Flash</span>
                </div>

                <div 
                  className={`provider-card ${providerChoice === 'ollama' ? 'selected' : ''}`}
                  onClick={() => setProviderChoice('ollama')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: 12 }}>
                    <Cpu size={14} color="var(--primary)" />
                    Ollama محلی
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--muted)' }}>اجرای کامل آفلاین در سیستم</span>
                </div>
              </div>
            </div>

            {/* Google Gemini Config Section */}
            <div style={{ background: 'var(--surface-2)', padding: 16, borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--lavender)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Key size={15} /> کلید API گوگل جمینای (Google Gemini API Key)
                </span>
                <a 
                  href="https://aistudio.google.com/app/apikey" 
                  target="_blank" 
                  rel="noreferrer" 
                  style={{ fontSize: 11, color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none', fontWeight: 600 }}
                >
                  دریافت کلید رایگان <ExternalLink size={12} />
                </a>
              </div>

              <div>
                <input 
                  type="password"
                  placeholder={aiStatus?.gemini_configured ? "کلید ثبت شده است (برای تغییر کلید جدید بنویسید)" : "مثال: AIzaSyD..."}
                  value={geminiKeyInput}
                  onChange={e => setGeminiKeyInput(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    fontSize: 13,
                    direction: 'ltr'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, display: 'block', marginBottom: 4 }}>
                    مدل Gemini
                  </label>
                  <select
                    value={geminiModelInput}
                    onChange={e => setGeminiModelInput(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '8px 10px',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border)',
                      background: 'var(--surface)',
                      color: 'var(--text)',
                      fontSize: 12
                    }}
                  >
                    {geminiModels.length ? geminiModels.map(model => (
                      <option key={model.id} value={model.id}>{model.name}{model.recommended ? ' — پیشنهادی برای حساب شما' : ''}</option>
                    )) : <option value={geminiModelInput}>ابتدا «تست اتصال کلید» را بزنید</option>}
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                  <button 
                    type="button"
                    className="btn btn-secondary"
                    style={{ width: '100%', height: 38, fontSize: 12 }}
                    onClick={handleTestGeminiKey}
                    disabled={keyTesting}
                  >
                    {keyTesting ? 'در حال تست اتصال...' : '🔍 تست اتصال کلید'}
                  </button>
                </div>
              </div>

              {/* Test Result Message Box */}
              {keyTestResult && (
                <div style={{
                  padding: '10px 12px',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 12,
                  background: keyTestResult.valid ? 'var(--primary-light)' : 'var(--danger-light)',
                  color: keyTestResult.valid ? 'var(--primary)' : 'var(--danger)',
                  border: `1px solid ${keyTestResult.valid ? 'var(--primary)' : 'var(--danger)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}>
                  {keyTestResult.valid ? <Check size={16} /> : <AlertCircle size={16} />}
                  <span>{keyTestResult.message || keyTestResult.error}</span>
                </div>
              )}
            </div>

            {/* Ollama Status Info */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: 'var(--surface-2)', borderRadius: 'var(--radius-sm)', fontSize: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cpu size={15} color="var(--primary)" />
                <span>وضعیت Ollama محلی:</span>
              </div>
              <span style={{ fontWeight: 700, color: aiStatus?.ollama_active ? 'var(--primary)' : 'var(--muted)' }}>
                {aiStatus?.ollama_active ? `فعال (${aiStatus.ollama_model})` : 'در دسترس نیست'}
              </span>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button 
                type="button" 
                className="btn btn-ghost" 
                onClick={() => setShowAiSettings(false)}
              >
                انصراف
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSaveAiConfig}
              >
                <Check size={15} /> ذخیره و اعمال تغییرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authentication & Registration Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        onSuccess={handleUserLogin}
        showToast={showToast}
      />

    </div>
  );
}
export default App;
