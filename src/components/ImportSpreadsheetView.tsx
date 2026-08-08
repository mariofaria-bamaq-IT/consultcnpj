import React, { useState } from 'react';
import {
  FileSpreadsheet,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  FileCheck,
  RefreshCw,
  ArrowRight,
  Database,
  Search,
  Sparkles,
  Download,
  Play,
  FileText,
  Clock,
  XCircle,
  Filter
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { Company, ReportConfig } from '../types';
import { exportToXlsx, exportToPdf, formatCnpj, formatCurrency } from '../utils/reportExporter';

interface ImportSpreadsheetViewProps {
  onImportComplete: () => void;
}

interface BatchItem {
  rawCnpj: string;
  cleanCnpj: string;
  status: 'PENDENTE' | 'PROCESSANDO' | 'SUCESSO' | 'ERRO';
  company?: Company;
  fonte?: string;
  erro?: string;
}

export const ImportSpreadsheetView: React.FC<ImportSpreadsheetViewProps> = ({
  onImportComplete
}) => {
  const [activeMode, setActiveMode] = useState<'batch_lookup' | 'direct_import'>('batch_lookup');

  // File & Excel parsing state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Batch Lookup specific state
  const [extractedCnpjs, setExtractedCnpjs] = useState<string[]>([]);
  const [manualText, setManualText] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [forceRefresh, setForceRefresh] = useState(false);
  
  // Batch Execution State
  const [batchItems, setBatchItems] = useState<BatchItem[]>([]);
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchFinished, setBatchFinished] = useState(false);
  const [batchFilterTab, setBatchFilterTab] = useState<'ALL' | 'SUCCESS' | 'ERROR'>('ALL');

  // Direct Import specific state
  const [loadingImport, setLoadingImport] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);
  const [importResult, setImportResult] = useState<any | null>(null);

  // Parse spreadsheet file
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      await processSpreadsheetFile(file);
    }
  };

  const handleDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      await processSpreadsheetFile(file);
    }
  };

  const processSpreadsheetFile = async (file: File) => {
    setLoadingPreview(true);
    setError(null);
    setExtractedCnpjs([]);
    setBatchItems([]);
    setBatchFinished(false);
    setPreviewData(null);
    setImportResult(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

      if (!rawRows || rawRows.length === 0) {
        throw new Error('A planilha enviada está vazia ou não contém dados válidos.');
      }

      // Extract all CNPJs found in rows
      const foundCnpjs: string[] = [];
      rawRows.forEach((row) => {
        // Search all keys in object for CNPJ-like strings
        for (const key of Object.keys(row)) {
          const valStr = String(row[key] || '').trim();
          const cleanVal = valStr.replace(/\D/g, '');
          if (cleanVal.length === 14 && !foundCnpjs.includes(cleanVal)) {
            foundCnpjs.push(cleanVal);
            break; // take first CNPJ per row
          }
        }
      });

      if (foundCnpjs.length === 0) {
        throw new Error('Nenhum CNPJ de 14 dígitos foi localizado na planilha. Verifique as colunas do arquivo.');
      }

      setExtractedCnpjs(foundCnpjs);

      // Also set up for direct import preview
      const previewRows = rawRows.slice(0, 10).map((row) => ({
        cnpj: String(row.cnpj || row.CNPJ || row['Cnpj'] || '').replace(/\D/g, ''),
        razao_social: String(row.razao_social || row['Razão Social'] || row['RAZAO SOCIAL'] || row['Razao Social'] || row['Empresa'] || ''),
        nome_fantasia: String(row.nome_fantasia || row['Nome Fantasia'] || row['NOME FANTASIA'] || ''),
        uf: String(row.uf || row.UF || row['Estado'] || 'SP').toUpperCase(),
        municipio: String(row.municipio || row['Município'] || row['MUNICIPIO'] || row['Cidade'] || ''),
        porte: String(row.porte || row.Porte || row['PORTE'] || 'EPP').toUpperCase(),
        capital_social: String(row.capital_social || row['Capital Social'] || row['CAPITAL SOCIAL'] || 0)
      }));

      setPreviewData({
        total_linhas: rawRows.length,
        colunas: Object.keys(rawRows[0] || {}),
        amostra: previewRows
      });

    } catch (err: any) {
      setError(err.message || 'Erro ao ler arquivo de planilha.');
    } finally {
      setLoadingPreview(false);
    }
  };

  // Process manual CNPJ list
  const handleProcessManualText = () => {
    if (!manualText.trim()) return;
    const lines = manualText.split(/[\n,;]+/);
    const validCnpjs: string[] = [];

    lines.forEach(line => {
      const clean = line.replace(/\D/g, '');
      if (clean.length === 14 && !validCnpjs.includes(clean)) {
        validCnpjs.push(clean);
      }
    });

    if (validCnpjs.length === 0) {
      setError('Nenhum CNPJ com 14 dígitos válidos foi encontrado no texto inserido.');
      return;
    }

    setError(null);
    setExtractedCnpjs(validCnpjs);
    setBatchItems([]);
    setBatchFinished(false);
  };

  // Execute Batch Query step-by-step
  const startBatchLookup = async () => {
    if (extractedCnpjs.length === 0) return;

    setIsProcessingBatch(true);
    setBatchFinished(false);
    setError(null);

    const initialItems: BatchItem[] = extractedCnpjs.map(cnpj => ({
      rawCnpj: cnpj,
      cleanCnpj: cnpj,
      status: 'PENDENTE'
    }));

    setBatchItems(initialItems);
    setBatchProgress({ current: 0, total: extractedCnpjs.length });

    const processedCompanies: Company[] = [];

    for (let i = 0; i < extractedCnpjs.length; i++) {
      const cnpj = extractedCnpjs[i];

      // Update current item status to processando
      setBatchItems(prev => prev.map((item, idx) => idx === i ? { ...item, status: 'PROCESSANDO' } : item));

      try {
        const res = await fetch(`/api/cnpj/lookup/${cnpj}?refresh=${forceRefresh}`);
        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.error || 'Falha na consulta');
        }

        const data = await res.json();
        const company: Company = data.company || data;
        const fonte = data.fonte || 'CNPJA_API';

        if (company) {
          processedCompanies.push(company);
        }

        setBatchItems(prev => prev.map((item, idx) =>
          idx === i ? {
            ...item,
            status: 'SUCESSO',
            company,
            fonte
          } : item
        ));
      } catch (err: any) {
        setBatchItems(prev => prev.map((item, idx) =>
          idx === i ? {
            ...item,
            status: 'ERRO',
            erro: err.message
          } : item
        ));
      }

      setBatchProgress({ current: i + 1, total: extractedCnpjs.length });
      // Small pause for smooth UI animation
      await new Promise(resolve => setTimeout(resolve, 80));
    }

    setIsProcessingBatch(false);
    setBatchFinished(true);
    onImportComplete(); // Refresh global dashboard state
  };

  // Retry only failed batch items
  const retryFailedBatchItems = async () => {
    const errorIndices = batchItems
      .map((item, idx) => item.status === 'ERRO' ? idx : -1)
      .filter(idx => idx !== -1);

    if (errorIndices.length === 0) return;

    setIsProcessingBatch(true);
    setBatchFinished(false);

    for (let count = 0; count < errorIndices.length; count++) {
      const i = errorIndices[count];
      const item = batchItems[i];

      setBatchItems(prev => prev.map((it, idx) => idx === i ? { ...it, status: 'PROCESSANDO' } : it));

      try {
        const res = await fetch(`/api/cnpj/lookup/${item.cleanCnpj}?refresh=true`);
        if (!res.ok) {
          const errJson = await res.json();
          throw new Error(errJson.error || 'Falha na reconsulta');
        }

        const data = await res.json();
        const company: Company = data.company || data;
        const fonte = data.fonte || 'CNPJA_API';

        setBatchItems(prev => prev.map((it, idx) =>
          idx === i ? {
            ...it,
            status: 'SUCESSO',
            company,
            fonte,
            erro: undefined
          } : it
        ));
      } catch (err: any) {
        setBatchItems(prev => prev.map((it, idx) =>
          idx === i ? {
            ...it,
            status: 'ERRO',
            erro: err.message
          } : it
        ));
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    setIsProcessingBatch(false);
    setBatchFinished(true);
    onImportComplete();
  };

  // Export errors report (.xlsx)
  const handleDownloadErrorsXlsx = () => {
    const errorItems = batchItems.filter(item => item.status === 'ERRO');
    if (errorItems.length === 0) return;

    const dataRows = errorItems.map((item, idx) => ({
      '#': idx + 1,
      'CNPJ': formatCnpj(item.cleanCnpj),
      'CNPJ Bruto': item.rawCnpj,
      'Status': 'ERRO NA CONSULTA',
      'Motivo da Falha': item.erro || 'Não encontrado na Receita Federal / Erro na API'
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Erros de Consulta');
    XLSX.writeFile(workbook, `relatorio_erros_cnpj_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  // Direct Excel Import Execution
  const executeDirectImport = async () => {
    if (!selectedFile) return;

    setLoadingImport(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const res = await fetch('/api/import/excel', {
        method: 'POST',
        body: formData
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.error || 'Erro ao executar importação.');
      }

      const data = await res.json();
      setImportResult(data);
      onImportComplete();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoadingImport(false);
    }
  };

  // Download enriched excel back
  const handleDownloadEnrichedXlsx = () => {
    const successCompanies = batchItems
      .filter(item => item.status === 'SUCESSO' && item.company)
      .map(item => item.company!);

    if (successCompanies.length === 0) {
      alert('Nenhuma empresa consultada com sucesso para exportar.');
      return;
    }

    const config: ReportConfig = {
      titulo: 'RELATÓRIO DE CONSULTA EM LOTE DE CNPJ (ENRIQUECIDA)',
      subtitulo: 'Dados Oficiais e Ficha Cadastral Preenchida via API & Banco SQLite',
      nome_organizacao: 'CUBOSOFT SISTEMAS CORPORATIVOS',
      cnpj_matriz: '00000000000191',
      departamento: 'TECNOLOGIA DA INFORMAÇÃO & COMPLIANCE',
      observacoes: 'Planilha preenchida em lote a partir de lista de CNPJs.',
      uf_filtro: '',
      porte_filtro: '',
      situacao_filtro: '',
      incluir_cabecalho_oficial: true,
      incluir_totais: true,
      incluir_data_hora: true
    };

    exportToXlsx(successCompanies, config);
  };

  // Export Enriched PDF
  const handleDownloadEnrichedPdf = () => {
    const successCompanies = batchItems
      .filter(item => item.status === 'SUCESSO' && item.company)
      .map(item => item.company!);

    if (successCompanies.length === 0) return;

    const config: ReportConfig = {
      titulo: 'RELATÓRIO DE CONSULTA EM LOTE DE CNPJ',
      subtitulo: 'Consulta e Preenchimento Automático de Empresas',
      nome_organizacao: 'CUBOSOFT SISTEMAS CORPORATIVOS',
      cnpj_matriz: '00000000000191',
      departamento: 'TECNOLOGIA DA INFORMAÇÃO & COMPLIANCE',
      observacoes: '',
      uf_filtro: '',
      porte_filtro: '',
      situacao_filtro: '',
      incluir_cabecalho_oficial: true,
      incluir_totais: true,
      incluir_data_hora: true
    };

    exportToPdf(successCompanies, config);
  };

  // Stats for current batch
  const totalCount = batchItems.length;
  const successCount = batchItems.filter(i => i.status === 'SUCESSO').length;
  const activeCount = batchItems.filter(i => i.status === 'SUCESSO' && i.company?.situacao_cadastral === 'ATIVA').length;
  const errorCount = batchItems.filter(i => i.status === 'ERRO').length;
  const progressPercent = batchProgress.total > 0 ? Math.round((batchProgress.current / batchProgress.total) * 100) : 0;

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Consulta em Lote & Importação Inteligente</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Consulta em Lote e Preenchimento Automático por Planilha</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Importe uma planilha com CNPJs e o sistema efetuará as consultas de cada empresa em tempo real, preenchendo todos os dados cadastrais (Razão Social, Situação, Endereço, Porte, Capital Social, QSA) no banco SQLite local.
            </p>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold self-start md:self-auto">
            <button
              onClick={() => setActiveMode('batch_lookup')}
              className={`px-3 py-2 rounded-md transition flex items-center space-x-1.5 ${
                activeMode === 'batch_lookup'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              <span>Consulta em Lote (API)</span>
            </button>

            <button
              onClick={() => setActiveMode('direct_import')}
              className={`px-3 py-2 rounded-md transition flex items-center space-x-1.5 ${
                activeMode === 'direct_import'
                  ? 'bg-blue-600 text-white shadow'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Importação Direta</span>
            </button>
          </div>
        </div>
      </div>

      {/* Mode 1: BATCH LOOKUP SECTION */}
      {activeMode === 'batch_lookup' && (
        <div className="space-y-6">
          
          {/* File Upload / Manual Input Box */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
            
            <div className="flex items-center justify-between border-b pb-3">
              <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                <span>Passo 1: Carregar Planilha de CNPJs ou Inserir Texto</span>
              </h3>

              <button
                onClick={() => setShowManualInput(!showManualInput)}
                className="text-xs text-blue-600 hover:text-blue-800 font-semibold underline"
              >
                {showManualInput ? 'Usar Arquivo de Planilha' : 'Ou Colar Lista Manual de CNPJs'}
              </button>
            </div>

            {!showManualInput ? (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center"
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                  <UploadCloud className="w-6 h-6" />
                </div>

                <p className="text-sm font-bold text-slate-800">
                  Arraste e solte sua planilha com CNPJs (.xlsx, .xls, .csv) aqui
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  O sistema identificará a coluna contendo os CNPJs automaticamente.
                </p>

                <label className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition shadow-sm inline-flex items-center space-x-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>Selecionar Planilha</span>
                  <input
                    type="file"
                    accept=".xlsx, .xls, .csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>

                {selectedFile && (
                  <div className="mt-4 inline-flex items-center space-x-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-medium">
                    <FileCheck className="w-4 h-4 text-blue-600" />
                    <span>Arquivo selecionado: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <label className="block text-xs font-bold text-slate-700">
                  Cole abaixo a lista de CNPJs (um por linha ou separados por vírgula):
                </label>
                <textarea
                  rows={5}
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                  placeholder="00.000.000/0001-91&#10;11.222.333/0001-44&#10;33.444.555/0001-88"
                  className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-slate-900"
                />
                <button
                  onClick={handleProcessManualText}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition"
                >
                  Identificar CNPJs
                </button>
              </div>
            )}

            {/* Error state display */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm flex items-start space-x-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-xs">Erro na Leitura dos Dados</p>
                  <p className="mt-0.5 text-xs text-red-700">{error}</p>
                </div>
              </div>
            )}

            {loadingPreview && (
              <div className="p-6 text-center text-slate-600 text-xs flex items-center justify-center space-x-2">
                <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                <span>Lendo arquivo e extraindo lista de CNPJs...</span>
              </div>
            )}
          </div>

          {/* Detected CNPJs Box & Start Batch Button */}
          {extractedCnpjs.length > 0 && !isProcessingBatch && !batchFinished && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-md text-xs font-bold mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    <span>{extractedCnpjs.length} CNPJs Identificados e Prontos</span>
                  </div>
                  <h3 className="font-bold text-slate-900 text-base">Passo 2: Configurar e Iniciar Consulta em Lote</h3>
                  <p className="text-xs text-slate-500">
                    O sistema consultará a API oficial CNPJá / Cache para cada um dos {extractedCnpjs.length} CNPJs e salvará no banco SQLite.
                  </p>
                </div>

                <button
                  onClick={startBatchLookup}
                  className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-lg flex items-center justify-center space-x-2 transition transform active:scale-95"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>Iniciar Consulta de {extractedCnpjs.length} Empresas</span>
                </button>
              </div>

              {/* Options */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 text-xs text-slate-700 space-y-2">
                <span className="font-bold text-slate-900 block">Opções da Consulta:</span>
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={forceRefresh}
                    onChange={(e) => setForceRefresh(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                  />
                  <span>Forçar atualização em tempo real na API CNPJá (ignorar cache do SQLite local)</span>
                </label>
              </div>

              {/* Sample list preview */}
              <div className="text-xs text-slate-500">
                <span className="font-bold text-slate-700">Amostra dos CNPJs localizados:</span>
                <div className="flex flex-wrap gap-2 mt-2">
                  {extractedCnpjs.slice(0, 12).map((c, idx) => (
                    <span key={idx} className="font-mono bg-slate-100 border border-slate-200 text-slate-800 px-2 py-1 rounded">
                      {formatCnpj(c)}
                    </span>
                  ))}
                  {extractedCnpjs.length > 12 && (
                    <span className="font-bold text-slate-500 self-center">
                      + {extractedCnpjs.length - 12} mais...
                    </span>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* LIVE PROCESSING & PROGRESS STATE */}
          {(isProcessingBatch || batchFinished) && (
            <div className="space-y-6">
              
              {/* Progress Summary Card */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-4">
                  <div>
                    <h3 className="font-bold text-lg text-slate-900 flex items-center space-x-2">
                      {isProcessingBatch ? (
                        <>
                          <RefreshCw className="w-5 h-5 animate-spin text-blue-600" />
                          <span>Consultando Planilha em Lote... ({batchProgress.current} / {batchProgress.total})</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          <span>Consulta em Lote Concluída com Sucesso!</span>
                        </>
                      )}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {isProcessingBatch
                        ? 'Obtendo dados cadastrais oficiais e gravando registros no banco SQLite.'
                        : 'Todos os registros foram enriquecidos e salvos no banco SQLite e estão disponíveis para exportação.'}
                    </p>
                  </div>

                  {batchFinished && (
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={handleDownloadEnrichedXlsx}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow flex items-center space-x-2 transition"
                      >
                        <Download className="w-4 h-4" />
                        <span>Baixar Planilha Enriquecida (.xlsx)</span>
                      </button>

                      <button
                        onClick={handleDownloadEnrichedPdf}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg shadow flex items-center space-x-2 transition"
                      >
                        <FileText className="w-4 h-4" />
                        <span>Exportar PDF</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Progress Animated Bar */}
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-bold text-slate-700">
                    <span>Progresso do Processamento:</span>
                    <span>{progressPercent}% ({batchProgress.current}/{batchProgress.total})</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden border border-slate-200">
                    <div
                      className={`h-full transition-all duration-300 ${
                        batchFinished ? 'bg-emerald-500' : 'bg-blue-600 animate-pulse'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                  
                  <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                    <span className="text-xs text-slate-500 font-bold block">Total da Fila</span>
                    <span className="text-xl font-bold text-slate-900">{totalCount}</span>
                  </div>

                  <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                    <span className="text-xs text-emerald-700 font-bold block font-bold">Sucessos Enriquecidos</span>
                    <span className="text-xl font-bold text-emerald-700">{successCount}</span>
                  </div>

                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                    <span className="text-xs text-blue-700 font-bold block">Empresas Ativas</span>
                    <span className="text-xl font-bold text-blue-700">{activeCount}</span>
                  </div>

                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-200 text-center">
                    <span className="text-xs text-amber-800 font-bold block">Falhas / Erros</span>
                    <span className="text-xl font-bold text-amber-800">{errorCount}</span>
                  </div>

                </div>

              </div>

              {/* Enriched Table Log */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">Registros Processados da Planilha</h3>
                    <p className="text-xs text-slate-500">Exibindo itens consultados via API CNPJá com regime tributário e gravações no SQLite.</p>
                  </div>

                  {/* Filter Tabs */}
                  <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs font-bold">
                    <button
                      type="button"
                      onClick={() => setBatchFilterTab('ALL')}
                      className={`px-3 py-1.5 rounded-md transition ${
                        batchFilterTab === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Todos ({totalCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchFilterTab('SUCCESS')}
                      className={`px-3 py-1.5 rounded-md transition ${
                        batchFilterTab === 'SUCCESS' ? 'bg-white text-emerald-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Sucesso ({successCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setBatchFilterTab('ERROR')}
                      className={`px-3 py-1.5 rounded-md transition flex items-center space-x-1 ${
                        batchFilterTab === 'ERROR' ? 'bg-red-600 text-white shadow-sm' : 'text-red-600 hover:bg-red-50'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Erros / Falhas ({errorCount})</span>
                    </button>
                  </div>
                </div>

                {/* Error tab action bar */}
                {batchFilterTab === 'ERROR' && errorCount > 0 && (
                  <div className="bg-red-50 border border-red-200 p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="text-xs text-red-800">
                      <span className="font-bold block">Foram identificados {errorCount} registros com erro na consulta.</span>
                      <span>Você pode re-tentar a consulta apenas para os itens que falharam ou exportar a lista de erros.</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={retryFailedBatchItems}
                        disabled={isProcessingBatch}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold rounded-lg shadow-sm flex items-center space-x-1.5 transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isProcessingBatch ? 'animate-spin' : ''}`} />
                        <span>Re-tentar Apenas com Erros</span>
                      </button>

                      <button
                        onClick={handleDownloadErrorsXlsx}
                        className="px-3 py-1.5 bg-white border border-red-300 text-red-700 hover:bg-red-100 text-xs font-bold rounded-lg transition flex items-center space-x-1.5"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>Baixar Erros (.xlsx)</span>
                      </button>
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border">
                    <thead className="bg-slate-800 text-white uppercase font-bold">
                      <tr>
                        <th className="p-2.5">#</th>
                        <th className="p-2.5">CNPJ</th>
                        <th className="p-2.5">Razão Social / Mensagem</th>
                        <th className="p-2.5">Situação</th>
                        <th className="p-2.5">Simples Nacional</th>
                        <th className="p-2.5">Porte / Local</th>
                        <th className="p-2.5 text-right">Capital Social</th>
                        <th className="p-2.5">Fonte</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-800">
                      {batchItems
                        .filter(item => {
                          if (batchFilterTab === 'SUCCESS') return item.status === 'SUCESSO';
                          if (batchFilterTab === 'ERROR') return item.status === 'ERRO';
                          return true;
                        })
                        .map((item, idx) => (
                          <tr key={idx} className={`hover:bg-slate-50 ${item.status === 'ERRO' ? 'bg-red-50/40' : ''}`}>
                            <td className="p-2.5 font-mono text-slate-400">{idx + 1}</td>
                            <td className="p-2.5 font-mono font-bold text-slate-900">{formatCnpj(item.cleanCnpj)}</td>
                            <td className="p-2.5">
                              {item.status === 'ERRO' ? (
                                <div className="text-red-700 font-medium">
                                  <span className="font-bold block text-red-800">Falha na Consulta</span>
                                  <span className="text-[11px] text-red-600">{item.erro || 'CNPJ não localizado na Receita Federal'}</span>
                                </div>
                              ) : (
                                <span className="font-semibold text-slate-900">
                                  {item.company?.razao_social || (item.status === 'PROCESSANDO' ? 'Consultando API...' : '—')}
                                </span>
                              )}
                            </td>
                            <td className="p-2.5">
                              {item.company ? (
                                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                  item.company.situacao_cadastral === 'ATIVA'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-red-100 text-red-800'
                                }`}>
                                  {item.company.situacao_cadastral}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="p-2.5">
                              {item.company ? (
                                item.company.opcao_simples ? (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    OPTANTE SIMPLES
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                                    NÃO OPTANTE (FORA DO SIMPLES)
                                  </span>
                                )
                              ) : '—'}
                            </td>
                            <td className="p-2.5 text-slate-600">
                              {item.company ? `${item.company.porte} - ${item.company.municipio}/${item.company.uf}` : '—'}
                            </td>
                            <td className="p-2.5 text-right font-medium">
                              {item.company ? formatCurrency(item.company.capital_social) : '—'}
                            </td>
                            <td className="p-2.5">
                              {item.fonte ? (
                                <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 font-mono text-[10px]">
                                  {item.fonte}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="p-2.5 text-center">
                              {item.status === 'SUCESSO' && (
                                <span className="inline-flex items-center text-emerald-600 font-bold space-x-1">
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span>OK</span>
                                </span>
                              )}
                              {item.status === 'PROCESSANDO' && (
                                <RefreshCw className="w-4 h-4 animate-spin text-blue-600 mx-auto" />
                              )}
                              {item.status === 'PENDENTE' && (
                                <Clock className="w-4 h-4 text-slate-300 mx-auto" />
                              )}
                              {item.status === 'ERRO' && (
                                <span className="inline-flex items-center text-red-600 font-bold space-x-1" title={item.erro}>
                                  <XCircle className="w-4 h-4" />
                                  <span>Erro</span>
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

        </div>
      )}

      {/* Mode 2: DIRECT IMPORT SECTION */}
      {activeMode === 'direct_import' && (
        <div className="space-y-6">
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h3 className="font-bold text-slate-900 text-base mb-1">Importação Rápida Direta da Planilha</h3>
            <p className="text-xs text-slate-500 mb-4">
              Importe cadastros completos diretamente da sua planilha (sem efetuar chamadas à API CNPJá). Recomendado para cargas em massa pré-existentes.
            </p>

            {/* Drag & Drop Upload Zone */}
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-xl p-8 text-center transition cursor-pointer flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-3">
                <UploadCloud className="w-6 h-6" />
              </div>

              <p className="text-sm font-bold text-slate-800">
                Arraste e solte sua planilha (.xlsx, .xls, .csv) aqui
              </p>
              <p className="text-xs text-slate-500 mt-1">
                ou clique no botão abaixo para selecionar do computador
              </p>

              <label className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition shadow-sm inline-flex items-center space-x-2">
                <FileSpreadsheet className="w-4 h-4" />
                <span>Selecionar Arquivo</span>
                <input
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>

              {selectedFile && (
                <div className="mt-4 inline-flex items-center space-x-2 bg-blue-50 text-blue-800 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-medium">
                  <FileCheck className="w-4 h-4 text-blue-600" />
                  <span>Arquivo selecionado: <strong>{selectedFile.name}</strong> ({Math.round(selectedFile.size / 1024)} KB)</span>
                </div>
              )}
            </div>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl text-sm flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Falha ao processar arquivo</p>
                <p className="mt-0.5 text-xs text-red-700">{error}</p>
              </div>
            </div>
          )}

          {/* Preview Table & Confirm Import Button */}
          {previewData && !importResult && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4">
                <div>
                  <h3 className="font-bold text-slate-900 text-base">Pré-visualização dos Dados</h3>
                  <p className="text-xs text-slate-500">
                    Amostra das primeiras linhas de <span className="font-bold text-slate-800">{previewData.total_linhas} registros</span> encontrados no arquivo.
                  </p>
                </div>

                <button
                  onClick={executeDirectImport}
                  disabled={loadingImport}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow flex items-center justify-center space-x-2 transition disabled:opacity-50"
                >
                  {loadingImport ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Importando para SQLite...</span>
                    </>
                  ) : (
                    <>
                      <Database className="w-4 h-4" />
                      <span>Confirmar e Importar {previewData.total_linhas} Linhas</span>
                    </>
                  )}
                </button>
              </div>

              {/* Table Preview */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">CNPJ Mapeado</th>
                      <th className="py-2.5 px-3">Razão Social Mapeada</th>
                      <th className="py-2.5 px-3">UF</th>
                      <th className="py-2.5 px-3">Município</th>
                      <th className="py-2.5 px-3">Porte</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewData.amostra.map((row: any, idx: number) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono font-bold text-slate-900">
                          {formatCnpj(row.cnpj)}
                        </td>
                        <td className="py-2 px-3 font-medium text-slate-800">{row.razao_social || '—'}</td>
                        <td className="py-2 px-3">{row.uf}</td>
                        <td className="py-2 px-3">{row.municipio}</td>
                        <td className="py-2 px-3">{row.porte}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Import Result Summary Card */}
          {importResult && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
              <div className="flex items-center space-x-3 text-emerald-600">
                <CheckCircle2 className="w-7 h-7" />
                <div>
                  <h3 className="font-bold text-lg text-slate-900">Importação Concluída com Sucesso!</h3>
                  <p className="text-xs text-slate-500">
                    Os cadastros foram salvos no banco SQLite e estão prontos para consulta, relatórios e sincronização em nuvem.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="text-xs text-slate-500 block">Total Processados</span>
                  <span className="text-xl font-bold text-slate-900">{importResult.totais.processados}</span>
                </div>

                <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-center">
                  <span className="text-xs text-emerald-700 block">Novos Importados</span>
                  <span className="text-xl font-bold text-emerald-700">{importResult.totais.importados}</span>
                </div>

                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200 text-center">
                  <span className="text-xs text-blue-700 block">Atualizados</span>
                  <span className="text-xl font-bold text-blue-700">{importResult.totais.atualizados}</span>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-center">
                  <span className="text-xs text-slate-500 block">Ignorados / Inválidos</span>
                  <span className="text-xl font-bold text-slate-600">{importResult.totais.ignorados}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => {
                    setPreviewData(null);
                    setImportResult(null);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center space-x-1"
                >
                  <span>Importar Outra Planilha</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
