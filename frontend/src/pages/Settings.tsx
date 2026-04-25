import { useState, useEffect } from 'react';
import { User, Mail, Shield, Bell, Monitor, Lock } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import EmailNotificationSettings from '../components/EmailNotificationSettings';

export default function Settings() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      setCurrentUser(JSON.parse(userJson));
    }
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-hidden font-sans">
      <Sidebar isSidebarOpen={isSidebarOpen} setIsSidebarOpen={setIsSidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between z-10 shrink-0">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-black text-slate-900 tracking-tight">System Settings</h1>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 p-8 lg:p-12 overflow-y-auto no-scrollbar">
          <div className="max-w-4xl mx-auto w-full space-y-8">
            
            {/* Account Profile Section */}
            <section className="space-y-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Account Profile</h2>
              <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
                <div className="p-8 flex flex-col md:flex-row items-start md:items-center gap-8">
                  <div className="w-24 h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-white text-3xl font-black shadow-xl shadow-indigo-100 shrink-0">
                    {currentUser?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                  <div className="flex-1 space-y-4 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <User className="w-3 h-3" /> Username
                        </label>
                        <div className="px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-transparent">
                          {currentUser?.username || 'N/A'}
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                          <Mail className="w-3 h-3" /> Email Address
                        </label>
                        <div className="px-4 py-3 bg-slate-50 rounded-xl font-bold text-slate-700 border border-transparent">
                          {currentUser?.email || 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="pt-2">
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-widest">
                        <Shield className="w-3 h-3" /> Access Level: {currentUser?.role || 'USER'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Application Configuration (Placeholder) */}
            <section className="space-y-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">System Preferences</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* Notifications Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:border-indigo-100 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600 group-hover:bg-amber-600 group-hover:text-white transition-all">
                      <Bell className="w-6 h-6" />
                    </div>
                    <div className="h-6 w-11 bg-slate-200 rounded-full relative">
                       <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow-sm" />
                    </div>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">Email Notifications</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">Receive project updates and task reminders.</p>
                  </div>
                </div>

                {/* Display Card */}
                <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm space-y-4 hover:border-indigo-100 transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 bg-cyan-50 rounded-2xl flex items-center justify-center text-cyan-600 group-hover:bg-cyan-600 group-hover:text-white transition-all">
                      <Monitor className="w-6 h-6" />
                    </div>
                    <div className="text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1.5 rounded-lg">Default</div>
                  </div>
                  <div>
                    <h3 className="font-black text-slate-900">Interface Theme</h3>
                    <p className="text-xs text-slate-400 font-bold mt-1">Switch between light, dark, or system theme.</p>
                  </div>
                </div>

              </div>
            </section>

            {/* Email Notification Templates */}
            <section className="space-y-4">
              <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest px-1">Email 通知設定</h2>
              <EmailNotificationSettings />
            </section>

            {/* Security Notice */}
            <div className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden">
               <div className="relative z-10 flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl backdrop-blur-md flex items-center justify-center">
                    <Lock className="w-8 h-8 text-indigo-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black mb-1">Security & Privacy</h3>
                    <p className="text-slate-400 text-sm font-medium">Your account uses corporate LDAP authentication. Password changes should be managed through the IT self-service portal.</p>
                  </div>
               </div>
               {/* Decorative background circle */}
               <div className="absolute -right-20 -bottom-20 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl " />
            </div>

          </div>
        </main>
      </div>
    </div>
  );
}
