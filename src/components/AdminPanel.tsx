import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '../types';
import { Users, Clock, Ban, Trash2, CheckCircle2 } from 'lucide-react';

export default function AdminPanel() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      setUsers(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAction = async (userId: string, action: string, days?: number) => {
    try {
      await axios.post(`/api/admin/users/${userId}/action`, { action, days });
      setMessage('تم تحديث المستخدم بنجاح');
      await fetchUsers();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'فشلت العملية');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم وبياناته نهائياً؟')) return;
    try {
      await axios.delete(`/api/admin/users/${userId}`);
      setMessage('تم حذف المستخدم بنجاح');
      await fetchUsers();
    } catch (err: any) {
      setMessage(err.response?.data?.error || 'فشل الحذف');
    } finally {
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) return <div className="text-gray-400">جاري تحميل البيانات...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Users className="w-7 h-7 text-yellow-500" />
          المشتركين
        </h2>
        <p className="text-gray-400 mt-1">التحكم في العضويات والصلاحيات</p>
      </div>

      {message && (
        <div className="p-4 bg-green-500/10 text-green-400 rounded-xl text-sm border border-green-500/20 font-bold">
          {message}
        </div>
      )}

      <div className="bg-gray-900 rounded-2xl shadow-xl border border-gray-800 overflow-hidden">
        <div className="p-5 border-b border-gray-800 bg-gray-900/50">
          <h3 className="font-bold text-gray-200">قائمة المستخدمين</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right text-gray-400">
            <thead className="text-xs text-gray-300 uppercase bg-gray-950/50 border-b border-gray-800">
              <tr>
                <th className="px-6 py-4 font-bold">المستخدم</th>
                <th className="px-6 py-4 font-bold">الحالة</th>
                <th className="px-6 py-4 font-bold">انتهاء الاشتراك</th>
                <th className="px-6 py-4 font-bold text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {users.map(u => (
                <tr key={u.userId} className="hover:bg-gray-800/30 transition">
                  <td className="px-6 py-4">
                    <div className="font-bold text-gray-200">{u.username}</div>
                    <div className="text-xs text-gray-500 mt-1 uppercase">{u.role}</div>
                  </td>
                  <td className="px-6 py-4">
                    {u.status === 'active' ? (
                      <span className="px-2 py-1 bg-green-500/10 text-green-500 rounded text-xs font-bold border border-green-500/20">نشط</span>
                    ) : (
                      <span className="px-2 py-1 bg-red-500/10 text-red-500 rounded text-xs font-bold border border-red-500/20">محظور</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {u.role === 'admin' ? (
                      <span className="text-yellow-500 font-bold">عضوية دائمة</span>
                    ) : u.expiresAt !== null && u.expiresAt > 0 ? (
                      <span className={Date.now() > u.expiresAt ? 'text-red-400 font-bold' : 'text-gray-300'}>
                        {new Date(u.expiresAt).toLocaleDateString('ar-EG')}
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold">غير فعال</span>
                    )}
                  </td>
                  <td className="px-6 py-4 flex flex-wrap gap-2 justify-end">
                    {u.role !== 'admin' && (
                      <>
                        <button
                          onClick={() => handleAction(u.userId, u.status === 'active' ? 'block' : 'unblock')}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition ${
                            u.status === 'active' 
                              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' 
                              : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'
                          }`}
                        >
                          {u.status === 'active' ? <><Ban className="w-3.5 h-3.5" /> حظر</> : <><CheckCircle2 className="w-3.5 h-3.5" /> تنشيط</>}
                        </button>
                        
                        <div className="flex gap-1 bg-gray-950 p-1 rounded-lg border border-gray-800">
                          <button onClick={() => handleAction(u.userId, 'add_time', 1)} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-bold transition">+يوم</button>
                          <button onClick={() => handleAction(u.userId, 'add_time', 7)} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-bold transition">+أسبوع</button>
                          <button onClick={() => handleAction(u.userId, 'add_time', 30)} className="px-2 py-1 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded text-xs font-bold transition">+شهر</button>
                        </div>
                        
                        <button
                          onClick={() => handleDelete(u.userId)}
                          className="px-3 py-1.5 bg-red-500/10 text-red-500 rounded-lg text-xs font-bold hover:bg-red-500/20 transition flex items-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          حذف
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
