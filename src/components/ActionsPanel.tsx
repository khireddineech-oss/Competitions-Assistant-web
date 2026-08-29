
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
      <div className="mb-8 border-b border-zinc-800/50 pb-6">
        <h2 className="text-2xl font-bold text-white mb-1.5 flex items-center gap-2">
          {title}
        </h2>
        <p className="text-zinc-500 text-sm">{desc}</p>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#111] border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-sm space-y-6">
        {type !== 'confirm' && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">رابط المنشور أو معرف الهدف (Link or ID)</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors font-mono text-sm"
              placeholder="مثال: 1459976664884 أو رابط منشور كامل"
              required
              dir="ltr"
            />
          </div>
        )}

        {type === 'react' && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-3">نوع التفاعل</label>
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
                  className={`py-2 rounded-lg text-sm font-medium transition-colors ${reactionType === rt.id ? 'bg-white text-black' : 'bg-[#1a1a1a] border border-zinc-800 text-zinc-400 hover:bg-zinc-800'}`}
                >
                  {rt.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {type === 'comment' && (
          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">تعليقات مجدولة (تعليق في كل سطر)</label>
            <textarea
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg p-4 h-32 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors text-sm leading-relaxed"
              placeholder="الرد الأول&#10;الرد الثاني"
              required
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-zinc-400 mb-2">الفاصل الزمني (بالثواني)</label>
          <input
            type="number"
            min="1"
            value={delay}
            onChange={(e) => setDelay(Number(e.target.value))}
            className="w-full md:w-1/3 bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors font-mono text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-white hover:bg-zinc-200 text-black font-medium text-sm py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> جاري التنفيذ...</>
          ) : (
            <><PlayCircle className="w-4 h-4" /> بدء العملية</>
          )}
        </button>
      </form>

      {result && (
        <div className="mt-8 bg-[#111] border border-zinc-800/80 p-6 rounded-xl shadow-sm">
          <h3 className="font-medium text-white mb-4 text-sm">تقرير العملية</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg text-center">
              <span className="block text-xl font-medium text-white">{result.total}</span>
              <span className="text-xs text-zinc-500 mt-1 block">الإجمالي</span>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-lg text-center">
              <span className="block text-xl font-medium text-green-400">{result.success}</span>
              <span className="text-xs text-green-500 mt-1 block">ناجح</span>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-lg text-center">
              <span className="block text-xl font-medium text-red-400">{result.failed}</span>
              <span className="text-xs text-red-500 mt-1 block">فشل</span>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-lg text-center">
              <span className="block text-xl font-medium text-white">{result.invalid}</span>
              <span className="text-xs text-zinc-500 mt-1 block">غير صالح</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
