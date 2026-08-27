
import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, PlayCircle, Settings2 } from 'lucide-react';

interface Props {
  type: 'react' | 'unreact' | 'follow' | 'comment' | 'confirm';
  title: string;
  desc: string;
}

export default function ActionsPanel({ type, title, desc }: Props) {
  const [target, setTarget] = useState('');
  const [delay, setDelay] = useState(2);
  const [reactionType, setReactionType] = useState('LIKE');
  const [comments, setComments] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const payload: any = { target, delay };
    if (type === 'react') payload.type = reactionType;
    if (type === 'comment') {
      payload.comments = comments.split('\n').filter(c => c.trim());
    }

    try {
      const res = await axios.post(`/api/action/${type}`, payload);
      setResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'حدث خطأ');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Settings2 className="w-6 h-6 text-indigo-400" /> {title}
        </h2>
        <p className="text-slate-400">{desc}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-6 md:p-8 rounded-3xl shadow-xl space-y-6">
        {type !== 'confirm' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">رابط المنشور أو معرف الهدف (Link or ID)</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
              placeholder="مثال: 1459976664884 أو رابط منشور كامل"
              required
              dir="ltr"
            />
          </div>
        )}

        {type === 'react' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-3">نوع التفاعل</label>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                { id: 'LIKE', label: 'إعجاب' },
                { id: 'LOVE', label: 'أحببته' },
                { id: 'CARE', label: 'أدعمه' },
                { id: 'HAHA', label: 'هاها' },
                { id: 'WOW', label: 'واو' },
                { id: 'SAD', label: 'حزين' }
              ].map(rt => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => setReactionType(rt.id)}
                  className={`py-2 rounded-xl text-sm font-bold transition-all ${reactionType === rt.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'comment' && (
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">تعليقات مجدولة (تعليق في كل سطر)</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 text-white rounded-xl p-4 h-32 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-sm leading-relaxed"
              placeholder="الرد الأول&#10;الرد الثاني"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">الفاصل الزمني (بالثواني)</label>
          <input
            type="number"
            min="1"
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="w-full md:w-1/3 bg-slate-950 border border-slate-800 text-white rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
        >
          {loading ? (
            <><Loader2 className="w-6 h-6 animate-spin" /> جاري التنفيذ...</>
          ) : (
            <><PlayCircle className="w-6 h-6" /> بدء العملية</>
          )}
        </button>
      </form>

      {result && (
        <div className="mt-8 bg-slate-900 border border-slate-800 p-6 rounded-2xl shadow-lg">
          <h3 className="font-bold text-white mb-4 text-lg">تقرير العملية</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-center">
              <span className="block text-xl font-bold text-white">{result.total}</span>
              <span className="text-sm text-slate-400">الإجمالي</span>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-xl text-center">
              <span className="block text-xl font-bold text-emerald-400">{result.success}</span>
              <span className="text-sm text-emerald-500/80">ناجح</span>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
              <span className="block text-xl font-bold text-red-400">{result.failed}</span>
              <span className="text-sm text-red-500/80">فشل</span>
            </div>
            <div className="bg-slate-800/50 border border-slate-700/50 p-4 rounded-xl text-center">
              <span className="block text-xl font-bold text-white">{result.invalid}</span>
              <span className="text-sm text-slate-400">غير صالح</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
