import React, { useState } from 'react';
import axios from 'axios';
import { UserPlus, Layers, Key } from 'lucide-react';

export default function AddAccounts() {
  const [mode, setMode] = useState<'single' | 'bulk' | 'token' | 'bulk_token'>('single');
  const [inputData, setInputData] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputData.trim()) return;
    
    setLoading(true);
    setResults([]);
    
    try {
      if (mode === 'single') {
        const [email, password] = inputData.split('\n');
        if (!email || !password) throw new Error('يرجى توفير البريد وكلمة المرور في سطرين منفصلين');
        const res = await axios.post('/api/accounts/add', { email: email.trim(), password: password.trim() });
        setResults([{ success: true, name: res.data.account.name }]);
      } 
      else if (mode === 'token') {
        const res = await axios.post('/api/accounts/add_token', { token: inputData.trim() });
        setResults([{ success: true, name: res.data.account.name }]);
      }
      else if (mode === 'bulk') {
        const lines = inputData.split('\n').map(l => l.trim()).filter(Boolean);
        if (lines.length % 2 !== 0) throw new Error('عدد الأسطر غير صحيح (يجب أن يكون أزواجاً من بريد/رقم سري)');
        const payload = [];
        for (let i = 0; i < lines.length; i += 2) {
          payload.push({ email: lines[i], password: lines[i+1] });
        }
        const res = await axios.post('/api/accounts/bulk_add', { lines: payload });
        setResults(res.data.results);
      }
      else if (mode === 'bulk_token') {
        const tokens = inputData.split('\n').map(l => l.trim()).filter(Boolean);
        const res = await axios.post('/api/accounts/bulk_tokens', { tokens });
        setResults(res.data.results);
      }
      setInputData('');
    } catch (err: any) {
      setResults([{ success: false, error: err.response?.data?.error || err.message }]);
    } finally {
      setLoading(false);
    }
  };

  const getPlaceholder = () => {
    switch (mode) {
      case 'single': return 'البريد الإلكتروني\nكلمة المرور';
      case 'bulk': return 'البريد1\nالرقم1\nالبريد2\nالرقم2...';
      case 'token': return 'أدخل التوكن (Access Token) هنا';
      case 'bulk_token': return 'توكن1\nتوكن2\n...';
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">إضافة حسابات</h2>
        <p className="text-gray-400 mt-1">ربط حسابات أو توكنات</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { id: 'single', label: 'حساب واحد', icon: UserPlus },
          { id: 'bulk', label: 'حسابات متعددة', icon: Layers },
          { id: 'token', label: 'توكن واحد', icon: Key },
          { id: 'bulk_token', label: 'توكنات متعددة', icon: Layers },
        ].map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id as any); setResults([]); setInputData(''); }}
            className={`p-5 rounded-2xl border text-center transition-all ${
              mode === m.id 
                ? 'border-yellow-500 bg-yellow-500/10 text-yellow-500' 
                : 'border-gray-800 bg-gray-900 hover:bg-gray-800 text-gray-400'
            }`}
          >
            <m.icon className={`w-7 h-7 mx-auto mb-3 ${mode === m.id ? 'text-yellow-500' : 'text-gray-500'}`} />
            <div className="font-bold text-sm">{m.label}</div>
          </button>
        ))}
      </div>

      <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 p-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              إدخال البيانات
            </label>
            <textarea
              rows={6}
              value={inputData}
              onChange={(e) => setInputData(e.target.value)}
              className="w-full p-4 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 transition-all font-mono text-sm placeholder-gray-600"
              placeholder={getPlaceholder()}
              required
              dir="ltr"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !inputData}
            className="w-full py-3.5 bg-yellow-600 text-white rounded-xl font-bold text-base hover:bg-yellow-500 transition disabled:opacity-50 shadow-lg shadow-yellow-900/20"
          >
            {loading ? 'جاري المعالجة...' : 'إرسال'}
          </button>
        </form>

        {results.length > 0 && (
          <div className="mt-6 p-5 bg-gray-950 rounded-xl border border-gray-800">
            <h4 className="font-bold text-gray-200 mb-4">النتائج</h4>
            <ul className="space-y-3 text-sm">
              {results.map((r, i) => (
                <li key={i} className="flex items-center gap-3 bg-gray-900 p-3 rounded-lg border border-gray-800">
                  {r.success ? (
                    <span className="text-green-500 font-medium">✓ نجاح: {r.name}</span>
                  ) : (
                    <span className="text-red-500 font-medium">✗ فشل: {r.error || r.email || 'خطأ غير معروف'}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
