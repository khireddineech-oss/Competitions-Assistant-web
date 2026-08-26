import React, { useState } from 'react';
import axios from 'axios';
import { Play, CheckCircle2, XCircle } from 'lucide-react';

interface Props {
  type: 'react' | 'unreact' | 'comment' | 'confirm' | 'follow';
}

const REACTIONS = [
  { id: 'LOVE', emoji: '♥️', label: 'أحببته' },
  { id: 'ANGRY', emoji: '😡', label: 'أغضبني' },
  { id: 'SAD', emoji: '😢', label: 'أحزنني' },
  { id: 'HAHA', emoji: '😆', label: 'أضحكني' },
  { id: 'WOW', emoji: '😮', label: 'واو' },
  { id: 'LIKE', emoji: '👍', label: 'إعجاب' }
];

export default function ActionsPanel({ type }: Props) {
  const [url, setUrl] = useState('');
  const [confirmUrl, setConfirmUrl] = useState('');
  const [targetType, setTargetType] = useState<'post' | 'comment'>('post');
  const [targetAccounts, setTargetAccounts] = useState<'both' | 'personal' | 'pages'>('both');
  const [count, setCount] = useState<string>('all');
  const [selectedReactions, setSelectedReactions] = useState<string[]>([]);
  const [commentType, setCommentType] = useState<'random' | 'custom'>('random');
  const [customWords, setCustomWords] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const getTitle = () => {
    switch (type) {
      case 'react': return 'إضافة تفاعلات';
      case 'unreact': return 'إزالة التفاعلات';
      case 'comment': return 'نشر تعليقات';
      case 'confirm': return 'تأكيد الإجراءات';
      case 'follow': return 'متابعة الصفحات';
    }
  };

  const executeAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    try {
      let endpoint = '';
      let payload: any = {};

      if (type === 'react') {
        endpoint = '/api/action/react';
        payload = { url, type: targetType, count, reactions: selectedReactions, targetAccounts };
      } 
      else if (type === 'unreact') {
        endpoint = '/api/action/unreact';
        payload = { url, type: targetType, toRemoveIds: customWords.split('\n').map(w => w.trim()).filter(Boolean), targetAccounts };
      }
      else if (type === 'confirm') {
        endpoint = '/api/action/confirm';
        payload = { mainUrl: url, confirmUrl, type: targetType, targetAccounts };
      }
      else if (type === 'follow') {
        endpoint = '/api/action/follow';
        payload = { pageId: url, count, targetAccounts };
      }
      else if (type === 'comment') {
        endpoint = '/api/action/comment';
        payload = { 
          url, 
          type: targetType, 
          count: parseInt(count, 10) || 1, 
          isRandom: commentType === 'random',
          words: customWords.split('\n').map(w => w.trim()).filter(Boolean),
          targetAccounts
        };
      }

      const res = await axios.post(endpoint, payload);
      setResult(res.data);
    } catch (err: any) {
      setResult({ error: err.response?.data?.error || err.message });
    } finally {
      setLoading(false);
    }
  };

  const toggleReaction = (r: string) => {
    setSelectedReactions(prev => 
      prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r]
    );
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">{getTitle()}</h2>
        <p className="text-gray-400 mt-1">تنفيذ المهام عبر الحسابات</p>
      </div>

      <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 p-6">
        <form onSubmit={executeAction} className="space-y-6">
          
          {(type === 'react' || type === 'unreact' || type === 'comment' || type === 'confirm') && (
            <div className="flex gap-2 p-1.5 bg-gray-950 border border-gray-800 rounded-xl w-max">
              {[
                { id: 'post', label: 'منشور' },
                { id: 'comment', label: 'تعليق' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetType(t.id as any)}
                  className={`px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-all ${
                    targetType === t.id 
                      ? 'bg-yellow-600 shadow-md text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">استهداف</label>
            <div className="flex flex-wrap gap-2 p-1.5 bg-gray-950 border border-gray-800 rounded-xl w-max">
              {[
                { id: 'both', label: 'الكل (حسابات وصفحات)' },
                { id: 'personal', label: 'حسابات شخصية' },
                { id: 'pages', label: 'صفحات فقط' }
              ].map(t => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTargetAccounts(t.id as any)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold capitalize transition-all ${
                    targetAccounts === t.id 
                      ? 'bg-yellow-600 shadow-md text-white' 
                      : 'text-gray-400 hover:text-white hover:bg-gray-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-300 mb-2">
              {type === 'follow' ? 'معرف الصفحة (ID)' : 'الرابط المستهدف'}
            </label>
            <input
              type="text"
              required
              value={url}
              onChange={e => setUrl(e.target.value)}
              dir="ltr"
              placeholder={type === 'follow' ? 'e.g., 123456789' : 'https://...'}
              className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 placeholder-gray-600 text-left"
            />
          </div>

          {type === 'confirm' && (
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                رابط التعليق التأكيدي
              </label>
              <input
                type="text"
                required
                value={confirmUrl}
                onChange={e => setConfirmUrl(e.target.value)}
                dir="ltr"
                placeholder="https://..."
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 placeholder-gray-600 text-left"
              />
            </div>
          )}

          {(type === 'react' || type === 'follow') && (
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                حد الحسابات المشاركة
              </label>
              <input
                type="text"
                value={count}
                onChange={e => setCount(e.target.value)}
                dir="ltr"
                placeholder="'all' للجميع أو أدخل عدداً"
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 placeholder-gray-600 text-left"
              />
            </div>
          )}

          {type === 'react' && (
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-3">
                اختر التفاعلات
              </label>
              <div className="flex flex-wrap gap-3">
                {REACTIONS.map(r => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleReaction(r.id)}
                    className={`px-5 py-2.5 rounded-xl border text-sm font-bold transition-all flex items-center gap-2 ${
                      selectedReactions.includes(r.id)
                        ? 'border-yellow-500 bg-yellow-500/20 text-yellow-500 shadow-md shadow-yellow-900/20'
                        : 'border-gray-700 bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    <span className="text-lg">{r.emoji}</span>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {type === 'unreact' && (
            <div>
              <label className="block text-sm font-bold text-gray-300 mb-2">
                معرفات الحسابات لإزالة تفاعلها (معرف في كل سطر، اتركه فارغاً لمحاولة الجميع)
              </label>
              <textarea
                rows={4}
                value={customWords}
                onChange={e => setCustomWords(e.target.value)}
                dir="ltr"
                placeholder="ID1&#10;ID2&#10;..."
                className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 placeholder-gray-600 text-left"
              />
            </div>
          )}

          {type === 'comment' && (
            <>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">
                  عدد التعليقات
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={count}
                  onChange={e => setCount(e.target.value)}
                  dir="ltr"
                  className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 text-left"
                />
              </div>
              <div className="flex gap-2 p-1.5 bg-gray-950 border border-gray-800 rounded-xl w-max mb-5">
                {[
                  { id: 'random', label: 'عشوائي' },
                  { id: 'custom', label: 'مخصص' }
                ].map(t => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setCommentType(t.id as any)}
                    className={`px-6 py-2.5 rounded-lg text-sm font-bold capitalize transition-all ${
                      commentType === t.id 
                        ? 'bg-yellow-600 shadow-md text-white' 
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`}
                  >
                    كلمات {t.label}
                  </button>
                ))}
              </div>
              {commentType === 'custom' && (
                <div>
                  <label className="block text-sm font-bold text-gray-300 mb-2">
                    كلمات مخصصة (كلمة أو جملة في كل سطر)
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={customWords}
                    onChange={e => setCustomWords(e.target.value)}
                    className="w-full px-4 py-3 bg-gray-950 border border-gray-800 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
                  />
                </div>
              )}
            </>
          )}

          <button
            type="submit"
            disabled={loading || (type === 'react' && selectedReactions.length === 0)}
            className="w-full py-4 bg-yellow-600 text-white rounded-xl font-bold text-lg hover:bg-yellow-500 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-yellow-900/20"
          >
            <Play className="w-6 h-6 fill-current" />
            {loading ? 'جاري التنفيذ...' : 'بدء التنفيذ'}
          </button>
        </form>
      </div>

      {result && (
        <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 overflow-hidden mt-8">
          <div className="p-5 border-b border-gray-800 bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center">
            <h3 className="font-bold text-white">نتائج التنفيذ</h3>
            {result.error ? (
              <p className="text-red-400 font-bold text-sm mt-2 sm:mt-0 px-3 py-1 bg-red-500/10 rounded-lg">{result.error}</p>
            ) : (
              <div className="flex gap-4 text-sm font-bold mt-2 sm:mt-0">
                <span className="text-green-500 bg-green-500/10 px-3 py-1 rounded-lg">نجاح: {result.ok}</span>
                <span className="text-red-500 bg-red-500/10 px-3 py-1 rounded-lg">فشل: {result.fail}</span>
              </div>
            )}
          </div>
          {result.results && result.results.length > 0 && (
            <ul className="divide-y divide-gray-800 max-h-[400px] overflow-y-auto">
              {result.results.map((r: any, i: number) => (
                <li key={i} className="p-4 flex items-center gap-4 text-sm hover:bg-gray-800/30 transition">
                  {r.success ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0 flex flex-wrap items-center gap-2">
                    <span className="font-bold text-gray-200">{r.name}</span>
                    {r.reaction && <span className="px-2 py-0.5 bg-gray-800 text-yellow-500 rounded text-xs font-bold border border-gray-700">{r.reaction}</span>}
                    {r.message && <span className="text-gray-400 text-xs bg-gray-950 px-2 py-1 rounded border border-gray-800 truncate block max-w-full">{r.message}</span>}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
