import React, { useState } from 'react';
import {
  Search,
  Building2,
  MapPin,
  Users,
  Briefcase,
  FileText,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  Printer,
  Download,
  Calendar,
  DollarSign
} from 'lucide-react';
import { Company } from '../types';
import { formatCnpj, formatCurrency, exportToPdf } from '../utils/reportExporter';

interface CnpjLookupViewProps {
  onSearch: (cnpj: string, forceRefresh: boolean) => Promise<{ company: Company; fonte: string }>;
  onSaveToDatabase?: (company: Company) => void;
  initialCnpj?: string;
  companies?: Company[];
}

export const CnpjLookupView: React.FC<CnpjLookupViewProps> = ({
  onSearch,
  initialCnpj = '',
  companies = []
}) => {
  const [cnpjInput, setCnpjInput] = useState(initialCnpj);
  const [loading, setLoading] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  const [company, setCompany] = useState<Company | null>(null);
  const [fonte, setFonte] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [nameSearchResults, setNameSearchResults] = useState<Company[]>([]);

  // Preset CNPJs for fast live testing
  const presets = [
    { label: 'Banco do Brasil', cnpj: '00000000000191' },
    { label: 'Petrobras', cnpj: '33000167000101' },
    { label: 'Vale S.A.', cnpj: '33592510000154' },
    { label: 'Itaú Unibanco', cnpj: '60701190000104' },
    { label: 'Ambev', cnpj: '07526557000100' },
    { label: 'WEG', cnpj: '84429695000111' },
    { label: 'Magalu', cnpj: '03238962000101' }
  ];

  const handleLookup = async (e?: React.FormEvent, cnpjToSearch?: string) => {
    if (e) e.preventDefault();
    const query = (cnpjToSearch || cnpjInput).trim();
    if (!query) return;

    setLoading(true);
    setError(null);
    setNameSearchResults([]);

    const cleanCnpj = query.replace(/\D/g, '');

    // Check if user is searching by Name (letters) or CNPJ (14 digits or formatted)
    if (cleanCnpj.length !== 14 && isNaN(Number(query.replace(/[\/\.-]/g, '')))) {
      // Name Search in local SQLite database
      const matches = companies.filter(c =>
        c.razao_social.toLowerCase().includes(query.toLowerCase()) ||
        (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(query.toLowerCase()))
      );

      if (matches.length === 1) {
        setCompany(matches[0]);
        setFonte('SQLite Local (Busca por Nome)');
        setLoading(false);
        return;
      } else if (matches.length > 1) {
        setNameSearchResults(matches);
        setCompany(null);
        setLoading(false);
        return;
      } else {
        setError(`Nenhuma empresa encontrada localmente para o nome "${query}". Para consultar na API CNPJá, digite o CNPJ numérico de 14 dígitos.`);
        setCompany(null);
        setLoading(false);
        return;
      }
    }

    // Standard CNPJ Search
    try {
      const res = await onSearch(cleanCnpj || query, forceRefresh);
      setCompany(res.company);
      setFonte(res.fonte);
    } catch (err: any) {
      setError(err.message || 'Erro ao realizar consulta de CNPJ.');
      setCompany(null);
    } finally {
      setLoading(false);
    }
  };

  const copyCnpj = () => {
    if (!company) return;
    navigator.clipboard.writeText(company.cnpj);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportIndividualPdf = () => {
    if (!company) return;
    exportToPdf([company], {
      titulo: 'FICHA CADASTRAL INDIVIDUAL DE EMPRESA',
      subtitulo: `Razão Social: ${company.razao_social}`,
      nome_organizacao: 'SISTEMA CORPORATIVO CUBOSOFT',
      cnpj_matriz: '00.000.000/0001-00',
      departamento: 'TECNOLOGIA DA INFORMAÇÃO',
      observacoes: 'Ficha gerada via consulta avulsa com armazenamento no banco SQLite',
      uf_filtro: company.uf,
      porte_filtro: company.porte,
      situacao_filtro: company.situacao_cadastral,
      incluir_cabecalho_oficial: true,
      incluir_totais: false,
      incluir_data_hora: true
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Header Box */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-bold text-slate-900">Consulta Avulsa de CNPJ (CNPJá API)</h2>
        <p className="text-sm text-slate-500 mt-1">
          Informe o CNPJ para consultar a Ficha Cadastral completa na Receita Federal via API CNPJá. O resultado é armazenado automaticamente no banco de dados SQLite local.
        </p>

        {/* Search Input Form */}
        <form onSubmit={handleLookup} className="mt-5 space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Digite o CNPJ (ex: 00.000.000/0000-00)"
                value={cnpjInput}
                onChange={(e) => setCnpjInput(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white font-mono"
              />
              <Search className="w-5 h-5 text-slate-400 absolute left-3 top-3.5" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center space-x-2 transition disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Consultando...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>Consultar CNPJ</span>
                </>
              )}
            </button>
          </div>

          {/* Options & Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-slate-600 pt-2 border-t border-slate-100">
            
            {/* Force Refresh Toggle */}
            <label className="flex items-center space-x-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={forceRefresh}
                onChange={(e) => setForceRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="font-medium text-slate-700">Forçar reconsulta online (Ignorar cache de 45 dias)</span>
            </label>

            {/* Fast Test Presets */}
            <div className="flex items-center space-x-1.5 flex-wrap">
              <span className="text-slate-400 font-medium">Testar rápidos:</span>
              {presets.map((p) => (
                <button
                  key={p.cnpj}
                  type="button"
                  onClick={() => {
                    setCnpjInput(p.cnpj);
                    handleLookup(undefined, p.cnpj);
                  }}
                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </form>
      </div>

      {/* Multiple Name Search Results Selection List */}
      {nameSearchResults.length > 0 && (
        <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-sm">
              Empresas Encontradas no Banco de Dados ({nameSearchResults.length})
            </h3>
            <span className="text-xs text-slate-400">Clique para abrir a Ficha Cadastral</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {nameSearchResults.map((comp) => (
              <button
                key={comp.cnpj}
                onClick={() => {
                  setCompany(comp);
                  setFonte('SQLite Local');
                  setNameSearchResults([]);
                }}
                className="p-3.5 bg-slate-50 hover:bg-blue-50/70 border border-slate-200 hover:border-blue-400 rounded-xl text-left transition flex items-center justify-between group"
              >
                <div>
                  <p className="font-bold text-slate-900 text-xs group-hover:text-blue-700">{comp.razao_social}</p>
                  <p className="font-mono text-[11px] text-slate-500 mt-0.5">CNPJ: {formatCnpj(comp.cnpj)}</p>
                  <p className="text-[10px] text-slate-400">{comp.municipio || '-'} / {comp.uf}</p>
                </div>
                <Building2 className="w-4 h-4 text-slate-400 group-hover:text-blue-600 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold">Erro na Consulta</p>
            <p className="mt-0.5 text-xs text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Complete Company Ficha Cadastral Result Card */}
      {company && (
        <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden">
          
          {/* Card Top Header */}
          <div className="bg-slate-900 text-white p-6 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center space-x-3 mb-1">
                <span className="px-2.5 py-0.5 rounded text-xs font-bold bg-emerald-900/80 text-emerald-300 border border-emerald-700">
                  {company.situacao_cadastral}
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  CNPJ: {formatCnpj(company.cnpj)}
                </span>
                <button
                  onClick={copyCnpj}
                  className="text-slate-400 hover:text-white transition p-1"
                  title="Copiar CNPJ"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>

              <h3 className="text-xl font-bold tracking-tight text-white">{company.razao_social}</h3>
              {company.nome_fantasia && (
                <p className="text-sm text-slate-300 mt-0.5">Nome Fantasia: <span className="text-white font-medium">{company.nome_fantasia}</span></p>
              )}
            </div>

            {/* Actions & Fonte Badge */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs bg-slate-800 text-blue-300 px-3 py-1.5 rounded-lg border border-slate-700 font-medium">
                Fonte: {fonte || company.origem}
              </span>

              <button
                onClick={handleExportIndividualPdf}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-1.5 shadow-sm transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar Ficha PDF</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-1.5 border border-slate-700 transition"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Imprimir</span>
              </button>
            </div>
          </div>

          {/* Ficha Cadastral Body Details */}
          <div className="p-6 space-y-6 text-slate-800">
            
            {/* Grid 1: Identificação & Dados Gerais */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-blue-600" />
                <span>Identificação & Dados Cadastrais</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block">Porte da Empresa:</span>
                  <span className="font-semibold text-slate-800">{company.porte}</span>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Data de Abertura:</span>
                  </span>
                  <span className="font-semibold text-slate-800">{company.data_abertura || 'Não informada'}</span>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block flex items-center gap-1">
                    <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                    <span>Capital Social:</span>
                  </span>
                  <span className="font-bold text-emerald-700">{formatCurrency(company.capital_social)}</span>
                </div>

                <div className="md:col-span-3 pt-2 border-t border-slate-200">
                  <span className="text-xs text-slate-500 block">Natureza Jurídica:</span>
                  <span className="font-medium text-slate-800">{company.natureza_juridica}</span>
                </div>
              </div>
            </div>

            {/* Grid 1.5: Regime Tributário (Simples Nacional & MEI) */}
            <div>
              <h4 className="text-xs font-extrabold text-purple-950 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-700" />
                <span>Regime Tributário (Simples Nacional & MEI)</span>
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                
                {/* Box Simples Nacional */}
                <div className={`p-4 rounded-xl border transition flex items-start space-x-3.5 ${
                  company.opcao_simples
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className={`p-2.5 rounded-xl ${
                    company.opcao_simples ? 'bg-emerald-600 text-white shadow-sm' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {company.opcao_simples ? <CheckCircle2 className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Simples Nacional</span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className={`text-sm font-black ${
                        company.opcao_simples ? 'text-emerald-800' : 'text-slate-600'
                      }`}>
                        {company.opcao_simples ? 'OPTANTE PELO SIMPLES' : 'NÃO OPTANTE'}
                      </span>
                    </div>
                    {company.opcao_simples && company.data_opcao_simples ? (
                      <p className="text-xs text-emerald-700 mt-1 font-medium">Desde: {company.data_opcao_simples}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">Empresa não optante pelo Simples Nacional</p>
                    )}
                  </div>
                </div>

                {/* Box MEI / SIMEI */}
                <div className={`p-4 rounded-xl border transition flex items-start space-x-3.5 ${
                  company.opcao_mei
                    ? 'bg-purple-50 border-purple-300 text-purple-950'
                    : 'bg-slate-50 border-slate-200 text-slate-700'
                }`}>
                  <div className={`p-2.5 rounded-xl ${
                    company.opcao_mei ? 'bg-purple-700 text-white shadow-sm' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {company.opcao_mei ? <Users className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Microempreendedor Individual (MEI / SIMEI)</span>
                    <div className="flex items-center space-x-2 mt-0.5">
                      <span className={`text-sm font-black ${
                        company.opcao_mei ? 'text-purple-900' : 'text-slate-600'
                      }`}>
                        {company.opcao_mei ? 'OPTANTE PELO MEI (SIMEI)' : 'NÃO OPTANTE'}
                      </span>
                    </div>
                    {company.opcao_mei && company.data_opcao_mei ? (
                      <p className="text-xs text-purple-700 mt-1 font-medium">Desde: {company.data_opcao_mei}</p>
                    ) : (
                      <p className="text-[11px] text-slate-400 mt-0.5">Empresa não enquadrada como MEI</p>
                    )}
                  </div>
                </div>

              </div>
            </div>


            {/* Grid 2: Atividades Econômicas (CNAE) */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-blue-600" />
                <span>Atividades Econômicas (CNAE)</span>
              </h4>

              <div className="space-y-2 text-sm">
                <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg">
                  <span className="text-xs font-bold text-blue-800 block">CNAE Principal:</span>
                  <p className="font-medium text-blue-950 mt-0.5">
                    <span className="font-mono font-bold mr-2">{company.cnae_principal_codigo}</span>
                    {company.cnae_principal_descricao}
                  </p>
                </div>

                {company.atividades_secundarias && company.atividades_secundarias.length > 0 && (
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg text-xs space-y-1">
                    <span className="font-bold text-slate-700 block">Atividades Secundárias ({company.atividades_secundarias.length}):</span>
                    {company.atividades_secundarias.map((act, i) => (
                      <div key={i} className="text-slate-600 font-mono">
                        <span className="font-bold text-slate-800 mr-2">{act.codigo}</span>
                        {act.descricao}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Grid 3: Endereço & Contato */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-blue-600" />
                <span>Localização & Contato</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <span className="text-xs text-slate-500 block">Logradouro / Endereço:</span>
                  <p className="font-medium text-slate-800">
                    {company.logradouro}, {company.numero} {company.complemento && `- ${company.complemento}`}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">
                    Bairro: {company.bairro} — CEP: {company.cep}
                  </p>
                  <p className="text-xs font-bold text-blue-700 mt-0.5">
                    {company.municipio} / {company.uf}
                  </p>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block">Canais de Contato:</span>
                  <p className="text-xs text-slate-800 mt-1">
                    <span className="font-semibold">Telefone:</span> {company.telefone || 'Não informado'}
                  </p>
                  <p className="text-xs text-slate-800 mt-0.5">
                    <span className="font-semibold">E-mail:</span> {company.email || 'Não informado'}
                  </p>
                </div>
              </div>
            </div>

            {/* Grid 4: QSA / Sócios */}
            {company.qsa && company.qsa.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span>Quadro de Sócios e Administradores (QSA)</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {company.qsa.map((s, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                      <p className="font-bold text-slate-800">{s.nome}</p>
                      <p className="text-slate-500 mt-0.5">Qualificação: <span className="text-slate-700 font-medium">{s.qualificacao}</span></p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SQLite Storage Banner Notice */}
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-3 rounded-lg text-xs flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>Esta empresa está salva e sincronizada no banco de dados SQLite local.</span>
              </div>
              <span className="text-[10px] bg-emerald-200 text-emerald-800 px-2 py-0.5 rounded font-bold">
                SQLite Persistido
              </span>
            </div>

          </div>

        </div>
      )}

    </div>
  );
};
