import React, { useState } from 'react';
import {
  FileText,
  Download,
  Filter,
  FileSpreadsheet,
  CheckCircle2,
  Building2,
  Sliders,
  Sparkles,
  CheckSquare,
  Square,
  Eye,
  Layers,
  Settings2
} from 'lucide-react';
import { Company, ReportConfig } from '../types';
import { exportToPdf, exportToXlsx, formatCnpj, formatCurrency } from '../utils/reportExporter';

interface ReportsViewProps {
  companies: Company[];
}

export const FIELD_GROUPS = [
  {
    category: 'Dados Cadastrais',
    fields: [
      { id: 'cnpj', label: 'CNPJ (Com Máscara)', defaultSelected: true },
      { id: 'razao_social', label: 'Razão Social', defaultSelected: true },
      { id: 'nome_fantasia', label: 'Nome Fantasia', defaultSelected: false },
      { id: 'situacao_cadastral', label: 'Situação Cadastral', defaultSelected: true },
      { id: 'data_abertura', label: 'Data de Abertura', defaultSelected: false },
      { id: 'porte', label: 'Porte Empresarial', defaultSelected: true },
      { id: 'natureza_juridica', label: 'Natureza Jurídica', defaultSelected: false }
    ]
  },
  {
    category: 'Regime Tributário',
    fields: [
      { id: 'opcao_simples', label: 'Optante Simples Nacional', defaultSelected: true },
      { id: 'data_opcao_simples', label: 'Data Opção Simples', defaultSelected: false },
      { id: 'opcao_mei', label: 'Optante MEI (SIMEI)', defaultSelected: true },
      { id: 'data_opcao_mei', label: 'Data Opção MEI', defaultSelected: false }
    ]
  },
  {
    category: 'CNAE & Atividade Econômica',
    fields: [
      { id: 'cnae_principal_codigo', label: 'Código CNAE Principal', defaultSelected: false },
      { id: 'cnae_principal_descricao', label: 'Descrição da Atividade (CNAE)', defaultSelected: false }
    ]
  },
  {
    category: 'Endereço & Localização',
    fields: [
      { id: 'logradouro', label: 'Logradouro & Número', defaultSelected: false },
      { id: 'bairro', label: 'Bairro', defaultSelected: false },
      { id: 'municipio', label: 'Município / Cidade', defaultSelected: true },
      { id: 'uf', label: 'UF (Estado)', defaultSelected: true },
      { id: 'cep', label: 'CEP', defaultSelected: false }
    ]
  },
  {
    category: 'Contato, Financeiro & Sócios',
    fields: [
      { id: 'email', label: 'E-mail Corporativo', defaultSelected: false },
      { id: 'telefone', label: 'Telefone de Contato', defaultSelected: false },
      { id: 'capital_social', label: 'Capital Social (R$)', defaultSelected: true },
      { id: 'qsa', label: 'Quadro de Sócios (QSA)', defaultSelected: false }
    ]
  }
];

export const ReportsView: React.FC<ReportsViewProps> = ({ companies }) => {
  const [activeTab, setActiveTab] = useState<'standard' | 'custom'>('custom');

  const [config, setConfig] = useState<ReportConfig>({
    titulo: 'RELATÓRIO CORPORATIVO DE CADASTRO DE EMPRESAS',
    subtitulo: 'CONSULT - ENTERPRISE • Grupo Bamaq',
    nome_organizacao: 'GRUPO BAMAQ',
    departamento: 'FISCAL/TRIBUTARIO',
    observacoes: 'Relatório corporativo oficial emitido pelo departamento Fiscal/Tributário do Grupo Bamaq.',
    uf_filtro: '',
    porte_filtro: '',
    situacao_filtro: '',
    incluir_cabecalho_oficial: true,
    incluir_totais: true,
    incluir_data_hora: true
  });

  // Selected fields (flags) for custom report
  const allFieldIds = FIELD_GROUPS.flatMap(g => g.fields.map(f => f.id));
  const defaultSelectedIds = FIELD_GROUPS.flatMap(g => g.fields.filter(f => f.defaultSelected).map(f => f.id));
  
  const [selectedFields, setSelectedFields] = useState<string[]>(defaultSelectedIds);

  const ufs = Array.from(new Set(companies.map(c => c.uf).filter(Boolean))).sort();
  const portes = Array.from(new Set(companies.map(c => c.porte).filter(Boolean))).sort();

  // Filter companies according to report settings
  const filteredCompanies = companies.filter(c => {
    const matchUf = !config.uf_filtro || c.uf === config.uf_filtro;
    const matchPorte = !config.porte_filtro || c.porte === config.porte_filtro;
    const matchSituacao = !config.situacao_filtro || c.situacao_cadastral === config.situacao_filtro;
    return matchUf && matchPorte && matchSituacao;
  });

  const totalCapitalFiltered = filteredCompanies.reduce((acc, curr) => acc + (curr.capital_social || 0), 0);

  const toggleField = (id: string) => {
    if (selectedFields.includes(id)) {
      setSelectedFields(selectedFields.filter(f => f !== id));
    } else {
      setSelectedFields([...selectedFields, id]);
    }
  };

  const selectAllFields = () => setSelectedFields(allFieldIds);
  const deselectAllFields = () => setSelectedFields(['cnpj', 'razao_social']);

  const applyPreset = (preset: 'fiscal' | 'contato' | 'all') => {
    if (preset === 'fiscal') {
      setSelectedFields(['cnpj', 'razao_social', 'situacao_cadastral', 'opcao_simples', 'opcao_mei', 'porte', 'uf']);
    } else if (preset === 'contato') {
      setSelectedFields(['cnpj', 'razao_social', 'logradouro', 'bairro', 'municipio', 'uf', 'cep', 'email', 'telefone']);
    } else {
      selectAllFields();
    }
  };

  const handleExportPdf = () => {
    exportToPdf(filteredCompanies, config, activeTab === 'custom' ? selectedFields : undefined);
  };

  const handleExportXlsx = () => {
    exportToXlsx(filteredCompanies, config, activeTab === 'custom' ? selectedFields : undefined);
  };

  const getFieldLabel = (id: string) => {
    for (const g of FIELD_GROUPS) {
      const match = g.fields.find(f => f.id === id);
      if (match) return match.label;
    }
    return id.toUpperCase();
  };

  const getFieldValue = (c: Company, id: string) => {
    switch (id) {
      case 'cnpj': return formatCnpj(c.cnpj);
      case 'razao_social': return c.razao_social;
      case 'nome_fantasia': return c.nome_fantasia || '-';
      case 'situacao_cadastral': return c.situacao_cadastral;
      case 'data_abertura': return c.data_abertura || '-';
      case 'porte': return c.porte;
      case 'natureza_juridica': return c.natureza_juridica || '-';
      case 'opcao_simples': return c.opcao_simples ? 'OPTANTE' : 'NÃO';
      case 'data_opcao_simples': return c.data_opcao_simples || '-';
      case 'opcao_mei': return c.opcao_mei ? 'SIM' : 'NÃO';
      case 'data_opcao_mei': return c.data_opcao_mei || '-';
      case 'cnae_principal_codigo': return c.cnae_principal_codigo || '-';
      case 'cnae_principal_descricao': return c.cnae_principal_descricao || '-';
      case 'logradouro': return `${c.logradouro || ''} ${c.numero || ''}`.trim() || '-';
      case 'bairro': return c.bairro || '-';
      case 'municipio': return c.municipio || '-';
      case 'uf': return c.uf;
      case 'cep': return c.cep || '-';
      case 'email': return c.email || '-';
      case 'telefone': return c.telefone || '-';
      case 'capital_social': return formatCurrency(c.capital_social);
      case 'qsa': return (c.qsa || []).map(s => `${s.nome} (${s.qualificacao})`).join('; ') || '-';
      default: return (c as any)[id] || '-';
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-purple-700 text-xs font-bold uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Formatador & Emissor de Relatórios - Grupo Bamaq</span>
          </div>
          <h2 className="text-xl font-black text-slate-900">Gerador de Relatórios Corporativos (PDF & XLS)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Monte relatórios personalizados com flags para selecionar exatamente quais campos imprimir, ou exporte o modelo padrão completo.
          </p>
        </div>

        {/* Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportPdf}
            className="px-4 py-2.5 bg-purple-800 hover:bg-purple-900 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition"
          >
            <Download className="w-4 h-4" />
            <span>Exportar PDF {activeTab === 'custom' ? `(${selectedFields.length} campos)` : 'Formatado'}</span>
          </button>

          <button
            onClick={handleExportXlsx}
            className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow flex items-center space-x-2 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar XLS (Cabeçalho Roxo)</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab Selector Navigation */}
      <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl w-fit border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('custom')}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 ${
            activeTab === 'custom'
              ? 'bg-purple-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <Settings2 className="w-4 h-4" />
          <span>Relatório Personalizado (Seleção de Campos / Flags)</span>
        </button>

        <button
          onClick={() => setActiveTab('standard')}
          className={`px-4 py-2 rounded-xl transition flex items-center space-x-2 ${
            activeTab === 'standard'
              ? 'bg-purple-900 text-white shadow-md'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Relatório Padrão Completo</span>
        </button>
      </div>

      {/* TAB 1: RELATÓRIO PERSONALIZADO COM FLAGS DE SELEÇÃO */}
      {activeTab === 'custom' && (
        <div className="bg-white rounded-2xl shadow-sm border border-purple-200 p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-purple-100 pb-4">
            <div>
              <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
                <CheckSquare className="w-4 h-4 text-purple-700" />
                <span>Selecione com Flag os Campos que Devem Aparecer no Relatório</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                {selectedFields.length} de {allFieldIds.length} campos selecionados para impressão e exportação.
              </p>
            </div>

            {/* Quick Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <span className="text-slate-400 font-normal">Atalhos:</span>
              <button
                onClick={() => applyPreset('fiscal')}
                className="px-2.5 py-1 bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
              >
                Tributário
              </button>
              <button
                onClick={() => applyPreset('contato')}
                className="px-2.5 py-1 bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200 rounded-lg transition"
              >
                Endereço & Contato
              </button>
              <button
                onClick={selectAllFields}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
              >
                Marcar Todos
              </button>
              <button
                onClick={deselectAllFields}
                className="px-2.5 py-1 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg transition"
              >
                Limpar
              </button>
            </div>
          </div>

          {/* Grouped Checkboxes Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs">
            {FIELD_GROUPS.map((group, idx) => (
              <div key={idx} className="bg-purple-50/40 border border-purple-100 rounded-xl p-4 space-y-3">
                <h4 className="font-extrabold text-purple-950 border-b border-purple-200 pb-1.5 flex items-center justify-between">
                  <span>{group.category}</span>
                  <span className="text-[10px] text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded font-mono">
                    {group.fields.filter(f => selectedFields.includes(f.id)).length}/{group.fields.length}
                  </span>
                </h4>
                <div className="space-y-2">
                  {group.fields.map(field => {
                    const isChecked = selectedFields.includes(field.id);
                    return (
                      <label
                        key={field.id}
                        onClick={() => toggleField(field.id)}
                        className={`flex items-center space-x-2.5 p-1.5 rounded-lg cursor-pointer transition select-none ${
                          isChecked ? 'bg-purple-100/80 font-bold text-purple-950' : 'hover:bg-purple-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}} // Controlled by label click
                          className="w-4 h-4 text-purple-800 rounded border-purple-300 focus:ring-purple-600"
                        />
                        <span className="text-xs">{field.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Report Filters Header Setup */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Título no Relatório:</label>
              <input
                type="text"
                value={config.titulo}
                onChange={(e) => setConfig({ ...config, titulo: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-bold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Organização:</label>
              <input
                type="text"
                value={config.nome_organizacao}
                onChange={(e) => setConfig({ ...config, nome_organizacao: e.target.value })}
                className="w-full p-2 bg-purple-50 border border-purple-200 rounded-lg text-purple-900 font-extrabold"
              />
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Filtrar Estado (UF):</label>
              <select
                value={config.uf_filtro}
                onChange={(e) => setConfig({ ...config, uf_filtro: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="">Todas as UFs</option>
                {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-slate-700 mb-1">Filtrar Situação:</label>
              <select
                value={config.situacao_filtro}
                onChange={(e) => setConfig({ ...config, situacao_filtro: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-800 font-medium"
              >
                <option value="">Todas as Situações</option>
                <option value="ATIVA">ATIVA</option>
                <option value="INATIVA">INATIVA</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURAÇÕES DO RELATÓRIO PADRÃO */}
      {activeTab === 'standard' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-5">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2 border-b pb-3">
            <Sliders className="w-4 h-4 text-purple-700" />
            <span>Configuração do Relatório Padrão - Grupo Bamaq</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-bold text-slate-700 mb-1">Título do Relatório:</label>
              <input
                type="text"
                value={config.titulo}
                onChange={(e) => setConfig({ ...config, titulo: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Subtítulo:</label>
              <input
                type="text"
                value={config.subtitulo}
                onChange={(e) => setConfig({ ...config, subtitulo: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Organização:</label>
              <input
                type="text"
                value={config.nome_organizacao}
                onChange={(e) => setConfig({ ...config, nome_organizacao: e.target.value })}
                className="w-full p-2 bg-purple-50 border border-purple-200 rounded text-purple-900 font-extrabold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Departamento Emissor:</label>
              <input
                type="text"
                value={config.departamento}
                onChange={(e) => setConfig({ ...config, departamento: e.target.value })}
                className="w-full p-2 bg-purple-50 border border-purple-200 rounded text-purple-900 font-bold"
              />
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Filtrar por UF (Estado):</label>
              <select
                value={config.uf_filtro}
                onChange={(e) => setConfig({ ...config, uf_filtro: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
              >
                <option value="">Todas as UFs</option>
                {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">Filtrar por Porte:</label>
              <select
                value={config.porte_filtro}
                onChange={(e) => setConfig({ ...config, porte_filtro: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-300 rounded text-slate-800"
              >
                <option value="">Todos os Portes</option>
                {portes.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* LIVE TABLE PREVIEW (Adapts to Selected Flags or Standard Layout) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 space-y-4">
        
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center space-x-2">
            <Eye className="w-4 h-4 text-purple-700" />
            <h3 className="font-bold text-slate-800 text-sm">
              Pré-Visualização do Relatório {activeTab === 'custom' ? 'Personalizado' : 'Padrão'}
            </h3>
          </div>
          <span className="text-xs text-slate-500 font-semibold">
            {filteredCompanies.length} empresas selecionadas
          </span>
        </div>

        {/* Header Preview Frame */}
        {config.incluir_cabecalho_oficial && (
          <div className="border border-purple-200 rounded-xl overflow-hidden text-xs">
            <div className="bg-purple-950 text-white p-3 flex justify-between items-center">
              <span className="font-extrabold tracking-wider text-purple-200">{config.nome_organizacao.toUpperCase()}</span>
              <span className="font-mono text-purple-300 font-semibold">CONSULT - ENTERPRISE</span>
            </div>
            <div className="bg-purple-50/50 p-4 space-y-1 text-slate-800 border-b border-purple-100">
              <h4 className="font-bold text-sm text-purple-950">{config.titulo}</h4>
              <p className="text-purple-800">{config.subtitulo} • Departamento: {config.departamento}</p>
              <p className="text-slate-500 text-[11px]">
                Filtros: UF [{config.uf_filtro || 'TODAS'}] | Porte [{config.porte_filtro || 'TODOS'}] | Colunas Ativas: <strong className="text-purple-950">{activeTab === 'custom' ? selectedFields.length : '8 padrão'}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Dynamic Data Table Preview */}
        <div className="overflow-x-auto max-h-[420px]">
          <table className="w-full text-left text-xs border border-purple-100">
            <thead className="bg-purple-950 text-white uppercase sticky top-0">
              <tr>
                <th className="p-2.5 w-10">#</th>
                {activeTab === 'custom' ? (
                  selectedFields.map(fieldId => (
                    <th key={fieldId} className="p-2.5 font-bold whitespace-nowrap">
                      {getFieldLabel(fieldId)}
                    </th>
                  ))
                ) : (
                  <>
                    <th className="p-2.5">CNPJ</th>
                    <th className="p-2.5">Razão Social</th>
                    <th className="p-2.5">Situação</th>
                    <th className="p-2.5">UF/Município</th>
                    <th className="p-2.5">Porte</th>
                    <th className="p-2.5 text-right">Capital Social</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y text-slate-800 divide-slate-100">
              {filteredCompanies.map((c, i) => (
                <tr key={c.cnpj} className="hover:bg-purple-50/30 transition">
                  <td className="p-2.5 text-slate-400 font-mono font-medium">{i + 1}</td>
                  {activeTab === 'custom' ? (
                    selectedFields.map(fieldId => (
                      <td key={fieldId} className="p-2.5 whitespace-nowrap">
                        {getFieldValue(c, fieldId)}
                      </td>
                    ))
                  ) : (
                    <>
                      <td className="p-2.5 font-mono font-bold text-slate-900">{formatCnpj(c.cnpj)}</td>
                      <td className="p-2.5 font-medium">{c.razao_social}</td>
                      <td className="p-2.5">{c.situacao_cadastral}</td>
                      <td className="p-2.5">{c.municipio}/{c.uf}</td>
                      <td className="p-2.5">{c.porte}</td>
                      <td className="p-2.5 text-right font-medium">{formatCurrency(c.capital_social)}</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
};
