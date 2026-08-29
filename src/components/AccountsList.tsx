
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Account } from '../types';
import { Trash2, Activity, Link2, Copy, Check } from 'lucide-react';
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
    if (!confirm('هل أنت متأكد من إزالة هذا الحساب؟')) return;
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

  if (loading) return <div className="text-center p-12 text-zinc-500">جاري تحميل الحسابات...</div>;

  return (
    <div>
      <div className="mb-8 flex justify-between items-end border-b border-zinc-800/50 pb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-1.5 flex items-center gap-2">
            حساباتي
          </h2>
          <p className="text-zinc-500 text-sm">إدارة الحسابات النشطة في مساحتك</p>
        </div>
        <div className="bg-white text-black px-3 py-1.5 rounded-md text-xs font-bold">
          {accounts.length} حساب
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {accounts.map((acc, index) => (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
            key={acc.id} 
            className="bg-[#111] border border-zinc-800/80 p-5 rounded-xl hover:border-zinc-700 transition-colors shadow-sm group relative"
          >
            <div className="flex justify-between items-start mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-zinc-900 rounded-lg flex items-center justify-center border border-zinc-800">
                  <Activity className="w-5 h-5 text-zinc-300" />
                </div>
                <div>
                  <h3 className="font-medium text-white text-base line-clamp-1" title={acc.name}>{acc.name}</h3>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    {acc.type === 'page' ? 'صفحة عامة' : 'حساب شخصي'}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(acc.id)}
                className="text-zinc-500 hover:text-red-400 p-2 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            
            <div className="bg-[#0a0a0a] p-3 rounded-lg border border-zinc-800/80 flex justify-between items-center group-hover:border-zinc-700/80 transition-colors">
               <div className="truncate text-xs text-zinc-500 font-mono ml-2" dir="ltr">
                  {acc.token ? acc.token.substring(0, 20) + '••••••••••' : 'لا يوجد مفتاح'}
               </div>
               {acc.token && (
                 <button 
                   onClick={() => copyToClipboard(acc.token!, acc.id)}
                   className="text-zinc-400 hover:text-white p-1.5 hover:bg-zinc-800 rounded transition-colors"
                 >
                   {copied === acc.id ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                 </button>
               )}
            </div>
          </motion.div>
        ))}
        {accounts.length === 0 && (
          <div className="col-span-full bg-[#111] border border-zinc-800/80 p-16 rounded-2xl text-center flex flex-col items-center justify-center">
            <Link2 className="w-10 h-10 text-zinc-600 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">لا توجد حسابات متصلة</h3>
            <p className="text-sm text-zinc-500">ابدأ بربط حساباتك من خلال صفحة "إضافة حسابات"</p>
          </div>
        )}
      </div>
    </div>
  );
}
