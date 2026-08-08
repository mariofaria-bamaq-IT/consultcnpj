import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';
import { Company, QueryLog, SyncLogEntry, CloudSyncStatus } from '../src/types.js';

let db: Database | null = null;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'app.sqlite');

export async function getDb(): Promise<Database> {
  if (db) return db;

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const filebuffer = fs.readFileSync(DB_FILE);
      db = new SQL.Database(filebuffer);
      console.log('⚡ Banco SQLite carregado do arquivo local:', DB_FILE);
    } catch (err) {
      console.error('Erro ao ler arquivo SQLite, criando novo banco:', err);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('✨ Novo banco de dados SQLite inicializado.');
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

  // Migrate columns for Simples Nacional & MEI if missing
  try {
    database.run(`ALTER TABLE companies ADD COLUMN opcao_simples INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    database.run(`ALTER TABLE companies ADD COLUMN data_opcao_simples TEXT;`);
  } catch (e) {}
  try {
    database.run(`ALTER TABLE companies ADD COLUMN opcao_mei INTEGER DEFAULT 0;`);
  } catch (e) {}
  try {
    database.run(`ALTER TABLE companies ADD COLUMN data_opcao_mei TEXT;`);
  } catch (e) {}

  // Seed default configuration if missing
  database.run(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('auto_sync', 'true');`);
  database.run(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('intervalo_minutos', '15');`);
  database.run(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('ultimo_sync', '${new Date().toISOString()}');`);
  database.run(`INSERT OR IGNORE INTO system_config (key, value) VALUES ('hash_nuvem', 'GDRIVE_VAULT_SYNC_V1_7A89F');`);
}

function seedInitialData(database: Database) {
  const seeds: Company[] = [
    {
      cnpj: '00000000000191',
      razao_social: 'BANCO DO BRASIL SA',
      nome_fantasia: 'BANCO DO BRASIL',
      situacao_cadastral: 'ATIVA',
      data_situacao_cadastral: '2005-11-03',
      data_abertura: '1966-08-01',
      porte: 'DEMAIS',
      natureza_juridica: 'Sociedade Anônima Aberta',
      cnae_principal_codigo: '6422-1/00',
      cnae_principal_descricao: 'Bancos múltiplos, com carteira comercial',
      logradouro: 'SAUN QUADRA 5 BL0CO B',
      numero: '16',
      complemento: 'TORRE I, II, III',
      bairro: 'ASA NORTE',
      municipio: 'BRASILIA',
      uf: 'DF',
      cep: '70040-912',
      email: 'secex@bb.com.br',
      telefone: '(61) 3493-9000',
      capital_social: 120000000000,
      origem: 'CNPJA',
      data_consulta: new Date().toISOString(),
      status_sincronizacao: 'SINCRONIZADO',
      ultima_atualizacao: new Date().toISOString(),
      qsa: [
        { nome: 'TARCISIANA PAULA MEDEIROS', qualificacao: 'Presidente' },
        { nome: 'MARCO TULIO MENDONCA COSTA', qualificacao: 'Diretor' }
      ]
    },
    {
      cnpj: '33000167000101',
      razao_social: 'PETROLEO BRASILEIRO S A PETROBRAS',
      nome_fantasia: 'PETROBRAS',
      situacao_cadastral: 'ATIVA',
      data_situacao_cadastral: '2005-11-03',
      data_abertura: '1966-08-01',
      porte: 'DEMAIS',
      natureza_juridica: 'Sociedade Anônima Aberta',
      cnae_principal_codigo: '1921-7/00',
      cnae_principal_descricao: 'Fabricação de produtos do refino de petróleo',
      logradouro: 'AV REPUBLICA DO CHILE',
      numero: '65',
      bairro: 'CENTRO',
      municipio: 'RIO DE JANEIRO',
      uf: 'RJ',
      cep: '20031-912',
      email: 'sac@petrobras.com.br',
      telefone: '(21) 3224-4477',
      capital_social: 205432000000,
      origem: 'CNPJA',
      data_consulta: new Date().toISOString(),
      status_sincronizacao: 'SINCRONIZADO',
      ultima_atualizacao: new Date().toISOString(),
      qsa: [
        { nome: 'MAGDA CHAMBRIARD', qualificacao: 'Presidente' }
      ]
    },
    {
      cnpj: '33592510000154',
      razao_social: 'VALE S.A.',
      nome_fantasia: 'VALE DO RIO DOCE',
      situacao_cadastral: 'ATIVA',
      data_situacao_cadastral: '2005-11-03',
      data_abertura: '1966-08-01',
      porte: 'DEMAIS',
      natureza_juridica: 'Sociedade Anônima Aberta',
      cnae_principal_codigo: '0710-3/01',
      cnae_principal_descricao: 'Extração de minério de ferro',
      logradouro: 'PRAIA DE BOTAFOGO',
      numero: '186',
      complemento: 'SALA 701 A 1901',
      bairro: 'BOTAFOGO',
      municipio: 'RIO DE JANEIRO',
      uf: 'RJ',
      cep: '22250-145',
      email: 'investor.relations@vale.com',
      telefone: '(21) 3485-3900',
      capital_social: 77300000000,
      origem: 'CNPJA',
      data_consulta: new Date().toISOString(),
      status_sincronizacao: 'SINCRONIZADO',
      ultima_atualizacao: new Date().toISOString(),
      qsa: [
        { nome: 'GUSTAVO PIMENTA', qualificacao: 'Presidente' }
      ]
    },
    {
      cnpj: '60701190000104',
      razao_social: 'ITAU UNIBANCO S.A.',
      nome_fantasia: 'ITAU UNIBANCO',
      situacao_cadastral: 'ATIVA',
      data_situacao_cadastral: '2005-11-03',
      data_abertura: '1966-08-01',
      porte: 'DEMAIS',
      natureza_juridica: 'Sociedade Anônima Aberta',
      cnae_principal_codigo: '6422-1/00',
      cnae_principal_descricao: 'Bancos múltiplos, com carteira comercial',
      logradouro: 'PRAÇA ALFREDO EGYDIO DE SOUZA ARANHA',
      numero: '100',
      bairro: 'JABAQUARA',
      municipio: 'SAO PAULO',
      uf: 'SP',
      cep: '04344-902',
      email: 'relacoes.investidores@itau.com.br',
      telefone: '(11) 5019-1200',
      capital_social: 97148000000,
      origem: 'CNPJA',
      data_consulta: new Date().toISOString(),
      status_sincronizacao: 'SINCRONIZADO',
      ultima_atualizacao: new Date().toISOString()
    },
    {
      cnpj: '07526557000100',
      razao_social: 'AMBEV S.A.',
      nome_fantasia: 'AMBEV',
      situacao_cadastral: 'ATIVA',
      data_situacao_cadastral: '2005-08-10',
      data_abertura: '2005-07-08',
      porte: 'DEMAIS',
      natureza_juridica: 'Sociedade Anônima Aberta',
      cnae_principal_codigo: '1111-9/02',
      cnae_principal_descricao: 'Fabricação de cervejas e meadas',
      logradouro: 'RUA DR RENATO PAES DE BARROS',
      numero: '1017',
      complemento: 'CONJ 41 E 42',
      bairro: 'ITAIM BIBI',
      municipio: 'SAO PAULO',
      uf: 'SP',
      cep: '04530-001',
      email: 'ri@ambev.com.br',
      telefone: '(11) 2122-1200',
      capital_social: 58000000000,
      origem: 'CNPJA',
      data_consulta: new Date().toISOString(),
      status_sincronizacao: 'SINCRONIZADO',
      ultima_atualizacao: new Date().toISOString()
    },
    {
      cnpj: '84429695000111',
      razao_social: 'WEG EQUIPAMENTOS ELETRICOS S.A.',
      nome_fantasia: 'WEG',
      situacao_cadastral: 'ATIVA',
      data_situacao_cadastral: '2005-11-03',
      data_abertura: '1961-09-16',
      porte: 'DEMAIS',
      natureza_juridica: 'Sociedade Anônima Fechada',
      cnae_principal_codigo: '2710-4/01',
      cnae_principal_descricao: 'Fabricação de geradores de corrente alternada e contínua',
      logradouro: 'AV PREFEITO WALDEMAR GRUBA',
      numero: '3000',
      bairro: 'VILA LALAU',
      municipio: 'JARAGUA DO SUL',
      uf: 'SC',
      cep: '89256-900',
      email: 'info-br@weg.net',
      telefone: '(47) 3276-4000',
      capital_social: 6500000000,
      origem: 'IMPORTACAO_EXCEL',
      data_consulta: new Date().toISOString(),
      status_sincronizacao: 'SINCRONIZADO',
      ultima_atualizacao: new Date().toISOString()
    },
    {
      cnpj: '03238962000101',
      razao_social: 'MAGAZINE LUIZA S.A.',
      nome_fantasia: 'MAGALU',
      situacao_cadastral: 'ATIVA',
      data_situacao_cadastral: '2005-11-03',
      data_abertura: '1957-11-16',
      porte: 'DEMAIS',
      natureza_juridica: 'Sociedade Anônima Aberta',
      cnae_principal_codigo: '4713-0/01',
      cnae_principal_descricao: 'Lojas de departamentos ou magazines',
      logradouro: 'RUA ARNULFO DE LIMA',
      numero: '2385',
      bairro: 'VILA SANTA CRUZ',
      municipio: 'FRANCA',
      uf: 'SP',
      cep: '14403-471',
      email: 'ri@magazineluiza.com.br',
      telefone: '(16) 3711-2000',
      capital_social: 12500000000,
      origem: 'CNPJA',
      data_consulta: new Date().toISOString(),
      status_sincronizacao: 'SINCRONIZADO',
      ultima_atualizacao: new Date().toISOString()
    },
    {
      cnpj: '42582660000102',
      razao_social: 'EMBRAER S.A.',
      nome_fantasia: 'EMBRAER',
      situacao_cadastral: 'ATIVA',
      data_situacao_cadastral: '2005-11-03',
      data_abertura: '1969-08-19',
      porte: 'DEMAIS',
      natureza_juridica: 'Sociedade Anônima Aberta',
      cnae_principal_codigo: '3041-0/00',
      cnae_principal_descricao: 'Fabricação de aeronaves',
      logradouro: 'AV BRIGADEIRO FARIA LIMA',
      numero: '2170',
      bairro: 'PUTIM',
      municipio: 'SAO JOSE DOS CAMPOS',
      uf: 'SP',
      cep: '12227-901',
      email: 'ri@embraer.com.br',
      telefone: '(12) 3927-1000',
      capital_social: 5120000000,
      origem: 'CNPJA',
      data_consulta: new Date().toISOString(),
      status_sincronizacao: 'SINCRONIZADO',
      ultima_atualizacao: new Date().toISOString()
    }
  ];

  for (const c of seeds) {
    saveCompanyToDb(database, c);
  }

  // Seed log
  database.run(`
    INSERT INTO query_logs (cnpj, razao_social, data_consulta, fonte, status, detalhe)
    VALUES ('00000000000191', 'BANCO DO BRASIL SA', '${new Date().toISOString()}', 'CNPJA_API', 'SUCESSO', 'Consulta inicial no sistema corporativo');
  `);

  database.run(`
    INSERT INTO sync_logs (data_sync, tipo, status, registros_afetados, mensagem)
    VALUES ('${new Date().toISOString()}', 'AUTOMATICO', 'CONCLUIDO', ${seeds.length}, 'Sincronização inicial com Cloud Vault concluída');
  `);
}

export function saveCompanyToDb(database: Database, company: Company) {
  const qsaJson = company.qsa ? JSON.stringify(company.qsa) : null;
  const atividadesSecJson = company.atividades_secundarias ? JSON.stringify(company.atividades_secundarias) : null;

  database.run(`
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
  `, [
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
  ]);

  saveDb();
}

export function getAllCompanies(database: Database, filters?: { search?: string; uf?: string; porte?: string; situacao?: string }): Company[] {
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

  const stmt = database.prepare(sql);
  if (params.length > 0) {
    stmt.bind(params);
  }

  const results: Company[] = [];
  while (stmt.step()) {
    const row = stmt.getAsObject();
    results.push(parseCompanyRow(row));
  }
  stmt.free();

  return results;
}

export function getCompanyByCnpj(database: Database, cnpj: string): Company | null {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  const stmt = database.prepare(`SELECT * FROM companies WHERE cnpj = ?`);
  stmt.bind([cleanCnpj]);

  if (stmt.step()) {
    const row = stmt.getAsObject();
    stmt.free();
    return parseCompanyRow(row);
  }
  stmt.free();
  return null;
}

export function deleteCompanyByCnpj(database: Database, cnpj: string): boolean {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  database.run(`DELETE FROM companies WHERE cnpj = ?`, [cleanCnpj]);
  saveDb();
  return true;
}

export function clearAllCompanies(database: Database): boolean {
  database.run(`DELETE FROM companies`);
  saveDb();
  return true;
}

function parseCompanyRow(row: any): Company {
  let qsa = [];
  let atividades = [];

  try {
    if (row.qsa) qsa = JSON.parse(row.qsa);
  } catch (e) {
    qsa = [];
  }

  try {
    if (row.atividades_secundarias) atividades = JSON.parse(row.atividades_secundarias);
  } catch (e) {
    atividades = [];
  }

  return {
    cnpj: row.cnpj,
    razao_social: row.razao_social,
    nome_fantasia: row.nome_fantasia || '',
    situacao_cadastral: row.situacao_cadastral || 'ATIVA',
    data_situacao_cadastral: row.data_situacao_cadastral || '',
    data_abertura: row.data_abertura || '',
    porte: row.porte || 'DEMAIS',
    natureza_juridica: row.natureza_juridica || '',
    cnae_principal_codigo: row.cnae_principal_codigo || '',
    cnae_principal_descricao: row.cnae_principal_descricao || '',
    atividades_secundarias: atividades,
    logradouro: row.logradouro || '',
    numero: row.numero || '',
    complemento: row.complemento || '',
    bairro: row.bairro || '',
    municipio: row.municipio || '',
    uf: row.uf || '',
    cep: row.cep || '',
    email: row.email || '',
    telefone: row.telefone || '',
    capital_social: Number(row.capital_social) || 0,
    opcao_simples: Boolean(row.opcao_simples),
    data_opcao_simples: row.data_opcao_simples || '',
    opcao_mei: Boolean(row.opcao_mei),
    data_opcao_mei: row.data_opcao_mei || '',
    qsa: qsa,
    origem: row.origem || 'MANUAL',
    data_consulta: row.data_consulta || '',
    status_sincronizacao: row.status_sincronizacao || 'SINCRONIZADO',
    ultima_atualizacao: row.ultima_atualizacao || ''
  };
}

export function logQuery(database: Database, log: { cnpj: string; razao_social?: string; fonte: string; status: string; detalhe: string }) {
  database.run(`
    INSERT INTO query_logs (cnpj, razao_social, data_consulta, fonte, status, detalhe)
    VALUES (?, ?, ?, ?, ?, ?)
  `, [
    log.cnpj,
    log.razao_social || '',
    new Date().toISOString(),
    log.fonte,
    log.status,
    log.detalhe
  ]);
  saveDb();
}

export function getQueryLogs(database: Database, limit = 50): QueryLog[] {
  const stmt = database.prepare(`SELECT * FROM query_logs ORDER BY id DESC LIMIT ?`);
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

export function logSync(database: Database, sync: { tipo: string; status: string; registros_afetados: number; mensagem: string }) {
  database.run(`
    INSERT INTO sync_logs (data_sync, tipo, status, registros_afetados, mensagem)
    VALUES (?, ?, ?, ?, ?)
  `, [
    new Date().toISOString(),
    sync.tipo,
    sync.status,
    sync.registros_afetados,
    sync.mensagem
  ]);

  database.run(`UPDATE system_config SET value = ? WHERE key = 'ultimo_sync'`, [new Date().toISOString()]);
  saveDb();
}

export function getSyncLogs(database: Database, limit = 20): SyncLogEntry[] {
  const stmt = database.prepare(`SELECT * FROM sync_logs ORDER BY id DESC LIMIT ?`);
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
