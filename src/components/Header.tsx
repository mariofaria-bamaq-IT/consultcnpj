import React from 'react';
import { Building2 } from 'lucide-react';

interface HeaderProps {
  setActiveTab: (tab: string) => void;
}

export const Header: React.FC<HeaderProps> = ({ setActiveTab }) => {
  return (
    <header className="bg-white border-b border-purple-100 text-slate-900 sticky top-0 z-30 shadow-sm">
      <div className="max-w-[1920px] mx-auto px-3 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Branding & Logo */}
        <div className="flex items-center space-x-2.5 sm:space-x-3 cursor-pointer" onClick={() => setActiveTab('dashboard')}>
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-900 flex items-center justify-center shadow-md shadow-purple-950/20 ring-1 ring-purple-300 flex-shrink-0">
            <Building2 className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5 sm:space-x-2 flex-wrap">
              <h1 className="font-extrabold text-base sm:text-lg text-purple-950 tracking-tight">CONSULT - ENTERPRISE</h1>
              <span className="bg-purple-100 text-purple-900 text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 rounded-md border border-purple-200 font-extrabold uppercase tracking-wide">
                GRUPO BAMAQ
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium hidden sm:block">
              Gestão Empresarial • Fiscal & Tributário
            </p>
          </div>
        </div>

        {/* Right side info badge */}
        <div className="hidden lg:flex items-center space-x-3 text-xs font-semibold text-purple-900 bg-purple-50 px-3 py-1.5 rounded-lg border border-purple-200">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Ambiente Fiscal Corporativo</span>
        </div>

      </div>
    </header>
  );
};
