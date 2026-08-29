
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
      <div className="mb-8 border-b border-zinc-800/50 pb-6">
        <h2 className="text-2xl font-bold text-white mb-1.5 flex items-center gap-2">
          إضافة حسابات
        </h2>
        <p className="text-zinc-500 text-sm">أدخل مفاتيح الاتصال (Connection Keys) لربط الحسابات بالنظام، كل مفتاح في سطر مستقل.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="relative">
          <textarea
            value={tokensText}
            onChange={(e) => setTokensText(e.target.value)}
            className="w-full bg-[#111] border border-zinc-800 text-white rounded-xl p-6 h-64 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors font-mono text-sm leading-relaxed"
            placeholder="أدخل مفاتيح الاتصال هنا...&#10;مفتاح 1&#10;مفتاح 2"
            required
            dir="ltr"
          />
          <div className="absolute top-4 right-4 text-zinc-600">
            <Key className="w-5 h-5" />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !tokensText.trim()}
          className="w-full bg-white hover:bg-zinc-200 text-black font-medium text-sm py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          تأكيد وإضافة الحسابات
        </button>
      </form>

      {result && (
        <div className="mt-8 bg-[#111] border border-zinc-800/80 p-6 rounded-xl shadow-sm">
          <h3 className="font-medium text-white mb-4 text-sm">نتيجة العملية</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg text-center">
              <span className="block text-2xl font-medium text-green-400">{result.success}</span>
              <span className="text-xs text-green-500 mt-1 block">ناجح</span>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-center">
              <span className="block text-2xl font-medium text-red-400">{result.failed}</span>
              <span className="text-xs text-red-500 mt-1 block">فشل</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
