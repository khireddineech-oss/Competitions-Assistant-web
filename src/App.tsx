import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Users, UserPlus, LogOut, MessageSquare, ThumbsUp, CheckCircle, UserCheck, Trash2, Award, ChevronRight, Sliders, LayoutDashboard, ShieldAlert } from 'lucide-react';
import { cn } from './lib/utils';
import { User } from './types';

import AuthScreen from './components/AuthScreen';
import AccountsList from './components/AccountsList';
import AddAccounts from './components/AddAccounts';
import ActionsPanel from './components/ActionsPanel';
import AdminPanel from './components/AdminPanel';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentTab, setCurrentTab] = useState('home');

  useEffect(() => {
    checkAuth();

    const reqInterceptor = axios.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    const resInterceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.removeItem('token');
          setUser(null);
        }
        return Promise.reject(error);
      }
    );

    return () => {
      axios.interceptors.request.eject(reqInterceptor);
      axios.interceptors.response.eject(resInterceptor);
    };
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }
      const res = await axios.get('/api/auth/me');
      if (res.data.authenticated) {
        setUser(res.data);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch (err) {
      // ignore
    }
    localStorage.removeItem('token');
    setUser(null);
  };

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-950 text-yellow-500">جاري التحميل...</div>;
  }

  if (!user) {
    return <AuthScreen onLogin={setUser} />;
  }

  const tabs = [
    { id: 'accounts', label: 'حساباتي', icon: Users },
    { id: 'add', label: 'إضافة حسابات', icon: UserPlus },
    { id: 'react', label: 'تفاعلات', icon: ThumbsUp },
    { id: 'unreact', label: 'إزالة التفاعلات', icon: Trash2 },
    { id: 'comment', label: 'تعليقات', icon: MessageSquare },
    { id: 'confirm', label: 'تأكيدات', icon: CheckCircle },
    { id: 'follow', label: 'متابعة صفحات', icon: UserCheck },
  ];

  if (user.role === 'admin') {
    tabs.push({ id: 'admin', label: 'إدارة النظام', icon: ShieldAlert });
  }

  return (
    <div className="min-h-screen bg-gray-950 font-sans text-gray-200">
      <header className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-900/80 backdrop-blur-md sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-500 to-yellow-700 flex items-center justify-center shadow-lg shadow-yellow-900/20">
            <Sliders className="w-5 h-5 text-gray-900" />
          </div>
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 to-yellow-600">
            لوحة التحكم
          </h1>
          <div className="hidden sm:block mr-4">
            <span className="text-sm text-gray-400">أهلاً بك، <span className="text-white">{user.username}</span></span>
            {user.role !== 'admin' && user.expiresAt !== null && user.expiresAt !== undefined && !isNaN(Number(user.expiresAt)) && (
              <span className="text-xs text-gray-500 mr-2">
                (ينتهي: {Number(user.expiresAt) === 0 ? 'غير فعال' : new Date(Number(user.expiresAt)).toLocaleDateString('ar-EG')})
              </span>
            )}
          </div>
        </div>
        <button
          onClick={logout}
          className="text-red-500 flex items-center gap-2 hover:bg-red-500/10 px-4 py-2 rounded-lg text-sm font-medium transition"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">تسجيل الخروج</span>
        </button>
      </header>

      <main className="p-6 md:p-8 max-w-7xl mx-auto">
        {currentTab === 'home' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setCurrentTab(tab.id)}
                className="group p-6 bg-gray-900 border border-gray-800 rounded-2xl hover:border-yellow-500/50 hover:bg-gray-800 transition-all flex flex-col items-center justify-center gap-4 text-center aspect-square shadow-xl hover:shadow-2xl hover:-translate-y-1"
              >
                <div className="w-16 h-16 rounded-2xl bg-gray-950 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 shadow-inner">
                  <tab.icon className="w-8 h-8 text-yellow-500" />
                </div>
                <span className="font-bold text-lg text-white group-hover:text-yellow-500 transition-colors">{tab.label}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            <button
              onClick={() => setCurrentTab('home')}
              className="flex items-center gap-2 text-gray-400 hover:text-white transition bg-gray-900 px-5 py-2.5 rounded-xl border border-gray-800 w-max shadow-sm hover:border-gray-700"
            >
              <ChevronRight className="w-5 h-5" />
              <span className="font-bold">العودة للقائمة الرئيسية</span>
            </button>
            <div className="bg-gray-900 rounded-3xl p-6 md:p-10 shadow-2xl border border-gray-800">
              {currentTab === 'accounts' && <AccountsList />}
              {currentTab === 'add' && <AddAccounts />}
              {currentTab === 'react' && <ActionsPanel type="react" />}
              {currentTab === 'confirm' && <ActionsPanel type="confirm" />}
              {currentTab === 'unreact' && <ActionsPanel type="unreact" />}
              {currentTab === 'follow' && <ActionsPanel type="follow" />}
              {currentTab === 'comment' && <ActionsPanel type="comment" />}
              {currentTab === 'admin' && user.role === 'admin' && <AdminPanel />}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
