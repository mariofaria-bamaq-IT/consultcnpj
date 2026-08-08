import React from 'react';
import {
  LayoutDashboard,
  Search,
  Building,
  FileSpreadsheet,
  FileCheck2
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  totalCompaniesCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  totalCompaniesCount
}) => {
  const primaryMenuItems = [
    {
      id: 'dashboard',
      label: 'Painel Geral',
      icon: LayoutDashboard,
      badge: null,
      desc: 'Indicadores'
    },
    {
      id: 'lookup',
      label: 'Consulta Avulsa',
      icon: Search,
      badge: 'CNPJá',
      desc: 'Buscar CNPJ'
    },
    {
      id: 'companies',
      label: 'Empresas',
      icon: Building,
      badge: totalCompaniesCount > 0 ? totalCompaniesCount.toString() : null,
      desc: 'Base SQLite'
    },
    {
      id: 'import',
      label: 'Importar Planilha',
      icon: FileSpreadsheet,
      badge: 'XLS/CSV',
      desc: 'Carga Excel'
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: FileCheck2,
      badge: 'PDF / XLS',
      desc: 'Personalizado'
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-white text-slate-700 flex-shrink-0 border-b md:border-b-0 md:border-r border-slate-200 p-3 md:p-4 shadow-sm">
      <div className="space-y-2 md:space-y-6">
        
        {/* Header Title on Desktop */}
        <h2 className="hidden md:block text-[11px] font-extrabold uppercase tracking-wider text-purple-950 px-3">
          Menu Principal
        </h2>

        {/* Navigation Bar - Horizontal Scroll on Mobile (iPhone 16), Vertical Sidebar on Desktop (14" / 27") */}
        <nav className="flex md:flex-col overflow-x-auto md:overflow-x-visible space-x-2 md:space-x-0 md:space-y-1.5 no-scrollbar pb-1 md:pb-0">
          {primaryMenuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex-shrink-0 flex items-center justify-between px-3.5 py-2.5 md:py-3 rounded-xl text-xs md:text-sm font-semibold transition-all whitespace-nowrap md:whitespace-normal ${
                  isActive
                    ? 'bg-purple-900 text-white shadow-md shadow-purple-950/20'
                    : 'bg-slate-50 md:bg-transparent text-slate-700 hover:bg-purple-50 hover:text-purple-950 border border-slate-200 md:border-0'
                }`}
              >
                <div className="flex items-center space-x-2.5 md:space-x-3">
                  <div className={`p-1.5 rounded-lg ${isActive ? 'bg-purple-800 text-white' : 'bg-purple-100 text-purple-900'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="text-left">
                    <span className="block leading-tight font-bold">{item.label}</span>
                    <span className={`hidden md:block text-[10px] font-medium ${isActive ? 'text-purple-200' : 'text-slate-400'}`}>
                      {item.desc}
                    </span>
                  </div>
                </div>

                {item.badge && (
                  <span
                    className={`ml-2 text-[10px] px-2 py-0.5 rounded-md font-extrabold hidden sm:inline-block ${
                      isActive
                        ? 'bg-purple-800 text-purple-100 border border-purple-700'
                        : 'bg-slate-200 md:bg-slate-100 text-slate-700 border border-slate-300 md:border-slate-200'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

      </div>
    </aside>
  );
};
