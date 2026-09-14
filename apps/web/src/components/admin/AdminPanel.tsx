import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Cpu, Users, Activity, Sparkles, 
  RefreshCw, CheckCircle2, AlertTriangle, UserPlus, Server, 
  Radio, Check, ExternalLink, Zap, ChevronLeft, LogOut
} from 'lucide-react';
import { api } from '../../services/api';
import type { User, GeminiModelInfo, AiStatusResponse } from '../../types';

interface AdminPanelProps {
  currentUser: User | null;
  onClose?: () => void;
  onLogout?: () => void;
  showToast: (msg: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onClose, onLogout, showToast }) => {
  const [activeTab, setActiveTab] = useState<'ai' | 'users' | 'health'>('ai');
  
  // AI State
  const [aiStatus, setAiStatus] = useState<AiStatusResponse | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [activeProvider, setActiveProvider] = useState<string>('gemini');
  const [selectedModel, setSelectedModel] = useState<string>('gemini-2.5-flash');
  const [modelsList, setModelsList] = useState<GeminiModelInfo[]>([]);
  const [isSyncingModels, setIsSyncingModels] = useState(false);
  const [isTestingKey, setIsTestingKey] = useState(false);
  const [testResult, setTestResult] = useState<{ valid: boolean; message?: string; error?: string } | null>(null);

  // Users State
  const [usersList, setUsersList] = useState<User[]>([]);
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newFullName, setNewFullName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'member'>('member');
  const [newPass, setNewPass] = useState('123');

  // Load Initial Admin Data
  useEffect(() => {
    loadAiData();
    loadUsers();
  }, []);

  const loadAiData = async () => {
    try {
      const status = await api.getAiStatus();
      setAiStatus(status);
      setActiveProvider(status.active_provider || 'gemini');
      setSelectedModel(status.gemini_model || 'gemini-2.5-flash');

      // Fetch models
      const modelsRes = await api.getGeminiModels();
      if (modelsRes && modelsRes.models) {
        setModelsList(modelsRes.models);
        if (modelsRes.recommended_model && !status.gemini_model) {
          setSelectedModel(modelsRes.recommended_model);
        }
      }
    } catch (err) {
      console.error('Failed to load AI admin data', err);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await api.getUsers();
      setUsersList(users);
    } catch (err) {
      console.error('Failed to load users', err);
    }
  };

  // Sync / Fetch Models from Google API
  const handleSyncModels = async () => {
    setIsSyncingModels(true);
    setTestResult(null);
    try {
      const res = await api.getGeminiModels(apiKeyInput.trim() || undefined);
      if (res.models) {
        setModelsList(res.models);
        if (res.recommended_model) {
          setSelectedModel(res.recommended_model);
        }
        showToast(res.message || 'مدل‌ها با موفقیت بروزرسانی شدند.');
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در بروزرسانی مدل‌ها');
    } finally {
      setIsSyncingModels(false);
    }
  };

  // Test API Key
  const handleTestKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);
    try {
      const res = await api.testGeminiKey(apiKeyInput.trim() || undefined);
      setTestResult(res);
      if (res.valid) {
        showToast(res.message || 'اتصال با Google Gemini برقرار است!');
        // Automatically sync models after successful key validation
        handleSyncModels();
      } else {
        showToast(res.error || 'کلید API نامعتبر است');
      }
    } catch (err: any) {
      setTestResult({ valid: false, error: err.message });
      showToast('خطا در آزمون اتصال به سرور');
    } finally {
      setIsTestingKey(false);
    }
  };

  // Save AI Config
  const handleSaveAiConfig = async (provider?: string, model?: string) => {
    try {
      const targetProvider = provider || activeProvider;
      const targetModel = model || selectedModel;
      
      await api.updateAiConfig({
        ai_provider: targetProvider,
        gemini_model: targetModel,
        gemini_api_key: apiKeyInput.trim() || undefined
      });
      
      setActiveProvider(targetProvider);
      setSelectedModel(targetModel);
      showToast('تنظیمات هوش مصنوعی ذخیره و فعال شد.');
      loadAiData();
    } catch (err: any) {
      showToast(err.message || 'خطا در ذخیره تنظیمات');
    }
  };

  // Create User
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdminUser({
        full_name: newFullName,
        username: newUsername,
        phone_number: newPhone,
        role: newRole,
        password: newPass || '123'
      });
      showToast(`کاربر ${newFullName} با موفقیت افزوده شد.`);
      setShowAddUserModal(false);
      setNewFullName('');
      setNewUsername('');
      setNewPhone('');
      loadUsers();
    } catch (err: any) {
      showToast(err.message || 'خطا در ساخت کاربر');
    }
  };

  return (
    <div className="admin-panel-container" style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #13221A 0%, #1E3A2B 100%)',
        color: '#FFFFFF',
        borderRadius: 20,
        padding: '24px 32px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 24,
        boxShadow: '0 8px 24px rgba(19, 34, 26, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: 16,
            background: 'rgba(78, 163, 123, 0.2)',
            border: '1px solid rgba(78, 163, 123, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#4EA37B'
          }}>
            <ShieldCheck size={32} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800 }}>پنل مدیریت ارشد سیستم</h2>
              <span style={{
                background: 'var(--apricot)',
                color: '#fff',
                fontSize: 11,
                fontWeight: 700,
                padding: '2px 10px',
                borderRadius: 20
              }}>
                SUPER ADMIN
              </span>
            </div>
            <p style={{ margin: '4px 0 0', color: 'rgba(255,255,255,0.7)', fontSize: 13 }}>
              مدیر ارشد: <b>{currentUser?.full_name || 'نوید'}</b> ({currentUser?.username || 'navid'}) — کنترل زیرساخت، هوش مصنوعی و کاربران
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {onLogout && (
            <button
              onClick={onLogout}
              style={{
                padding: '10px 16px',
                borderRadius: 12,
                background: 'rgba(220,38,38,0.2)',
                border: '1px solid rgba(220,38,38,0.4)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <LogOut size={16} /> خروج از حساب
            </button>
          )}

          {onClose && (
            <button
              onClick={onClose}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                color: '#fff',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              بازگشت به برنامه <ChevronLeft size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: 12,
        marginBottom: 24,
        borderBottom: '1px solid var(--border)',
        paddingBottom: 12
      }}>
        <button
          onClick={() => setActiveTab('ai')}
          style={{
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'ai' ? 'var(--primary)' : 'var(--surface)',
            color: activeTab === 'ai' ? '#fff' : 'var(--text)',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: activeTab === 'ai' ? '0 4px 12px rgba(45,106,79,0.25)' : 'none'
          }}
        >
          <Cpu size={18} /> مرکز کنترل هوش مصنوعی (Google Gemini)
        </button>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'users' ? 'var(--primary)' : 'var(--surface)',
            color: activeTab === 'users' ? '#fff' : 'var(--text)',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: activeTab === 'users' ? '0 4px 12px rgba(45,106,79,0.25)' : 'none'
          }}
        >
          <Users size={18} /> مدیریت کاربران و اعضا ({usersList.length})
        </button>
        <button
          onClick={() => setActiveTab('health')}
          style={{
            padding: '12px 20px',
            borderRadius: 12,
            border: 'none',
            background: activeTab === 'health' ? 'var(--primary)' : 'var(--surface)',
            color: activeTab === 'health' ? '#fff' : 'var(--text)',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            boxShadow: activeTab === 'health' ? '0 4px 12px rgba(45,106,79,0.25)' : 'none'
          }}
        >
          <Activity size={18} /> تله‌متری و سلامت سرویس
        </button>
      </div>

      {/* TAB 1: AI CONTROL CENTER */}
      {activeTab === 'ai' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
          {/* Left Column: Provider & Key Configuration */}
          <div style={{
            background: 'var(--surface)',
            borderRadius: 18,
            padding: 24,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
              <div style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: 'var(--primary-light)',
                color: 'var(--primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Sparkles size={20} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>پیکربندی هوش مصنوعی پیش‌فرض</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>Google Gemini به عنوان هوش مصنوعی اصلی سیستم تنظیم شده است</p>
              </div>
            </div>

            {/* Provider Selector */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>موتور هوش مصنوعی فعال:</label>
              <div style={{ display: 'flex', gap: 10 }}>
                <div
                  onClick={() => handleSaveAiConfig('gemini', selectedModel)}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: 12,
                    border: `2px solid ${activeProvider === 'gemini' ? 'var(--primary)' : 'var(--border)'}`,
                    background: activeProvider === 'gemini' ? 'var(--primary-light)' : 'var(--surface-2)',
                    cursor: 'pointer',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>Google Gemini</div>
                    {activeProvider === 'gemini' && <Check size={18} color="var(--primary)" />}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>پیش‌فرض ابری | سرعت فوق‌العاده</div>
                  <div style={{
                    position: 'absolute',
                    top: -10,
                    right: 12,
                    background: 'var(--primary)',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '1px 8px',
                    borderRadius: 10
                  }}>
                    پیش‌فرض سیستم
                  </div>
                </div>

                <div
                  onClick={() => handleSaveAiConfig('ollama', 'gemma3:1b')}
                  style={{
                    flex: 1,
                    padding: '14px',
                    borderRadius: 12,
                    border: `2px solid ${activeProvider === 'ollama' ? 'var(--primary)' : 'var(--border)'}`,
                    background: activeProvider === 'ollama' ? 'var(--primary-light)' : 'var(--surface-2)',
                    cursor: 'pointer'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>Ollama Local</div>
                    {activeProvider === 'ollama' && <Check size={18} color="var(--primary)" />}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>محلی و آفلاین (Gemma3)</div>
                </div>
              </div>
            </div>

            {/* Gemini API Key Input */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 8 }}>
                کلید دسترسی Google Gemini API Key:
              </label>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="password"
                  value={apiKeyInput}
                  onChange={(e) => setApiKeyInput(e.target.value)}
                  placeholder="AIzaSy... (کلید API اختصاصی خود را وارد کنید)"
                  style={{
                    flex: 1,
                    padding: '12px 14px',
                    borderRadius: 10,
                    border: '1px solid var(--border)',
                    background: 'var(--surface-2)',
                    color: 'var(--text)',
                    fontSize: 13,
                    fontFamily: 'monospace'
                  }}
                />
                <button
                  onClick={handleTestKey}
                  disabled={isTestingKey}
                  style={{
                    padding: '10px 16px',
                    borderRadius: 10,
                    background: 'var(--primary)',
                    color: '#fff',
                    border: 'none',
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {isTestingKey ? <RefreshCw size={14} className="spin" /> : <Zap size={14} />}
                  تست اتصال
                </button>
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6, display: 'flex', justifyContent: 'space-between' }}>
                <span>کلید به صورت امن در نشست سرور ذخیره می‌شود.</span>
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}
                >
                  دریافت کلید رایگان از Google AI Studio <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div style={{
                padding: '12px 16px',
                borderRadius: 10,
                background: testResult.valid ? 'rgba(45,106,79,0.1)' : 'rgba(220,38,38,0.1)',
                border: `1px solid ${testResult.valid ? 'var(--primary)' : 'var(--danger)'}`,
                color: testResult.valid ? 'var(--primary)' : 'var(--danger)',
                fontSize: 12,
                fontWeight: 600,
                marginBottom: 20,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                {testResult.valid ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                {testResult.message || testResult.error}
              </div>
            )}

            {/* Sync Models Action */}
            <div style={{
              background: 'var(--surface-2)',
              borderRadius: 12,
              padding: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700 }}>بروزرسانی زنده لیست مدل‌ها از گوگل</div>
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>استعلام مستقیم آخرین مدل‌های هوش مصنوعی از سرور Google v1beta API</div>
              </div>
              <button
                onClick={handleSyncModels}
                disabled={isSyncingModels}
                style={{
                  padding: '8px 14px',
                  borderRadius: 8,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <RefreshCw size={14} className={isSyncingModels ? 'spin' : ''} />
                {isSyncingModels ? 'در حال دریافت...' : 'بروزرسانی مدل‌ها'}
              </button>
            </div>
          </div>

          {/* Right Column: Models List & Recommendation */}
          <div style={{
            background: 'var(--surface)',
            borderRadius: 18,
            padding: 24,
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>مدل‌های در دسترس Google Gemini</h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>مدل فعال: <b>{selectedModel}</b></p>
              </div>
              <span style={{
                fontSize: 11,
                padding: '4px 10px',
                borderRadius: 20,
                background: 'rgba(231,140,83,0.15)',
                color: 'var(--apricot)',
                fontWeight: 700
              }}>
                {modelsList.length} مدل آماده
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: 420, overflowY: 'auto' }}>
              {modelsList.map((m) => {
                const isSelected = selectedModel === m.id;
                return (
                  <div
                    key={m.id}
                    onClick={() => handleSaveAiConfig('gemini', m.id)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 12,
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border)'}`,
                      background: isSelected ? 'var(--primary-light)' : 'var(--surface-2)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 800, fontSize: 14, color: 'var(--text)' }}>{m.name || m.id}</span>
                        {m.recommended && (
                          <span style={{
                            background: 'linear-gradient(90deg, #D97706, #F59E0B)',
                            color: '#fff',
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '2px 8px',
                            borderRadius: 10,
                            boxShadow: '0 2px 6px rgba(217, 119, 6, 0.3)'
                          }}>
                            بهترین مدل پیشنهادی ⭐
                          </span>
                        )}
                      </div>
                      <span style={{
                        fontSize: 11,
                        color: 'var(--muted)',
                        background: 'var(--surface)',
                        padding: '2px 8px',
                        borderRadius: 6,
                        border: '1px solid var(--border)'
                      }}>
                        {m.tier}
                      </span>
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.5 }}>
                      {m.description}
                    </p>
                    {isSelected && (
                      <div style={{
                        marginTop: 8,
                        fontSize: 11,
                        color: 'var(--primary)',
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}>
                        <CheckCircle2 size={13} /> انتخاب‌شده به عنوان مدل فعال پاسخگوی دستیار
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div style={{
          background: 'var(--surface)',
          borderRadius: 18,
          padding: 24,
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800 }}>فهرست کاربران و اعضای ثبت‌نام‌شده</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>مدیریت اعضای خانواده، نقش‌ها و حساب‌های فعال</p>
            </div>
            <button
              onClick={() => setShowAddUserModal(true)}
              style={{
                padding: '10px 18px',
                borderRadius: 12,
                background: 'var(--primary)',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 6
              }}
            >
              <UserPlus size={16} /> افزودن کاربر جدید
            </button>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: 'var(--surface-2)', borderBottom: '1px solid var(--border)' }}>
                <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, borderRadius: '0 10px 10px 0' }}>نام و نام خانوادگی</th>
                <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>نام کاربری</th>
                <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>شماره همراه فعال</th>
                <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>سطح دسترسی (نقش)</th>
                <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>وضعیت حساب</th>
                <th style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, borderRadius: '10px 0 0 10px' }}>تاریخ ثبت</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '14px 16px', fontWeight: 700, fontSize: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 32,
                        height: 32,
                        borderRadius: 8,
                        background: u.role === 'super_admin' ? 'var(--primary)' : 'var(--surface-3)',
                        color: u.role === 'super_admin' ? '#fff' : 'var(--text)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800,
                        fontSize: 12
                      }}>
                        {u.full_name.charAt(0)}
                      </div>
                      {u.full_name}
                    </div>
                  </td>
                  <td style={{ padding: '14px 16px', fontFamily: 'monospace', fontSize: 13, color: 'var(--text-2)' }}>
                    {u.username}
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 13, color: 'var(--text)' }}>
                    {u.phone_number}
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      padding: '4px 10px',
                      borderRadius: 20,
                      fontSize: 11,
                      fontWeight: 700,
                      background: u.role === 'super_admin' ? 'rgba(231,140,83,0.15)' : 'rgba(45,106,79,0.1)',
                      color: u.role === 'super_admin' ? 'var(--apricot)' : 'var(--primary)'
                    }}>
                      {u.role === 'super_admin' ? 'سوپر ادمین (مدیر کل)' : u.role === 'admin' ? 'مدیر' : 'عضو خانواده'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                      color: u.is_active ? 'var(--primary)' : 'var(--danger)',
                      fontSize: 12,
                      fontWeight: 600
                    }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'currentColor' }} />
                      {u.is_active ? 'فعال و تاییدشده' : 'غیرفعال'}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', fontSize: 12, color: 'var(--muted)' }}>
                    {u.created_at || 'امروز'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Add User Modal */}
          {showAddUserModal && (
            <div style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999
            }}>
              <div style={{
                background: 'var(--surface)',
                borderRadius: 18,
                padding: 24,
                width: 440,
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                border: '1px solid var(--border)'
              }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 800 }}>افزودن کاربر جدید توسط ادمین</h3>
                <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>نام و نام خانوادگی:</label>
                    <input
                      type="text"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      placeholder="مثلاً: سارا احمدی"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>نام کاربری:</label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="sara_cook"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>شماره موبایل:</label>
                    <input
                      type="tel"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="0912..."
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>نقش دسترسی:</label>
                    <select
                      value={newRole}
                      onChange={(e: any) => setNewRole(e.target.value)}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                    >
                      <option value="member">عضو عادی خانواده</option>
                      <option value="admin">مدیر کمکی</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 4 }}>رمز عبور اولیه:</label>
                    <input
                      type="password"
                      value={newPass}
                      onChange={(e) => setNewPass(e.target.value)}
                      placeholder="پیش‌فرض: 123"
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface-2)', color: 'var(--text)' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                    <button
                      type="button"
                      onClick={() => setShowAddUserModal(false)}
                      style={{ flex: 1, padding: 10, borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', cursor: 'pointer' }}
                    >
                      انصراف
                    </button>
                    <button
                      type="submit"
                      style={{ flex: 1, padding: 10, borderRadius: 8, background: 'var(--primary)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer' }}
                    >
                      ثبت کاربر
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: SYSTEM HEALTH */}
      {activeTab === 'health' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
          <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Server size={20} color="var(--primary)" />
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>سرور بک‌اند FastAPI</h4>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--primary)', marginBottom: 4 }}>Online</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>پورت ۸۲۰۰ | معماری REST + TanStack</div>
          </div>

          <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Radio size={20} color="var(--apricot)" />
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>سرویس هوش مصنوعی Gemini</h4>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--apricot)', marginBottom: 4 }}>
              {selectedModel}
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              پرووایدر فعال: {aiStatus?.active_provider || 'gemini'} | Ollama محلی: {aiStatus?.ollama_active ? 'آماده' : 'غیرفعال'}
            </div>
          </div>

          <div style={{ background: 'var(--surface)', padding: 20, borderRadius: 16, border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <Users size={20} color="var(--lavender)" />
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>کاربران احراز هویت شده</h4>
            </div>
            <div style={{ fontSize: 24, fontWeight: 900, color: 'var(--lavender)', marginBottom: 4 }}>
              {usersList.length} کاربر
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>سوپر ادمین پیش‌فرض: navid (رمز ۱۲۳)</div>
          </div>
        </div>
      )}
    </div>
  );
};
