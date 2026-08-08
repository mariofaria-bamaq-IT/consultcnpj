import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Company, ReportConfig } from '../types';

export function formatCnpj(cnpj: string): string {
  const clean = cnpj.replace(/\D/g, '');
  if (clean.length !== 14) return cnpj;
  return clean.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value || 0);
}

export function exportToPdf(
  companies: Company[],
  config: ReportConfig,
  selectedColumns?: string[]
) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const totalWidth = doc.internal.pageSize.getWidth();
  const emissaoData = new Date().toLocaleString('pt-BR');

  // Master field mapping
  const allColumnsMap: { id: string; label: string; getValue: (c: Company) => any }[] = [
    { id: 'cnpj', label: 'CNPJ', getValue: c => formatCnpj(c.cnpj) },
    { id: 'razao_social', label: 'Razão Social', getValue: c => c.razao_social },
    { id: 'nome_fantasia', label: 'Nome Fantasia', getValue: c => c.nome_fantasia || '-' },
    { id: 'situacao_cadastral', label: 'Situação', getValue: c => c.situacao_cadastral },
    { id: 'opcao_simples', label: 'Simples', getValue: c => c.opcao_simples ? 'OPTANTE' : 'NÃO' },
    { id: 'opcao_mei', label: 'MEI', getValue: c => c.opcao_mei ? 'SIM' : 'NÃO' },
    { id: 'data_abertura', label: 'Abertura', getValue: c => c.data_abertura || '-' },
    { id: 'porte', label: 'Porte', getValue: c => c.porte },
    { id: 'cnae_principal_codigo', label: 'CNAE Cód', getValue: c => c.cnae_principal_codigo || '-' },
    { id: 'municipio', label: 'Município', getValue: c => c.municipio || '-' },
    { id: 'uf', label: 'UF', getValue: c => c.uf },
    { id: 'email', label: 'E-mail', getValue: c => c.email || '-' },
    { id: 'telefone', label: 'Telefone', getValue: c => c.telefone || '-' },
    { id: 'capital_social', label: 'Capital Social', getValue: c => formatCurrency(c.capital_social) }
  ];

  const activeCols = selectedColumns && selectedColumns.length > 0
    ? allColumnsMap.filter(col => selectedColumns.includes(col.id))
    : [
        allColumnsMap[0], // cnpj
        allColumnsMap[1], // razao_social
        allColumnsMap[3], // situacao
        allColumnsMap[4], // simples
        allColumnsMap[9], // municipio
        allColumnsMap[10], // uf
        allColumnsMap[7], // porte
        allColumnsMap[13] // capital
      ];

  // 1. Cabeçalho Corporativo
  if (config.incluir_cabecalho_oficial) {
    // Top primary bar (Purple theme for GRUPO BAMAQ - CONSULT ENTERPRISE)
    doc.setFillColor(88, 28, 135); // Purple-900
    doc.rect(0, 0, totalWidth, 18, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text((config.nome_organizacao || 'GRUPO BAMAQ').toUpperCase(), 14, 12);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`CONSULT - ENTERPRISE | DEPARTAMENTO: ${config.departamento || 'FISCAL/TRIBUTARIO'}`, totalWidth - 14, 12, { align: 'right' });

    // Sub-header box
    doc.setFillColor(250, 245, 255); // Purple-50
    doc.setDrawColor(233, 213, 255); // Purple-200
    doc.roundedRect(14, 22, totalWidth - 28, 24, 2, 2, 'FD');

    doc.setTextColor(58, 12, 91);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(config.titulo, 18, 30);

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(88, 28, 135);
    doc.text(`${config.subtitulo} | Departamento: ${config.departamento || 'FISCAL/TRIBUTARIO'}`, 18, 36);

    const filtrosText = `Filtros: UF [${config.uf_filtro || 'TODAS'}] | Porte [${config.porte_filtro || 'TODOS'}] | Situação [${config.situacao_filtro || 'TODAS'}]`;
    doc.text(filtrosText, 18, 41);

    doc.setFont('helvetica', 'bold');
    doc.text(`Emissão: ${emissaoData}`, totalWidth - 18, 30, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.text(`Total Registros: ${companies.length}`, totalWidth - 18, 36, { align: 'right' });
  }

  // 2. Preparar dados da tabela
  const startY = config.incluir_cabecalho_oficial ? 50 : 15;

  const tableData = companies.map((c, index) => [
    (index + 1).toString(),
    ...activeCols.map(col => String(col.getValue(c) ?? '-'))
  ]);

  const headers = ['#', ...activeCols.map(c => c.label)];

  // Total de capital social
  const totalCapital = companies.reduce((acc, curr) => acc + (curr.capital_social || 0), 0);

  // 3. Renderizar Tabela Formatada
  autoTable(doc, {
    startY,
    head: [headers],
    body: tableData,
    foot: config.incluir_totais ? [
      ['', `TOTAL: ${companies.length} REGISTROS`, ...new Array(Math.max(0, activeCols.length - 1)).fill('')]
    ] : undefined,
    theme: 'grid',
    headStyles: {
      fillColor: [88, 28, 135], // Purple-900 header
      textColor: [255, 255, 255], // White text
      fontStyle: 'bold',
      fontSize: 8.5,
      halign: 'left'
    },
    footStyles: {
      fillColor: [243, 232, 255], // Light purple footer
      textColor: [88, 28, 135],
      fontStyle: 'bold',
      fontSize: 8.5
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: [250, 245, 255]
    },
    margin: { left: 14, right: 14, bottom: 15 }
  });

  // 4. Rodapé Corporativo e Paginação
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();

    doc.setDrawColor(226, 232, 240);
    doc.line(14, pageHeight - 12, totalWidth - 14, pageHeight - 12);

    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.text('DOCUMENTO CORPORATIVO CONFIDENCIAL - GRUPO BAMAQ | CONSULT - ENTERPRISE', 14, pageHeight - 6);
    doc.text(`Página ${i} de ${pageCount}`, totalWidth - 14, pageHeight - 6, { align: 'right' });
  }

  doc.save(`Relatorio_Corporativo_Empresas_${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportToXlsx(
  companies: Company[],
  config: ReportConfig,
  selectedColumns?: string[]
) {
  const emissaoData = new Date().toLocaleString('pt-BR');
  const totalCapital = companies.reduce((acc, curr) => acc + (curr.capital_social || 0), 0);

  // Default all columns if not specified
  const allColumnsMap: { id: string; label: string; getValue: (c: Company) => any }[] = [
    { id: 'cnpj', label: 'CNPJ', getValue: c => formatCnpj(c.cnpj) },
    { id: 'razao_social', label: 'Razão Social', getValue: c => c.razao_social },
    { id: 'nome_fantasia', label: 'Nome Fantasia', getValue: c => c.nome_fantasia || '-' },
    { id: 'situacao_cadastral', label: 'Situação Cadastral', getValue: c => c.situacao_cadastral },
    { id: 'opcao_simples', label: 'Optante Simples Nacional', getValue: c => c.opcao_simples ? 'SIM' : 'NÃO' },
    { id: 'data_opcao_simples', label: 'Data Opção Simples', getValue: c => c.data_opcao_simples || '-' },
    { id: 'opcao_mei', label: 'Optante MEI (SIMEI)', getValue: c => c.opcao_mei ? 'SIM' : 'NÃO' },
    { id: 'data_opcao_mei', label: 'Data Opção MEI', getValue: c => c.data_opcao_mei || '-' },
    { id: 'data_abertura', label: 'Data de Abertura', getValue: c => c.data_abertura || '-' },
    { id: 'porte', label: 'Porte', getValue: c => c.porte },
    { id: 'natureza_juridica', label: 'Natureza Jurídica', getValue: c => c.natureza_juridica || '-' },
    { id: 'cnae_principal_codigo', label: 'CNAE Código', getValue: c => c.cnae_principal_codigo || '-' },
    { id: 'cnae_principal_descricao', label: 'CNAE Descrição', getValue: c => c.cnae_principal_descricao || '-' },
    { id: 'logradouro', label: 'Logradouro', getValue: c => c.logradouro || '-' },
    { id: 'numero', label: 'Número', getValue: c => c.numero || 'SN' },
    { id: 'bairro', label: 'Bairro', getValue: c => c.bairro || '-' },
    { id: 'municipio', label: 'Município', getValue: c => c.municipio || '-' },
    { id: 'uf', label: 'UF', getValue: c => c.uf },
    { id: 'cep', label: 'CEP', getValue: c => c.cep || '-' },
    { id: 'email', label: 'E-mail', getValue: c => c.email || '-' },
    { id: 'telefone', label: 'Telefone', getValue: c => c.telefone || '-' },
    { id: 'capital_social', label: 'Capital Social (R$)', getValue: c => c.capital_social || 0 },
    { id: 'qsa', label: 'Quadro de Sócios (QSA)', getValue: c => (c.qsa || []).map(s => `${s.nome} (${s.qualificacao})`).join('; ') || '-' },
    { id: 'origem', label: 'Origem dos Dados', getValue: c => c.origem },
    { id: 'ultima_atualizacao', label: 'Última Atualização', getValue: c => c.ultima_atualizacao || '-' }
  ];

  const activeCols = selectedColumns && selectedColumns.length > 0
    ? allColumnsMap.filter(col => selectedColumns.includes(col.id))
    : allColumnsMap;

  // Construir planilha estruturada com cabeçalho corporativo
  const sheetData: any[][] = [];

  if (config.incluir_cabecalho_oficial) {
    sheetData.push([(config.nome_organizacao || 'GRUPO BAMAQ').toUpperCase()]);
    sheetData.push([`CONSULT - ENTERPRISE - DEPARTAMENTO: ${(config.departamento || 'FISCAL/TRIBUTARIO').toUpperCase()}`]);
    sheetData.push([`RELATÓRIO EXECUTIVO: ${config.titulo.toUpperCase()}`]);
    sheetData.push([`Subtítulo: ${config.subtitulo} | Departamento: ${config.departamento || 'FISCAL/TRIBUTARIO'}`]);
    sheetData.push([`Data de Emissão: ${emissaoData} | Total Registros: ${companies.length}`]);
    sheetData.push([`Filtros Aplicados: UF [${config.uf_filtro || 'TODAS'}] | Porte [${config.porte_filtro || 'TODOS'}] | Situação [${config.situacao_filtro || 'TODAS'}]`]);
    sheetData.push([]); // Linha em branco
  }

  // Cabeçalho das Colunas Ativas
  sheetData.push(['Item', ...activeCols.map(c => c.label)]);

  // Dados das Empresas
  companies.forEach((c, idx) => {
    sheetData.push([
      idx + 1,
      ...activeCols.map(col => col.getValue(c))
    ]);
  });

  // Linha de Totais
  if (config.incluir_totais) {
    sheetData.push([]);
    const footerRow = new Array(activeCols.length + 1).fill('');
    footerRow[0] = 'TOTALIZADORES';
    footerRow[1] = `TOTAL REGISTROS: ${companies.length}`;

    const capIdx = activeCols.findIndex(col => col.id === 'capital_social');
    if (capIdx !== -1) {
      footerRow[capIdx + 1] = totalCapital;
    }

    sheetData.push(footerRow);
  }

  const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Largura das colunas
  worksheet['!cols'] = [
    { wch: 6 },
    ...activeCols.map(c => ({ wch: Math.max(c.label.length + 4, 15) }))
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Empresas Executivo');

  const filename = `${config.titulo.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(workbook, filename);
}
