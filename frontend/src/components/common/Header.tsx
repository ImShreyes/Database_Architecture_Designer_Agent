import { Database, Settings, HelpCircle, Key } from 'lucide-react';

export const Header = () => {
  return (
    <header className="bg-surface-800 border-b border-surface-700 font-sans shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Database className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-bold text-white tracking-tight">
              DB Architecture Agent
            </span>
          </div>

          <div className="flex items-center gap-6">
            <button className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
              <HelpCircle className="w-4 h-4" />
              <span>Documentation</span>
            </button>
            <button className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
              <Key className="w-4 h-4" />
              <span>API Key</span>
            </button>
            <button className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
