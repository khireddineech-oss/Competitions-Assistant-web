import React, { useState } from 'react';
import axios from 'axios';
import { Loader2, PlayCircle, Settings2, Users, FileText, CheckCircle2 } from 'lucide-react';

interface Props {
  type: 'react' | 'unreact' | 'follow' | 'comment' | 'confirm';
  title: string;
  desc: string;
}

const REACTIONS = [
  { id: 'LIKE', emoji: '👍', label: 'إعجاب' },
  { id: 'LOVE', emoji: '❤️', label: 'أحببته' },
  { id: 'CARE', emoji: '🫂', label: 'أدعمه' },
  { id: 'HAHA', emoji: '😂', label: 'هاها' },
  { id: 'WOW', emoji: '😲', label: 'واو' },
  { id: 'SAD', emoji: '😢', label: 'حزين' },
  { id: 'ANGRY', emoji: '😡', label: 'غاضب' }
];

export default function ActionsPanel({ type, title, desc }: Props) {
  const [target, setTarget] = useState('');
  const [targetAccounts, setTargetAccounts] = useState<'all' | 'personal' | 'pages'>('all');
  const [count, setCount] = useState<string>('all');
  const [selectedReactions, setSelectedReactions] = useState<string[]>(['LIKE']);
  const [comments, setComments] = useState('');
  const [isRandom, setIsRandom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const toggleReaction = (id: string) => {
    setSelectedReactions(prev => 
      prev.includes(id) && prev.length > 1 
        ? prev.filter(r => r !== id) 
        : [...new Set([...prev, id])]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const payload: any = { url: target, targetAccounts, count };
    if (type === 'react') payload.reactions = selectedReactions;
    if (type === 'comment') {
      payload.words = comments.split('\n').filter(c => c.trim());
      payload.isRandom = isRandom;
    }

    try {
      const res = await axios.post(`/api/action/${type}`, payload);
      setResult(res.data);
    } catch (err: any) {
      alert(err.response?.data?.error || 'حدث خطأ. تأكد من صحة الرابط وأن لديك حسابات متصلة.');
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

      <form onSubmit={handleSubmit} className="bg-[#111] border border-zinc-800 p-6 md:p-8 rounded-2xl shadow-sm space-y-8">
        
        {/* Target Link */}
        {type !== 'confirm' && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">رابط المنشور أو معرف الهدف (Link / ID)</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-3 px-4 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors font-mono text-sm"
              placeholder="مثال: https://www.facebook.com/... أو ID المنشور"
              required
              dir="ltr"
            />
          </div>
        )}

        {/* Target Accounts Type */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-3">نوع الحسابات المستخدمة في العملية</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: 'all', label: 'الكل (حسابات وصفحات)', icon: Users },
              { id: 'personal', label: 'الحسابات الشخصية فقط', icon: CheckCircle2 },
              { id: 'pages', label: 'الصفحات فقط', icon: FileText }
            ].map(ta => (
              <button
                key={ta.id}
                type="button"
                onClick={() => setTargetAccounts(ta.id as any)}
                className={`py-3 px-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex flex-col items-center gap-2 border ${targetAccounts === ta.id ? 'bg-white text-black border-white shadow-sm' : 'bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'}`}
              >
                <ta.icon className={`w-5 h-5 ${targetAccounts === ta.id ? 'text-black' : 'text-zinc-500'}`} />
                {ta.label}
              </button>
            ))}
          </div>
        </div>

        {/* Reaction Picker */}
        {type === 'react' && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">
              أنواع التفاعل (سيتم الاختيار منها عشوائياً لكل حساب)
            </label>
            <div className="flex flex-wrap gap-3">
              {REACTIONS.map(rt => (
                <button
                  key={rt.id}
                  type="button"
                  onClick={() => toggleReaction(rt.id)}
                  className={`py-2 px-4 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border ${selectedReactions.includes(rt.id) ? 'bg-zinc-800/80 text-white border-zinc-600 shadow-sm' : 'bg-transparent border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:border-zinc-700'}`}
                >
                  <span className="text-xl">{rt.emoji}</span>
                  <span>{rt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comments Input */}
        {type === 'comment' && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input 
                type="checkbox" 
                id="random_comments"
                checked={isRandom}
                onChange={e => setIsRandom(e.target.checked)}
                className="w-4 h-4 rounded border-zinc-700 text-indigo-500 focus:ring-indigo-500/20 bg-zinc-900"
              />
              <label htmlFor="random_comments" className="text-sm font-medium text-zinc-300 cursor-pointer">
                توليد تعليقات عشوائية (حروف وأرقام)
              </label>
            </div>

            {!isRandom && (
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">التعليقات المجدولة (تعليق في كل سطر)</label>
                <textarea
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg p-4 h-32 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors text-sm leading-relaxed"
                  placeholder="الرد الأول&#10;الرد الثاني"
                  required
                />
              </div>
            )}
          </div>
        )}

        {/* Count Input */}
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-2">العدد المطلوب</label>
          <div className="flex gap-3 items-center">
            <input
              type="number"
              min="1"
              value={count === 'all' ? '' : count}
              onChange={(e) => setCount(e.target.value || 'all')}
              placeholder="اكتب العدد..."
              disabled={count === 'all'}
              className="flex-1 max-w-[200px] bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-2.5 px-4 focus:outline-none focus:border-zinc-500 disabled:opacity-50 transition-colors font-mono text-sm"
            />
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="count_all"
                checked={count === 'all'}
                onChange={e => setCount(e.target.checked ? 'all' : '10')}
                className="w-4 h-4 rounded border-zinc-700 text-indigo-500 focus:ring-indigo-500/20 bg-zinc-900"
              />
              <label htmlFor="count_all" className="text-sm text-zinc-400 cursor-pointer">الحد الأقصى (كل الحسابات المتاحة)</label>
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || (type === 'react' && selectedReactions.length === 0)}
          className="w-full bg-white hover:bg-zinc-200 text-black font-medium text-sm py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> جاري التنفيذ...</>
          ) : (
            <><PlayCircle className="w-4 h-4" /> بدء العملية</>
          )}
        </button>
      </form>

      {/* Results */}
      {result && (
        <div className="mt-8 bg-[#111] border border-zinc-800/80 p-6 rounded-xl shadow-sm">
          <h3 className="font-medium text-white mb-6 text-sm">التقرير النهائي للعملية</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-[#1a1a1a] border border-zinc-800 p-4 rounded-xl text-center">
              <span className="block text-2xl font-medium text-white">{result.ok + result.fail || 0}</span>
              <span className="text-xs text-zinc-500 mt-1 block">إجمالي المحاولات</span>
            </div>
            <div className="bg-green-500/10 border border-green-500/20 p-4 rounded-xl text-center">
              <span className="block text-2xl font-medium text-green-400">{result.ok || 0}</span>
              <span className="text-xs text-green-500 mt-1 block">عملية ناجحة</span>
            </div>
            <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-xl text-center">
              <span className="block text-2xl font-medium text-red-400">{result.fail || 0}</span>
              <span className="text-xs text-red-500 mt-1 block">فشل</span>
            </div>
          </div>

          {/* Details */}
          {result.results && result.results.length > 0 && (
            <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
              {result.results.map((r: any, i: number) => (
                <div key={i} className="flex justify-between items-center bg-[#1a1a1a] border border-zinc-800/50 p-3 rounded-lg text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-white">{r.name}</span>
                    {r.reaction && <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{r.reaction}</span>}
                  </div>
                  {r.success ? (
                    <span className="text-green-400 text-xs font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3"/> ناجح</span>
                  ) : (
                    <span className="text-red-400 text-xs font-medium">فشل</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
