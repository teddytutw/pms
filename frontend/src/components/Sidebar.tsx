import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings, LogOut, Menu,
  Folder, ChevronDown, ChevronRight, BarChart3, Clock,
  Calendar, PlayCircle, FileText
} from 'lucide-react';

interface SidebarProps {
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  // Optional filters for ProjectHub
  onStatusChange?: (status: string) => void;
  onYearChange?: (years: string[]) => void;
  currentStatus?: string;
  currentYears?: string[];
  allYears?: string[];
}

export default function Sidebar({
  isSidebarOpen,
  setIsSidebarOpen,
  onStatusChange,
  onYearChange,
  currentStatus = 'ALL',
  currentYears = [],
  allYears = []
}: SidebarProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isProjectsExpanded, setIsProjectsExpanded] = useState(true);
  const [isAnalysisExpanded, setIsAnalysisExpanded] = useState(false);

  useEffect(() => {
    const userJson = localStorage.getItem('currentUser');
    if (userJson) {
      setCurrentUser(JSON.parse(userJson));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/login');
  };

  const isOwner = currentUser?.role === 'OWNER';
  const isActive = (path: string) => location.pathname === path;

  // Define nav items
  const statusItems = [
    { id: 'ALL', label: 'All', icon: Folder },
    { id: 'NOT_STARTED', label: 'NOT STARTED', icon: Clock },
    { id: 'STARTED', label: 'STARTED', icon: PlayCircle },
    { id: 'TEMPLATE', label: 'TEMPLATE', icon: FileText },
  ];

  const toggleYear = (year: string) => {
    if (!onYearChange) return;
    const newYears = currentYears.includes(year)
      ? currentYears.filter(y => y !== year)
      : [...currentYears, year];
    onYearChange(newYears);
  };

  return (
    <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white border-r flex flex-col z-20 transition-all duration-300 shadow-sm shrink-0`}>
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 border-b">
        <div className={`flex items-center gap-2 overflow-hidden ${!isSidebarOpen && 'hidden'}`}>
          <img
            src={(import.meta as any).env.BASE_URL + 'small_logo.png'}
            alt="Logo"
            className="h-10 w-auto object-contain flex-shrink-0"
          />
        </div>
        {!isSidebarOpen && (
          <div className="w-full flex justify-center">
            <img
              src={(import.meta as any).env.BASE_URL + 'small_logo.png'}
              alt="Logo"
              className="h-10 w-auto object-contain"
            />
          </div>
        )}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 absolute right-4 lg:relative lg:right-0"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>

      <nav className="flex-1 py-6 overflow-y-auto no-scrollbar">
        <ul className="space-y-1 px-3">
          {/* Projects with Submenu */}
          <li>
            <button
              onClick={() => {
                if (!isSidebarOpen) setIsSidebarOpen(true);
                setIsProjectsExpanded(!isProjectsExpanded);
                if (!isActive('/projects')) navigate('/projects');
              }}
              className={`w-full flex items-center justify-between h-10 px-3 rounded-xl transition-all ${isActive('/projects') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center">
                <LayoutDashboard className="w-5 h-5 shrink-0" />
                <span className={`ml-3 font-bold whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>Projects</span>
              </div>
              {isSidebarOpen && (
                isProjectsExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {isSidebarOpen && isProjectsExpanded && (
              <ul className="mt-1 ml-4 space-y-1 border-l-2 border-slate-50 pl-2">
                {statusItems.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        if (!isActive('/projects')) navigate('/projects');
                        onStatusChange?.(item.id);
                      }}
                      className={`w-full flex items-center h-9 px-3 rounded-lg text-[11px] font-bold transition-all ${isActive('/projects') && currentStatus === item.id
                        ? 'text-indigo-600 bg-indigo-50/50'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <item.icon className="w-3.5 h-3.5 mr-2" />
                      {item.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </li>

          {/* WBS Analysis with Submenu */}
          <li>
            <button
              onClick={() => {
                if (!isSidebarOpen) setIsSidebarOpen(true);
                setIsAnalysisExpanded(!isAnalysisExpanded);
                if (!isActive('/dashboard')) navigate('/dashboard');
              }}
              className={`w-full flex items-center justify-between h-10 px-3 rounded-xl transition-all ${isActive('/dashboard') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center">
                <BarChart3 className="w-5 h-5 shrink-0" />
                <span className={`ml-3 font-bold whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>WBS Analysis</span>
              </div>
              {isSidebarOpen && (
                isAnalysisExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
              )}
            </button>

            {isSidebarOpen && isAnalysisExpanded && (
              <ul className="mt-1 ml-4 space-y-1 border-l-2 border-slate-50 pl-2">
                <li>
                  <button
                    onClick={() => {
                      if (!isActive('/dashboard')) navigate('/dashboard');
                    }}
                    className={`w-full flex items-center h-9 px-3 rounded-lg text-[11px] font-bold transition-all ${isActive('/dashboard')
                      ? 'text-indigo-600 bg-indigo-50/50'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 mr-2" />
                    WBS View
                  </button>
                </li>
              </ul>
            )}
          </li>

          {/* Teams (Owner Only) */}
          {isOwner && (
            <li>
              <button
                onClick={() => navigate('/team')}
                className={`w-full flex items-center h-10 px-3 rounded-xl transition-all ${isActive('/team') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
                  }`}
              >
                <Users className="w-5 h-5 shrink-0" />
                <span className={`ml-3 font-bold whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>Teams</span>
              </button>
            </li>
          )}

          {/* Settings */}
          <li>
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center h-10 px-3 rounded-xl transition-all font-bold ${
                isActive('/settings') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-5 h-5 shrink-0" />
              <span className={`ml-3 whitespace-nowrap ${!isSidebarOpen && 'hidden'}`}>Settings</span>
            </button>
          </li>
        </ul>

        {/* Year Filter Section (Only visible when expanded) */}
        {isSidebarOpen && (
          <div className="mt-10 px-6 space-y-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Project Year
            </h3>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => onYearChange?.([])}
                className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${currentYears.length === 0
                  ? 'bg-slate-800 text-white shadow-md'
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
              >
                ALL
              </button>
              {allYears.map(year => (
                <button
                  key={year}
                  onClick={() => toggleYear(year)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${currentYears.includes(year)
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}
      </nav>

      <div className="p-4 border-t">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-3 py-2 text-red-500 hover:bg-red-50 rounded-xl transition-all font-bold"
        >
          <LogOut className="w-5 h-5 shrink-0" />
          <span className={`ml-3 ${!isSidebarOpen && 'hidden'}`}>Logout</span>
        </button>
      </div>
    </aside>
  );
}
