import React, { useState } from 'react';
import axios from 'axios';
import { Lock, User as UserIcon, AlertCircle } from 'lucide-react';
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
      setError(err.response?.data?.error || 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-3xl p-8 shadow-2xl w-full" dir="rtl">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-white mb-2">
          {isLogin ? 'تسجيل الدخول' : 'إنشاء حساب جديد'}
        </h2>
        <p className="text-gray-400">
          {isLogin ? 'مرحباً بعودتك إلى المنصة' : 'انضم إلينا لإدارة حساباتك'}
        </p>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-xl mb-6 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-medium text-sm">{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">اسم المستخدم</label>
          <div className="relative">
            <UserIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl py-3 pr-12 pl-4 focus:outline-none focus:border-yellow-500 transition-colors"
              placeholder="أدخل اسم المستخدم"
              required
              minLength={3}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">كلمة المرور</label>
          <div className="relative">
            <Lock className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-gray-950 border border-gray-800 text-white rounded-xl py-3 pr-12 pl-4 focus:outline-none focus:border-yellow-500 transition-colors"
              placeholder="أدخل كلمة المرور"
              required
              minLength={6}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-yellow-500 hover:bg-yellow-400 text-gray-950 font-bold py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'جاري التحميل...' : (isLogin ? 'دخول' : 'تسجيل')}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={() => {
            setIsLogin(!isLogin);
            setError('');
          }}
          className="text-gray-400 hover:text-yellow-500 transition-colors text-sm"
        >
          {isLogin ? 'ليس لديك حساب؟ سجل الآن' : 'لديك حساب بالفعل؟ سجل دخولك'}
        </button>
      </div>
    </div>
  );
}
