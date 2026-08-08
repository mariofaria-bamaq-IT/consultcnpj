import React, { useState } from 'react';
import {
  CloudCheck,
  RefreshCw,
  HardDrive,
  Database,
  ShieldCheck,
  History,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  Upload
} from 'lucide-react';
import { CloudSyncStatus, SyncLogEntry } from '../types';

interface CloudSyncViewProps {
  syncStatus: CloudSyncStatus | null;
  syncLogs: SyncLogEntry[];
  onTriggerSync: () => Promise<void>;
  isSyncing: boolean;
}

export const CloudSyncView: React.FC<CloudSyncViewProps> = ({
  syncStatus,
  syncLogs,
  onTriggerSync,
  isSyncing
}) => {
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);

  const handleManualSync = async () => {
    await onTriggerSync();
    setSyncSuccessMsg('Sincronização manual com o Cofre em Nuvem concluída com sucesso!');
    setTimeout(() => setSyncSuccessMsg(null), 4000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner Header */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-emerald-600 text-xs font-bold uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Sincronização & Backup Automático</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900">Sincronização em Nuvem do Banco SQLite</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              O sistema mantém os dados gravados no banco SQLite local e espelhados no cofre de nuvem corporativa (Google Drive / Cloud Vault) com verificador de hash.
            </p>
          </div>

          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow flex items-center justify-center space-x-2 transition disabled:opacity-50"
          >
            {isSyncing ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sincronizando Nuvem...</span>
              </>
            ) : (
              <>
                <CloudCheck className="w-4 h-4" />
                <span>Forçar Sincronização Agora</span>
              </>
            )}
          </button>
        </div>
      </div>

      {syncSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-xl text-sm flex items-center space-x-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{syncSuccessMsg}</span>
        </div>
      )}

      {/* Sync Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Card 1: Local SQLite Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Banco Local SQLite</span>
            <Database className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-xl font-bold text-slate-900">
            {syncStatus?.total_registros || 0} Empresas
          </p>
          <p className="text-xs text-slate-500 font-mono truncate">
            Hash Local: {syncStatus?.hash_local || 'SQLITE_MD5_LOCAL'}
          </p>
        </div>

        {/* Card 2: Cloud Vault Status */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Cofre Nuvem Corporativa</span>
            <HardDrive className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-xl font-bold text-emerald-600">
            {syncStatus?.status === 'EM_DIA' ? '100% Espelhado' : 'Pendente'}
          </p>
          <p className="text-xs text-slate-500 font-mono truncate">
            Hash Nuvem: {syncStatus?.hash_nuvem || 'GDRIVE_VAULT_SYNC_V1'}
          </p>
        </div>

        {/* Card 3: Auto-sync Schedule */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500 text-xs font-bold uppercase">
            <span>Agendamento Automático</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-xl font-bold text-slate-900">A cada 15 min</span>
            <label className="relative inline-flex items-center cursor-pointer ml-auto">
              <input
                type="checkbox"
                checked={autoSyncEnabled}
                onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
          <p className="text-xs text-slate-500">
            Último sync: {syncStatus?.ultimo_sync ? new Date(syncStatus.ultimo_sync).toLocaleTimeString('pt-BR') : 'Hoje'}
          </p>
        </div>

      </div>

      {/* Snapshot Backup Actions Box */}
      <div className="bg-slate-900 rounded-xl p-6 text-white shadow-md border border-slate-800 space-y-4">
        <div className="flex items-center space-x-2 text-blue-400 text-xs font-bold uppercase tracking-wider">
          <Sparkles className="w-4 h-4" />
          <span>Gestão de Backup Físico (.sqlite)</span>
        </div>
        <div>
          <h3 className="text-lg font-bold">Snapshot do Banco de Dados SQLite</h3>
          <p className="text-slate-300 text-xs mt-0.5">
            Baixe uma cópia bruta do arquivo <code className="bg-slate-800 text-amber-300 px-1 py-0.5 rounded font-mono">app.sqlite</code> para guarda em cofre físico ou restauração corporativa.
          </p>
        </div>

        <div className="flex flex-wrap gap-3 pt-2">
          <a
            href="/data/app.sqlite"
            download="app.sqlite"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg flex items-center space-x-2 transition shadow"
          >
            <Download className="w-4 h-4" />
            <span>Download da Base SQLite (.sqlite)</span>
          </a>

          <button
            onClick={handleManualSync}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg flex items-center space-x-2 border border-slate-700 transition"
          >
            <Upload className="w-4 h-4" />
            <span>Verificar Integridade com Nuvem</span>
          </button>
        </div>
      </div>

      {/* Sync Audit History Log */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4">
        <div className="flex items-center space-x-2 text-slate-800">
          <History className="w-5 h-5 text-blue-600" />
          <h3 className="font-bold text-base">Histórico de Auditoria de Sincronizações</h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold uppercase">
              <tr>
                <th className="py-2.5 px-3">Data / Hora</th>
                <th className="py-2.5 px-3">Tipo</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Registros Afetados</th>
                <th className="py-2.5 px-3">Detalhes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {syncLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-3 font-mono text-slate-700 font-medium">
                    {new Date(log.data_sync).toLocaleString('pt-BR')}
                  </td>
                  <td className="py-2.5 px-3 font-semibold text-slate-800">{log.tipo}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 font-bold text-slate-800">{log.registros_afetados}</td>
                  <td className="py-2.5 px-3 text-slate-600">{log.mensagem}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
