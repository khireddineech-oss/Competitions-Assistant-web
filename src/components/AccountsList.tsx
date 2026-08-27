
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Account } from '../types';
import { Trash2, Shield, Activity, Link2, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AccountsList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get('/api/accounts');
      setAccounts(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من إزالة هذه الحساب؟')) return;
    try {
      await axios.delete(`/api/accounts/${id}`);
      setAccounts(accounts.filter(a => a.id !== id));
    } catch (err) {
      alert('حدث خطأ');
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  if (loading) return <div className="text-center p-12 text-slate-400">جاري تحميل الحسابات...</div>;

  return (
    <div>
      <div className="mb-6 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
            <Link2 className="w-6 h-6 text-indigo-400" /> حساباتي
          </h2>
          <p className="text-slate-400">إدارة الحسابات النشطة في مساحتك</p>
        </div>
        <div className="bg-slate-800/50 text-indigo-400 px-4 py-2 rounded-xl border border-indigo-500/20 font-bold">
          {accounts.length} حساب
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {accounts.map((acc, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
            key={acc.id} 
            className="bg-slate-900 border border-slate-800 p-5 rounded-2xl hover:border-indigo-500/30 transition-colors shadow-lg group relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl -z-10 group-hover:bg-indigo-500/10 transition-colors"></div>
            
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center border border-indigo-500/20">
                  <Activity className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg line-clamp-1" title={acc.name}>{acc.name}</h3>
                  <p className="text-sm text-slate-400 flex items-center gap-1">
                    {acc.type === 'page' ? 'صفحة عامة' : 'حساب شخصي'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(acc.id)}
                className="text-red-400 hover:bg-red-500/10 p-2 rounded-lg transition"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
            
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex justify-between items-center group-hover:border-slate-700 transition-colors">
               <div className="truncate text-xs text-slate-500 font-mono ml-2" dir="ltr">
                  {acc.token ? acc.token.substring(0, 20) + '••••••••••' : 'لا يوجد مفتاح'}
               </div>
               {acc.token && (
                 <button 
                   onClick={() => copyToClipboard(acc.token!, acc.id)}
                   className="text-indigo-400 hover:text-indigo-300 p-1.5 hover:bg-indigo-500/10 rounded flex-shrink-0 transition"
                 >
                   {copied === acc.id ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                 </button>
               )}
            </div>
          </motion.div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full bg-slate-900 border border-slate-800 p-12 rounded-3xl text-center">
            <Link2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">لا توجد قنوات متصلة</h3>
            <p className="text-slate-400">ابدأ بربط قنواتك من خلال صفحة "ربط حساب جديدة"</p>
          </div>
        )}
      </div>
    </div>
  );
}
