import React, { useState } from 'react';
import { BookOpen, ShieldCheck, Code, FileText, CheckCircle2 } from 'lucide-react';

export const TiDocsView: React.FC = () => {
  const [docTab, setDocTab] = useState<'agents' | 'readme' | 'architecture' | 'adr' | 'operations' | 'backlog'>('agents');

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex items-center space-x-2 text-blue-600 text-xs font-bold uppercase tracking-wider mb-1">
          <ShieldCheck className="w-4 h-4" />
          <span>Norma Técnica TI — Cubosoft 2.0</span>
        </div>
        <h2 className="text-xl font-bold text-slate-900">Documentação do Sistema & Padrão de TI</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Consulte as diretrizes arquiteturais, normas de segurança, governança do código e registro de decisões (ADR) do projeto.
        </p>
      </div>

      {/* Doc Sub-tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setDocTab('agents')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            docTab === 'agents' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          AGENTS.md (Diretrizes)
        </button>

        <button
          onClick={() => setDocTab('readme')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            docTab === 'readme' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          README.md (Visão Geral)
        </button>

        <button
          onClick={() => setDocTab('architecture')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            docTab === 'architecture' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          docs/arquitetura.md
        </button>

        <button
          onClick={() => setDocTab('adr')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            docTab === 'adr' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          ADR-001 (SQLite & Nuvem)
        </button>

        <button
          onClick={() => setDocTab('operations')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            docTab === 'operations' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          docs/operacao-local.md
        </button>

        <button
          onClick={() => setDocTab('backlog')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            docTab === 'backlog' ? 'bg-slate-900 text-white shadow' : 'bg-white text-slate-700 hover:bg-slate-100'
          }`}
        >
          docs/backlog.md
        </button>
      </div>

      {/* Doc Viewer Content Card */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 font-mono text-xs text-slate-800 leading-relaxed overflow-x-auto space-y-4">
        
        {docTab === 'agents' && (
          <div className="space-y-3 font-sans text-sm text-slate-800">
            <h3 className="font-bold text-lg text-slate-900 border-b pb-2">DIRETRIZES TÉCNICAS E NORMA DE TI (AGENTS.md)</h3>
            <div className="bg-slate-50 p-4 rounded-lg border text-xs space-y-2 font-mono">
              <p className="font-bold text-slate-900"># Padrão Corporativo de Soluções TI Cubosoft 2.0</p>
              <ul className="list-disc pl-5 space-y-1 text-slate-700">
                <li><strong>Frontend:</strong> React 19 com TypeScript e Tailwind CSS v4.</li>
                <li><strong>Backend:</strong> Node.js Express estruturado com API REST modular (Separação entre controle, serviço de CNPJ e banco SQLite).</li>
                <li><strong>Regra Crítica de Negócio:</strong> Permanece no backend (Express/SQLite), nunca isolada no cliente.</li>
                <li><strong>Segurança de Segredos:</strong> Nenhuma chave, senha ou token gravado direto no código. Utiliza suporte em `.env` (`CNPJA_API_KEY`, `DEFAULT_MAX_AGE_DAYS`).</li>
                <li><strong>Persistência de Dados:</strong> Banco de dados SQLite persistido no disco local e sincronizado automaticamente com cofre de nuvem corporativa.</li>
                <li><strong>Auditoria e Governança:</strong> Trilha de auditoria das consultas e sincronizações registradas nas tabelas `query_logs` e `sync_logs`.</li>
              </ul>
            </div>
          </div>
        )}

        {docTab === 'readme' && (
          <div className="space-y-3 font-sans text-sm text-slate-800">
            <h3 className="font-bold text-lg text-slate-900 border-b pb-2">README.md — Gestão Empresarial & CNPJ</h3>
            <p>Sistema corporativo de consulta de CNPJ, cadastro de empresas em banco SQLite local, importação de planilhas Excel/CSV e sincronização em nuvem.</p>
            <div className="bg-slate-900 text-slate-200 p-4 rounded-lg font-mono text-xs space-y-2">
              <p className="text-emerald-400 font-bold"># Como Executar o Projeto:</p>
              <p>npm run dev      # Inicia o servidor Express e Vite na porta 3000</p>
              <p>npm run build    # Compila a aplicação e o servidor bundle dist/server.cjs</p>
              <p>npm run start    # Executa o servidor compilado em produção</p>
            </div>
          </div>
        )}

        {docTab === 'architecture' && (
          <div className="space-y-3 font-sans text-sm text-slate-800">
            <h3 className="font-bold text-lg text-slate-900 border-b pb-2">ARQUITETURA DO SISTEMA (docs/arquitetura.md)</h3>
            <p>A arquitetura foi concebida seguindo o modelo de camada tripla:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-sans">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="font-bold text-blue-900 block">Camada 1: Apresentação</span>
                <p className="text-blue-950 mt-1">React 19 com componentes modulares, layout responsivo e relatórios em PDF/XLSX.</p>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                <span className="font-bold text-emerald-900 block">Camada 2: Serviço e Controle</span>
                <p className="text-emerald-950 mt-1">Express.js backend para roteamento REST, integração CNPJá e barramento de sincronização.</p>
              </div>
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
                <span className="font-bold text-indigo-900 block">Camada 3: Persistência & Nuvem</span>
                <p className="text-indigo-950 mt-1">Engine SQLite (sql.js) persistido em disco com verificador de integridade hash para o cofre de nuvem.</p>
              </div>
            </div>
          </div>
        )}

        {docTab === 'adr' && (
          <div className="space-y-3 font-sans text-sm text-slate-800">
            <h3 className="font-bold text-lg text-slate-900 border-b pb-2">ADR-001: Seleção do Banco SQLite e Sincronização em Nuvem</h3>
            <div className="bg-slate-50 p-4 rounded-lg border text-xs space-y-2">
              <p><strong>Status:</strong> APROVADO</p>
              <p><strong>Contexto:</strong> A solução exigia respostas instantâneas, operação sem latência de rede e backup automático seguro em nuvem corporativa.</p>
              <p><strong>Decisão:</strong> Adotar o banco SQLite em arquivo local (`data/app.sqlite`) associado ao serviço de sincronização assíncrona para a nuvem.</p>
              <p><strong>Consequências:</strong> Performance máxima nas consultas e resiliência total contra quedas de internet.</p>
            </div>
          </div>
        )}

        {docTab === 'operations' && (
          <div className="space-y-3 font-sans text-sm text-slate-800">
            <h3 className="font-bold text-lg text-slate-900 border-b pb-2">MANUAL DE OPERAÇÃO LOCAL (docs/operacao-local.md)</h3>
            <p>Instruções para a equipe de operação e infraestrutura de TI:</p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-700">
              <li>O arquivo de banco de dados SQLite é mantido no diretório <code className="bg-slate-100 px-1 py-0.5 font-mono">./data/app.sqlite</code>.</li>
              <li>A chave de API da CNPJá deve ser configurada na variável <code className="bg-slate-100 px-1 py-0.5 font-mono">CNPJA_API_KEY</code> no arquivo <code className="bg-slate-100 px-1 py-0.5 font-mono">.env</code>.</li>
              <li>A retenção de cache padrão de consultas é controlada por <code className="bg-slate-100 px-1 py-0.5 font-mono">DEFAULT_MAX_AGE_DAYS=45</code>.</li>
            </ul>
          </div>
        )}

        {docTab === 'backlog' && (
          <div className="space-y-3 font-sans text-sm text-slate-800">
            <h3 className="font-bold text-lg text-slate-900 border-b pb-2">BACKLOG DE EVOLUÇÃO (docs/backlog.md)</h3>
            <ul className="list-disc pl-5 space-y-2 text-xs text-slate-700">
              <li><strong className="text-slate-900">Sprint 1 (Concluído):</strong> Implantação do SQLite local, consulta CNPJá, importação Excel/CSV, relatórios PDF/XLS.</li>
              <li><strong className="text-slate-900">Sprint 2 (Próximo):</strong> Conector direto de backup via OAuth com Google Drive API / Google Sheets.</li>
              <li><strong className="text-slate-900">Sprint 3:</strong> Módulo de notificação por e-mail de alteração de situação cadastral.</li>
            </ul>
          </div>
        )}

      </div>

    </div>
  );
};
