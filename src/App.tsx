
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { LogOut, LayoutDashboard, Link2, PlusCircle, Settings, PlayCircle, StopCircle, MessageSquare, CheckSquare, Users, Loader2, Bell, ChevronRight, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AuthScreen from './components/AuthScreen';
import AccountsList from './components/AccountsList';
import AddAccounts from './components/AddAccounts';
import ActionsPanel from './components/ActionsPanel';
import AdminPanel from './components/AdminPanel';
import { User, Settings as SettingsType } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('home');
  const [showAuth, setShowAuth] = useState<'login' | 'register' | null>(null);
  const [settings, setSettings] = useState<SettingsType>({});

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get('/settings');
        setSettings(res.data);
      } catch (e) {
        // ignore
      }
    };
    fetchSettings();

    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        try {
          const res = await axios.get('/api/auth/me');
          setUser(res.data.user);
        } catch (err) {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const logout = async () => {
    try { await axios.post('/api/auth/logout'); } catch (e) {}
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setCurrentTab('home');
  };

  const siteName = settings.siteName || 'KHIRO INFO';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-zinc-400 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] text-zinc-100 overflow-x-hidden font-sans selection:bg-zinc-800" dir="rtl">
        <nav className="p-6 flex justify-between items-center max-w-7xl mx-auto border-b border-zinc-800/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <TrendingUp className="text-black w-5 h-5" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">{siteName}</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowAuth('login')} className="text-zinc-400 text-sm font-medium hover:text-white transition-colors">تسجيل الدخول</button>
            <button onClick={() => setShowAuth('register')} className="bg-white hover:bg-zinc-200 text-black px-5 py-2 rounded-lg text-sm font-medium transition-colors hidden sm:block">إنشاء حساب</button>
          </div>
        </nav>
        
        <main className="max-w-7xl mx-auto px-6 py-20 md:py-32 grid md:grid-cols-2 gap-16 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
            <h1 className="text-4xl md:text-6xl font-bold text-white leading-tight mb-6 tracking-tighter">
              إدارة احترافية <br/><span className="text-zinc-400">لنشاطك الرقمي.</span>
            </h1>
            <p className="text-zinc-400 text-lg mb-10 leading-relaxed max-w-lg">
              منصة متكاملة لأتمتة المهام اليومية، تنظيم الحسابات، وإدارة المهام بفعالية. نوفر لك الأدوات لتبسيط سير عملك وزيادة إنتاجيتك.
            </p>
            <button onClick={() => setShowAuth('register')} className="bg-white text-black px-8 py-4 rounded-lg font-medium text-lg hover:bg-zinc-200 transition-colors flex items-center gap-3">
              ابدأ تجربتك الآن
              <ChevronRight className="w-5 h-5" />
            </button>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, delay: 0.1, ease: 'easeOut' }} className="relative">
             <div className="bg-[#111] border border-zinc-800/80 p-8 rounded-2xl grid grid-cols-2 gap-4 shadow-2xl shadow-black">
               {[
                 { icon: Link2, title: 'حساباتي' },
                 { icon: PlayCircle, title: 'تفاعلات' },
                 { icon: MessageSquare, title: 'تعليقات' },
                 { icon: Users, title: 'متابعة صفحات' }
               ].map((item, i) => (
                 <div key={i} className="bg-[#1a1a1a] p-6 rounded-xl border border-zinc-800/50 flex flex-col items-start gap-4 transition-colors hover:border-zinc-700">
                    <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-zinc-100" />
                    </div>
                    <span className="text-zinc-300 font-medium text-sm">{item.title}</span>
                 </div>
               ))}
             </div>
          </motion.div>
        </main>
        <AnimatePresence>
          {showAuth && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="relative w-full max-w-md my-8">
                <button onClick={() => setShowAuth(null)} className="absolute -top-12 right-0 text-zinc-400 hover:text-white p-2">إغلاق ✕</button>
                <AuthScreen onLogin={setUser} initialMode={showAuth} />
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  const tabs = [
    { id: 'home', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'accounts', label: 'حساباتي', icon: Link2 },
    { id: 'add', label: 'إضافة حسابات', icon: PlusCircle },
    { id: 'react', label: 'تفاعلات', icon: PlayCircle },
    { id: 'unreact', label: 'إزالة التفاعلات', icon: StopCircle },
    { id: 'comment', label: 'تعليقات', icon: MessageSquare },
    { id: 'confirm', label: 'تأكيدات', icon: CheckSquare },
    { id: 'follow', label: 'متابعة صفحات', icon: Users },
  ];

  if (user.role === 'admin') {
    tabs.push({ id: 'admin', label: 'إدارة النظام', icon: Settings });
  }

  const renderContent = () => {
    switch (currentTab) {
      case 'home':
        return (
          <div className="space-y-6">
            {settings.announcement && (
              <div className="bg-zinc-900 border border-zinc-800 p-5 rounded-xl flex items-start gap-4">
                <Bell className="w-5 h-5 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-white font-medium text-sm mb-1">إعلان إداري</h3>
                  <p className="text-zinc-400 text-sm leading-relaxed">{settings.announcement}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tabs.filter(t => t.id !== 'home').map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className="bg-[#111] border border-zinc-800/80 hover:border-zinc-700 p-6 rounded-xl flex flex-col items-start gap-4 transition-all hover:bg-[#1a1a1a]"
                >
                  <div className="w-10 h-10 rounded-lg bg-zinc-800/80 flex items-center justify-center">
                    <tab.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="font-medium text-sm text-zinc-200">{tab.label}</span>
                </button>
              ))}
            </div>
          </div>
        );
      case 'accounts': return <AccountsList />;
      case 'add': return <AddAccounts />;
      case 'react': return <ActionsPanel type="react" title="تفاعلات" desc="إرسال تفاعلات بشكل آلي" />;
      case 'confirm': return <ActionsPanel type="confirm" title="تأكيدات" desc="قبول طلبات المتابعة تلقائياً" />;
      case 'unreact': return <ActionsPanel type="unreact" title="إزالة التفاعلات" desc="إزالة التفاعلات السابقة" />;
      case 'follow': return <ActionsPanel type="follow" title="متابعة صفحات" desc="متابعة صفحات جديدة" />;
      case 'comment': return <ActionsPanel type="comment" title="تعليقات" desc="نشر تعليقات مجدولة أو عشوائية" />;
      case 'admin': return user.role === 'admin' ? <AdminPanel siteName={siteName} currentAnnouncement={settings.announcement} /> : null;
      default: return null;
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-[#0a0a0a] flex flex-col md:flex-row font-sans text-zinc-200 selection:bg-zinc-800" dir="rtl">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-64 bg-[#111] border-l border-zinc-800/50 sticky top-0 h-screen overflow-y-auto">
          <div className="p-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
              <TrendingUp className="text-black w-4 h-4" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white">{siteName}</span>
          </div>
          
          <div className="px-4 pb-4">
            <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800/50">
              <p className="text-xs text-zinc-500 mb-1">المستخدم الحالي</p>
              <p className="font-medium text-sm text-white truncate">{user.username}</p>
              {user.role !== 'admin' && user.expires_at && (
                <div className="mt-3 text-xs font-medium text-zinc-400 flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                  صالح حتى: {(() => { try { return new Date(user.expires_at).toLocaleDateString('ar-EG'); } catch(e) { return '-'; } })()}
                </div>
              )}
            </div>
          </div>
          
          <nav className="flex-1 px-3 space-y-1 mt-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentTab === tab.id ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900/50 hover:text-white'}`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </nav>
          
          <div className="p-4 mt-auto border-t border-zinc-800/50">
            <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-950/30 transition-colors">
              <LogOut className="w-4 h-4" />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden bg-[#111] border-b border-zinc-800/50 p-4 sticky top-0 z-20 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <TrendingUp className="text-black w-4 h-4" />
             </div>
             <span className="font-bold tracking-tight text-white">{siteName}</span>
          </div>
          <button onClick={logout} className="text-zinc-400 hover:text-white p-2 rounded-lg"><LogOut className="w-5 h-5" /></button>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
          <div className="max-w-5xl mx-auto">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {currentTab !== 'home' && (
              <button
                onClick={() => setCurrentTab('home')}
                className="mb-8 flex items-center gap-2 text-zinc-400 hover:text-white transition-colors text-sm font-medium w-max"
              >
                <ChevronRight className="w-4 h-4" />
                <span>العودة للقائمة الرئيسية</span>
              </button>
            )}
            {renderContent()}
            </motion.div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#111]/95 backdrop-blur-md border-t border-zinc-800/50 z-20 pb-safe">
          <nav className="flex overflow-x-auto p-2 gap-1 no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-14 rounded-lg transition-colors ${currentTab === tab.id ? 'text-white bg-zinc-800' : 'text-zinc-500 hover:text-zinc-300'}`}
              >
                <tab.icon className="w-5 h-5 mb-1" />
                <span className="text-[10px] font-medium truncate w-full text-center">{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
