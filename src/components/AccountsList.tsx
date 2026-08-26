import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Account } from '../types';
import { Trash2, UserCircle, Share2, RefreshCw, Flag, DownloadCloud } from 'lucide-react';

export default function AccountsList() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareUsername, setShareUsername] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState('');

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

  const handleDelete = async (index: number) => {
    if (!confirm('هل أنت متأكد من حذف هذا الحساب؟')) return;
    try {
      await axios.delete(`/api/accounts/${index}`);
      await fetchAccounts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'فشل الحذف');
    }
  };

  const handleClear = async () => {
    if (!confirm('هل أنت متأكد من حذف جميع حساباتك الأصلية؟')) return;
    try {
      await axios.post('/api/accounts/clear');
      await fetchAccounts();
    } catch (err) {
      alert('فشلت العملية');
    }
  };

  const handleRenew = async () => {
    setActionLoading(true);
    setMessage('جاري تجديد الجلسات...');
    try {
      await axios.post('/api/accounts/renew');
      await fetchAccounts();
      setMessage('تم تجديد الجلسات بنجاح!');
    } catch (err) {
      setMessage('فشل في تجديد الجلسات.');
    } finally {
      setActionLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleShare = async () => {
    if (!shareUsername) return;
    setActionLoading(true);
    try {
      const res = await axios.post('/api/share', { targetUsername: shareUsername });
      setMessage(`تمت مشاركة ${res.data.count} حساب مع ${shareUsername}`);
      setShareUsername('');
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'فشلت المشاركة');
    } finally {
      setActionLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleFetchPages = async (index: number) => {
    setActionLoading(true);
    try {
      const res = await axios.post(`/api/accounts/${index}/pages`);
      setMessage(`تم جلب ${res.data.count} صفحة بنجاح`);
      await fetchAccounts();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'فشل جلب الصفحات');
    } finally {
      setActionLoading(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const myAccounts = accounts.filter(a => !a.shared_by && a.type !== 'page');
  const myPages = accounts.filter(a => !a.shared_by && a.type === 'page');
  const sharedAccounts = accounts.filter(a => a.shared_by);

  if (loading) return <div className="text-gray-400">جاري تحميل الحسابات...</div>;

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">حساباتي وصفحاتي</h2>
          <p className="text-gray-400 mt-1">قائمة الحسابات المرتبطة</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleRenew}
            disabled={actionLoading || myAccounts.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-gray-200 rounded-xl hover:bg-gray-700 transition disabled:opacity-50 text-sm font-bold border border-gray-700"
          >
            <RefreshCw className="w-4 h-4" />
            تجديد الجلسات
          </button>
          <button
            onClick={handleClear}
            disabled={myAccounts.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl hover:bg-red-500/20 transition disabled:opacity-50 text-sm font-bold"
          >
            <Trash2 className="w-4 h-4" />
            حذف الكل
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-yellow-500/10 text-yellow-500 rounded-xl text-sm border border-yellow-500/20 font-medium">
          {message}
        </div>
      )}

      <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-gray-900/50 flex flex-col sm:flex-row justify-between items-center gap-4">
          <h3 className="font-bold text-gray-200">مشاركة الحسابات</h3>
          <div className="flex gap-2 w-full sm:w-auto">
            <input
              type="text"
              placeholder="اسم المستخدم المستهدف"
              value={shareUsername}
              onChange={e => setShareUsername(e.target.value)}
              className="flex-1 sm:w-56 px-4 py-2 bg-gray-950 border border-gray-800 rounded-xl text-sm text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50"
            />
            <button
              onClick={handleShare}
              disabled={actionLoading || !shareUsername}
              className="flex items-center gap-2 px-4 py-2 bg-yellow-600 text-white rounded-xl hover:bg-yellow-500 transition disabled:opacity-50 text-sm font-bold"
            >
              <Share2 className="w-4 h-4" />
              مشاركة
            </button>
          </div>
        </div>

        {accounts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-medium">
            لم يتم إضافة أي حسابات بعد.
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {myAccounts.map((acc, idx) => {
              const realIndex = accounts.indexOf(acc);
              return (
                <li key={idx} className="p-5 flex items-center justify-between hover:bg-gray-800/50 transition">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
                      <UserCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-gray-100">{acc.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">معرف: {acc.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleFetchPages(realIndex)}
                      className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition text-xs font-medium border border-gray-700"
                    >
                      <DownloadCloud className="w-3.5 h-3.5" />
                      جلب الصفحات
                    </button>
                    <button
                      onClick={() => handleDelete(realIndex)}
                      className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </li>
              );
            })}
            
            {myPages.map((acc, idx) => (
              <li key={`page-${idx}`} className="p-5 flex items-center justify-between hover:bg-gray-800/50 transition bg-gray-900/30">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center border border-green-500/20">
                    <Flag className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-100">{acc.name} <span className="text-xs font-normal text-green-500 mr-2 bg-green-500/10 px-2 py-0.5 rounded-md">صفحة</span></p>
                    <p className="text-xs text-gray-500 mt-0.5">معرف: {acc.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(accounts.indexOf(acc))}
                  className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </li>
            ))}

            {sharedAccounts.map((acc, idx) => (
              <li key={`shared-${idx}`} className="p-5 flex items-center justify-between hover:bg-gray-800/50 transition bg-yellow-500/5">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-yellow-500/10 text-yellow-500 rounded-full flex items-center justify-center">
                    <Share2 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-gray-100">{acc.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">معرف: {acc.id} • حساب مشترك</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
