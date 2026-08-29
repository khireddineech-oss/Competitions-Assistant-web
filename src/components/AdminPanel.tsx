
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { User } from '../types';
import { ShieldAlert, Trash2, Clock, Ban, CheckCircle, AlertCircle, Edit, Settings } from 'lucide-react';

interface Props {
  siteName: string;
  currentAnnouncement?: string;
}

export default function AdminPanel({ siteName, currentAnnouncement }: Props) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [announcement, setAnnouncement] = useState(currentAnnouncement || '');
  const [newSiteName, setNewSiteName] = useState(siteName);
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [customDays, setCustomDays] = useState<Record<string, string>>({});

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
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.error || 'حدث خطأ');
    }
  };

  const updateSettings = async (key: string, value: string) => {
    setSettingsLoading(true);
    try {
      await axios.post('/api/admin/settings', { key, value });
      window.location.reload();
    } catch (err) {
      alert('فشل حفظ الإعدادات');
    } finally {
      setSettingsLoading(false);
    }
  };

  if (loading) return <div className="text-center p-12 text-zinc-500">جاري تحميل البيانات...</div>;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="mb-8 border-b border-zinc-800/50 pb-6">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2 mb-1.5">
           إدارة النظام
        </h2>
        <p className="text-zinc-500 text-sm">إدارة المستخدمين وإعدادات المنصة</p>
      </div>

      {/* Settings Cards */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl shadow-sm">
          <h3 className="font-medium text-white mb-4 flex items-center gap-2"><Edit className="w-4 h-4 text-zinc-400"/> اسم الموقع</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={newSiteName} 
              onChange={e => setNewSiteName(e.target.value)}
              className="flex-1 bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 text-sm transition-colors"
            />
            <button 
              onClick={() => updateSettings('siteName', newSiteName)}
              disabled={settingsLoading || newSiteName === siteName}
              className="bg-white hover:bg-zinc-200 text-black px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              حفظ
            </button>
          </div>
        </div>

        <div className="bg-[#111] border border-zinc-800 p-6 rounded-xl shadow-sm">
          <h3 className="font-medium text-white mb-4 flex items-center gap-2"><AlertCircle className="w-4 h-4 text-zinc-400"/> إعلان النظام</h3>
          <div className="flex gap-2">
            <input 
              type="text" 
              value={announcement} 
              onChange={e => setAnnouncement(e.target.value)}
              placeholder="اكتب إعلاناً ليظهر لجميع المستخدمين..."
              className="flex-1 bg-[#1a1a1a] border border-zinc-800 text-white rounded-lg px-4 py-2.5 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500 text-sm transition-colors"
            />
            <button 
              onClick={() => updateSettings('announcement', announcement)}
              disabled={settingsLoading || announcement === currentAnnouncement}
              className="bg-white hover:bg-zinc-200 text-black px-4 py-2.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              نشر
            </button>
          </div>
        </div>
      </div>

      <div className="bg-[#111] border border-zinc-800 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 text-xs uppercase">
              <tr>
                <th className="p-4 font-medium">المستخدم</th>
                <th className="p-4 font-medium">الرتبة</th>
                <th className="p-4 font-medium">الحالة</th>
                <th className="p-4 font-medium">الحسابات</th>
                <th className="p-4 font-medium">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-zinc-900/50 transition-colors text-sm">
                  <td className="p-4">
                    <div className="font-medium text-zinc-200">{u.username}</div>
                    <div className="text-xs text-zinc-500 mt-1">ID: {u.id.substring(0,8)}...</div>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${u.role === 'admin' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' : 'bg-zinc-800 text-zinc-400 border border-zinc-700'}`}>
                      {u.role === 'admin' ? 'مدير' : 'عضو'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col gap-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium w-max ${
                        u.status === 'active' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 
                        u.status === 'paused' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' : 
                        'bg-red-500/10 text-red-400 border border-red-500/20'
                      }`}>
                        {u.status === 'active' ? 'نشط' : u.status === 'paused' ? 'مجمد' : 'محظور'}
                      </span>
                      {u.expires_at && u.role !== 'admin' && (
                        <span className="text-[10px] text-zinc-500">
                          {new Date(u.expires_at) < new Date() ? 'منتهي الصلاحية' : `ينتهي في: ${new Date(u.expires_at).toLocaleDateString('ar-EG')}`}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="p-4 text-zinc-400">{u.accountsCount}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {u.role !== 'admin' && (
                        <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-md border border-zinc-800">
                          <input 
                            type="number" 
                            value={customDays[u.id] || ''} 
                            onChange={e => setCustomDays({...customDays, [u.id]: e.target.value})} 
                            className="w-12 bg-[#1a1a1a] border border-zinc-700 text-white px-1 py-1 rounded text-xs text-center focus:outline-none focus:border-zinc-500" 
                            placeholder="يوم" 
                          />
                          <button onClick={() => handleAction(u.id, 'extend', parseInt(customDays[u.id] || '30'))} className="text-xs bg-zinc-800 text-white hover:bg-zinc-700 px-2 py-1 rounded transition-colors">إضافة</button>
                          <button onClick={() => handleAction(u.id, 'reduce', parseInt(customDays[u.id] || '30'))} className="text-xs bg-zinc-800 text-white hover:bg-zinc-700 px-2 py-1 rounded transition-colors">خصم</button>
                        </div>
                      )}
                      
                      {u.status === 'blocked' ? (
                        <button onClick={() => handleAction(u.id, 'unblock')} className="text-green-500 hover:bg-green-500/10 p-1.5 rounded transition-colors" title="رفع الحظر"><CheckCircle className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => handleAction(u.id, 'block')} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors" title="حظر"><Ban className="w-4 h-4" /></button>
                      )}
                      
                      {u.status === 'paused' ? (
                        <button onClick={() => handleAction(u.id, 'unblock')} className="text-green-500 hover:bg-green-500/10 p-1.5 rounded transition-colors" title="تفعيل النشاط"><CheckCircle className="w-4 h-4" /></button>
                      ) : (
                        <button onClick={() => handleAction(u.id, 'pause')} className="text-yellow-500 hover:bg-yellow-500/10 p-1.5 rounded transition-colors" title="تجميد مؤقت"><Clock className="w-4 h-4" /></button>
                      )}

                      <button onClick={() => handleAction(u.id, 'delete')} className="text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors ml-2" title="حذف نهائي"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-zinc-500">لا يوجد أعضاء</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
