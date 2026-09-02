const fs = require('fs');

const code = `
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Loader2, PlayCircle, Users, FileText, CheckCircle2, MessageSquare, LayoutTemplate, Terminal } from 'lucide-react';

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
  const [targetType, setTargetType] = useState<'post' | 'comment'>('post');
  const [targetAccounts, setTargetAccounts] = useState<'all' | 'personal' | 'pages'>('all');
  const [count, setCount] = useState<string>('all');
  const [selectedReactions, setSelectedReactions] = useState<string[]>(['LIKE']);
  const [comments, setComments] = useState('');
  const [isRandom, setIsRandom] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<{ok: number, fail: number} | null>(null);
  const [logs, setLogs] = useState<{name?: string, success?: boolean, message?: string, reaction?: string, raw?: string}[]>([]);
  
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

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
    setSummary(null);
    setLogs([]);

    const payload: any = { url: target, targetAccounts, count };
    if (type !== 'confirm' && type !== 'follow') payload.targetType = targetType;
    if (type === 'react') payload.reactions = selectedReactions;
    if (type === 'comment') {
      payload.words = comments.split('\\n').filter(c => c.trim());
      payload.isRandom = isRandom;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(\`/api/action/\${type}\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${token}\` },
        body: JSON.stringify(payload)
      });

      if (!response.body) throw new Error('No response body');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'progress') {
              setLogs(prev => [...prev, data.data]);
            } else if (data.type === 'done') {
              setSummary(data.summary);
            } else if (data.type === 'error') {
              setLogs(prev => [...prev, { raw: \`[ERROR] \${data.message || 'حدث خطأ'}\` }]);
            }
          } catch(e) {
            console.error('Failed to parse JSONL chunk', e);
          }
        }
      }
    } catch (err: any) {
      alert('حدث خطأ في الاتصال بالخادم.');
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
        {type !== 'confirm' && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">رابط الهدف أو معرفه (Link / ID)</label>
            <input
              type="text"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-3 px-4 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 transition-colors font-mono text-sm"
              placeholder={type === 'follow' ? 'مثال: ID الصفحة أو رابط الحساب' : 'مثال: https://www.facebook.com/... أو ID المنشور'}
              required
              dir="ltr"
            />
          </div>
        )}

        {(type === 'react' || type === 'unreact' || type === 'comment') && (
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-3">هل الرابط المستهدف هو لمنشور أم لتعليق؟</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTargetType('post')}
                className={\`py-3 px-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 border \${targetType === 'post' ? 'bg-white text-black border-white shadow-sm' : 'bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'}\`}
              >
                <LayoutTemplate className={\`w-4 h-4 \${targetType === 'post' ? 'text-black' : 'text-zinc-500'}\`} />
                منشور (Post)
              </button>
              <button
                type="button"
                onClick={() => setTargetType('comment')}
                className={\`py-3 px-2 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2 border \${targetType === 'comment' ? 'bg-white text-black border-white shadow-sm' : 'bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'}\`}
              >
                <MessageSquare className={\`w-4 h-4 \${targetType === 'comment' ? 'text-black' : 'text-zinc-500'}\`} />
                تعليق (Comment)
              </button>
            </div>
          </div>
        )}

        {type !== 'confirm' && (
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
                  className={\`py-3 px-2 rounded-xl text-xs sm:text-sm font-medium transition-colors flex flex-col items-center gap-2 border \${targetAccounts === ta.id ? 'bg-white text-black border-white shadow-sm' : 'bg-[#1a1a1a] border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700'}\`}
                >
                  <ta.icon className={\`w-5 h-5 \${targetAccounts === ta.id ? 'text-black' : 'text-zinc-500'}\`} />
                  {ta.label}
                </button>
              ))}
            </div>
          </div>
        )}

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
                  className={\`py-2 px-4 rounded-xl text-sm font-medium transition-all flex items-center gap-2 border \${selectedReactions.includes(rt.id) ? 'bg-zinc-800/80 text-white border-zinc-600 shadow-sm' : 'bg-transparent border-zinc-800 text-zinc-500 hover:bg-zinc-800 hover:border-zinc-700'}\`}
                >
                  <span className="text-xl">{rt.emoji}</span>
                  <span>{rt.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

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

      {/* Terminal Results */}
      {(logs.length > 0 || loading || summary) && (
        <div className="mt-8 bg-black border border-zinc-800 rounded-xl overflow-hidden shadow-2xl">
          <div className="bg-[#1a1a1a] px-4 py-3 flex justify-between items-center border-b border-zinc-800">
            <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
              <Terminal className="w-4 h-4" />
              مراقب العمليات المباشر (Real-time Log)
            </div>
            {summary && (
              <div className="flex items-center gap-3 text-xs">
                <span className="text-green-400 font-mono">نجاح: {summary.ok}</span>
                <span className="text-red-400 font-mono">فشل: {summary.fail}</span>
              </div>
            )}
          </div>
          <div className="p-4 h-64 overflow-y-auto font-mono text-xs sm:text-sm space-y-1.5 custom-scrollbar">
            {logs.map((log, i) => (
              <div key={i} className={\`\${log.raw ? 'text-zinc-500' : log.success ? 'text-green-400' : 'text-red-400'} flex gap-3\`}>
                <span className="text-zinc-600 select-none">[{new Date().toLocaleTimeString()}]</span>
                <span>
                  {log.raw ? log.raw : (
                    <>
                      {log.success ? '[+]' : '[-]'} {log.name} 
                      {log.reaction ? \` (تفاعل: \${log.reaction})\` : ''} 
                      {log.message ? \` - \${log.message}\` : ''}
                    </>
                  )}
                </span>
              </div>
            ))}
            {loading && (
              <div className="text-zinc-500 flex gap-3 animate-pulse">
                <span>[{new Date().toLocaleTimeString()}]</span>
                <span>[~] جاري الاتصال ومعالجة الحساب التالي...</span>
              </div>
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/ActionsPanel.tsx', code);
console.log('ActionsPanel real-time UI updated.');
