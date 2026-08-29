import React, { useState } from 'react';
import axios from 'axios';
import { PlusCircle, Loader2, Key, CheckSquare, Square, Facebook, AlertCircle, Save, Check } from 'lucide-react';

interface FbAccount {
  id: string;
  name: string;
  token: string;
  type: 'account' | 'page';
  parentId: string;
}

export default function AddAccounts() {
  const [tokensText, setTokensText] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchedAccounts, setFetchedAccounts] = useState<FbAccount[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const fetchTokens = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFetchedAccounts([]);
    setErrors([]);
    setSuccessCount(null);
    
    const tokens = tokensText.split('\n').map(t => t.trim()).filter(t => t);
    const results: FbAccount[] = [];
    const errs: string[] = [];

    for (const t of tokens) {
      try {
        const meRes = await axios.get(`https://graph.facebook.com/me?access_token=${t}`);
        const personalId = meRes.data.id;
        results.push({
          id: personalId,
          name: meRes.data.name,
          token: t,
          type: 'account',
          parentId: personalId
        });

        try {
          const pagesRes = await axios.get(`https://graph.facebook.com/me/accounts?access_token=${t}`);
          if (pagesRes.data && pagesRes.data.data) {
            for (const p of pagesRes.data.data) {
              results.push({
                id: p.id,
                name: p.name,
                token: p.access_token,
                type: 'page',
                parentId: personalId
              });
            }
          }
        } catch (e) {
          // Ignore page fetch errors
        }
      } catch (err: any) {
        errs.push(`فشل الاتصال بالمفتاح الذي يبدأ بـ ${t.substring(0, 15)}...`);
      }
    }

    setFetchedAccounts(results);
    setSelected(new Set(results.map(r => r.id)));
    setErrors(errs);
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  };

  const selectAll = () => setSelected(new Set(fetchedAccounts.map(a => a.id)));
  const selectNone = () => setSelected(new Set());
  const selectProfiles = () => setSelected(new Set(fetchedAccounts.filter(a => a.type === 'account').map(a => a.id)));
  const selectPages = () => setSelected(new Set(fetchedAccounts.filter(a => a.type === 'page').map(a => a.id)));

  const handleSave = async () => {
    if (selected.size === 0) return;
    setSubmitting(true);
    const accountsToSave = fetchedAccounts.filter(a => selected.has(a.id));
    
    try {
      const res = await axios.post('/api/accounts', { accounts: accountsToSave });
      setSuccessCount(res.data.count);
      setTokensText('');
      setFetchedAccounts([]);
    } catch (err: any) {
      alert(err.response?.data?.error || 'حدث خطأ أثناء حفظ الحسابات');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8 border-b border-zinc-800/50 pb-6">
        <h2 className="text-2xl font-bold text-white mb-1.5 flex items-center gap-2">
          إضافة حسابات وصفحات
        </h2>
        <p className="text-zinc-500 text-sm">أدخل مفاتيح الاتصال لاستخراج الحسابات الشخصية والصفحات المرتبطة بها.</p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <form onSubmit={fetchTokens} className="space-y-6">
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
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Facebook className="w-4 h-4" />}
            استخراج الحسابات والصفحات
          </button>
        </form>

        <div className="bg-[#111] border border-zinc-800/80 rounded-xl p-6 min-h-[300px]">
          {successCount !== null && (
            <div className="bg-green-500/10 border border-green-500/20 text-green-400 p-4 rounded-lg mb-6 flex items-center justify-center gap-2">
              <Check className="w-5 h-5" />
              تم إضافة {successCount} حساب/صفحة بنجاح!
            </div>
          )}

          {errors.map((e, i) => (
            <div key={i} className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-4 text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> {e}
            </div>
          ))}

          {fetchedAccounts.length === 0 && !loading && (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500">
              <Key className="w-10 h-10 mb-3 opacity-20" />
              <p className="text-sm">لم يتم استخراج أي حسابات بعد.</p>
            </div>
          )}

          {fetchedAccounts.length > 0 && (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 pb-4 border-b border-zinc-800/50">
                <button onClick={selectAll} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors">تحديد الكل</button>
                <button onClick={selectNone} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg transition-colors">إلغاء التحديد</button>
                <button onClick={selectProfiles} className="text-xs bg-indigo-500/20 text-indigo-400 hover:bg-indigo-500/30 px-3 py-1.5 rounded-lg transition-colors">الحسابات الشخصية فقط</button>
                <button onClick={selectPages} className="text-xs bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 px-3 py-1.5 rounded-lg transition-colors">الصفحات فقط</button>
              </div>
              
              <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                {fetchedAccounts.map(acc => (
                  <div 
                    key={acc.id} 
                    onClick={() => toggleSelect(acc.id)}
                    className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${selected.has(acc.id) ? 'bg-zinc-800/50 border-zinc-700' : 'bg-transparent border-zinc-800/50 hover:bg-zinc-900/50'}`}
                  >
                    <div className="text-zinc-400">
                      {selected.has(acc.id) ? <CheckSquare className="w-5 h-5 text-white" /> : <Square className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="font-medium text-sm text-white">{acc.name}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{acc.type === 'page' ? 'صفحة عامة' : 'حساب شخصي'} • {acc.id}</div>
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={handleSave}
                disabled={submitting || selected.size === 0}
                className="w-full mt-4 bg-white hover:bg-zinc-200 text-black font-medium text-sm py-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                حفظ ({selected.size}) حساب/صفحة
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
