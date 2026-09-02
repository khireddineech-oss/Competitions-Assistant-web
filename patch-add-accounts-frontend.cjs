const fs = require('fs');

const code = `
import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Loader2, Plus, Users, Terminal, Key } from 'lucide-react';

interface Props {
  onSuccess: () => void;
}

export default function AddAccounts({ onSuccess }: Props) {
  const [activeTab, setActiveTab] = useState<'bulk' | 'login' | 'manual'>('bulk');
  
  // Bulk Tokens
  const [tokens, setTokens] = useState('');
  
  // Login Bulk
  const [loginText, setLoginText] = useState('');

  // Manual
  const [manualId, setManualId] = useState('');
  const [manualName, setManualName] = useState('');
  const [manualToken, setManualToken] = useState('');
  const [manualType, setManualType] = useState<'account' | 'page'>('account');
  
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<{type: 'info'|'success'|'error', text: string}[]>([]);
  const [extractedAccounts, setExtractedAccounts] = useState<any[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const saveToServer = async (accounts: any[]) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/accounts', { accounts }, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      return true;
    } catch (e) {
      return false;
    }
  };

  const streamProcess = async (url: string, bodyData: any) => {
    try {
      const authToken = localStorage.getItem('token');
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': \`Bearer \${authToken}\` },
        body: JSON.stringify(bodyData)
      });

      if (!response.body) throw new Error('No response body');
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let foundAccounts: any[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        const lines = chunk.split('\\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.type === 'account') {
              foundAccounts.push(data.data);
              setExtractedAccounts(prev => [...prev, data.data]);
              setLogs(prev => [...prev, { type: 'success', text: \`[+] تم استخراج: \${data.data.name} (\${data.data.type === 'page' ? 'صفحة' : 'حساب'})\` }]);
            } else if (data.type === 'error') {
              setLogs(prev => [...prev, { type: 'error', text: \`[-] \${data.message}\` }]);
            } else if (data.type === 'done') {
              setLogs(prev => [...prev, { type: 'info', text: \`[i] انتهى الفحص. تم العثور على \${foundAccounts.length} حساب/صفحة.\` }]);
              if (foundAccounts.length > 0) {
                setLogs(prev => [...prev, { type: 'info', text: '[i] جاري حفظ الحسابات في قاعدة البيانات...' }]);
                const saved = await saveToServer(foundAccounts);
                if (saved) {
                  setLogs(prev => [...prev, { type: 'success', text: '[+] تم الحفظ بنجاح! يمكنك الآن استخدامها.' }]);
                  setTimeout(onSuccess, 2000);
                } else {
                  setLogs(prev => [...prev, { type: 'error', text: '[-] فشل حفظ الحسابات.' }]);
                }
              }
            }
          } catch(e) { }
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, { type: 'error', text: '[-] حدث خطأ في الاتصال بالخادم.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLogs([]);
    setExtractedAccounts([]);

    const tokenList = tokens.split('\\n').map(t => t.trim()).filter(Boolean);
    if (tokenList.length === 0) {
      setLoading(false);
      return;
    }

    setLogs([{ type: 'info', text: \`بدء فحص \${tokenList.length} مفتاح (Token)...\` }]);
    await streamProcess('/api/accounts/extract', { tokens: tokenList });
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLogs([]);
    setExtractedAccounts([]);

    const lines = loginText.split('\\n').map(t => t.trim()).filter(Boolean);
    if (lines.length === 0) {
      setLoading(false);
      return;
    }

    const credentials = [];
    for (let i = 0; i < lines.length; i++) {
       if (lines[i].includes(':') || lines[i].includes('|')) {
           const parts = lines[i].split(/[:|]/);
           credentials.push({ email: parts[0].trim(), password: parts.slice(1).join(':').trim() });
       } else if (i + 1 < lines.length) {
           credentials.push({ email: lines[i], password: lines[i+1] });
           i++; // skip password line
       } else {
           setLogs(prev => [...prev, { type: 'error', text: \`[-] تنسيق غير صالح في السطر: \${lines[i]}\` }]);
       }
    }

    if (credentials.length === 0) {
        setLogs(prev => [...prev, { type: 'error', text: '[-] لم يتم العثور على بيانات تسجيل دخول صالحة.' }]);
        setLoading(false);
        return;
    }

    setLogs([{ type: 'info', text: \`بدء محاولة تسجيل الدخول لـ \${credentials.length} حساب...\` }]);
    await streamProcess('/api/accounts/login-extract', { credentials });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const acc = {
      id: manualId || Math.random().toString().substring(2, 12),
      name: manualName || 'حساب يدوي',
      token: manualToken,
      type: manualType
    };
    const saved = await saveToServer([acc]);
    setLoading(false);
    if (saved) {
      onSuccess();
    } else {
      alert('فشل الحفظ');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      
      {/* Tabs */}
      <div className="flex flex-col sm:flex-row bg-[#111] border border-zinc-800 rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab('bulk')}
          className={\`flex-1 py-3 px-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 \${activeTab === 'bulk' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}\`}
        >
          <Users className="w-4 h-4" /> إضافة بالتوكن (Tokens)
        </button>
        <button
          onClick={() => setActiveTab('login')}
          className={\`flex-1 py-3 px-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 \${activeTab === 'login' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}\`}
        >
          <Key className="w-4 h-4" /> تسجيل دخول (Email/Pass)
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={\`flex-1 py-3 px-2 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-2 \${activeTab === 'manual' ? 'bg-white text-black' : 'text-zinc-400 hover:text-white'}\`}
        >
          <Plus className="w-4 h-4" /> إضافة يدوية مخصصة
        </button>
      </div>

      {activeTab === 'manual' ? (
        <form onSubmit={handleManualSubmit} className="bg-[#111] border border-zinc-800 p-6 md:p-8 rounded-2xl max-w-2xl mx-auto space-y-6">
          <div className="mb-6 border-b border-zinc-800/50 pb-6">
            <h3 className="text-lg font-bold text-white mb-1">إضافة حساب يدوياً</h3>
            <p className="text-zinc-500 text-sm">استخدم هذه الطريقة إذا كان لديك تفاصيل حساب محدد أو لا تريد استخدام الفحص الآلي.</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">اسم الحساب (للعرض فقط)</label>
              <input
                type="text"
                value={manualName}
                onChange={e => setManualName(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-3 px-4 focus:outline-none focus:border-zinc-500"
                placeholder="مثال: حساب وهمي 1"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">نوع الحساب</label>
              <select
                value={manualType}
                onChange={e => setManualType(e.target.value as any)}
                className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-3 px-4 focus:outline-none focus:border-zinc-500 appearance-none"
              >
                <option value="account">حساب شخصي (Profile)</option>
                <option value="page">صفحة عامة (Page)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Facebook ID (اختياري)</label>
              <input
                type="text"
                value={manualId}
                onChange={e => setManualId(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-3 px-4 focus:outline-none focus:border-zinc-500 font-mono text-sm"
                placeholder="1000..."
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">الرمز (Access Token)</label>
              <textarea
                value={manualToken}
                onChange={e => setManualToken(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg py-3 px-4 focus:outline-none focus:border-zinc-500 font-mono text-sm h-32"
                placeholder="EAAB..."
                required
                dir="ltr"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white hover:bg-zinc-200 text-black font-medium py-3.5 rounded-xl transition-colors disabled:opacity-50 mt-4"
          >
            {loading ? 'جاري الحفظ...' : 'حفظ الحساب'}
          </button>
        </form>
      ) : (
        <div className="grid md:grid-cols-2 gap-6">
          {activeTab === 'bulk' ? (
            <form onSubmit={handleBulkSubmit} className="bg-[#111] border border-zinc-800 p-6 rounded-2xl flex flex-col h-full">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white mb-1">استخراج من Tokens</h3>
                <p className="text-zinc-500 text-sm">قم بلصق كل مفتاح Token (EAAB...) في سطر منفصل. سيقوم النظام باستخراج الحسابات والصفحات المرتبطة بها تلقائياً.</p>
              </div>
              
              <textarea
                value={tokens}
                onChange={(e) => setTokens(e.target.value)}
                className="w-full flex-1 min-h-[250px] bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg p-4 focus:outline-none focus:border-zinc-500 font-mono text-xs sm:text-sm custom-scrollbar mb-4"
                placeholder="EAAB...&#10;EAAB..."
                required
                disabled={loading}
                dir="ltr"
              />
              
              <button
                type="submit"
                disabled={loading || !tokens.trim()}
                className="w-full bg-white hover:bg-zinc-200 text-black font-medium py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الفحص والاستخراج...</> : 'بدء الاستخراج'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleLoginSubmit} className="bg-[#111] border border-zinc-800 p-6 rounded-2xl flex flex-col h-full">
              <div className="mb-4">
                <h3 className="text-lg font-bold text-white mb-1">تسجيل دخول مباشر</h3>
                <p className="text-zinc-500 text-sm">
                  أدخل الحسابات بصيغة <span className="font-mono text-indigo-400">email:password</span> أو <span className="font-mono text-indigo-400">email|password</span> (حساب في كل سطر).<br/>
                  أو اكتب البريد في سطر وكلمة المرور في السطر الذي يليه.
                </p>
              </div>
              
              <textarea
                value={loginText}
                onChange={(e) => setLoginText(e.target.value)}
                className="w-full flex-1 min-h-[250px] bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg p-4 focus:outline-none focus:border-zinc-500 font-mono text-xs sm:text-sm custom-scrollbar mb-4"
                placeholder="email@example.com:password123&#10;phone_number|password456&#10;email3@test.com&#10;password789"
                required
                disabled={loading}
                dir="ltr"
              />
              
              <button
                type="submit"
                disabled={loading || !loginText.trim()}
                className="w-full bg-white hover:bg-zinc-200 text-black font-medium py-3.5 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-auto"
              >
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري تسجيل الدخول...</> : 'بدء تسجيل الدخول'}
              </button>
            </form>
          )}

          {/* Terminal / Live Logs */}
          <div className="bg-black border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-full min-h-[400px]">
             <div className="bg-[#1a1a1a] px-4 py-3 flex justify-between items-center border-b border-zinc-800">
              <div className="flex items-center gap-2 text-zinc-400 text-sm font-medium">
                <Terminal className="w-4 h-4" />
                مراقب العمليات المباشر
              </div>
              <div className="text-xs font-mono text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                Found: {extractedAccounts.length}
              </div>
            </div>
            <div className="p-4 flex-1 overflow-y-auto font-mono text-xs sm:text-sm space-y-2 custom-scrollbar">
              {logs.map((log, i) => (
                <div key={i} className={\`
                  \${log.type === 'info' ? 'text-blue-400' : ''}
                  \${log.type === 'success' ? 'text-green-400' : ''}
                  \${log.type === 'error' ? 'text-red-400' : ''}
                \`}>
                  {log.text}
                </div>
              ))}
              {loading && logs.length > 0 && !logs[logs.length-1].text.includes('انتهى') && (
                <div className="text-zinc-500 animate-pulse mt-2">
                  [~] جاري الاتصال ومعالجة البيانات...
                </div>
              )}
              {logs.length === 0 && !loading && (
                <div className="text-zinc-600 flex flex-col items-center justify-center h-full gap-2">
                  <Terminal className="w-8 h-8 opacity-20" />
                  <span>النتائج ستظهر هنا في الوقت الفعلي</span>
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
`;

fs.writeFileSync('src/components/AddAccounts.tsx', code);
console.log('Frontend login route patched');
