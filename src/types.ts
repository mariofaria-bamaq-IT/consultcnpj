export interface Socio {
  nome: string;
  qualificacao: string;
  pais?: string;
  faixa_etaria?: string;
  data_entrada?: string;
}

export interface AtividadeEconomica {
  codigo: string;
  descricao: string;
}

export interface Company {
  cnpj: string; // Key / Primary ID formatted or unformatted
  razao_social: string;
  nome_fantasia: string;
  situacao_cadastral: 'ATIVA' | 'INATIVA' | 'SUSPENSA' | 'BAIXADA' | 'NULA' | string;
  data_situacao_cadastral?: string;
  data_abertura: string;
  porte: 'ME' | 'EPP' | 'DEMAIS' | 'MEI' | string;
  natureza_juridica: string;
  cnae_principal_codigo: string;
  cnae_principal_descricao: string;
  atividades_secundarias?: AtividadeEconomica[];
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  municipio: string;
  uf: string;
  cep: string;
  email?: string;
  telefone?: string;
  capital_social: number;
  opcao_simples?: boolean;
  data_opcao_simples?: string;
  opcao_mei?: boolean;
  data_opcao_mei?: string;
  qsa?: Socio[];
  origem: 'CNPJA' | 'IMPORTACAO_EXCEL' | 'MANUAL' | 'SINCRONIZACAO_NUVEM';
  data_consulta: string;
  status_sincronizacao: 'SINCRONIZADO' | 'PENDENTE' | 'ERRO';
  ultima_atualizacao: string;
}

export interface QueryLog {
  id: number;
  cnpj: string;
  razao_social?: string;
  data_consulta: string;
  fonte: 'CNPJA_API' | 'CACHE_SQLITE' | 'RECEITA_FALLBACK' | 'IMPORTACAO';
  status: 'SUCESSO' | 'ERRO' | 'ALERTA';
  detalhe: string;
}

export interface CloudSyncStatus {
  auto_sync: boolean;
  intervalo_minutos: number;
  ultimo_sync: string | null;
  proximo_sync: string | null;
  status: 'EM_DIA' | 'SINCRONIZANDO' | 'PENDENTE' | 'ERRO';
  pendentes_count: number;
  total_registros: number;
  hash_local: string;
  hash_nuvem: string;
  mensagem: string;
}

export interface SyncLogEntry {
  id: number;
  data_sync: string;
  tipo: 'AUTOMATICO' | 'MANUAL' | 'SNAPSHOT_UPLOAD' | 'SNAPSHOT_DOWNLOAD';
  status: 'CONCLUIDO' | 'FALHA' | 'EM_ANDAMENTO';
  registros_afetados: number;
  mensagem: string;
}

export interface DashboardStats {
  total_empresas: number;
  empresas_ativas: number;
  empresas_inativas: number;
  consultas_hoje: number;
  consultas_mes: number;
  distribuicao_porte: Record<string, number>;
  distribuicao_uf: Record<string, number>;
  sync_status: CloudSyncStatus;
}

export interface ReportConfig {
  titulo: string;
  subtitulo: string;
  nome_organizacao: string;
  cnpj_matriz?: string;
  departamento: string;
  observacoes: string;
  uf_filtro: string;
  porte_filtro: string;
  situacao_filtro: string;
  incluir_cabecalho_oficial: boolean;
  incluir_totais: boolean;
  incluir_data_hora: boolean;
}

export interface ExcelImportRow {
  cnpj?: string;
  CNPJ?: string;
  razao_social?: string;
  'Razão Social'?: string;
  'RAZAO SOCIAL'?: string;
  nome_fantasia?: string;
  'Nome Fantasia'?: string;
  uf?: string;
  UF?: string;
  municipio?: string;
  'Município'?: string;
  'MUNICIPIO'?: string;
  porte?: string;
  Porte?: string;
  capital_social?: string | number;
  'Capital Social'?: string | number;
  situacao?: string;
  Situacao?: string;
  [key: string]: unknown;
}
