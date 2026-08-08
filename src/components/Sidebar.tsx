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
      desc: 'Indicadores & Métricas'
    },
    {
      id: 'lookup',
      label: 'Consulta Avulsa',
      icon: Search,
      badge: 'CNPJá',
      desc: 'Por Nome ou CNPJ'
    },
    {
      id: 'companies',
      label: 'Cadastro de Empresas',
      icon: Building,
      badge: totalCompaniesCount > 0 ? totalCompaniesCount.toString() : null,
      desc: 'Base de Dados'
    },
    {
      id: 'import',
      label: 'Importar Planilha',
      icon: FileSpreadsheet,
      badge: 'XLS/CSV',
      desc: 'Leitura Inteligente'
    },
    {
      id: 'reports',
      label: 'Relatórios Executivos',
      icon: FileCheck2,
      badge: 'PDF / XLS',
      desc: 'Filtro e Seleção'
    }
  ];

  return (
    <aside className="w-full md:w-64 bg-white text-slate-700 flex-shrink-0 border-r border-slate-200 min-h-[calc(100vh-4rem)] p-4 shadow-sm">
      <div className="space-y-6">
        
        {/* Primary CRM Menu */}
        <div>
          <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-purple-950 px-3 mb-3">
            Menu Principal
          </h2>
          <nav className="space-y-1.5">
            {primaryMenuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isActive
                      ? 'bg-purple-900 text-white shadow-md shadow-purple-950/20'
                      : 'text-slate-700 hover:bg-purple-50 hover:text-purple-950'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className={`p-1.5 rounded-lg ${isActive ? 'bg-purple-800 text-white' : 'bg-purple-50 text-purple-900'}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="block leading-tight font-bold">{item.label}</span>
                      <span className={`text-[10px] font-medium ${isActive ? 'text-purple-200' : 'text-slate-400'}`}>
                        {item.desc}
                      </span>
                    </div>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md font-extrabold ${
                        isActive
                          ? 'bg-purple-800 text-purple-100 border border-purple-700'
                          : 'bg-slate-100 text-slate-600 border border-slate-200'
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

      </div>
    </aside>
  );
};
