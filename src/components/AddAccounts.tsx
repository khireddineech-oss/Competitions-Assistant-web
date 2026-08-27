
import React, { useState } from 'react';
import axios from 'axios';
import { PlusCircle, Loader2, Key } from 'lucide-react';

export default function AddAccounts() {
  const [tokensText, setTokensText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const tokens = tokensText.split('\n').map(t => t.trim()).filter(t => t);
    
    try {
      const res = await axios.post('/api/accounts/bulk', { tokens });
      setResult(res.data);
      if (res.data.success > 0) setTokensText('');
    } catch (err: any) {
      alert(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <PlusCircle className="w-6 h-6 text-indigo-400" /> إضافة حسابات
        </h2>
        <p className="text-slate-400">أدخل مفاتيح الاتصال (Connection Keys) لربط الحسابات بالنظام، كل مفتاح في سطر مستقل.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <textarea
            value={tokensText}
            onChange={(e) => setTokensText(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 text-white rounded-2xl p-6 h-64 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-sm leading-relaxed"
            placeholder="أدخل مفاتيح الاتصال هنا...&#10;مفتاح 1&#10;مفتاح 2"
            required
            dir="ltr"
          />
          <div className="absolute top-4 right-4 text-slate-600">
            <Key className="w-6 h-6" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !tokensText.trim()}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
        >
          {loading && <Loader2 className="w-6 h-6 animate-spin" />}
          تأكيد وإضافة الحسابات
        </button>
      </form>

      {result && (
        <div className="mt-8 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <h3 className="font-bold text-white mb-4 text-lg">نتيجة العملية</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
              <span className="block text-2xl font-bold text-emerald-400">{result.success}</span>
              <span className="text-sm text-emerald-500/80">ناجح</span>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
              <span className="block text-2xl font-bold text-red-400">{result.failed}</span>
              <span className="text-sm text-red-500/80">فشل</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
