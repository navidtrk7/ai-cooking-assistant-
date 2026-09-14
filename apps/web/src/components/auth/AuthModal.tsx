import React, { useState } from 'react';
import { Shield, UserPlus, LogIn, CheckCircle2, ArrowRight, X, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import type { User } from '../../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User) => void;
  showToast: (msg: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess, showToast }) => {
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  
  // Login Form
  const [loginIdentifier, setLoginIdentifier] = useState('navid');
  const [loginPassword, setLoginPassword] = useState('123');
  const [loginOtpCode, setLoginOtpCode] = useState('');
  const [otpSentForLogin, setOtpSentForLogin] = useState(false);

  // Register Form
  const [regFullName, setRegFullName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regUsername, setRegUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regStep, setRegStep] = useState<'details' | 'verify'>('details');
  const [regOtpCode, setRegOtpCode] = useState('1234');

  const [loading, setLoading] = useState(false);
  const [demoNotice, setDemoNotice] = useState<string | null>(null);

  if (!isOpen) return null;

  // Quick Super Admin Login
  const handleQuickAdminLogin = async () => {
    setLoading(true);
    try {
      const res = await api.login({ username_or_phone: 'navid', password: '123' });
      showToast(`خوش آمدید نوید عزیز! دسترسی سوپر ادمین برقرار شد.`);
      onSuccess(res.user);
      onClose();
    } catch (err: any) {
      showToast(err.message || 'خطا در ورود ادمین');
    } finally {
      setLoading(false);
    }
  };

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (loginMethod === 'password') {
        const res = await api.login({ username_or_phone: loginIdentifier, password: loginPassword });
        showToast(res.message || 'ورود با موفقیت انجام شد');
        onSuccess(res.user);
        onClose();
      } else {
        if (!otpSentForLogin) {
          const res = await api.requestOtp(loginIdentifier);
          setOtpSentForLogin(true);
          setDemoNotice(res.message);
          setLoginOtpCode('1234');
        } else {
          const res = await api.verifyOtp(loginIdentifier, loginOtpCode);
          showToast(res.message);
          onSuccess(res.user);
          onClose();
        }
      }
    } catch (err: any) {
      showToast(err.message || 'خطا در ورود');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regStep === 'details') {
      if (!regPhone || !regFullName || !regUsername) {
        showToast('لطفاً تمامی فیلدها را تکمیل کنید');
        return;
      }
      setLoading(true);
      try {
        const res = await api.requestOtp(regPhone);
        setDemoNotice(res.message);
        setRegStep('verify');
        setRegOtpCode('1234');
      } catch (err: any) {
        showToast(err.message || 'خطا در ارسال کد تایید');
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        if (regOtpCode.trim() !== '1234') {
          showToast('کد تایید نامعتبر است. در حالت دمو از ۱۲۳۴ استفاده کنید.');
          return;
        }
        const res = await api.register({
          full_name: regFullName,
          phone_number: regPhone,
          username: regUsername,
          password: regPassword || '123'
        });
        showToast('حساب کاربری جدید فعال شد!');
        onSuccess(res.user);
        onClose();
      } catch (err: any) {
        showToast(err.message || 'خطا در ثبت‌نام');
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 19, 0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      padding: 16
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 20,
        width: '100%',
        maxWidth: 480,
        boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
        border: '1px solid var(--border)',
        overflow: 'hidden',
        animation: 'fadeIn 0.25s ease'
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid var(--border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'var(--surface-2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 38,
              height: 38,
              borderRadius: 12,
              background: 'var(--primary)',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Shield size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800 }}>حساب کاربری و ورود</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--muted)' }}>دستیار آشپزی خانواده هوشمند</p>
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--text-2)',
            padding: 4,
            borderRadius: 8
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Quick Admin Access Banner */}
        <div style={{
          padding: '12px 20px',
          background: 'rgba(45, 106, 79, 0.08)',
          borderBottom: '1px dashed var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Sparkles size={14} /> ورود سریع سوپر ادمین (نوید)
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-2)' }}>نام: <b>navid</b> | رمز: <b>123</b> (دسترسی نامحدود)</div>
          </div>
          <button
            onClick={handleQuickAdminLogin}
            disabled={loading}
            style={{
              padding: '6px 14px',
              borderRadius: 10,
              background: 'var(--primary)',
              color: '#fff',
              border: 'none',
              fontSize: 12,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            ورود فوری
          </button>
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)'
        }}>
          <button
            onClick={() => { setTab('login'); setDemoNotice(null); }}
            style={{
              flex: 1,
              padding: '14px',
              border: 'none',
              background: tab === 'login' ? 'var(--surface)' : 'var(--surface-2)',
              borderBottom: tab === 'login' ? '3px solid var(--primary)' : 'none',
              fontWeight: tab === 'login' ? 800 : 500,
              color: tab === 'login' ? 'var(--primary)' : 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 14
            }}
          >
            <LogIn size={16} /> ورود به سیستم
          </button>
          <button
            onClick={() => { setTab('register'); setDemoNotice(null); setRegStep('details'); }}
            style={{
              flex: 1,
              padding: '14px',
              border: 'none',
              background: tab === 'register' ? 'var(--surface)' : 'var(--surface-2)',
              borderBottom: tab === 'register' ? '3px solid var(--primary)' : 'none',
              fontWeight: tab === 'register' ? 800 : 500,
              color: tab === 'register' ? 'var(--primary)' : 'var(--muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: 14
            }}
          >
            <UserPlus size={16} /> عضویت جدید (موبایل)
          </button>
        </div>

        <div style={{ padding: 24 }}>
          {demoNotice && (
            <div style={{
              padding: '10px 14px',
              borderRadius: 10,
              background: 'rgba(231, 140, 83, 0.12)',
              border: '1px solid var(--apricot)',
              color: 'var(--apricot)',
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <CheckCircle2 size={16} /> {demoNotice}
            </div>
          )}

          {tab === 'login' ? (
            <form onSubmit={handleStandardLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('password'); setOtpSentForLogin(false); }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    border: '1px solid var(--border)',
                    background: loginMethod === 'password' ? 'var(--primary-light)' : 'transparent',
                    color: loginMethod === 'password' ? 'var(--primary)' : 'var(--text-2)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  با نام کاربری و رمز
                </button>
                <button
                  type="button"
                  onClick={() => { setLoginMethod('otp'); setOtpSentForLogin(false); }}
                  style={{
                    flex: 1,
                    padding: '8px 10px',
                    borderRadius: 8,
                    fontSize: 12,
                    border: '1px solid var(--border)',
                    background: loginMethod === 'otp' ? 'var(--primary-light)' : 'transparent',
                    color: loginMethod === 'otp' ? 'var(--primary)' : 'var(--text-2)',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  با شماره موبایل (کد دمو)
                </button>
              </div>

              {loginMethod === 'password' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>نام کاربری یا شماره موبایل:</label>
                    <input
                      type="text"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="مثال: navid یا 0912..."
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontSize: 14
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>رمز عبور:</label>
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="رمز عبور (برای نوید: 123)"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontSize: 14
                      }}
                      required
                    />
                  </div>
                </>
              ) : (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>شماره موبایل:</label>
                    <input
                      type="tel"
                      value={loginIdentifier}
                      onChange={(e) => setLoginIdentifier(e.target.value)}
                      placeholder="مثال: 09123456789"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontSize: 14
                      }}
                      required
                    />
                  </div>
                  {otpSentForLogin && (
                    <div>
                      <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>کد تایید دمو (۱۲۳۴):</label>
                      <input
                        type="text"
                        value={loginOtpCode}
                        onChange={(e) => setLoginOtpCode(e.target.value)}
                        placeholder="کد تایید ۴ رقمی"
                        style={{
                          width: '100%',
                          padding: '10px 14px',
                          borderRadius: 10,
                          border: '1px solid var(--border)',
                          background: 'var(--surface-2)',
                          color: 'var(--text)',
                          fontSize: 16,
                          textAlign: 'center',
                          letterSpacing: 6,
                          fontWeight: 800
                        }}
                        required
                      />
                    </div>
                  )}
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                style={{
                  marginTop: 8,
                  padding: '12px 16px',
                  borderRadius: 12,
                  background: 'var(--primary)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 14,
                  fontWeight: 800,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8
                }}
              >
                {loading ? 'در حال پردازش...' : (
                  loginMethod === 'otp' && !otpSentForLogin ? 'ارسال کد تایید' : 'ورود به حساب'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {regStep === 'details' ? (
                <>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>نام و نام خانوادگی:</label>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="مثال: علی رضایی"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontSize: 14
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>شماره موبایل فعال:</label>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="مثال: 09121234567"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontSize: 14
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>نام کاربری دلخواه:</label>
                    <input
                      type="text"
                      value={regUsername}
                      onChange={(e) => setRegUsername(e.target.value)}
                      placeholder="مثال: ali_chef"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontSize: 14
                      }}
                      required
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 700, marginBottom: 6 }}>رمز عبور:</label>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="حداقل ۴ کاراکتر (یا ۱۲۳)"
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: '1px solid var(--border)',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontSize: 14
                      }}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      marginTop: 8,
                      padding: '12px 16px',
                      borderRadius: 12,
                      background: 'var(--primary)',
                      color: '#fff',
                      border: 'none',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8
                    }}
                  >
                    دریافت کد تایید دمو <ArrowRight size={16} />
                  </button>
                </>
              ) : (
                <>
                  <div style={{ textAlign: 'center', padding: '10px 0' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>کد تایید ارسال‌شده به {regPhone}</div>
                    <div style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>حالت آزمایشی: کد تایید دمو ۱۲۳۴ است</div>
                  </div>
                  <div>
                    <input
                      type="text"
                      value={regOtpCode}
                      onChange={(e) => setRegOtpCode(e.target.value)}
                      placeholder="۱۲۳۴"
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: 12,
                        border: '2px solid var(--primary)',
                        background: 'var(--surface-2)',
                        color: 'var(--text)',
                        fontSize: 20,
                        textAlign: 'center',
                        letterSpacing: 8,
                        fontWeight: 900
                      }}
                      required
                    />
                  </div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setRegStep('details')}
                      style={{
                        flex: 1,
                        padding: '12px',
                        borderRadius: 12,
                        border: '1px solid var(--border)',
                        background: 'transparent',
                        color: 'var(--text)',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      ویرایش شماره
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        flex: 2,
                        padding: '12px',
                        borderRadius: 12,
                        background: 'var(--primary)',
                        color: '#fff',
                        border: 'none',
                        fontSize: 14,
                        fontWeight: 800,
                        cursor: 'pointer'
                      }}
                    >
                      تایید و ساخت حساب
                    </button>
                  </div>
                </>
              )}
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
