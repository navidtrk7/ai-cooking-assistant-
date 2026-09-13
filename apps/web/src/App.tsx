import React, { useState, useEffect } from 'react';
import { 
  Home, Compass, RotateCcw, BookOpen, Clock, 
  Package, Settings, Mic, Send, Sparkles, Moon, Sun, 
  AlertCircle, ChevronRight, Play, Pause, 
  Check, Plus, Trash2, X
} from 'lucide-react';
import { api } from './services/api';
import type { PantryItem, Recipe, RecommendationResponse, ChatMessage } from './types';


export function App() {
  const [currentView, setCurrentView] = useState<string>('home');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [ollamaActive, setOllamaActive] = useState<boolean>(false);
  
  // Data states
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendationResponse | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [activePantryTab, setActivePantryTab] = useState<string>('همه');
  const [newPantryName, setNewPantryName] = useState<string>('');
  const [newPantryCategory, setNewPantryCategory] = useState<string>('یخچال');
  const [newPantryDays, setNewPantryDays] = useState<number>(4);

  // Cooking Mode Timer state
  const [cookingTimer, setCookingTimer] = useState<number>(15 * 60);
  const [timerRunning, setTimerRunning] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Wheel state
  const [wheelRotation, setWheelRotation] = useState<number>(0);
  const [wheelSpinning, setWheelSpinning] = useState<boolean>(false);
  const [wheelResult, setWheelResult] = useState<string | null>(null);

  // AI Assistant Drawer state
  const [aiDrawerOpen, setAiDrawerOpen] = useState<boolean>(false);
  const [aiInput, setAiInput] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'سلام! من دستیار هوشمند آشپزخانه شما هستم. با مدل هوش مصنوعی لوکال Ollama در خدمت شما هستم. می‌تونید بپرسید چی بپزید یا مواد اولیه به یخچال اضافه کنید.',
      timestamp: 'همین الان'
    }
  ]);
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 3000);
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
  };

  // Theme toggle
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.dataset.theme = next;
  };

  // Initial load from Python FastAPI backend
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const health = await api.getHealth();
        setOllamaActive(health.ollama_active);

        const pantryItems = await api.getPantry();
        setPantry(pantryItems);

        const recs = await api.getRecommendations();
        setRecommendations(recs);
        if (recs?.top_recipe) {
          setSelectedRecipe(recs.top_recipe);
        }
      } catch (err) {
        console.error('Failed to load initial data:', err);
      }
    };
    loadInitialData();
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

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Spin wheel action
  const handleSpinWheel = () => {
    if (wheelSpinning) return;
    setWheelSpinning(true);
    setWheelResult(null);
    const randomDeg = 1440 + Math.floor(Math.random() * 360);
    setWheelRotation(prev => prev + randomDeg);
    setTimeout(() => {
      setWheelSpinning(false);
      const dishes = ['قورمه‌سبزی جاافتاده', 'کوکو سبزی سبک', 'زرشک‌پلو با مرغ', 'کشک بادمجان اصیل'];
      const chosen = dishes[Math.floor(Math.random() * dishes.length)];
      setWheelResult(chosen);
      showToast(`🎯 گردونه انتخاب کرد: ${chosen}`);
    }, 2500);
  };

  // Add pantry item
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

  // Delete pantry item
  const handleDeletePantry = async (id: string, name: string) => {
    try {
      await api.deletePantryItem(id);
      setPantry(pantry.filter(p => p.id !== id));
      showToast(`«${name}» حذف شد.`);
    } catch {
      showToast('خطا در حذف کالا');
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
        timestamp: 'همین الان'
      };
      setChatMessages(prev => [...prev, botMsg]);
    } catch {
      setChatMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'متأسفانه در برقراری ارتباط با سرور مشکلی رخ داد.',
          timestamp: 'همین الان'
        }
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Confirm AI Action
  const handleConfirmAction = async (msgId: string, draft: any) => {
    try {
      const res = await api.confirmAction(draft);
      showToast(res.message);
      // Reload pantry if it was a pantry addition
      if (draft.action_type === 'add_pantry') {
        const updatedPantry = await api.getPantry();
        setPantry(updatedPantry);
      }
      // Remove draft action from message so it can't be re-confirmed
      setChatMessages(prev => prev.map(m => m.id === msgId ? { ...m, draft_action: null } : m));
    } catch {
      showToast('خطا در تایید عملیات');
    }
  };

  const navItems = [
    { id: 'home', label: 'خانه', icon: Home },
    { id: 'recommend', label: 'پیشنهاد غذا', icon: Compass },
    { id: 'wheel', label: 'گردونه تصمیم', icon: RotateCcw },
    { id: 'recipe', label: 'دستور پخت', icon: BookOpen },
    { id: 'cooking', label: 'آشپزی گام‌به‌گام', icon: Clock },
    { id: 'pantry', label: 'انبار و موجودی', icon: Package },
    { id: 'settings', label: 'تنظیمات', icon: Settings },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', direction: 'rtl' }}>
      
      {/* Toast Notification */}
      {toastMsg && (
        <div style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          background: 'var(--color-primary)',
          color: '#FFF',
          padding: '12px 20px',
          borderRadius: 'var(--radius-pill)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 2000,
          fontWeight: 600,
          fontSize: 14,
          animation: 'fadeIn 0.2s ease'
        }}>
          {toastMsg}
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside style={{
        width: 'var(--sidebar-w)',
        background: 'var(--bg-surface)',
        borderLeft: '1px solid var(--border-subtle)',
        display: 'flex',
        flexDirection: 'column',
        padding: 24,
        position: 'sticky',
        top: 0,
        height: '100vh'
      }}>
        {/* Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 32 }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: 12,
            background: 'var(--color-primary)',
            color: '#FFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Sparkles size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 800 }}>دستیار آشپزخانه</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: ollamaActive ? '#34D399' : '#FBBF24'
              }} />
              <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {ollamaActive ? 'مدل Ollama فعال' : 'حالت لوکال'}
              </span>
            </div>
          </div>
        </div>

        {/* Nav Links */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
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
                  gap: 12,
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  background: active ? 'var(--color-primary-light)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--text-secondary)',
                  fontWeight: active ? 700 : 500,
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'right',
                  transition: 'all 0.15s'
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Theme and Profile Footer */}
        <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
          <button
            onClick={toggleTheme}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              padding: '10px 14px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-muted)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              fontSize: 13,
              marginBottom: 12
            }}
          >
            <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {theme === 'dark' ? <Moon size={16} /> : <Sun size={16} />}
              {theme === 'dark' ? 'تم تاریک' : 'تم روشن'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>تغییر</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: '#2F6B4F',
              color: '#FFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700
            }}>
              ن
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>نوید مددی</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>خانه ۴ نفره</div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        
        {/* Top Voice & Quick Action Hero Bar */}
        <header style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '16px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 20
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, maxWidth: 540 }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              background: 'var(--bg-muted)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-pill)',
              padding: '8px 16px',
              width: '100%'
            }}>
              <Mic size={18} color="var(--color-primary)" />
              <input
                type="text"
                placeholder="بگویید یا بنویسید: «چی بپزم؟» یا «دو کیلو گوجه به یخچال اضافه کن»..."
                style={{
                  border: 'none',
                  background: 'transparent',
                  outline: 'none',
                  fontSize: 13,
                  width: '100%',
                  color: 'var(--text-primary)'
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    setAiDrawerOpen(true);
                  }
                }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button 
              className="btn btn-primary btn-pill"
              onClick={() => setAiDrawerOpen(true)}
              style={{ gap: 6, fontSize: 13 }}
            >
              <Sparkles size={16} />
              <span>دستیار هوشمند AI</span>
            </button>
          </div>
        </header>

        {/* Dynamic Pages Container */}
        <div style={{ padding: 32, flex: 1 }}>
          
          {/* VIEW: HOME DASHBOARD */}
          {currentView === 'home' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              
              {/* Greeting */}
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800, color: 'var(--text-primary)' }}>
                  سلام نوید عزیز، امروز چی بپزیم؟ 🍲
                </h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                  با توجه به مواد موجود در انبار و تاریخ انقضای اقلام، بهترین گزینه‌ها آماده است.
                </p>
              </div>

              {/* Grid: Main Recommendation & Expiry Alert */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
                
                {/* Recommendation Card */}
                {recommendations?.top_recipe && (
                  <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className="badge badge-success">پیشنهاد برگزیده روز</span>
                        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-primary)' }}>
                          {recommendations.top_recipe.pantry_match_percent}٪ تطابق
                        </span>
                      </div>
                      
                      <h2 style={{ fontSize: 20, fontWeight: 800, margin: '14px 0 8px' }}>
                        {recommendations.top_recipe.title}
                      </h2>
                      
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {recommendations.top_recipe.match_reasons[0]}
                      </p>

                      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 13, color: 'var(--text-muted)' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <Clock size={14} /> زمان پخت: {recommendations.top_recipe.cook_time_minutes} دقیقه
                        </span>
                        <span>کالری: {recommendations.top_recipe.nutrition.calories} کیلوکالری</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                      <button 
                        className="btn btn-primary" 
                        style={{ flex: 1 }}
                        onClick={() => {
                          setSelectedRecipe(recommendations.top_recipe);
                          navigate('recipe');
                        }}
                      >
                        مشاهده رسپی و مواد اولیه
                      </button>
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          setSelectedRecipe(recommendations.top_recipe);
                          navigate('cooking');
                        }}
                      >
                        شروع پخت
                      </button>
                    </div>
                  </div>
                )}

                {/* Expiry Alert Card */}
                <div className="card" style={{ borderRight: '4px solid var(--color-accent)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                    <AlertCircle size={20} color="var(--color-accent)" />
                    <h3 style={{ fontSize: 16, fontWeight: 700 }}>هشدارهای انقضای انبار و یخچال</h3>
                  </div>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
                    این اقلام در ۲ الی ۳ روز آینده منقضی می‌شوند. پیشنهاد هوش مصنوعی استفاده سریع‌تر از آن‌هاست:
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {pantry.filter(p => p.is_expiring_soon || p.expiry_days_left <= 3).map(item => (
                      <div 
                        key={item.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '10px 14px',
                          background: 'var(--color-accent-light)',
                          borderRadius: 'var(--radius-md)'
                        }}
                      >
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</span>
                        <span className="badge badge-warning">
                          {item.expiry_days_left} روز باقیمانده
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Quick Navigation Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginTop: 8 }}>
                <div 
                  className="card" 
                  style={{ cursor: 'pointer', textAlign: 'center' }}
                  onClick={() => navigate('wheel')}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎯</div>
                  <h4 style={{ fontWeight: 700, fontSize: 15 }}>گردونه تصمیم‌گیری</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    نمی‌دانید چی بپزید؟ بچرخانید و تصمیم بگیرید
                  </p>
                </div>

                <div 
                  className="card" 
                  style={{ cursor: 'pointer', textAlign: 'center' }}
                  onClick={() => navigate('pantry')}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🧊</div>
                  <h4 style={{ fontWeight: 700, fontSize: 15 }}>مدیریت موجودی انبار</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    {pantry.length} قلم کالا ثبت شده در یخچال و فریزر
                  </p>
                </div>

                <div 
                  className="card" 
                  style={{ cursor: 'pointer', textAlign: 'center' }}
                  onClick={() => navigate('recommend')}
                >
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🥗</div>
                  <h4 style={{ fontWeight: 700, fontSize: 15 }}>پیشنهادهای راداری</h4>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                    مقایسه تغذیه، هزینه و سرعت پخت رسپی‌ها
                  </p>
                </div>
              </div>

            </div>
          )}

          {/* VIEW: RECOMMENDATIONS */}
          {currentView === 'recommend' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>موتور پیشنهاد هوشمند غذا</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                  {recommendations?.ai_reasoning}
                </p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
                {recommendations?.top_recipe && (
                  <div className="card" style={{ border: '2px solid var(--color-primary)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span className="badge badge-success">رتبه ۱ (بهترین تطابق)</span>
                      <span style={{ fontWeight: 800, color: 'var(--color-primary)' }}>
                        {recommendations.top_recipe.pantry_match_percent}٪ تطابق
                      </span>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800 }}>{recommendations.top_recipe.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 16px' }}>
                      دسته‌بندی: {recommendations.top_recipe.category}
                    </p>

                    <div style={{ background: 'var(--bg-muted)', padding: 12, borderRadius: 'var(--radius-md)', marginBottom: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>شاخص‌های راداری:</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                        <span>انبار: {recommendations.top_recipe.radar_scores.pantry}٪</span>
                        <span>سلامت: {recommendations.top_recipe.radar_scores.health}٪</span>
                        <span>سرعت: {recommendations.top_recipe.radar_scores.speed}٪</span>
                        <span>اقتصادی: {recommendations.top_recipe.radar_scores.budget}٪</span>
                      </div>
                    </div>

                    <button 
                      className="btn btn-primary w-full"
                      style={{ width: '100%' }}
                      onClick={() => {
                        setSelectedRecipe(recommendations.top_recipe);
                        navigate('recipe');
                      }}
                    >
                      مشاهده جزئیات کامل
                    </button>
                  </div>
                )}

                {recommendations?.alternatives.map(rec => (
                  <div key={rec.id} className="card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span className="badge badge-ai">گزینه جایگزین</span>
                      <span style={{ fontWeight: 700 }}>{rec.pantry_match_percent}٪ تطابق</span>
                    </div>
                    <h3 style={{ fontSize: 18, fontWeight: 800 }}>{rec.title}</h3>
                    <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '6px 0 16px' }}>
                      زمان: {rec.cook_time_minutes} دقیقه • هزینه: {rec.estimated_cost_toman.toLocaleString('fa-IR')} تومان
                    </p>
                    <button 
                      className="btn btn-secondary w-full"
                      style={{ width: '100%' }}
                      onClick={() => {
                        setSelectedRecipe(rec);
                        navigate('recipe');
                      }}
                    >
                      مشاهده دستور
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW: SMART WHEEL */}
          {currentView === 'wheel' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24, textAlign: 'center' }}>
              <div>
                <h1 style={{ fontSize: 24, fontWeight: 800 }}>گردونه تصمیم‌گیری هوشمند</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginTop: 4 }}>
                  برای پایان دادن به بلاتکلیفی «امروز چی بپزیم»، گردونه را بچرخانید!
                </p>
              </div>

              {/* Wheel Graphic */}
              <div style={{ position: 'relative', width: 280, height: 280, margin: '20px 0' }}>
                <svg 
                  viewBox="0 0 200 200" 
                  style={{
                    width: '100%',
                    height: '100%',
                    transition: wheelSpinning ? 'transform 2.5s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none',
                    transform: `rotate(${wheelRotation}deg)`
                  }}
                >
                  <circle cx="100" cy="100" r="95" fill="var(--bg-surface)" stroke="var(--border-strong)" strokeWidth="4" />
                  <path d="M100 100 L100 5 A95 95 0 0 1 195 100 Z" fill="#2F6B4F" opacity="0.85" />
                  <path d="M100 100 L195 100 A95 95 0 0 1 100 195 Z" fill="#E88B52" opacity="0.85" />
                  <path d="M100 100 L100 195 A95 95 0 0 1 5 100 Z" fill="#7D6FB5" opacity="0.85" />
                  <path d="M100 100 L5 100 A95 95 0 0 1 100 5 Z" fill="#47A376" opacity="0.85" />
                  <circle cx="100" cy="100" r="22" fill="var(--bg-canvas)" stroke="var(--border-strong)" strokeWidth="3" />
                </svg>

                {/* Needle */}
                <div style={{
                  position: 'absolute',
                  top: -12,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 0,
                  height: 0,
                  borderLeft: '10px solid transparent',
                  borderRight: '10px solid transparent',
                  borderTop: '20px solid var(--color-danger)'
                }} />
              </div>

              <button 
                className="btn btn-primary btn-lg btn-pill" 
                style={{ padding: '14px 40px', fontSize: 16 }}
                onClick={handleSpinWheel}
                disabled={wheelSpinning}
              >
                {wheelSpinning ? 'در حال چرخش…' : '🎯 چرخاندن گردونه'}
              </button>

              {wheelResult && (
                <div className="card" style={{ maxWidth: 400, marginTop: 16, animation: 'fadeIn 0.3s ease' }}>
                  <span className="badge badge-success">نتیجه شانس هوشمند</span>
                  <h3 style={{ fontSize: 20, fontWeight: 800, margin: '8px 0' }}>{wheelResult}</h3>
                  <button 
                    className="btn btn-secondary btn-sm"
                    onClick={() => navigate('cooking')}
                  >
                    شروع آشپزی با این غذا
                  </button>
                </div>
              )}
            </div>
          )}

          {/* VIEW: RECIPE DETAIL */}
          {currentView === 'recipe' && selectedRecipe && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840, margin: '0 auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span className="badge badge-success">{selectedRecipe.category}</span>
                  <h1 style={{ fontSize: 26, fontWeight: 800, marginTop: 6 }}>{selectedRecipe.title}</h1>
                </div>
                <button 
                  className="btn btn-primary btn-pill"
                  onClick={() => navigate('cooking')}
                  style={{ gap: 8 }}
                >
                  <Play size={16} /> ورود به حالت پخت گام‌به‌گام
                </button>
              </div>

              {/* Nutrition and specs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
                <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>کالری هر سهم</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRecipe.nutrition.calories}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>پروتئین</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRecipe.nutrition.protein}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>کربوهیدرات</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRecipe.nutrition.carbs}</div>
                </div>
                <div className="card" style={{ textAlign: 'center', padding: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>چربی</div>
                  <div style={{ fontSize: 16, fontWeight: 800 }}>{selectedRecipe.nutrition.fat}</div>
                </div>
              </div>

              {/* Ingredients */}
              <div className="card">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>مواد اولیه و وضعیت انبار:</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  {selectedRecipe.ingredients.map((ing, idx) => (
                    <div 
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 12px',
                        background: 'var(--bg-muted)',
                        borderRadius: 'var(--radius-sm)'
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 600 }}>{ing.name} ({ing.amount})</span>
                      <span style={{ fontSize: 11, color: ing.in_pantry ? 'var(--color-primary)' : 'var(--color-accent)' }}>
                        {ing.in_pantry ? '✓ در انبار' : 'نیاز به خرید'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Steps */}
              <div className="card">
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>مراحل آماده‌سازی و طبخ:</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {selectedRecipe.steps.map((st, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        background: 'var(--color-primary)',
                        color: '#FFF',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        flexShrink: 0
                      }}>
                        {idx + 1}
                      </span>
                      <p style={{ fontSize: 14, lineHeight: 1.6 }}>{st}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

          {/* VIEW: COOKING MODE */}
          {currentView === 'cooking' && selectedRecipe && (
            <div style={{ maxWidth: 680, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1 style={{ fontSize: 22, fontWeight: 800 }}>حالت آشپزی: {selectedRecipe.title}</h1>
                <button className="btn btn-ghost" onClick={() => navigate('recipe')}>بازگشت</button>
              </div>

              {/* Digital Countdown Timer */}
              <div className="card" style={{ textAlign: 'center', padding: 32, background: 'var(--bg-surface)' }}>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>تایمر هوشمند معکوس مرحله پخت</div>
                <div style={{ fontSize: 56, fontWeight: 900, fontFamily: 'monospace', color: 'var(--color-primary)', letterSpacing: 2 }}>
                  {formatTimer(cookingTimer)}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginTop: 20 }}>
                  <button 
                    className="btn btn-primary btn-pill" 
                    onClick={() => setTimerRunning(!timerRunning)}
                    style={{ gap: 6, minWidth: 130 }}
                  >
                    {timerRunning ? <Pause size={18} /> : <Play size={18} />}
                    {timerRunning ? 'توقف موقت' : 'شروع تایمر'}
                  </button>
                  <button 
                    className="btn btn-secondary btn-pill"
                    onClick={() => {
                      setTimerRunning(false);
                      setCookingTimer(15 * 60);
                    }}
                  >
                    تنظیم مجدد (۱۵ دقیقه)
                  </button>
                </div>
              </div>

              {/* Current Step Instruction */}
              <div className="card" style={{ borderRight: '4px solid var(--color-primary)' }}>
                <div style={{ fontSize: 12, color: 'var(--color-primary)', fontWeight: 700, marginBottom: 8 }}>
                  مرحله {activeStepIndex + 1} از {selectedRecipe.steps.length}
                </div>
                <p style={{ fontSize: 18, fontWeight: 600, lineHeight: 1.8 }}>
                  {selectedRecipe.steps[activeStepIndex]}
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
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
                    onClick={() => {
                      setActiveStepIndex(i => Math.min(selectedRecipe.steps.length - 1, i + 1));
                      showToast('مرحله بعد ذخیره شد.');
                    }}
                  >
                    مرحله بعدی <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* VIEW: PANTRY INVENTORY */}
          {currentView === 'pantry' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h1 style={{ fontSize: 22, fontWeight: 800 }}>مدیریت انبار و یخچال</h1>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginTop: 4 }}>
                    لیست تمام اقلام موجود در خانه با تفکیک تاریخ مصرف
                  </p>
                </div>
              </div>

              {/* Quick Add Form */}
              <form onSubmit={handleAddPantry} className="card" style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                <input 
                  type="text" 
                  placeholder="نام ماده (مثلاً: گوجه‌فرنگی تازه)..." 
                  value={newPantryName}
                  onChange={(e) => setNewPantryName(e.target.value)}
                  style={{
                    flex: 2,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-canvas)',
                    color: 'var(--text-primary)',
                    fontSize: 13,
                    minWidth: 180
                  }}
                />
                <select 
                  value={newPantryCategory}
                  onChange={(e) => setNewPantryCategory(e.target.value)}
                  style={{
                    flex: 1,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-canvas)',
                    color: 'var(--text-primary)',
                    fontSize: 13
                  }}
                >
                  <option value="یخچال">یخچال</option>
                  <option value="فریزر">فریزر</option>
                  <option value="کابینت">کابینت</option>
                </select>
                <input 
                  type="number" 
                  placeholder="روز تا انقضا"
                  value={newPantryDays}
                  onChange={(e) => setNewPantryDays(Number(e.target.value))}
                  style={{
                    width: 100,
                    padding: '10px 14px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-subtle)',
                    background: 'var(--bg-canvas)',
                    color: 'var(--text-primary)',
                    fontSize: 13
                  }}
                />
                <button type="submit" className="btn btn-primary" style={{ gap: 6 }}>
                  <Plus size={16} /> افزودن به موجودی
                </button>
              </form>

              {/* Pantry Category Tabs */}
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {pantry
                  .filter(p => activePantryTab === 'همه' || p.category === activePantryTab)
                  .map(item => (
                    <div key={item.id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                          {item.quantity} {item.unit} • بخش {item.category}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span className={`badge ${item.is_expiring_soon || item.expiry_days_left <= 3 ? 'badge-warning' : 'badge-success'}`}>
                          {item.expiry_days_left} روز
                        </span>
                        <button 
                          className="btn btn-ghost"
                          style={{ padding: 6, color: 'var(--color-danger)' }}
                          onClick={() => handleDeletePantry(item.id, item.name)}
                          title="حذف یا مصرف شد"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* VIEW: SETTINGS */}
          {currentView === 'settings' && (
            <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800 }}>تنظیمات و اطلاعات سیستم</h1>
              
              <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>وضعیت مدل‌های هوش مصنوعی (AI Engine)</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>سرور محلی Ollama:</span>
                    <span style={{ fontWeight: 700, color: ollamaActive ? 'var(--color-primary)' : 'var(--color-accent)' }}>
                      {ollamaActive ? 'متصل (localhost:11434)' : 'آفلاین / حالت Fallback'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>مدل اصلی گفتمان:</span>
                    <span style={{ fontFamily: 'monospace' }}>gemma3:1b</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>مدل ثانویه (کد و استدلال):</span>
                    <span style={{ fontFamily: 'monospace' }}>qwen3-coder:30b</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>سرویس بک‌اند پایتون:</span>
                    <span style={{ fontFamily: 'monospace' }}>FastAPI on port 8200</span>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12 }}>پروتکل ایمنی هوش مصنوعی (Human-in-the-Loop)</h3>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                  طبق سند استاندارد PRD، هیچ عملیات تغییر موجودی در انبار، فاکتورها یا برنامه غذایی خانوار توسط هوش مصنوعی بدون دریافت تاییدیه مستقیم شما انجام نخواهد شد.
                </p>
              </div>
            </div>
          )}

        </div>
      </main>

      {/* AI Assistant Bottom Sheet / Drawer */}
      {aiDrawerOpen && (
        <div className="ai-drawer-overlay" onClick={() => setAiDrawerOpen(false)}>
          <div className="ai-drawer" onClick={(e) => e.stopPropagation()}>
            
            {/* Drawer Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 24px',
              borderBottom: '1px solid var(--border-subtle)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: 'var(--color-ai-light)',
                  color: 'var(--color-ai)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700 }}>دستیار صوتی و متنی آشپزخانه</h3>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>محیط جاری: {currentView}</div>
                </div>
              </div>
              <button className="btn btn-ghost" onClick={() => setAiDrawerOpen(false)} style={{ padding: 6 }}>
                <X size={20} />
              </button>
            </div>

            {/* Chat Conversation Scroll Area */}
            <div style={{
              padding: 20,
              overflowY: 'auto',
              maxHeight: '50vh',
              display: 'flex',
              flexDirection: 'column',
              gap: 14
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
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-lg)',
                    background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--bg-muted)',
                    color: msg.role === 'user' ? '#FFF' : 'var(--text-primary)',
                    fontSize: 14,
                    lineHeight: 1.6
                  }}>
                    {msg.content}
                  </div>

                  {/* Human-in-the-Loop Confirmation Card */}
                  {msg.draft_action && (
                    <div style={{
                      marginTop: 10,
                      padding: 14,
                      borderRadius: 'var(--radius-md)',
                      background: 'var(--color-accent-light)',
                      border: '1px solid var(--color-accent)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)' }}>
                        ⚠️ تاییدیه انسانی لازم است:
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600 }}>
                        {msg.draft_action.description}
                      </div>
                      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ fontSize: 12, padding: '6px 14px' }}
                          onClick={() => handleConfirmAction(msg.id, msg.draft_action)}
                        >
                          <Check size={14} /> تأیید و ثبت در انبار
                        </button>
                        <button 
                          className="btn btn-ghost btn-sm"
                          style={{ fontSize: 12, padding: '6px 14px' }}
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

                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, alignSelf: msg.role === 'user' ? 'flex-start' : 'flex-end' }}>
                    {msg.timestamp}
                  </span>
                </div>
              ))}

              {isAiLoading && (
                <div style={{ alignSelf: 'flex-end', fontSize: 13, color: 'var(--text-muted)', padding: '6px 12px' }}>
                  در حال استدلال با مدل هوش مصنوعی…
                </div>
              )}
            </div>

            {/* Input Form */}
            <form onSubmit={handleSendAi} style={{
              display: 'flex',
              gap: 10,
              padding: 16,
              borderTop: '1px solid var(--border-subtle)',
              background: 'var(--bg-surface)'
            }}>
              <input 
                type="text"
                placeholder="دستور خود را بنویسید (مثلاً: ۲ کیلو گوشت به فریزر اضافه کن)..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 'var(--radius-pill)',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: 13
                }}
              />
              <button 
                type="submit" 
                className="btn btn-primary btn-pill" 
                style={{ width: 44, height: 44, padding: 0 }}
                disabled={isAiLoading}
              >
                <Send size={18} />
              </button>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
export default App;
