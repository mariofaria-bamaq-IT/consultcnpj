import React, { useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  Edit,
  Eye,
  Building2,
  X,
  Save,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Company } from '../types';
import { formatCnpj, formatCurrency } from '../utils/reportExporter';

interface CompanyManagerViewProps {
  companies: Company[];
  onSaveCompany: (company: Company) => Promise<void>;
  onDeleteCompany: (cnpj: string) => Promise<void>;
  onRefresh: () => void;
  onSelectCnpjLookup: (cnpj: string) => void;
}

export const CompanyManagerView: React.FC<CompanyManagerViewProps> = ({
  companies,
  onSaveCompany,
  onDeleteCompany,
  onSelectCnpjLookup
}) => {
  const [search, setSearch] = useState('');
  const [selectedUf, setSelectedUf] = useState('');
  const [selectedPorte, setSelectedPorte] = useState('');
  const [selectedSituacao, setSelectedSituacao] = useState('');
  const [selectedSimples, setSelectedSimples] = useState('');
  const [isClearAllModalOpen, setIsClearAllModalOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Modals state
  const [viewCompany, setViewCompany] = useState<Company | null>(null);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [deleteCnpj, setDeleteCnpj] = useState<string | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Unique UFs and Portes for filters
  const ufs = Array.from(new Set(companies.map(c => c.uf).filter(Boolean))).sort();
  const portes = Array.from(new Set(companies.map(c => c.porte).filter(Boolean))).sort();

  // Filtered companies
  const filtered = companies.filter(c => {
    const matchSearch = !search || (
      c.cnpj.includes(search.replace(/\D/g, '')) ||
      c.razao_social.toLowerCase().includes(search.toLowerCase()) ||
      (c.nome_fantasia && c.nome_fantasia.toLowerCase().includes(search.toLowerCase())) ||
      (c.municipio && c.municipio.toLowerCase().includes(search.toLowerCase()))
    );
    const matchUf = !selectedUf || c.uf === selectedUf;
    const matchPorte = !selectedPorte || c.porte === selectedPorte;
    const matchSituacao = !selectedSituacao || c.situacao_cadastral === selectedSituacao;
    const matchSimples = !selectedSimples || (
      selectedSimples === 'SIM' ? !!c.opcao_simples : !c.opcao_simples
    );

    return matchSearch && matchUf && matchPorte && matchSituacao && matchSimples;
  });

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const emptyForm: Company = {
    cnpj: '',
    razao_social: '',
    nome_fantasia: '',
    situacao_cadastral: 'ATIVA',
    data_abertura: new Date().toISOString().slice(0, 10),
    porte: 'EPP',
    natureza_juridica: '206-2 - Sociedade Empresária Limitada',
    cnae_principal_codigo: '6201-5/00',
    cnae_principal_descricao: 'Desenvolvimento de software',
    logradouro: '',
    numero: '100',
    bairro: 'Centro',
    municipio: 'São Paulo',
    uf: 'SP',
    cep: '01000-000',
    email: 'contato@empresa.com.br',
    telefone: '(11) 3000-0000',
    capital_social: 100000,
    origem: 'MANUAL',
    data_consulta: new Date().toISOString(),
    status_sincronizacao: 'PENDENTE',
    ultima_atualizacao: new Date().toISOString()
  };

  const [formData, setFormData] = useState<Company>(emptyForm);

  const handleOpenAdd = () => {
    setFormData(emptyForm);
    setIsAddModalOpen(true);
  };

  const handleSaveFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.cnpj || !formData.razao_social) {
      alert('CNPJ e Razão Social são obrigatórios.');
      return;
    }
    await onSaveCompany(formData);
    setIsAddModalOpen(false);
    setEditCompany(null);
  };

  const handleConfirmDelete = async () => {
    if (deleteCnpj) {
      await onDeleteCompany(deleteCnpj);
      setDeleteCnpj(null);
    }
  };

  const handleConfirmClearAll = async () => {
    setClearing(true);
    try {
      await fetch('/api/companies/clear-all', { method: 'POST' });
      await onSaveCompany({} as any).catch(() => {}); // soft trigger update
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setClearing(false);
      setIsClearAllModalOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header & Action Buttons */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Gestão de Cadastro de Empresas</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Visualize, filtre, edite e gerencie o cadastro de empresas ({companies.length} cadastradas).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {companies.length > 0 && (
            <button
              onClick={() => setIsClearAllModalOpen(true)}
              className="px-3.5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center space-x-2 transition"
              title="Excluir empresas de exemplo e limpar base local"
            >
              <Trash2 className="w-4 h-4 text-red-600" />
              <span>Limpar Base / Excluir Exemplos</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg shadow-sm flex items-center justify-center space-x-2 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Cadastrar Empresa</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        
        {/* Search Field */}
        <div className="lg:col-span-2 relative">
          <input
            type="text"
            placeholder="Buscar por CNPJ, Razão Social, Município..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </div>

        {/* Filter UF */}
        <div>
          <select
            value={selectedUf}
            onChange={(e) => { setSelectedUf(e.target.value); setCurrentPage(1); }}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as UFs</option>
            {ufs.map(uf => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        {/* Filter Porte */}
        <div>
          <select
            value={selectedPorte}
            onChange={(e) => { setSelectedPorte(e.target.value); setCurrentPage(1); }}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todos os Portes</option>
            {portes.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        {/* Filter Situação */}
        <div>
          <select
            value={selectedSituacao}
            onChange={(e) => { setSelectedSituacao(e.target.value); setCurrentPage(1); }}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Todas as Situações</option>
            <option value="ATIVA">ATIVA</option>
            <option value="INATIVA">INATIVA</option>
            <option value="SUSPENSA">SUSPENSA</option>
            <option value="BAIXADA">BAIXADA</option>
          </select>
        </div>

        {/* Filter Simples Nacional */}
        <div>
          <select
            value={selectedSimples}
            onChange={(e) => { setSelectedSimples(e.target.value); setCurrentPage(1); }}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Simples Nacional (Todos)</option>
            <option value="SIM">Optantes do Simples</option>
            <option value="NAO">Não Optantes</option>
          </select>
        </div>

      </div>

      {/* Main Companies Table */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-900 text-white text-xs font-semibold uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">CNPJ</th>
                <th className="py-3 px-4">Razão Social / Nome Fantasia</th>
                <th className="py-3 px-4">Situação</th>
                <th className="py-3 px-4">Simples</th>
                <th className="py-3 px-4">UF / Cidade</th>
                <th className="py-3 px-4">Porte</th>
                <th className="py-3 px-4 text-right">Capital Social</th>
                <th className="py-3 px-4 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-8 text-slate-500 text-sm">
                    Nenhuma empresa encontrada para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                paginated.map((c) => (
                  <tr key={c.cnpj} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-mono text-xs font-bold text-slate-900">
                      {formatCnpj(c.cnpj)}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-semibold text-slate-900">{c.razao_social}</p>
                      {c.nome_fantasia && (
                        <p className="text-xs text-slate-500">{c.nome_fantasia}</p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                        c.situacao_cadastral === 'ATIVA'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {c.situacao_cadastral}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {c.opcao_simples ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                          OPTANTE SIMPLES
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                          NÃO OPTANTE (FORA DO SIMPLES)
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-xs">
                      <span className="font-semibold text-slate-800">{c.uf}</span>
                      <span className="text-slate-500"> — {c.municipio || '-'}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-xs font-medium">
                        {c.porte}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-900 text-xs">
                      {formatCurrency(c.capital_social)}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center space-x-2">
                        
                        {/* View Details */}
                        <button
                          onClick={() => setViewCompany(c)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-slate-100 rounded transition"
                          title="Ver Ficha Completa"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Lookup CNPJá */}
                        <button
                          onClick={() => onSelectCnpjLookup(c.cnpj)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition"
                          title="Reconsultar via CNPJá"
                        >
                          <Building2 className="w-4 h-4" />
                        </button>

                        {/* Edit */}
                        <button
                          onClick={() => {
                            setFormData(c);
                            setEditCompany(c);
                          }}
                          className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded transition"
                          title="Editar Cadastro"
                        >
                          <Edit className="w-4 h-4" />
                        </button>

                        {/* Delete */}
                        <button
                          onClick={() => setDeleteCnpj(c.cnpj)}
                          className="p-1.5 text-slate-500 hover:text-red-600 hover:bg-slate-100 rounded transition"
                          title="Excluir Empresa"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>

                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
          <span>Mostrando {paginated.length} de {filtered.length} empresas</span>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(p => Math.max(p - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-40 hover:bg-slate-100"
            >
              Anterior
            </button>
            <span className="font-semibold text-slate-800">
              Página {currentPage} de {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-white border border-slate-300 rounded font-medium disabled:opacity-40 hover:bg-slate-100"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>

      {/* View Company Modal */}
      {viewCompany && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">Ficha Cadastral — {viewCompany.razao_social}</h3>
              <button onClick={() => setViewCompany(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-sm text-slate-700">
              <p><span className="font-bold">CNPJ:</span> {formatCnpj(viewCompany.cnpj)}</p>
              <p><span className="font-bold">Nome Fantasia:</span> {viewCompany.nome_fantasia || '-'}</p>
              <p><span className="font-bold">Situação Cadastral:</span> {viewCompany.situacao_cadastral}</p>
              <p><span className="font-bold">Porte:</span> {viewCompany.porte}</p>
              <p><span className="font-bold">Natureza Jurídica:</span> {viewCompany.natureza_juridica}</p>
              <p><span className="font-bold">CNAE Principal:</span> {viewCompany.cnae_principal_codigo} - {viewCompany.cnae_principal_descricao}</p>
              <p><span className="font-bold">Endereço:</span> {viewCompany.logradouro}, {viewCompany.numero} - {viewCompany.bairro}, {viewCompany.municipio}/{viewCompany.uf}</p>
              <p><span className="font-bold">Capital Social:</span> {formatCurrency(viewCompany.capital_social)}</p>
              <p><span className="font-bold">E-mail:</span> {viewCompany.email || '-'}</p>
              <p><span className="font-bold">Telefone:</span> {viewCompany.telefone || '-'}</p>
              <p><span className="font-bold">Origem no Sistema:</span> {viewCompany.origem}</p>
            </div>

            <div className="pt-4 border-t flex justify-end">
              <button
                onClick={() => setViewCompany(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit / Add Modal */}
      {(isAddModalOpen || editCompany) && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-lg text-slate-900">
                {isAddModalOpen ? 'Cadastrar Nova Empresa' : 'Editar Dados da Empresa'}
              </h3>
              <button
                onClick={() => { setIsAddModalOpen(false); setEditCompany(null); }}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveFormSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">CNPJ (apenas números):</label>
                  <input
                    type="text"
                    required
                    value={formData.cnpj}
                    onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                    className="w-full p-2 border rounded font-mono"
                    disabled={!!editCompany}
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Razão Social:</label>
                  <input
                    type="text"
                    required
                    value={formData.razao_social}
                    onChange={(e) => setFormData({ ...formData, razao_social: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nome Fantasia:</label>
                  <input
                    type="text"
                    value={formData.nome_fantasia}
                    onChange={(e) => setFormData({ ...formData, nome_fantasia: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Situação Cadastral:</label>
                  <select
                    value={formData.situacao_cadastral}
                    onChange={(e) => setFormData({ ...formData, situacao_cadastral: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="ATIVA">ATIVA</option>
                    <option value="INATIVA">INATIVA</option>
                    <option value="SUSPENSA">SUSPENSA</option>
                    <option value="BAIXADA">BAIXADA</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Porte:</label>
                  <select
                    value={formData.porte}
                    onChange={(e) => setFormData({ ...formData, porte: e.target.value })}
                    className="w-full p-2 border rounded"
                  >
                    <option value="ME">ME</option>
                    <option value="EPP">EPP</option>
                    <option value="DEMAIS">DEMAIS</option>
                    <option value="MEI">MEI</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Capital Social (R$):</label>
                  <input
                    type="number"
                    value={formData.capital_social}
                    onChange={(e) => setFormData({ ...formData, capital_social: Number(e.target.value) })}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Município:</label>
                  <input
                    type="text"
                    value={formData.municipio}
                    onChange={(e) => setFormData({ ...formData, municipio: e.target.value })}
                    className="w-full p-2 border rounded"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">UF (Estado):</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={formData.uf}
                    onChange={(e) => setFormData({ ...formData, uf: e.target.value.toUpperCase() })}
                    className="w-full p-2 border rounded uppercase"
                  />
                </div>
              </div>

              <div className="pt-4 border-t flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => { setIsAddModalOpen(false); setEditCompany(null); }}
                  className="px-4 py-2 bg-slate-200 text-slate-700 rounded text-xs font-semibold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded text-xs font-semibold flex items-center space-x-1"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Salvar Empresa</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteCnpj && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <AlertTriangle className="w-6 h-6" />
              <h3 className="font-bold text-lg">Excluir Empresa?</h3>
            </div>
            <p className="text-sm text-slate-600">
              Tem certeza que deseja remover a empresa com CNPJ <span className="font-mono font-bold text-slate-900">{formatCnpj(deleteCnpj)}</span> da base de dados?
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setDeleteCnpj(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmDelete}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
              >
                Excluir Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear All Base Modal */}
      {isClearAllModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <Trash2 className="w-6 h-6" />
              <h3 className="font-bold text-lg">Limpar Base Cadastral?</h3>
            </div>
            <p className="text-sm text-slate-600">
              Esta ação excluirá <strong>todas as empresas cadastradas/exemplo</strong> da base de dados, deixando a base totalmente limpa para que você possa importar suas próprias planilhas ou realizar consultas avulsas manuais.
            </p>
            <div className="flex justify-end space-x-3 pt-2">
              <button
                onClick={() => setIsClearAllModalOpen(false)}
                disabled={clearing}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmClearAll}
                disabled={clearing}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg flex items-center space-x-2"
              >
                {clearing ? (
                  <span>Limpando...</span>
                ) : (
                  <span>Limpar Tudo</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
