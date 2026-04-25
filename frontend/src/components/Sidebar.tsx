import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Users, Settings, LogOut, Menu,
  Folder, ChevronDown, ChevronRight, BarChart3, Clock,
  Calendar, PlayCircle, FileText, ShieldCheck, GitBranch, Package, Archive
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
    <aside className={`${isSidebarOpen ? 'w-40' : 'w-12'} bg-white border-r flex flex-col z-20 transition-all duration-300 shadow-sm shrink-0`}>
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-2 border-b">
        <div className={`flex items-center gap-1 overflow-hidden ${!isSidebarOpen && 'hidden'}`}>
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
              className="h-9 w-auto object-contain"
            />
          </div>
        )}
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 shrink-0"
        >
          <Menu className="w-4 h-4" />
        </button>
      </div>

      <nav className="flex-1 py-3 overflow-y-auto no-scrollbar">
        <ul className="space-y-0.5 px-1.5">
          {/* Projects with Submenu */}
          <li>
            <button
              onClick={() => {
                if (!isSidebarOpen) setIsSidebarOpen(true);
                setIsProjectsExpanded(!isProjectsExpanded);
                if (!isActive('/projects')) navigate('/projects');
              }}
              className={`w-full flex items-center justify-between h-8 px-2 rounded-lg transition-all ${isActive('/projects') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center">
                <LayoutDashboard className="w-3.5 h-3.5 shrink-0" />
                <span className={`ml-2 font-bold whitespace-nowrap text-[11px] ${!isSidebarOpen && 'hidden'}`}>Projects</span>
              </div>
              {isSidebarOpen && (
                isProjectsExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {isSidebarOpen && isProjectsExpanded && (
              <ul className="mt-0.5 ml-3 space-y-0.5 border-l-2 border-slate-50 pl-1.5">
                {statusItems.map(item => (
                  <li key={item.id}>
                    <button
                      onClick={() => {
                        if (!isActive('/projects')) navigate('/projects');
                        onStatusChange?.(item.id);
                      }}
                      className={`w-full flex items-center h-7 px-2 rounded text-[9px] font-bold transition-all ${isActive('/projects') && currentStatus === item.id
                        ? 'text-indigo-600 bg-indigo-50/50'
                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                        }`}
                    >
                      <item.icon className="w-3 h-3 mr-1.5 shrink-0" />
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
              className={`w-full flex items-center justify-between h-8 px-2 rounded-lg transition-all ${isActive('/dashboard') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <div className="flex items-center">
                <BarChart3 className="w-3.5 h-3.5 shrink-0" />
                <span className={`ml-2 font-bold whitespace-nowrap text-[11px] ${!isSidebarOpen && 'hidden'}`}>WBS Analysis</span>
              </div>
              {isSidebarOpen && (
                isAnalysisExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />
              )}
            </button>

            {isSidebarOpen && isAnalysisExpanded && (
              <ul className="mt-0.5 ml-3 space-y-0.5 border-l-2 border-slate-50 pl-1.5">
                <li>
                  <button
                    onClick={() => {
                      if (!isActive('/dashboard')) navigate('/dashboard');
                    }}
                    className={`w-full flex items-center h-7 px-2 rounded text-[9px] font-bold transition-all ${isActive('/dashboard')
                      ? 'text-indigo-600 bg-indigo-50/50'
                      : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'
                      }`}
                  >
                    <LayoutDashboard className="w-3 h-3 mr-1.5" />
                    WBS View
                  </button>
                </li>
              </ul>
            )}
          </li>

          {/* Teams (Owner Only) */}
          {isOwner && (
            <>
              <li>
                <button
                  onClick={() => navigate('/team')}
                  className={`w-full flex items-center h-8 px-2 rounded-lg transition-all ${isActive('/team') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                  <Users className="w-3.5 h-3.5 shrink-0" />
                  <span className={`ml-2 font-bold whitespace-nowrap text-[11px] ${!isSidebarOpen && 'hidden'}`}>Teams</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/roles')}
                  className={`w-full flex items-center h-8 px-2 rounded-lg transition-all ${isActive('/roles') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                  <span className={`ml-2 font-bold whitespace-nowrap text-[11px] ${!isSidebarOpen && 'hidden'}`}>Roles</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/workflows')}
                  className={`w-full flex items-center h-8 px-2 rounded-lg transition-all ${isActive('/workflows') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                  <GitBranch className="w-3.5 h-3.5 shrink-0" />
                  <span className={`ml-2 font-bold whitespace-nowrap text-[11px] ${!isSidebarOpen && 'hidden'}`}>Workflows</span>
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate('/deliverable-types')}
                  className={`w-full flex items-center h-8 px-2 rounded-lg transition-all ${isActive('/deliverable-types') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
                    }`}
                >
                  <Package className="w-3.5 h-3.5 shrink-0" />
                  <span className={`ml-2 font-bold whitespace-nowrap text-[11px] ${!isSidebarOpen && 'hidden'}`}>Deliv. Types</span>
                </button>
              </li>
            </>
          )}

          {/* Deliverables — visible to all users */}
          <li>
            <button
              onClick={() => navigate('/deliverables')}
              className={`w-full flex items-center h-8 px-2 rounded-lg transition-all ${isActive('/deliverables') ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' : 'text-slate-500 hover:bg-slate-50'
                }`}
            >
              <Archive className="w-3.5 h-3.5 shrink-0" />
              <span className={`ml-2 font-bold whitespace-nowrap text-[11px] ${!isSidebarOpen && 'hidden'}`}>Deliverables</span>
            </button>
          </li>

          {/* Settings */}
          <li>
            <button
              onClick={() => navigate('/settings')}
              className={`w-full flex items-center h-8 px-2 rounded-lg transition-all font-bold ${
                isActive('/settings') ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Settings className="w-3.5 h-3.5 shrink-0" />
              <span className={`ml-2 whitespace-nowrap text-[11px] ${!isSidebarOpen && 'hidden'}`}>Settings</span>
            </button>
          </li>
        </ul>

        {/* Year Filter Section (Only visible when expanded) */}
        {isSidebarOpen && (
          <div className="mt-6 px-3 space-y-2">
            <h3 className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Calendar className="w-2.5 h-2.5" /> Project Year
            </h3>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => onYearChange?.([])}
                className={`px-2 py-1 rounded text-[9px] font-black transition-all ${currentYears.length === 0
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
                  className={`px-2 py-1 rounded text-[9px] font-black transition-all ${currentYears.includes(year)
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

      <div className="p-2 border-t">
        <button
          onClick={handleLogout}
          className="w-full flex items-center px-2 py-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-all font-bold"
        >
          <LogOut className="w-3.5 h-3.5 shrink-0" />
          <span className={`ml-2 text-[11px] ${!isSidebarOpen && 'hidden'}`}>Logout</span>
        </button>
      </div>
    </aside>
  );
}
