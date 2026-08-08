/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './components/DashboardView';
import { CnpjLookupView } from './components/CnpjLookupView';
import { CompanyManagerView } from './components/CompanyManagerView';
import { ImportSpreadsheetView } from './components/ImportSpreadsheetView';
import { CloudSyncView } from './components/CloudSyncView';
import { ReportsView } from './components/ReportsView';
import { TiDocsView } from './components/TiDocsView';
import { Company, DashboardStats, QueryLog, SyncLogEntry, CloudSyncStatus } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [companies, setCompanies] = useState<Company[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [syncStatus, setSyncStatus] = useState<CloudSyncStatus | null>(null);
  const [logs, setLogs] = useState<QueryLog[]>([]);
  const [syncLogs, setSyncLogs] = useState<SyncLogEntry[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [lookupTargetCnpj, setLookupTargetCnpj] = useState<string>('');

  const loadData = useCallback(async () => {
    try {
      const [resStats, resCompanies, resLogs, resSyncLogs] = await Promise.all([
        fetch('/api/stats'),
        fetch('/api/companies'),
        fetch('/api/logs'),
        fetch('/api/sync/logs')
      ]);

      if (resStats.ok) {
        const statsData: DashboardStats = await resStats.json();
        setStats(statsData);
        setSyncStatus(statsData.sync_status);
      }

      if (resCompanies.ok) {
        const companiesData: Company[] = await resCompanies.json();
        setCompanies(companiesData);
      }

      if (resLogs.ok) {
        const logsData: QueryLog[] = await resLogs.json();
        setLogs(logsData);
      }

      if (resSyncLogs.ok) {
        const syncLogsData: SyncLogEntry[] = await resSyncLogs.json();
        setSyncLogs(syncLogsData);
      }
    } catch (err) {
      console.error('Erro ao carregar dados do servidor:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Trigger manual cloud sync
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/sync/trigger', { method: 'POST' });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Erro ao acionar sincronização:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  // CNPJ Lookup handler
  const handleCnpjSearch = async (cnpj: string, forceRefresh: boolean) => {
    const res = await fetch(`/api/cnpj/lookup/${cnpj.replace(/\D/g, '')}?refresh=${forceRefresh}`);
    if (!res.ok) {
      const errJson = await res.json();
      throw new Error(errJson.error || 'Erro ao efetuar consulta de CNPJ.');
    }
    const data = await res.json();
    await loadData(); // Reload DB list
    return data;
  };

  // Save Company manually
  const handleSaveCompany = async (company: Company) => {
    const res = await fetch('/api/companies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(company)
    });

    if (!res.ok) {
      const errJson = await res.json();
      alert(`Erro ao salvar empresa: ${errJson.error}`);
      return;
    }

    await loadData();
  };

  // Delete Company
  const handleDeleteCompany = async (cnpj: string) => {
    const res = await fetch(`/api/companies/${cnpj}`, { method: 'DELETE' });
    if (!res.ok) {
      const errJson = await res.json();
      alert(`Erro ao excluir empresa: ${errJson.error}`);
      return;
    }

    await loadData();
  };

  // Quick Search Jump
  const handleQuickSearchJump = (cnpj: string) => {
    setLookupTargetCnpj(cnpj);
    setActiveTab('lookup');
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col text-slate-900 font-sans antialiased">
      
      {/* Top Header */}
      <Header
        setActiveTab={setActiveTab}
      />

      {/* Main Body Layout with Sidebar and Content */}
      <div className="flex-1 max-w-[1920px] w-full mx-auto flex flex-col md:flex-row">
        
        {/* Left Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          totalCompaniesCount={companies.length}
        />

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              stats={stats}
              companies={companies}
              logs={logs}
              setActiveTab={setActiveTab}
              onQuickSearch={handleQuickSearchJump}
            />
          )}

          {activeTab === 'lookup' && (
            <CnpjLookupView
              onSearch={handleCnpjSearch}
              onSaveToDatabase={handleSaveCompany}
              initialCnpj={lookupTargetCnpj}
              companies={companies}
            />
          )}

          {activeTab === 'companies' && (
            <CompanyManagerView
              companies={companies}
              onSaveCompany={handleSaveCompany}
              onDeleteCompany={handleDeleteCompany}
              onRefresh={loadData}
              onSelectCnpjLookup={handleQuickSearchJump}
            />
          )}

          {activeTab === 'import' && (
            <ImportSpreadsheetView
              onImportComplete={loadData}
            />
          )}

          {activeTab === 'sync' && (
            <CloudSyncView
              syncStatus={syncStatus}
              syncLogs={syncLogs}
              onTriggerSync={handleTriggerSync}
              isSyncing={isSyncing}
            />
          )}

          {activeTab === 'reports' && (
            <ReportsView
              companies={companies}
            />
          )}

          {activeTab === 'tidocs' && (
            <TiDocsView />
          )}
        </main>

      </div>

    </div>
  );
}
