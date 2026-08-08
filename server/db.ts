import initSqlJs, { Database } from 'sql.js';
import { createClient, Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import { Company, QueryLog, SyncLogEntry } from '../src/types.js';

let db: Database | null = null;
let libsql: Client | null = null;

const DATA_DIR = process.env.VERCEL ? '/tmp' : path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'app.sqlite');

// Initialize Turso Cloud SQLite if environment variables are provided
const tursoUrl = process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL;
const tursoToken = process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN;

if (tursoUrl) {
  try {
    libsql = createClient({
      url: tursoUrl,
      authToken: tursoToken
    });
    console.log('⚡ Conectado ao banco SQLite em nuvem (Turso Cloud):', tursoUrl);
  } catch (err) {
    console.error('Erro ao conectar ao Turso Cloud SQLite:', err);
  }
}

export function parseBooleanValue(val: any): boolean {
  if (val === true || val === 1 || val === '1') return true;
  if (typeof val === 'string') {
    const s = val.trim().toLowerCase();
    return s === 'true' || s === 'sim' || s === 'optante' || s === 's';
  }
  return false;
}

async function createSqlInstance(): Promise<any> {
  try {
    const wasmPath = path.resolve(process.cwd(), 'node_modules/sql.js/dist/sql-wasm.wasm');
    if (fs.existsSync(wasmPath)) {
      const wasmBinary = fs.readFileSync(wasmPath);
      return await initSqlJs({ wasmBinary });
    }
  } catch (err) {
    console.warn('Falha ao carregar WASM local do sql.js:', err);
  }

  try {
    return await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
  } catch (err) {
    console.warn('Falha no fallback CDN do sql.js:', err);
  }

  return await initSqlJs();
}

export async function getDb(): Promise<any> {
  if (libsql) {
    await initTursoTables(libsql);
    return libsql;
  }

  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    } catch (e) {
      console.warn('Não foi possível criar diretório de dados:', e);
    }
  }

  const SQL = await createSqlInstance();

  if (fs.existsSync(DB_FILE)) {
    try {
      const filebuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(filebuffer);
      console.log('⚡ Banco SQLite local carregado:', DB_FILE);
    } catch (err) {
      console.error('Erro ao ler arquivo SQLite local, criando novo banco:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('✨ Novo banco de dados SQLite local inicializado.');
  }

  initTables(db);
  saveDb();
  return db;
}

export function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Erro ao persistir SQLite no disco:', err);
  }
}

async function initTursoTables(client: Client) {
  try {
    await client.execute(`
      CREATE TABLE IF NOT EXISTS companies (
        cnpj TEXT PRIMARY KEY,
        razao_social TEXT NOT NULL,
        nome_fantasia TEXT,
        situacao_cadastral TEXT DEFAULT 'ATIVA',
        data_situacao_cadastral TEXT,
        data_abertura TEXT,
        porte TEXT DEFAULT 'DEMAIS',
        natureza_juridica TEXT,
        cnae_principal_codigo TEXT,
        cnae_principal_descricao TEXT,
        atividades_secundarias TEXT,
        logradouro TEXT,
        numero TEXT,
        complemento TEXT,
        bairro TEXT,
        municipio TEXT,
        uf TEXT,
        cep TEXT,
        email TEXT,
        telefone TEXT,
        capital_social REAL DEFAULT 0,
        opcao_simples INTEGER DEFAULT 0,
        data_opcao_simples TEXT,
        opcao_mei INTEGER DEFAULT 0,
        data_opcao_mei TEXT,
        qsa TEXT,
        origem TEXT DEFAULT 'MANUAL',
        data_consulta TEXT,
        status_sincronizacao TEXT DEFAULT 'SINCRONIZADO',
        ultima_atualizacao TEXT
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS query_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        cnpj TEXT,
        razao_social TEXT,
        data_consulta TEXT,
        fonte TEXT,
        status TEXT,
        detalhe TEXT
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS sync_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        data_sync TEXT,
        tipo TEXT,
        status TEXT,
        registros_afetados INTEGER,
        mensagem TEXT
      );
    `);

    await client.execute(`
      CREATE TABLE IF NOT EXISTS system_config (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);
  } catch (e) {
    console.error('Erro ao inicializar tabelas no Turso SQLite Cloud:', e);
  }
}

function initTables(database: Database) {
  database.run(`
    CREATE TABLE IF NOT EXISTS companies (
      cnpj TEXT PRIMARY KEY,
      razao_social TEXT NOT NULL,
      nome_fantasia TEXT,
      situacao_cadastral TEXT DEFAULT 'ATIVA',
      data_situacao_cadastral TEXT,
      data_abertura TEXT,
      porte TEXT DEFAULT 'DEMAIS',
      natureza_juridica TEXT,
      cnae_principal_codigo TEXT,
      cnae_principal_descricao TEXT,
      atividades_secundarias TEXT,
      logradouro TEXT,
      numero TEXT,
      complemento TEXT,
      bairro TEXT,
      municipio TEXT,
      uf TEXT,
      cep TEXT,
      email TEXT,
      telefone TEXT,
      capital_social REAL DEFAULT 0,
      opcao_simples INTEGER DEFAULT 0,
      data_opcao_simples TEXT,
      opcao_mei INTEGER DEFAULT 0,
      data_opcao_mei TEXT,
      qsa TEXT,
      origem TEXT DEFAULT 'MANUAL',
      data_consulta TEXT,
      status_sincronizacao TEXT DEFAULT 'SINCRONIZADO',
      ultima_atualizacao TEXT
    );

    CREATE TABLE IF NOT EXISTS query_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cnpj TEXT,
      razao_social TEXT,
      data_consulta TEXT,
      fonte TEXT,
      status TEXT,
      detalhe TEXT
    );

    CREATE TABLE IF NOT EXISTS sync_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      data_sync TEXT,
      tipo TEXT,
      status TEXT,
      registros_afetados INTEGER,
      mensagem TEXT
    );

    CREATE TABLE IF NOT EXISTS system_config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);
}

export async function saveCompanyToDb(database: any, company: Company) {
  const qsaJson = company.qsa ? JSON.stringify(company.qsa) : null;
  const atividadesSecJson = company.atividades_secundarias ? JSON.stringify(company.atividades_secundarias) : null;

  const sql = `
    INSERT OR REPLACE INTO companies (
      cnpj, razao_social, nome_fantasia, situacao_cadastral, data_situacao_cadastral,
      data_abertura, porte, natureza_juridica, cnae_principal_codigo, cnae_principal_descricao,
      atividades_secundarias, logradouro, numero, complemento, bairro, municipio, uf, cep,
      email, telefone, capital_social, opcao_simples, data_opcao_simples, opcao_mei, data_opcao_mei,
      qsa, origem, data_consulta, status_sincronizacao, ultima_atualizacao
    ) VALUES (
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    );
  `;

  const args = [
    company.cnpj.replace(/\D/g, ''),
    company.razao_social,
    company.nome_fantasia || '',
    company.situacao_cadastral || 'ATIVA',
    company.data_situacao_cadastral || '',
    company.data_abertura || '',
    company.porte || 'DEMAIS',
    company.natureza_juridica || '',
    company.cnae_principal_codigo || '',
    company.cnae_principal_descricao || '',
    atividadesSecJson,
    company.logradouro || '',
    company.numero || '',
    company.complemento || '',
    company.bairro || '',
    company.municipio || '',
    company.uf || '',
    company.cep || '',
    company.email || '',
    company.telefone || '',
    company.capital_social || 0,
    company.opcao_simples ? 1 : 0,
    company.data_opcao_simples || '',
    company.opcao_mei ? 1 : 0,
    company.data_opcao_mei || '',
    qsaJson,
    company.origem || 'MANUAL',
    company.data_consulta || new Date().toISOString(),
    company.status_sincronizacao || 'SINCRONIZADO',
    new Date().toISOString()
  ];

  if (libsql) {
    await libsql.execute({ sql, args });
  } else if (db) {
    db.run(sql, args);
    saveDb();
  }
}

export async function getAllCompanies(database: any, filters?: { search?: string; uf?: string; porte?: string; situacao?: string }): Promise<Company[]> {
  let sql = `SELECT * FROM companies WHERE 1=1`;
  const params: any[] = [];

  if (filters?.search) {
    sql += ` AND (cnpj LIKE ? OR razao_social LIKE ? OR nome_fantasia LIKE ? OR municipio LIKE ?)`;
    const term = `%${filters.search}%`;
    params.push(term, term, term, term);
  }

  if (filters?.uf) {
    sql += ` AND uf = ?`;
    params.push(filters.uf);
  }

  if (filters?.porte) {
    sql += ` AND porte = ?`;
    params.push(filters.porte);
  }

  if (filters?.situacao) {
    sql += ` AND situacao_cadastral = ?`;
    params.push(filters.situacao);
  }

  sql += ` ORDER BY razao_social ASC`;

  if (libsql) {
    const res = await libsql.execute({ sql, args: params });
    return res.rows.map(row => parseCompanyRow(row));
  } else if (db) {
    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);
    const results: Company[] = [];
    while (stmt.step()) {
      results.push(parseCompanyRow(stmt.getAsObject()));
    }
    stmt.free();
    return results;
  }
  return [];
}

export async function getCompanyByCnpj(database: any, cnpj: string): Promise<Company | null> {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  const sql = `SELECT * FROM companies WHERE cnpj = ?`;

  if (libsql) {
    const res = await libsql.execute({ sql, args: [cleanCnpj] });
    if (res.rows.length > 0) {
      return parseCompanyRow(res.rows[0]);
    }
    return null;
  } else if (db) {
    const stmt = db.prepare(sql);
    stmt.bind([cleanCnpj]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return parseCompanyRow(row);
    }
    stmt.free();
    return null;
  }
  return null;
}

export async function deleteCompanyByCnpj(database: any, cnpj: string): Promise<boolean> {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  const sql = `DELETE FROM companies WHERE cnpj = ?`;

  if (libsql) {
    await libsql.execute({ sql, args: [cleanCnpj] });
  } else if (db) {
    db.run(sql, [cleanCnpj]);
    saveDb();
  }
  return true;
}

export async function clearAllCompanies(database: any): Promise<boolean> {
  const sql = `DELETE FROM companies`;
  if (libsql) {
    await libsql.execute(sql);
  } else if (db) {
    db.run(sql);
    saveDb();
  }
  return true;
}

function parseCompanyRow(row: any): Company {
  let qsa = [];
  let atividades = [];

  try {
    if (row.qsa) qsa = typeof row.qsa === 'string' ? JSON.parse(row.qsa) : row.qsa;
  } catch (e) {
    qsa = [];
  }

  try {
    if (row.atividades_secundarias) actividades = typeof row.atividades_secundarias === 'string' ? JSON.parse(row.atividades_secundarias) : row.atividades_secundarias;
  } catch (e) {
    atividades = [];
  }

  return {
    cnpj: String(row.cnpj || ''),
    razao_social: String(row.razao_social || ''),
    nome_fantasia: String(row.nome_fantasia || ''),
    situacao_cadastral: String(row.situacao_cadastral || 'ATIVA'),
    data_situacao_cadastral: String(row.data_situacao_cadastral || ''),
    data_abertura: String(row.data_abertura || ''),
    porte: String(row.porte || 'DEMAIS'),
    natureza_juridica: String(row.natureza_juridica || ''),
    cnae_principal_codigo: String(row.cnae_principal_codigo || ''),
    cnae_principal_descricao: String(row.cnae_principal_descricao || ''),
    atividades_secundarias: atividades,
    logradouro: String(row.logradouro || ''),
    numero: String(row.numero || ''),
    complemento: String(row.complemento || ''),
    bairro: String(row.bairro || ''),
    municipio: String(row.municipio || ''),
    uf: String(row.uf || ''),
    cep: String(row.cep || ''),
    email: String(row.email || ''),
    telefone: String(row.telefone || ''),
    capital_social: Number(row.capital_social) || 0,
    opcao_simples: parseBooleanValue(row.opcao_simples),
    data_opcao_simples: String(row.data_opcao_simples || ''),
    opcao_mei: parseBooleanValue(row.opcao_mei),
    data_opcao_mei: String(row.data_opcao_mei || ''),
    qsa: qsa,
    origem: String(row.origem || 'MANUAL'),
    data_consulta: String(row.data_consulta || ''),
    status_sincronizacao: String(row.status_sincronizacao || 'SINCRONIZADO'),
    ultima_atualizacao: String(row.ultima_atualizacao || '')
  };
}

export async function logQuery(database: any, log: { cnpj: string; razao_social?: string; fonte: string; status: string; detalhe: string }) {
  const sql = `
    INSERT INTO query_logs (cnpj, razao_social, data_consulta, fonte, status, detalhe)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const args = [
    log.cnpj,
    log.razao_social || '',
    new Date().toISOString(),
    log.fonte,
    log.status,
    log.detalhe
  ];

  if (libsql) {
    await libsql.execute({ sql, args });
  } else if (db) {
    db.run(sql, args);
    saveDb();
  }
}

export async function getQueryLogs(database: any, limit = 50): Promise<QueryLog[]> {
  const sql = `SELECT * FROM query_logs ORDER BY id DESC LIMIT ?`;
  if (libsql) {
    const res = await libsql.execute({ sql, args: [limit] });
    return res.rows.map(row => ({
      id: Number(row.id),
      cnpj: String(row.cnpj || ''),
      razao_social: String(row.razao_social || ''),
      data_consulta: String(row.data_consulta || ''),
      fonte: row.fonte as any,
      status: row.status as any,
      detalhe: String(row.detalhe || '')
    }));
  } else if (db) {
    const stmt = db.prepare(sql);
    stmt.bind([limit]);
    const logs: QueryLog[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      logs.push({
        id: row.id as number,
        cnpj: row.cnpj as string,
        razao_social: row.razao_social as string,
        data_consulta: row.data_consulta as string,
        fonte: row.fonte as any,
        status: row.status as any,
        detalhe: row.detalhe as string
      });
    }
    stmt.free();
    return logs;
  }
  return [];
}

export async function logSync(database: any, sync: { tipo: string; status: string; registros_afetados: number; mensagem: string }) {
  const sql = `
    INSERT INTO sync_logs (data_sync, tipo, status, registros_afetados, mensagem)
    VALUES (?, ?, ?, ?, ?)
  `;
  const args = [
    new Date().toISOString(),
    sync.tipo,
    sync.status,
    sync.registros_afetados,
    sync.mensagem
  ];

  if (libsql) {
    await libsql.execute({ sql, args });
    await libsql.execute({
      sql: `INSERT OR REPLACE INTO system_config (key, value) VALUES ('ultimo_sync', ?)`,
      args: [new Date().toISOString()]
    });
  } else if (db) {
    db.run(sql, args);
    db.run(`UPDATE system_config SET value = ? WHERE key = 'ultimo_sync'`, [new Date().toISOString()]);
    saveDb();
  }
}

export async function getSyncLogs(database: any, limit = 20): Promise<SyncLogEntry[]> {
  const sql = `SELECT * FROM sync_logs ORDER BY id DESC LIMIT ?`;
  if (libsql) {
    const res = await libsql.execute({ sql, args: [limit] });
    return res.rows.map(row => ({
      id: Number(row.id),
      data_sync: String(row.data_sync || ''),
      tipo: row.tipo as any,
      status: row.status as any,
      registros_afetados: Number(row.registros_afetados || 0),
      mensagem: String(row.mensagem || '')
    }));
  } else if (db) {
    const stmt = db.prepare(sql);
    stmt.bind([limit]);
    const logs: SyncLogEntry[] = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      logs.push({
        id: row.id as number,
        data_sync: row.data_sync as string,
        tipo: row.tipo as any,
        status: row.status as any,
        registros_afetados: row.registros_afetados as number,
        mensagem: row.mensagem as string
      });
    }
    stmt.free();
    return logs;
  }
  return [];
}
