import React, { useState } from 'react';
import axios from 'axios';
import { User } from '../types';
import { Lock } from 'lucide-react';

interface Props {
  onLogin: (user: User) => void;
}

export default function AuthScreen({ onLogin }: Props) {
  const [isLogin, setIsLogin] = useState(true);
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
      if (res.data.token) {
        localStorage.setItem('token', res.data.token);
      }
      onLogin(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'بيانات الدخول غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-2xl border border-gray-800 p-8">
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-br from-yellow-600 to-yellow-800 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-yellow-900/20">
            <Lock className="w-8 h-8" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-center text-white mb-2">
          {isLogin ? 'تسجيل الدخول' : 'حساب جديد'}
        </h2>
        <p className="text-center text-gray-400 mb-8">
          {isLogin ? 'الرجاء إدخال بياناتك للمتابعة' : 'أدخل بياناتك لإنشاء الحساب'}
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm text-center font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">اسم المستخدم</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all placeholder-gray-600"
              placeholder="أدخل اسم المستخدم"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">كلمة المرور</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-yellow-500 transition-all placeholder-gray-600"
              placeholder="أدخل كلمة المرور"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-yellow-600 text-white rounded-xl font-bold text-base hover:bg-yellow-500 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 disabled:opacity-50 transition-all shadow-lg shadow-yellow-900/20"
          >
            {loading ? 'يرجى الانتظار...' : (isLogin ? 'تسجيل الدخول' : 'إنشاء حساب')}
          </button>
        </form>

        <div className="mt-8 text-center text-sm text-gray-400">
          {isLogin ? "ليس لديك حساب؟ " : "لديك حساب بالفعل؟ "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-yellow-500 font-bold hover:text-yellow-400 transition-colors focus:outline-none"
          >
            {isLogin ? 'سجل الآن' : 'سجل الدخول'}
          </button>
        </div>
      </div>
    </div>
  );
}
