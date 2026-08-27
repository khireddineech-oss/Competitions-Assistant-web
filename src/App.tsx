
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {  LogOut, LayoutDashboard, Link2, PlusCircle, Settings, PlayCircle, StopCircle, MessageSquare, CheckSquare, Users, Loader2, Bell , ChevronRight } from 'lucide-react';
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

  const siteName = settings.siteName || 'أوتوميت برو';

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-indigo-500 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 overflow-x-hidden font-sans" dir="rtl">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-950 to-slate-950 -z-10"></div>
        <nav className="p-6 flex justify-between items-center max-w-6xl mx-auto">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <PlayCircle className="text-white w-6 h-6" />
            </div>
            <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-indigo-400 to-purple-400">{siteName}</span>
          </div>
          <div className="flex gap-4">
            <button onClick={() => setShowAuth('login')} className="text-slate-300 font-medium hover:text-white transition">تسجيل الدخول</button>
            <button onClick={() => setShowAuth('register')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2 rounded-xl font-medium transition shadow-lg shadow-indigo-500/20 hidden sm:block">إنشاء حساب</button>
          </div>
        </nav>
        
        <main className="max-w-6xl mx-auto px-6 py-12 md:py-24 grid md:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <h1 className="text-4xl md:text-6xl font-extrabold text-white leading-tight mb-6">
              أدر نشاطك الرقمي <br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-500">بذكاء وسهولة</span>
            </h1>
            <p className="text-slate-400 text-lg mb-8 leading-relaxed">
              منصة متكاملة لأتمتة المهام اليومية، تنظيم القنوات، وإدارة الأنشطة بفعالية. نوفر لك الأدوات لتبسيط سير عملك وزيادة إنتاجيتك بخطوات بسيطة.
            </p>
            <button onClick={() => setShowAuth('register')} className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-8 py-4 rounded-full font-bold text-lg hover:shadow-xl hover:shadow-indigo-500/30 transition-all flex items-center gap-3">
              <PlayCircle className="w-6 h-6" />
              ابدأ تجربتك الآن
            </button>
          </motion.div>
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.6, delay: 0.2 }} className="relative">
             <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-3xl blur-2xl opacity-20"></div>
             <div className="relative bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl grid grid-cols-2 gap-4">
               {[
                 { icon: Link2, color: 'text-blue-400', bg: 'bg-blue-400/10', title: 'حساباتي' },
                 { icon: PlayCircle, color: 'text-indigo-400', bg: 'bg-indigo-400/10', title: 'تفاعلات' },
                 { icon: MessageSquare, color: 'text-purple-400', bg: 'bg-purple-400/10', title: 'تعليقات' },
                 { icon: Users, color: 'text-emerald-400', bg: 'bg-emerald-400/10', title: 'متابعة صفحات' }
               ].map((item, i) => (
                 <div key={i} className="bg-slate-800/50 p-6 rounded-2xl border border-slate-700/50 flex flex-col items-center gap-3 text-center">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${item.bg}`}>
                      <item.icon className={`w-6 h-6 ${item.color}`} />
                    </div>
                    <span className="text-slate-300 font-medium">{item.title}</span>
                 </div>
               ))}
             </div>
          </motion.div>
        </main>

        <AnimatePresence>
          {showAuth && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto">
               <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }} className="relative w-full max-w-md my-8">
                 <button onClick={() => setShowAuth(null)} className="absolute -top-4 -right-4 w-10 h-10 bg-slate-800 text-slate-400 hover:text-white rounded-full flex items-center justify-center z-10 shadow-lg border border-slate-700 transition">✕</button>
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
              <div className="bg-indigo-500/10 border border-indigo-500/30 p-4 rounded-2xl flex items-start gap-4">
                <Bell className="w-6 h-6 text-indigo-400 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="text-white font-bold mb-1">إعلان إداري</h3>
                  <p className="text-slate-300 text-sm leading-relaxed">{settings.announcement}</p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {tabs.filter(t => t.id !== 'home').map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setCurrentTab(tab.id)}
                  className="bg-slate-900 border border-slate-800 hover:border-indigo-500/50 p-6 rounded-3xl flex flex-col items-center justify-center gap-4 transition-all hover:bg-slate-800/80 group hover:-translate-y-1 shadow-lg"
                >
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
                    <tab.icon className="w-7 h-7 text-indigo-400 group-hover:text-indigo-300 transition-colors" />
                  </div>
                  <span className="font-bold text-slate-200">{tab.label}</span>
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
      <div className="min-h-screen bg-slate-950 flex flex-col md:flex-row font-sans text-slate-200" dir="rtl">
        {/* Desktop Sidebar */}
        <aside className="hidden md:flex flex-col w-72 bg-slate-900 border-l border-slate-800 sticky top-0 h-screen overflow-y-auto">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
              <PlayCircle className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-l from-indigo-400 to-purple-400">{siteName}</span>
          </div>
          <div className="px-6 pb-4">
            <div className="bg-slate-800/50 p-4 rounded-2xl border border-slate-700/50">
              <p className="text-xs text-slate-400 mb-1">المستخدم الحالي</p>
              <p className="font-bold text-white truncate">{user.username}</p>
              {user.role !== 'admin' && user.expires_at && (
                <div className="mt-2 text-xs font-medium text-emerald-400 bg-emerald-400/10 px-2 py-1 rounded inline-block">
                  صالح حتى: {(() => { try { return new Date(user.expires_at).toLocaleDateString('ar-EG'); } catch(e) { return '-'; } })()}
                </div>
              )}
            </div>
          </div>
          <nav className="flex-1 px-4 space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition ${currentTab === tab.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
          <div className="p-4">
            <button onClick={logout} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-red-400 hover:bg-red-400/10 transition font-medium">
              <LogOut className="w-5 h-5" />
              تسجيل الخروج
            </button>
          </div>
        </aside>

        {/* Mobile Header */}
        <header className="md:hidden bg-slate-900 border-b border-slate-800 p-4 sticky top-0 z-20 flex justify-between items-center">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg flex items-center justify-center">
                <PlayCircle className="text-white w-4 h-4" />
             </div>
             <span className="font-bold text-white">{siteName}</span>
          </div>
          <button onClick={logout} className="text-slate-400 hover:text-white p-2 bg-slate-800 rounded-lg"><LogOut className="w-5 h-5" /></button>
        </header>

        <main className="flex-1 p-4 md:p-8 pb-24 md:pb-8 w-full max-w-full overflow-x-hidden">
          <div className="max-w-4xl mx-auto">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              {currentTab !== 'home' && (
              <button
                onClick={() => setCurrentTab('home')}
                className="mb-6 flex items-center gap-2 text-slate-400 hover:text-white transition bg-slate-800/50 px-5 py-2.5 rounded-xl border border-slate-700/50 w-max shadow-sm hover:border-slate-600 hover:bg-slate-800"
              >
                <ChevronRight className="w-5 h-5" />
                <span className="font-bold">العودة للقائمة الرئيسية</span>
              </button>
            )}
            {renderContent()}
            </motion.div>
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/90 backdrop-blur-md border-t border-slate-800 z-20 pb-safe">
          <nav className="flex overflow-x-auto p-2 gap-1 no-scrollbar">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className={`flex-shrink-0 flex flex-col items-center justify-center w-16 h-14 rounded-xl transition-colors ${currentTab === tab.id ? 'text-indigo-400 bg-indigo-500/10' : 'text-slate-500 hover:text-slate-300'}`}
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
