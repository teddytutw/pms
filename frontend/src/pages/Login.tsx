import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Users } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [version, setVersion] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${(import.meta as any).env.BASE_URL}api/auth/config`)
      .then(res => res.json())
      .then(data => setVersion(data.version))
      .catch(() => {});
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch((import.meta as any).env.BASE_URL + 'api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      if (response.ok) {
        const user = await response.json();
        localStorage.setItem('currentUser', JSON.stringify(user));
        navigate('/projects');
      } else {
        const data = await response.json();
        setError(data.message || '登入失敗，請檢查帳號與密碼。');
      }
    } catch (err) {
      setError('無法連線至伺服器。');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden border border-gray-100">
        <div className="p-8 relative">
          <div className="absolute top-6 left-8">
            <img src={(import.meta as any).env.BASE_URL + 'company_logo.png'} alt="Company Logo" className="h-8 w-auto object-contain opacity-80" />
          </div>

          <div className="flex flex-col items-center justify-center mb-10 pt-12 relative">
            <div className="relative">
              <img src={(import.meta as any).env.BASE_URL + 'logo.png'} alt="PSM Logo" className="h-20 w-auto object-contain" />
              {version && (
                <div className="absolute -bottom-4 -right-2 text-[10px] font-bold text-gray-400 opacity-60 pointer-events-none">
                  v{version}
                </div>
              )}
            </div>
          </div>

          <h2 className="text-2xl font-bold text-center text-gray-900 mb-2">Project Management System</h2>
          <p className="text-gray-500 text-center mb-8">請登入您的帳號以開始協作</p>

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-100 text-red-600 text-sm rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">帳號 (Username)</label>
              <div className="relative">
                <Users className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  placeholder="您的登入編號或帳號"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">密碼</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? '驗證中...' : '登入系統'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
