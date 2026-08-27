
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '../types';
import { ShieldAlert, Trash2, Clock, Ban, CheckCircle, AlertCircle, Edit, Settings, PlayCircle } from 'lucide-react';

interface Props {
  siteName: string;
  currentAnnouncement?: string;
}

export default function AdminPanel({ siteName, currentAnnouncement }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [newName, setNewName] = useState(siteName);
  const [newAnnouncement, setNewAnnouncement] = useState(currentAnnouncement || '');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [customDays, setCustomDays] = useState<Record<string, string>>({});

  const fetchUsers = async () => {
    try {
      const res = await axios.get('/api/admin/users');
      setUsers(res.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'حدث خطأ');
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
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'حدث خطأ');
    }
  };

  const updateSettings = async (key: string, value: string) => {
    setSettingsLoading(true);
    try {
      await axios.post('/api/admin/settings', { key, value });
      alert('تم التحديث بنجاح');
      window.location.reload();
    } catch (err) {
      alert('حدث خطأ أثناء التحديث');
    } finally {
      setSettingsLoading(false);
    }
  };

  if (loading) return <div className="text-center p-8 text-slate-400">جاري التحميل...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-400" /> إعدادات المنصة
        </h2>
        <p className="text-slate-400 mb-6">تحكم في اسم الموقع والإعلانات الإدارية</p>
        
        <div className="grid md:grid-cols-2 gap-6">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
             <label className="block text-sm font-medium text-slate-300 mb-2">اسم المنصة</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={newName} 
                 onChange={e => setNewName(e.target.value)}
                 className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
               />
               <button 
                 onClick={() => updateSettings('siteName', newName)}
                 disabled={settingsLoading}
                 className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition"
               >
                 حفظ
               </button>
             </div>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
             <label className="block text-sm font-medium text-slate-300 mb-2">إعلان إداري (يظهر لجميع المستخدمين)</label>
             <div className="flex gap-2">
               <input 
                 type="text" 
                 value={newAnnouncement} 
                 onChange={e => setNewAnnouncement(e.target.value)}
                 placeholder="اتركه فارغاً للإزالة"
                 className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-4 py-2 text-white focus:border-indigo-500 focus:outline-none"
               />
               <button 
                 onClick={() => updateSettings('announcement', newAnnouncement)}
                 disabled={settingsLoading}
                 className="bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition"
               >
                 نشر
               </button>
             </div>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-2">
          <ShieldAlert className="w-6 h-6 text-indigo-400" /> إدارة الأعضاء
        </h2>
        <p className="text-slate-400 mb-6">تحكم في صلاحيات واشتراكات الأعضاء</p>

        {error && <div className="text-red-400 bg-red-400/10 p-4 rounded-xl mb-4">{error}</div>}

        <div className="overflow-x-auto bg-slate-900 border border-slate-800 rounded-2xl">
          <table className="w-full text-right">
            <thead>
              <tr className="bg-slate-800/50 border-b border-slate-800">
                <th className="p-4 text-slate-400 font-medium">المستخدم</th>
                <th className="p-4 text-slate-400 font-medium">الدور</th>
                <th className="p-4 text-slate-400 font-medium">الحالة</th>
                <th className="p-4 text-slate-400 font-medium">الاشتراك</th>
                <th className="p-4 text-slate-400 font-medium text-center">إجراءات سريعة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="p-4 font-bold text-white">{u.username}</td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' : 'bg-slate-800 text-slate-300'}`}>
                      {u.role === 'admin' ? 'مدير' : 'مستخدم'}
                    </span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 
                      u.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400' : 'bg-red-500/10 text-red-400'
                    }`}>
                      {u.status === 'active' ? 'نشط' : u.status === 'paused' ? 'مجمد' : 'محظور'}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-slate-300">
                    {u.expires_at ? new Date(u.expires_at).toLocaleDateString('ar-EG') : 'مدى الحياة'}
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap items-center justify-center gap-2">
                      <div className="flex items-center gap-1 bg-slate-800/50 p-1 rounded-lg border border-slate-700/50">
                          <input type="number" value={customDays[u.id] || ''} onChange={e => setCustomDays({...customDays, [u.id]: e.target.value})} className="w-12 bg-slate-900 border border-slate-700 text-white px-1 py-1 rounded text-xs text-center focus:outline-none focus:border-indigo-500" placeholder="يوم" />
                          <button onClick={() => handleAction(u.id, 'extend', parseInt(customDays[u.id] || '30'))} className="text-xs bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white px-2 py-1 rounded transition">إضافة</button>
                          <button onClick={() => handleAction(u.id, 'reduce', parseInt(customDays[u.id] || '30'))} className="text-xs bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-white px-2 py-1 rounded transition">خصم</button>
                        </div>
                      
                      
                      {u.status === 'blocked' ? (
                        <button onClick={() => handleAction(u.id, 'unblock')} className="text-emerald-400 hover:bg-emerald-400/10 p-1.5 rounded transition" title="رفع الحظر"><CheckCircle className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => handleAction(u.id, 'block')} className="text-red-400 hover:bg-red-400/10 p-1.5 rounded transition" title="حظر"><Ban className="w-4 h-4" /></button>
                      )}
                      
                      {u.status === 'paused' ? (
                        <button onClick={() => handleAction(u.id, 'unblock')} className="text-emerald-400 hover:bg-emerald-400/10 p-1.5 rounded transition" title="تفعيل النشاط"><PlayCircle className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => handleAction(u.id, 'pause')} className="text-yellow-400 hover:bg-yellow-400/10 p-1.5 rounded transition" title="تجميد مؤقت"><Clock className="w-4 h-4" /></button>
                      )}

                      <button onClick={() => handleAction(u.id, 'delete')} className="text-red-400 hover:bg-red-400/10 p-1.5 rounded transition" title="حذف نهائي"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">لا يوجد أعضاء</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
