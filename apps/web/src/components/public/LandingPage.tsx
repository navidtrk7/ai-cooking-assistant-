import { ArrowLeft, CalendarDays, ChefHat, Mic, ShoppingBasket, Sparkles, Users } from 'lucide-react';

interface LandingPageProps {
  onStart: () => void;
  onLogin: () => void;
}

const features = [
  { icon: Mic, title: 'با گفتن، تصمیم بگیرید', text: 'شرایط خانواده، مواد موجود و زمان‌تان را بگویید؛ دستیار آن را به پیشنهاد عملی تبدیل می‌کند.' },
  { icon: ChefHat, title: 'غذای مناسب همه', text: 'ذائقه، محدودیت‌های قطعی سلامت، بودجه و مواد رو به انقضا پیش از پیشنهاد دیده می‌شوند.' },
  { icon: ShoppingBasket, title: 'خرید بدون دوباره‌کاری', text: 'فهرست مشترک از برنامهٔ غذا ساخته می‌شود تا خرید و موجودی خانه هماهنگ بماند.' },
];

export function LandingPage({ onStart, onLogin }: LandingPageProps) {
  return <main className="landing-page" dir="rtl">
    <nav className="landing-nav">
      <div className="landing-brand"><span><Sparkles size={19}/></span><strong>دستیار آشپزخانه</strong></div>
      <button className="btn btn-secondary btn-pill" onClick={onLogin}>ورود</button>
    </nav>
    <section className="landing-hero">
      <div className="landing-kicker"><Sparkles size={14}/> آشپزیِ هماهنگ برای خانواده</div>
      <h1>هر روز، یک تصمیم<br/><em>خوش‌طعم‌تر</em></h1>
      <p>یک دستیار فارسی برای انتخاب غذا، مدیریت مواد خانه، برنامه‌ریزی وعده‌ها و تقسیم کار خانواده.</p>
      <div className="landing-actions">
        <button className="btn btn-primary btn-lg btn-pill" onClick={onStart}>شروع آشپزی <ArrowLeft size={17}/></button>
        <button className="btn btn-ghost btn-lg" onClick={onLogin}>حساب دارم</button>
      </div>
      <div className="landing-prompt"><Mic size={18}/><span>«امشب ۶ نفر مهمان دارم؛ با مرغ و برنج چی بپزم؟»</span></div>
    </section>
    <section className="landing-features" aria-label="خدمات دستیار آشپزخانه">
      {features.map(({ icon: Icon, title, text }) => <article key={title} className="landing-feature"><Icon size={22}/><h2>{title}</h2><p>{text}</p></article>)}
    </section>
    <section className="landing-problem">
      <div><Users size={22}/><strong>تصمیم غذا، یک تصمیم خانوادگی است.</strong><p>این ابزار انتخاب غذا را از گفت‌وگوی پراکنده به یک برنامهٔ روشن، قابل توضیح و مشترک تبدیل می‌کند.</p></div>
      <div><CalendarDays size={22}/><strong>از امروز تا خرید هفته</strong><p>پیشنهاد، رسپی، پخت و خرید در یک جریان واحد کنار هم قرار می‌گیرند.</p></div>
    </section>
  </main>;
}
