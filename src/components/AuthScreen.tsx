
import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User as UserIcon, AlertCircle, Loader2, TrendingUp } from 'lucide-react';
import { User } from '../types';

interface Props {
  onLogin: (user: User) => void;
  initialMode?: 'login' | 'register';
}

export default function AuthScreen({ onLogin, initialMode = 'login' }: Props) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
      const res = await axios.post(endpoint, { username, password });
      
      if (res.data.success && res.data.token) {
        localStorage.setItem('token', res.data.token);
        onLogin(res.data.user);
      }
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ في الاتصال بالمنصة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-[#111] border border-zinc-800/80 rounded-2xl p-8 shadow-2xl w-full" dir="rtl">
      <div className="mb-8">
        <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center mb-6">
          <TrendingUp className="text-black w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
          {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
        </h2>
        <p className="text-sm text-zinc-400">
          {isLogin ? 'مرحباً بعودتك إلى مساحة العمل الخاصة بك.' : 'أدخل بياناتك لإنشاء حساب والبدء فوراً.'}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-lg mb-6 flex items-start gap-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <span className="font-medium">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">اسم المستخدم</label>
          <div className="relative">
            <UserIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-2.5 pr-10 pl-4 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors text-sm"
              placeholder="أدخل اسم المستخدم"
              required
              minLength={3}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-1.5">كلمة المرور</label>
          <div className="relative">
            <Lock className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-2.5 pr-10 pl-4 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors text-sm"
              placeholder="أدخل كلمة المرور"
              required
              minLength={6}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white hover:bg-zinc-200 text-black font-medium text-sm py-2.5 rounded-lg transition-colors mt-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLogin ? 'دخول مساحة العمل' : 'تأكيد التسجيل'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="text-zinc-500 hover:text-zinc-300 transition-colors text-sm font-medium"
        >
          {isLogin ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب بالفعل؟ سجل دخولك'}
        </button>
      </div>
    </div>
  );
}
