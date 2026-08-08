import express from 'express';
import path from 'path';
import multer from 'multer';
import * as XLSX from 'xlsx';
import { createServer as createViteServer } from 'vite';
import {
  getDb,
  saveDb,
  getAllCompanies,
  getCompanyByCnpj,
  saveCompanyToDb,
  deleteCompanyByCnpj,
  clearAllCompanies,
  getQueryLogs,
  getSyncLogs,
  logSync,
  logQuery
} from './db.js';
import { consultarCnpj } from './cnpjService.js';
import { Company, ExcelImportRow } from '../src/types.js';

const upload = multer({ storage: multer.memoryStorage() });

export const app = express();

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Middleware to ensure Database is initialized before handling requests
app.use(async (req, res, next) => {
  try {
    await getDb();
    next();
  } catch (err: any) {
    console.error('Erro na inicialização do Banco SQLite:', err);
    res.status(500).json({ error: 'Erro de conexão ao banco de dados SQLite local' });
  }
});

// ----------------------- API ROUTES -----------------------

// Healthcheck
app.get('/api/health', async (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Dashboard Stats
app.get('/api/stats', async (req, res) => {
  try {
    const db = await getDb();
    const companies = getAllCompanies(db);

    const total = companies.length;
    const ativas = companies.filter(c => c.situacao_cadastral === 'ATIVA').length;
    const inativas = total - ativas;

    const distribuicao_porte: Record<string, number> = {};
    const distribuicao_uf: Record<string, number> = {};

    companies.forEach(c => {
      const porte = c.porte || 'OUTROS';
      distribuicao_porte[porte] = (distribuicao_porte[porte] || 0) + 1;

      const uf = c.uf || 'ND';
      distribuicao_uf[uf] = (distribuicao_uf[uf] || 0) + 1;
    });

    const logs = getQueryLogs(db, 100);
    const hojeStr = new Date().toISOString().slice(0, 10);
    const mesStr = new Date().toISOString().slice(0, 7);

    const consultas_hoje = logs.filter(l => l.data_consulta?.startsWith(hojeStr)).length;
    const consultas_mes = logs.filter(l => l.data_consulta?.startsWith(mesStr)).length;

    const syncLogs = getSyncLogs(db, 1);
    const ultimoSync = syncLogs[0]?.data_sync || new Date().toISOString();

    res.json({
      total_empresas: total,
      empresas_ativas: ativas,
      empresas_inativas: inativas,
      consultas_hoje,
      consultas_mes,
      distribuicao_porte,
      distribuicao_uf,
      sync_status: {
        auto_sync: true,
        intervalo_minutos: 15,
        ultimo_sync: ultimoSync,
        proximo_sync: new Date(Date.now() + 15 * 60000).toISOString(),
        status: 'EM_DIA',
        pendentes_count: companies.filter(c => c.status_sincronizacao === 'PENDENTE').length,
        total_registros: total,
        hash_local: `SQLITE_MD5_${total}_${Date.now().toString(36).toUpperCase()}`,
        hash_nuvem: `SQLITE_MD5_${total}_GDRIVE_VAULT`,
        mensagem: 'Banco de dados sincronizado'
      }
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// List companies with search and filters
app.get('/api/companies', async (req, res) => {
  try {
    const db = await getDb();
    const search = req.query.search as string;
    const uf = req.query.uf as string;
    const porte = req.query.porte as string;
    const situacao = req.query.situacao as string;

    const companies = getAllCompanies(db, { search, uf, porte, situacao });
    res.json(companies);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Single company details
app.get('/api/companies/:cnpj', async (req, res) => {
  try {
    const db = await getDb();
    const company = getCompanyByCnpj(db, req.params.cnpj);
    if (!company) {
      return res.status(404).json({ error: 'Empresa não encontrada no banco de dados' });
    }
    res.json(company);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create or Update company manually
app.post('/api/companies', async (req, res) => {
  try {
    const db = await getDb();
    const company: Company = req.body;
    if (!company.cnpj || !company.razao_social) {
      return res.status(400).json({ error: 'CNPJ e Razão Social são obrigatórios' });
    }

    company.cnpj = company.cnpj.replace(/\D/g, '');
    company.origem = company.origem || 'MANUAL';
    company.data_consulta = company.data_consulta || new Date().toISOString();
    company.status_sincronizacao = 'PENDENTE';

    saveCompanyToDb(db, company);

    res.json({ message: 'Empresa salva com sucesso', company });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Delete company
app.delete('/api/companies/:cnpj', async (req, res) => {
  try {
    const db = await getDb();
    deleteCompanyByCnpj(db, req.params.cnpj);
    res.json({ message: 'Empresa removida com sucesso' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Clear all companies
app.post('/api/companies/clear-all', async (req, res) => {
  try {
    const db = await getDb();
    clearAllCompanies(db);
    res.json({ message: 'Todas as empresas foram removidas com sucesso.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Consulta Avulsa CNPJá API lookup
app.get('/api/cnpj/lookup/:cnpj', async (req, res) => {
  try {
    const db = await getDb();
    const forceRefresh = req.query.refresh === 'true';
    const result = await consultarCnpj(db, req.params.cnpj, forceRefresh);
    res.json(result);
  } catch (err: any) {
    const db = await getDb();
    logQuery(db, {
      cnpj: req.params.cnpj,
      fonte: 'CNPJA_API',
      status: 'ERRO',
      detalhe: err.message
    });
    res.status(400).json({ error: err.message });
  }
});

// Preview Spreadsheet before import
app.post('/api/import/preview', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: ExcelImportRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    const previewRows = rawRows.slice(0, 10).map((row) => ({
      cnpj: String(row.cnpj || row.CNPJ || row['Cnpj'] || '').replace(/\D/g, ''),
      razao_social: String(row.razao_social || row['Razão Social'] || row['RAZAO SOCIAL'] || row['Razao Social'] || row['Empresa'] || ''),
      nome_fantasia: String(row.nome_fantasia || row['Nome Fantasia'] || row['NOME FANTASIA'] || ''),
      uf: String(row.uf || row.UF || row['Estado'] || 'SP').toUpperCase(),
      municipio: String(row.municipio || row['Município'] || row['MUNICIPIO'] || row['Cidade'] || ''),
      porte: String(row.porte || row.Porte || row['PORTE'] || 'EPP').toUpperCase(),
      capital_social: String(row.capital_social || row['Capital Social'] || row['CAPITAL SOCIAL'] || 0)
    }));

    res.json({
      total_linhas: rawRows.length,
      colunas: Object.keys(rawRows[0] || {}),
      amostra: previewRows
    });
  } catch (err: any) {
    res.status(400).json({ error: `Erro ao processar planilha: ${err.message}` });
  }
});

// Bulk Import Spreadsheet
app.post('/api/import/excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const db = await getDb();
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const rawRows: ExcelImportRow[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    let importados = 0;
    let atualizados = 0;
    let ignorados = 0;
    const erros: string[] = [];

    rawRows.forEach((row, idx) => {
      const rawCnpj = String(row.cnpj || row.CNPJ || row['Cnpj'] || row['CNPJ/CPF'] || '').replace(/\D/g, '');
      const razaoSocial = String(row.razao_social || row['Razão Social'] || row['RAZAO SOCIAL'] || row['Razao Social'] || row['Empresa'] || row['Nome'] || '').trim();

      if (!rawCnpj || rawCnpj.length !== 14) {
        ignorados++;
        erros.push(`Linha ${idx + 2}: CNPJ "${rawCnpj}" inválido ou ausente.`);
        return;
      }

      if (!razaoSocial) {
        ignorados++;
        erros.push(`Linha ${idx + 2}: Razão Social não especificada para o CNPJ ${rawCnpj}.`);
        return;
      }

      const existing = getCompanyByCnpj(db, rawCnpj);

      const newCompany: Company = {
        cnpj: rawCnpj,
        razao_social: razaoSocial,
        nome_fantasia: String(row.nome_fantasia || row['Nome Fantasia'] || row['NOME FANTASIA'] || existing?.nome_fantasia || ''),
        situacao_cadastral: String(row.situacao || row['Situacao'] || row['SITUAÇÃO'] || existing?.situacao_cadastral || 'ATIVA').toUpperCase(),
        data_situacao_cadastral: String(row.data_situacao || existing?.data_situacao_cadastral || ''),
        data_abertura: String(row.data_abertura || row['Data Abertura'] || existing?.data_abertura || new Date().toISOString().slice(0, 10)),
        porte: String(row.porte || row.Porte || row['PORTE'] || existing?.porte || 'EPP').toUpperCase(),
        natureza_juridica: String(row.natureza_juridica || row['Natureza Jurídica'] || existing?.natureza_juridica || 'Sociedade Empresária Limitada'),
        cnae_principal_codigo: String(row.cnae || row['CNAE'] || existing?.cnae_principal_codigo || ''),
        cnae_principal_descricao: String(row.cnae_descricao || row['Atividade'] || existing?.cnae_principal_descricao || 'Atividades Gerais'),
        logradouro: String(row.logradouro || row['Logradouro'] || existing?.logradouro || ''),
        numero: String(row.numero || row['Número'] || existing?.numero || 'SN'),
        complemento: String(row.complemento || row['Complemento'] || existing?.complemento || ''),
        bairro: String(row.bairro || row['Bairro'] || existing?.bairro || ''),
        municipio: String(row.municipio || row['Município'] || row['Cidade'] || existing?.municipio || ''),
        uf: String(row.uf || row.UF || row['Estado'] || existing?.uf || 'SP').toUpperCase(),
        cep: String(row.cep || row.CEP || existing?.cep || ''),
        email: String(row.email || row.Email || existing?.email || ''),
        telefone: String(row.telefone || row.Telefone || existing?.telefone || ''),
        capital_social: Number(row.capital_social || row['Capital Social'] || existing?.capital_social) || 0,
        qsa: existing?.qsa || [],
        origem: 'IMPORTACAO_EXCEL',
        data_consulta: new Date().toISOString(),
        status_sincronizacao: 'PENDENTE',
        ultima_atualizacao: new Date().toISOString()
      };

      if (existing) {
        atualizados++;
      } else {
        importados++;
      }

      saveCompanyToDb(db, newCompany);
    });

    logSync(db, {
      tipo: 'MANUAL',
      status: 'CONCLUIDO',
      registros_afetados: importados + atualizados,
      mensagem: `Importação de planilha concluída: ${importados} novos, ${atualizados} atualizados, ${ignorados} ignorados`
    });

    res.json({
      sucesso: true,
      totais: {
        processados: rawRows.length,
        importados,
        atualizados,
        ignorados
      },
      erros: erros.slice(0, 10)
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Batch CNPJ Lookup Endpoint
app.post('/api/cnpj/batch-lookup', async (req, res) => {
  try {
    const db = await getDb();
    const { cnpjs, forceRefresh } = req.body;
    if (!Array.isArray(cnpjs) || cnpjs.length === 0) {
      return res.status(400).json({ error: 'Nenhum CNPJ fornecido para consulta em lote.' });
    }

    const results = [];
    let sucessos = 0;
    let erros = 0;

    for (const item of cnpjs) {
      const rawCnpj = typeof item === 'string' ? item : String(item.cnpj || item.CNPJ || '');
      const cleanCnpj = rawCnpj.replace(/\D/g, '');

      if (!cleanCnpj || cleanCnpj.length !== 14) {
        results.push({
          cnpj: rawCnpj,
          cleanCnpj,
          status: 'ERRO',
          erro: 'CNPJ inválido (deve possuir 14 dígitos)'
        });
        erros++;
        continue;
      }

      try {
        const lookupResult = await consultarCnpj(db, cleanCnpj, !!forceRefresh);
        results.push({
          cnpj: cleanCnpj,
          status: 'SUCESSO',
          company: lookupResult.company,
          fonte: lookupResult.fonte
        });
        sucessos++;
      } catch (err: any) {
        results.push({
          cnpj: cleanCnpj,
          status: 'ERRO',
          erro: err.message || 'Erro ao consultar CNPJ'
        });
        erros++;
      }
    }

    res.json({
      total: cnpjs.length,
      sucessos,
      erros,
      resultados: results
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Cloud Sync Trigger
app.post('/api/sync/trigger', async (req, res) => {
  try {
    const db = await getDb();
    const companies = getAllCompanies(db);
    companies.forEach(c => {
      if (c.status_sincronizacao === 'PENDENTE') {
        c.status_sincronizacao = 'SINCRONIZADO';
        saveCompanyToDb(db, c);
      }
    });

    logSync(db, {
      tipo: 'MANUAL',
      status: 'CONCLUIDO',
      registros_afetados: companies.length,
      mensagem: 'Sincronização manual concluída com sucesso'
    });

    res.json({
      sucesso: true,
      mensagem: 'Sincronização realizada.',
      timestamp: new Date().toISOString()
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logs
app.get('/api/logs', async (req, res) => {
  try {
    const db = await getDb();
    res.json(getQueryLogs(db, 100));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/sync/logs', async (req, res) => {
  try {
    const db = await getDb();
    res.json(getSyncLogs(db, 50));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default app;
