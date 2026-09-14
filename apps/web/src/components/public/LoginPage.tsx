import { ArrowRight, LockKeyhole, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { api } from '../../services/api';
import type { User } from '../../types';

interface LoginPageProps { onSuccess: (user: User) => void; onBack: () => void; }

export function LoginPage({ onSuccess, onBack }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setLoading(true); setError('');
    try { const result = await api.login({ username_or_phone: identifier, password }); onSuccess(result.user); }
    catch (err) { setError(err instanceof Error ? err.message : 'ورود ناموفق بود.'); }
    finally { setLoading(false); }
  };
  return <main className="login-page" dir="rtl"><section className="login-card">
    <button className="btn btn-ghost login-back" onClick={onBack}><ArrowRight size={16}/> بازگشت</button>
    <div className="login-logo"><Sparkles size={22}/></div><h1>خوش آمدید</h1><p>برای ادامه، وارد حساب خانواده‌تان شوید.</p>
    <form onSubmit={submit}><label>نام کاربری یا شماره موبایل<input value={identifier} onChange={e => setIdentifier(e.target.value)} required autoComplete="username"/></label>
      <label>رمز عبور<input type="password" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password"/></label>
      {error && <div className="login-error">{error}</div>}
      <button className="btn btn-primary btn-lg" type="submit" disabled={loading}>{loading ? 'در حال ورود…' : <><LockKeyhole size={16}/> ورود به آشپزخانه</>}</button>
    </form>
  </section></main>;
}
