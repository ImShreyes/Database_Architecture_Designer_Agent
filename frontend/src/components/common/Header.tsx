import { Database, Settings, Search, Download, User, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export const Header = () => {
  const { isLoggedIn, logout } = useAuth();
  const navigate = useNavigate();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-[#0f1117] border-b border-surface-700 font-sans">
      <div className="w-full px-4 sm:px-6 lg:px-6">
        <div className="flex h-16 items-center justify-between gap-6">
          {/* Logo */}
          <div className="flex items-center gap-3 min-w-[240px] cursor-pointer hover:opacity-80" onClick={() => navigate('/')}>
            <div className="bg-blue-500 p-1.5 rounded-lg">
              <Database className="w-5 h-5 text-white" />
            </div>
            <span className="text-lg font-bold text-white tracking-tight">
              Database Architect
            </span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-md hidden md:block">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                className="w-full pl-10 pr-4 py-2 bg-[#1a1d24] border border-[#2d3139] rounded-lg text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                placeholder="Search tables or fields..."
              />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden lg:flex items-center gap-6">
            <a href="#" className="text-sm font-medium text-blue-500 border-b-2 border-blue-500 pb-5 pt-5">Explorer</a>
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-slate-200 py-5">Queries</a>
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-slate-200 py-5">Relationships</a>
            <a href="#" className="text-sm font-medium text-slate-400 hover:text-slate-200 py-5">History</a>
          </nav>

          <div className="hidden lg:block w-px h-6 bg-surface-600 mx-2"></div>

          {/* Right Actions */}
          <div className="flex items-center gap-4">
            <button className="text-slate-400 hover:text-white transition-colors p-1">
              <Settings className="w-5 h-5" />
            </button>
            <button className="bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
              <Download className="w-4 h-4" />
              Export SQL
            </button>
            {isLoggedIn && (
              <div className="relative">
                <button 
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-8 h-8 rounded-full bg-amber-600/20 text-amber-500 flex items-center justify-center border border-amber-600/30 font-medium hover:bg-amber-600/30 transition"
                >
                  <User className="w-4 h-4" />
                </button>
                {showUserMenu && (
                  <div className="absolute right-0 mt-2 w-48 bg-[#1a1d24] border border-slate-700 rounded-lg shadow-lg py-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-700/50 flex items-center gap-2 transition"
                    >
                      <LogOut className="w-4 h-4" />
                      Logout
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
