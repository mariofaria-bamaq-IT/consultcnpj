import React, { useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Search,
  CloudCheck,
  TrendingUp,
  FileSpreadsheet,
  FileText,
  ArrowRight,
  Database,
  History,
  Sparkles,
  PieChart,
  Download,
  X,
  Filter,
  Layers,
  ChevronRight,
  MapPin,
  Globe
} from 'lucide-react';
import { DashboardStats, Company, QueryLog, ReportConfig } from '../types';
import { formatCnpj, formatCurrency, exportToXlsx } from '../utils/reportExporter';

interface DashboardViewProps {
  stats: DashboardStats | null;
  companies: Company[];
  logs: QueryLog[];
  setActiveTab: (tab: string) => void;
  onQuickSearch: (cnpj: string) => void;
}

type DrilldownSegment = 'ALL' | 'SIMPLES' | 'MEI' | 'OUTROS' | 'ATIVAS';

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  companies,
  logs,
  setActiveTab,
  onQuickSearch
}) => {
  const [quickCnpj, setQuickCnpj] = useState('');
  const [selectedSegment, setSelectedSegment] = useState<DrilldownSegment | null>(null);
  const [selectedUfFilter, setSelectedUfFilter] = useState<string | null>(null);
  const [modalSearchTerm, setModalSearchTerm] = useState('');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quickCnpj.trim()) {
      onQuickSearch(quickCnpj);
    }
  };

  const totalCompanies = companies.length;
  const simplesCompanies = companies.filter(c => c.opcao_simples);
  const meiCompanies = companies.filter(c => c.opcao_mei);
  const outrosCompanies = companies.filter(c => !c.opcao_simples && !c.opcao_mei);
  const ativasCompanies = companies.filter(c => c.situacao_cadastral === 'ATIVA');

  const simplesCount = simplesCompanies.length;
  const meiCount = meiCompanies.length;
  const outrosCount = outrosCompanies.length;
  const ativasCount = ativasCompanies.length;

  const recentCompanies = companies.slice(0, 6);
  const totalCapital = companies.reduce((sum, c) => sum + (c.capital_social || 0), 0);

  // Group companies by UF for Geographic Concentration Analysis
  const ufMap: Record<string, { count: number; capital: number; cities: Set<string> }> = {};
  companies.forEach(c => {
    const uf = c.uf ? c.uf.toUpperCase() : 'ND';
    if (!ufMap[uf]) {
      ufMap[uf] = { count: 0, capital: 0, cities: new Set() };
    }
    ufMap[uf].count += 1;
    ufMap[uf].capital += (c.capital_social || 0);
    if (c.municipio) ufMap[uf].cities.add(c.municipio);
  });

  const ufRanking = Object.entries(ufMap)
    .map(([uf, data]) => ({
      uf,
      count: data.count,
      capital: data.capital,
      cityCount: data.cities.size,
      percentage: totalCompanies ? (data.count / totalCompanies) * 100 : 0
    }))
    .sort((a, b) => b.count - a.count);

  // Filter companies for Drilldown Modal
  const getModalCompanies = (): { label: string; data: Company[]; color: string } | null => {
    if (selectedUfFilter) {
      const ufData = companies.filter(c => (c.uf ? c.uf.toUpperCase() : 'ND') === selectedUfFilter);
      return {
        label: `Empresas Concentradas no Estado: ${selectedUfFilter}`,
        data: ufData,
        color: 'indigo'
      };
    }
    if (!selectedSegment) return null;
    switch (selectedSegment) {
      case 'SIMPLES':
        return { label: 'Empresas Optantes do Simples Nacional', data: simplesCompanies, color: 'emerald' };
      case 'MEI':
        return { label: 'Microempreendedores Individuais (MEI / SIMEI)', data: meiCompanies, color: 'blue' };
      case 'OUTROS':
        return { label: 'Demais Regimes (Lucro Presumido / Lucro Real / Isentos)', data: outrosCompanies, color: 'indigo' };
      case 'ATIVAS':
        return { label: 'Empresas com Situação Cadastral ATIVA', data: ativasCompanies, color: 'emerald' };
      case 'ALL':
      default:
        return { label: 'Todas as Empresas da Base SQLite Local', data: companies, color: 'slate' };
    }
  };

  const modalInfo = getModalCompanies();

  const filteredModalCompanies = modalInfo
    ? modalInfo.data.filter(c =>
        c.cnpj.includes(modalSearchTerm.replace(/\D/g, '')) ||
        c.razao_social.toLowerCase().includes(modalSearchTerm.toLowerCase()) ||
        (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(modalSearchTerm.toLowerCase())) ||
        (c.municipio && c.municipio.toLowerCase().includes(modalSearchTerm.toLowerCase()))
      )
    : [];

  const handleExportSegmentXlsx = () => {
    if (!modalInfo || filteredModalCompanies.length === 0) return;

    const config: ReportConfig = {
      titulo: `RELATÓRIO DRILL-DOWN - ${modalInfo.label.toUpperCase()}`,
      subtitulo: `CONSULT - ENTERPRISE • Exportação de segmento corporativo (${filteredModalCompanies.length} registros)`,
      nome_organizacao: 'GRUPO BAMAQ',
      departamento: 'FISCAL/TRIBUTARIO',
      observacoes: 'Relatório gerado a partir do Drill-Down do sistema CONSULT - ENTERPRISE.',
      uf_filtro: '',
      porte_filtro: '',
      situacao_filtro: '',
      incluir_cabecalho_oficial: true,
      incluir_totais: true,
      incluir_data_hora: true
    };

    exportToXlsx(filteredModalCompanies, config);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-purple-950 to-indigo-950 rounded-2xl p-6 text-white shadow-xl border border-purple-900/40 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
        <div>
          <div className="flex items-center space-x-2 text-purple-300 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>CONSULT - ENTERPRISE • GRUPO BAMAQ</span>
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Painel Executivo Fiscal & Tributário
          </h2>
          <p className="text-purple-200/80 text-sm mt-1 max-w-2xl font-medium">
            Visão consolidada das {totalCompanies} empresas cadastradas no Grupo Bamaq, com classificação por regime tributário e concentração por estado (UF).
          </p>
        </div>

        {/* Quick Search Box */}
        <form onSubmit={handleSearchSubmit} className="w-full lg:w-80 flex-shrink-0">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">
            Consulta Rápida de CNPJ (CNPJá):
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="00.000.000/0000-00"
              value={quickCnpj}
              onChange={(e) => setQuickCnpj(e.target.value)}
              className="w-full pl-3 pr-10 py-2.5 bg-slate-800/90 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1.5 p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
              title="Buscar CNPJ"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>

      {/* CRM Metric Cards Grid (Simples, MEI, Demais, Ativas, Total) */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center space-x-1.5">
            <PieChart className="w-4 h-4 text-blue-600" />
            <span>Resumo Tributário & Indicadores (Clique nos cards para Drill-Down)</span>
          </h3>
          <span className="text-xs text-slate-400">Total na Base: <strong className="text-slate-800">{totalCompanies}</strong></span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Total Empresas */}
          <div
            onClick={() => setSelectedSegment('ALL')}
            className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Total Cadastrado</span>
              <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900">{totalCompanies}</p>
              <div className="flex items-center justify-between mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <Database className="w-3.5 h-3.5 text-blue-600" />
                  SQLite Local
                </span>
                <span className="text-[11px] text-blue-600 font-bold group-hover:underline flex items-center">
                  Drill-Down <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Simples Nacional */}
          <div
            onClick={() => setSelectedSegment('SIMPLES')}
            className="bg-emerald-50/50 p-5 rounded-2xl shadow-sm border border-emerald-200 hover:border-emerald-400 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-800 uppercase">Simples Nacional</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center group-hover:bg-emerald-600 group-hover:text-white transition">
                <CheckCircle2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-emerald-900">{simplesCount}</p>
              <div className="flex items-center justify-between mt-1 text-xs text-emerald-700">
                <span>{totalCompanies ? Math.round((simplesCount / totalCompanies) * 100) : 0}% da base</span>
                <span className="text-[11px] font-bold group-hover:underline flex items-center">
                  Ver {simplesCount} <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* MEI / SIMEI */}
          <div
            onClick={() => setSelectedSegment('MEI')}
            className="bg-sky-50/50 p-5 rounded-2xl shadow-sm border border-sky-200 hover:border-sky-400 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-sky-800 uppercase">Optantes MEI</span>
              <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center group-hover:bg-sky-600 group-hover:text-white transition">
                <Layers className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-sky-900">{meiCount}</p>
              <div className="flex items-center justify-between mt-1 text-xs text-sky-700">
                <span>{totalCompanies ? Math.round((meiCount / totalCompanies) * 100) : 0}% da base</span>
                <span className="text-[11px] font-bold group-hover:underline flex items-center">
                  Ver {meiCount} <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Demais Regimes / Não Optantes */}
          <div
            onClick={() => setSelectedSegment('OUTROS')}
            className="bg-slate-50 p-5 rounded-2xl shadow-sm border border-slate-200 hover:border-slate-400 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700 uppercase">Não Optantes / Demais</span>
              <div className="w-9 h-9 rounded-xl bg-slate-200 text-slate-700 flex items-center justify-center group-hover:bg-slate-700 group-hover:text-white transition">
                <Building2 className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-slate-900">{outrosCount}</p>
              <div className="flex items-center justify-between mt-1 text-xs text-slate-600">
                <span>{totalCompanies ? Math.round((outrosCount / totalCompanies) * 100) : 0}% da base</span>
                <span className="text-[11px] font-bold group-hover:underline flex items-center">
                  Ver {outrosCount} <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

          {/* Empresas Ativas */}
          <div
            onClick={() => setSelectedSegment('ATIVAS')}
            className="bg-indigo-50/50 p-5 rounded-2xl shadow-sm border border-indigo-200 hover:border-indigo-400 hover:shadow-md transition cursor-pointer group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-indigo-800 uppercase">Situação Ativa</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="mt-3">
              <p className="text-2xl font-black text-indigo-900">{ativasCount}</p>
              <div className="flex items-center justify-between mt-1 text-xs text-indigo-700">
                <span>{totalCompanies ? Math.round((ativasCount / totalCompanies) * 100) : 0}% ativas</span>
                <span className="text-[11px] font-bold group-hover:underline flex items-center">
                  Ver {ativasCount} <ChevronRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Visual Regime Comparison Bar */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-700">
          <span>Distribuição Visual por Regime Tributário</span>
          <span className="text-slate-400 font-normal">Base SQLite ({totalCompanies} registros)</span>
        </div>
        
        <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden flex">
          <div
            className="bg-emerald-500 h-full transition-all"
            style={{ width: `${totalCompanies ? (simplesCount / totalCompanies) * 100 : 0}%` }}
            title={`Simples Nacional: ${simplesCount} (${totalCompanies ? Math.round((simplesCount / totalCompanies) * 100) : 0}%)`}
          />
          <div
            className="bg-sky-500 h-full transition-all"
            style={{ width: `${totalCompanies ? (meiCount / totalCompanies) * 100 : 0}%` }}
            title={`MEI: ${meiCount} (${totalCompanies ? Math.round((meiCount / totalCompanies) * 100) : 0}%)`}
          />
          <div
            className="bg-slate-400 h-full transition-all"
            style={{ width: `${totalCompanies ? (outrosCount / totalCompanies) * 100 : 0}%` }}
            title={`Demais Regimes: ${outrosCount} (${totalCompanies ? Math.round((outrosCount / totalCompanies) * 100) : 0}%)`}
          />
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 pt-1">
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block"></span>
            <span>Simples Nacional: <strong>{simplesCount}</strong> ({totalCompanies ? Math.round((simplesCount / totalCompanies) * 100) : 0}%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500 inline-block"></span>
            <span>MEI (SIMEI): <strong>{meiCount}</strong> ({totalCompanies ? Math.round((meiCount / totalCompanies) * 100) : 0}%)</span>
          </div>
          <div className="flex items-center space-x-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-400 inline-block"></span>
            <span>Não Optantes / Demais: <strong>{outrosCount}</strong> ({totalCompanies ? Math.round((outrosCount / totalCompanies) * 100) : 0}%)</span>
          </div>
        </div>
      </div>

      {/* Concentração Geográfica por Estado (UF) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-800">
                Filtro & Concentração Geográfica por Estado (UF)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Análise territorial de densidade de cadastros e volume de Capital Social. Selecione o estado para filtrar a listagem completa.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <span className="text-xs text-slate-500 font-medium">Filtrar Estado:</span>
            <select
              value={selectedUfFilter || ''}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedUfFilter(val || null);
              }}
              className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Todos os Estados ({ufRanking.length})</option>
              {ufRanking.map(item => (
                <option key={item.uf} value={item.uf}>
                  {item.uf} — {item.count} {item.count === 1 ? 'empresa' : 'empresas'} ({item.percentage.toFixed(1)}%)
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* State Badges / Chips Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setSelectedUfFilter(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              !selectedUfFilter
                ? 'bg-blue-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>Todos os Estados ({totalCompanies})</span>
          </button>

          {ufRanking.map(item => {
            const isSelected = selectedUfFilter === item.uf;
            return (
              <button
                key={item.uf}
                onClick={() => setSelectedUfFilter(item.uf)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                  isSelected
                    ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-300'
                    : 'bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="font-bold">{item.uf}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-bold ${
                  isSelected ? 'bg-blue-700 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* State Ranking Visual Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {ufRanking.slice(0, 6).map(item => (
            <div
              key={item.uf}
              onClick={() => setSelectedUfFilter(item.uf)}
              className="p-3.5 bg-slate-50 hover:bg-blue-50/60 border border-slate-200 hover:border-blue-400 rounded-xl transition cursor-pointer group space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2">
                  <span className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-black flex items-center justify-center text-xs group-hover:bg-blue-600 group-hover:text-white transition">
                    {item.uf}
                  </span>
                  <div>
                    <span className="font-bold text-slate-800 group-hover:text-blue-700 block leading-tight">
                      {item.count} {item.count === 1 ? 'empresa' : 'empresas'}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {item.cityCount} {item.cityCount === 1 ? 'município' : 'municípios'}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold text-slate-900 block">
                    {item.percentage.toFixed(1)}%
                  </span>
                  <span className="text-[10px] text-emerald-700 font-semibold">
                    {formatCurrency(item.capital)}
                  </span>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-blue-600 h-full rounded-full transition-all group-hover:bg-blue-500"
                  style={{ width: `${Math.min(100, item.percentage)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Companies Section */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Empresas Cadastradas Recentemente</h3>
            <p className="text-xs text-slate-500">Últimos cadastros atualizados na base de dados</p>
          </div>
          <button
            onClick={() => setActiveTab('companies')}
            className="text-xs text-purple-700 hover:text-purple-800 font-bold flex items-center gap-1"
          >
            <span>Ver todas ({companies.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto mt-4">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase">
              <tr>
                <th className="py-2.5 px-3">CNPJ</th>
                <th className="py-2.5 px-3">Razão Social</th>
                <th className="py-2.5 px-3">Simples / MEI</th>
                <th className="py-2.5 px-3">UF/Cidade</th>
                <th className="py-2.5 px-3 text-right">Capital Social</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentCompanies.map((c) => (
                <tr key={c.cnpj} className="hover:bg-purple-50/30 transition">
                  <td className="py-2.5 px-3 font-mono text-xs text-purple-950 font-bold">
                    {formatCnpj(c.cnpj)}
                  </td>
                  <td className="py-2.5 px-3 font-medium text-slate-900 truncate max-w-[300px]">
                    {c.razao_social}
                  </td>
                  <td className="py-2.5 px-3 text-xs">
                    {c.opcao_simples ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        {c.opcao_mei ? 'MEI' : 'SIMPLES'}
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        NÃO OPTANTE (FORA DO SIMPLES)
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-xs text-slate-600">{c.uf} - {c.municipio || '-'}</td>
                  <td className="py-2.5 px-3 text-right text-xs font-semibold text-slate-700">
                    {formatCurrency(c.capital_social)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRILL-DOWN MODAL POPUP */}
      {(selectedSegment || selectedUfFilter) && modalInfo && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[85vh] flex flex-col overflow-hidden border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Filter className="w-4 h-4 text-blue-400" />
                  <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Drill-Down Corporativo CRM</span>
                </div>
                <h3 className="text-lg font-bold text-white">
                  {modalInfo.label}
                </h3>
                <p className="text-xs text-slate-400">
                  Total de {filteredModalCompanies.length} empresas encontradas nesta seleção.
                </p>
              </div>

              <button
                onClick={() => { setSelectedSegment(null); setSelectedUfFilter(null); setModalSearchTerm(''); }}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Actions Bar */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="relative flex-1 max-w-md">
                <input
                  type="text"
                  placeholder="Filtrar por CNPJ, Razão Social ou Cidade..."
                  value={modalSearchTerm}
                  onChange={(e) => setModalSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleExportSegmentXlsx}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition"
                >
                  <Download className="w-4 h-4" />
                  <span>Exportar Seleção Executiva em XLS (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Modal Table Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {filteredModalCompanies.length === 0 ? (
                <div className="text-center py-12 text-slate-500 space-y-2">
                  <p className="text-sm font-semibold">Nenhuma empresa encontrada para os critérios de busca.</p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase border-b border-slate-200">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">CNPJ</th>
                      <th className="p-3">Razão Social</th>
                      <th className="p-3">Simples Nacional</th>
                      <th className="p-3">UF / Município</th>
                      <th className="p-3">Porte</th>
                      <th className="p-3 text-right">Capital Social</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-800">
                    {filteredModalCompanies.map((c, idx) => (
                      <tr key={c.cnpj} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono text-slate-400">{idx + 1}</td>
                        <td className="p-3 font-mono font-bold text-slate-900">{formatCnpj(c.cnpj)}</td>
                        <td className="p-3 font-semibold text-slate-900 max-w-xs truncate">{c.razao_social}</td>
                        <td className="p-3">
                          {c.opcao_simples ? (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              {c.opcao_mei ? 'MEI / SIMEI' : 'OPTANTE SIMPLES'}
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                              NÃO OPTANTE (FORA DO SIMPLES)
                            </span>
                          )}
                        </td>
                        <td className="p-3">{c.uf} — {c.municipio || '-'}</td>
                        <td className="p-3 font-medium">{c.porte}</td>
                        <td className="p-3 text-right font-semibold text-slate-800">{formatCurrency(c.capital_social)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
              <span>CONSULT - ENTERPRISE • Grupo Bamaq</span>
              <button
                onClick={() => { setSelectedSegment(null); setSelectedUfFilter(null); setModalSearchTerm(''); }}
                className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-lg transition"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};

