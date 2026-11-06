import React, { useState, useMemo } from 'react';
import SeverityBadge from './common/SeverityBadge';
import StatusBadge from './common/StatusBadge';
import { EmptyState, DemoBadge } from './common/UIStates';

export default function IncidentsConsole({ incidents, onSelectIncident, onSimulateClick, isDemoMode = false }) {
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [appFilter, setAppFilter] = useState('all');
  const [sortBy, setSortBy] = useState('newest');
  const [selectedIds, setSelectedIds] = useState([]);

  // Available unique applications for the dropdown
  const uniqueApps = useMemo(() => {
    const apps = new Set(incidents.map(i => i.application || i.app));
    return Array.from(apps).filter(Boolean);
  }, [incidents]);

  // Filtering & Sorting
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      const appName = inc.application || inc.app || '';
      const matchesSearch =
        search === '' ||
        inc.title.toLowerCase().includes(search.toLowerCase()) ||
        (inc.signature && inc.signature.toLowerCase().includes(search.toLowerCase())) ||
        inc.id.toLowerCase().includes(search.toLowerCase()) ||
        appName.toLowerCase().includes(search.toLowerCase());

      const normSev = (inc.severity || '').toLowerCase();
      const matchesSeverity =
        severityFilter === 'all' ||
        normSev === severityFilter.toLowerCase() ||
        normSev.includes(severityFilter.toLowerCase().replace('p', ''));

      const normStatus = (inc.status || '').toLowerCase().replace(/ /g, '_');
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? normStatus !== 'recovered' : normStatus === statusFilter);

      const matchesApp = appFilter === 'all' || appName === appFilter;

      return matchesSearch && matchesSeverity && matchesStatus && matchesApp;
    }).sort((a, b) => {
      if (sortBy === 'severity') {
        const order = { critical: 0, high: 1, medium: 2, low: 3, p0: 0, p1: 1, p2: 2, p3: 3 };
        const aVal = order[a.severity?.toLowerCase()] ?? 9;
        const bVal = order[b.severity?.toLowerCase()] ?? 9;
        return aVal - bVal;
      }
      return 0;
    });
  }, [incidents, search, severityFilter, statusFilter, appFilter, sortBy]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredIncidents.map(i => i.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const resetFilters = () => {
    setSearch('');
    setSeverityFilter('all');
    setStatusFilter('all');
    setAppFilter('all');
    setSortBy('newest');
  };

  const handleExportCSV = () => {
    const headers = ['Incident ID', 'Application', 'Version', 'Title', 'Severity', 'Status', 'Detected'];
    const rows = filteredIncidents.map(i => [
      i.id,
      i.application || i.app,
      i.version || '',
      `"${(i.title || '').replace(/"/g, '""')}"`,
      i.severity,
      i.status,
      i.detectedTime || i.detectedAt
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `sentinelmesh-incidents-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="flex flex-col w-full gap-6">
      {/* Top Banner & Quick Metrics */}
      <div className="relative p-6 sm:p-8 rounded-3xl glass-panel shadow-glass overflow-hidden border border-white/80">
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full bg-powder-blue/30 text-deep-navy font-mono text-[11px] font-semibold border border-powder-blue/40">
                Live Incident Stream
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white/80 text-muted-slate font-mono text-[11px] border border-white">
                <span className="w-2 h-2 rounded-full bg-sunset-peach animate-ping"></span>
                Kafka ingress active
              </span>
              {isDemoMode ? (
                <DemoBadge label="DEMO DATA" />
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-mono text-[10px] font-bold border border-emerald-300 shadow-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse"></span>
                  Live Telemetry
                </span>
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-deep-navy tracking-tight">
              Incident Management Console
            </h1>
            <p className="text-xs sm:text-sm text-muted-slate max-w-3xl leading-relaxed">
              Real-time telemetry, automated triage, and agent dispatch pipeline across 14 services. Continuous synthesis by Observer, Investigator, Repair, and Verifier swarm nodes.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-white/80 text-deep-navy hover:bg-white transition-all text-xs font-semibold shadow-xs border border-white"
            >
              <span className="material-symbols-outlined text-[18px] text-muted-slate">download</span>
              <span>Export CSV</span>
            </button>
            <button
              onClick={onSimulateClick}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-deep-navy text-white text-xs font-semibold hover:bg-deep-navy/90 transition-all shadow-md active:scale-95"
            >
              <span className="material-symbols-outlined text-[18px] text-sunset-peach">bolt</span>
              <span>Simulate Incident</span>
            </button>
          </div>
        </div>

        {/* Telemetry Pulse Strip */}
        <div className="mt-6 pt-5 grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-3 border-t border-muted-slate/15 font-mono text-xs">
          <div className="p-3 rounded-2xl bg-white/70 border border-white/80 flex flex-col">
            <span className="text-muted-slate uppercase text-[10px]">Active Critical/High</span>
            <span className="text-lg font-bold text-rose-600 mt-1 flex items-center gap-1">
              {incidents.filter(i => (i.severity === 'critical' || i.severity === 'high' || i.severity === 'P0' || i.severity === 'P1') && i.status !== 'recovered').length}
              <span className="text-[10px] text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full font-sans font-semibold">+1 vs 1h</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 border border-white/80 flex flex-col">
            <span className="text-muted-slate uppercase text-[10px]">MTTR (AI-Assisted)</span>
            <span className="text-lg font-bold text-deep-navy mt-1 flex items-center gap-1">
              4.2m
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full font-sans font-semibold">-68%</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 border border-white/80 flex flex-col">
            <span className="text-muted-slate uppercase text-[10px]">Patches Generated</span>
            <span className="text-lg font-bold text-deep-navy mt-1">
              18 <span className="text-muted-slate font-normal text-[11px]">today</span>
            </span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 border border-white/80 flex flex-col">
            <span className="text-muted-slate uppercase text-[10px]">Swarm Confidence</span>
            <span className="text-lg font-bold text-tertiary mt-1">96.4%</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 border border-white/80 hidden xl:flex flex-col">
            <span className="text-muted-slate uppercase text-[10px]">Services Monitored</span>
            <span className="text-lg font-bold text-deep-navy mt-1">14 / 14</span>
          </div>

          <div className="p-3 rounded-2xl bg-white/70 border border-white/80 hidden xl:flex flex-col">
            <span className="text-muted-slate uppercase text-[10px]">Auto-Recoveries</span>
            <span className="text-lg font-bold text-emerald-700 mt-1">89.2%</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Control Bar */}
      <div className="p-4 sm:p-5 rounded-3xl glass-panel shadow-sm border border-white/80 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Instant Search Input */}
        <div className="relative flex-1 min-w-0">
          <span className="material-symbols-outlined absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-slate text-[20px] pointer-events-none">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 bg-white/80 rounded-full text-xs text-deep-navy placeholder:text-muted-slate focus:outline-none focus:ring-2 focus:ring-powder-blue/70 border border-white/80 shadow-xs transition-all"
            placeholder="Search by incident ID, application, or error text..."
            type="text"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-slate hover:text-deep-navy"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns Group */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          {/* Severity Filter */}
          <div className="relative">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="appearance-none bg-white/80 hover:bg-white text-deep-navy pl-3.5 pr-8 py-2 rounded-full cursor-pointer border border-white/80 shadow-xs focus:outline-none transition-colors"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical (P0)</option>
              <option value="high">High (P1)</option>
              <option value="medium">Medium (P2)</option>
              <option value="low">Low (P3)</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-slate pointer-events-none text-[18px]">
              arrow_drop_down
            </span>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white/80 hover:bg-white text-deep-navy pl-3.5 pr-8 py-2 rounded-full cursor-pointer border border-white/80 shadow-xs focus:outline-none transition-colors"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Pipeline</option>
              <option value="detected">Detected</option>
              <option value="investigating">Investigating</option>
              <option value="awaiting_approval">Awaiting Approval</option>
              <option value="approved">Approved</option>
              <option value="verifying">Verifying</option>
              <option value="recovered">Recovered</option>
              <option value="rejected">Rejected</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-slate pointer-events-none text-[18px]">
              arrow_drop_down
            </span>
          </div>

          {/* App Filter */}
          <div className="relative">
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="appearance-none bg-white/80 hover:bg-white text-deep-navy pl-3.5 pr-8 py-2 rounded-full cursor-pointer border border-white/80 shadow-xs focus:outline-none transition-colors"
            >
              <option value="all">All Applications</option>
              {uniqueApps.map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-slate pointer-events-none text-[18px]">
              arrow_drop_down
            </span>
          </div>

          {/* Sort Filter */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-white/80 hover:bg-white text-deep-navy pl-3.5 pr-8 py-2 rounded-full cursor-pointer border border-white/80 shadow-xs focus:outline-none transition-colors"
            >
              <option value="newest">Sort: Detected (Newest)</option>
              <option value="severity">Sort: Severity (High → Low)</option>
            </select>
            <span className="material-symbols-outlined absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-slate pointer-events-none text-[18px]">
              sort
            </span>
          </div>

          {/* Reset button */}
          <button
            onClick={resetFilters}
            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-muted-slate hover:text-deep-navy transition-colors border border-white/80 shadow-xs flex items-center justify-center"
            title="Reset Filters"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          </button>
        </div>
      </div>

      {/* Incident Data Grid / Card Surface */}
      <div className="rounded-3xl glass-panel shadow-glass overflow-hidden flex flex-col border border-white/80">
        {/* Column Headers */}
        <div className="bg-white/60 px-6 py-3.5 hidden xl:grid grid-cols-12 gap-3 items-center font-mono uppercase text-[11px] text-muted-slate select-none border-b border-muted-slate/10">
          <div className="col-span-1 flex items-center gap-2">
            <input
              checked={selectedIds.length === filteredIncidents.length && filteredIncidents.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded accent-deep-navy cursor-pointer"
              type="checkbox"
            />
            <span>Incident</span>
          </div>
          <div className="col-span-2">Application</div>
          <div className="col-span-4">Error Signature & Context</div>
          <div className="col-span-1">Severity</div>
          <div className="col-span-2">Agent Swarm Pipeline</div>
          <div className="col-span-1">Detected</div>
          <div className="col-span-1 text-right">Action</div>
        </div>

        {/* Rows List */}
        <div className="flex flex-col divide-y divide-muted-slate/10">
          {filteredIncidents.length === 0 ? (
            <EmptyState
              title="No incidents match filter criteria"
              description="Try adjusting your search terms, changing the severity filter, or reset all filters."
              action={
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 rounded-full bg-deep-navy text-white text-xs font-semibold shadow-xs"
                >
                  Reset All Filters
                </button>
              }
            />
          ) : (
            filteredIncidents.map((inc) => {
              const appName = inc.application || inc.app;
              return (
                <div
                  key={inc.id}
                  className="p-5 hover:bg-white/80 transition-colors flex flex-col xl:grid xl:grid-cols-12 gap-3 items-start xl:items-center bg-white/40"
                >
                  {/* Col 1: ID + Select */}
                  <div className="xl:col-span-1 flex items-center gap-2 w-full xl:w-auto justify-between xl:justify-start">
                    <div className="flex items-center gap-2">
                      <input
                        checked={selectedIds.includes(inc.id)}
                        onChange={() => handleToggleRow(inc.id)}
                        className="w-4 h-4 rounded accent-deep-navy cursor-pointer"
                        type="checkbox"
                      />
                      <span 
                        onClick={() => onSelectIncident(inc)}
                        className="font-mono text-deep-navy font-bold tracking-tight cursor-pointer hover:underline text-xs"
                      >
                        {inc.id}
                      </span>
                    </div>
                    <div className="xl:hidden">
                      <SeverityBadge severity={inc.severity} short />
                    </div>
                  </div>

                  {/* Col 2: Service Tag */}
                  <div className="xl:col-span-2 flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-muted-slate shrink-0">
                      dns
                    </span>
                    <span className="font-mono text-deep-navy truncate font-semibold text-xs">
                      {appName}
                    </span>
                    {inc.version && (
                      <span className="px-1.5 py-0.5 rounded-md bg-white border border-muted-slate/20 font-mono text-muted-slate text-[10px]">
                        {inc.version}
                      </span>
                    )}
                  </div>

                  {/* Col 3: Title */}
                  <div className="xl:col-span-4 min-w-0">
                    <div
                      onClick={() => onSelectIncident(inc)}
                      className="text-xs font-bold text-deep-navy hover:text-deep-navy/80 cursor-pointer truncate"
                      title={inc.title}
                    >
                      {inc.title}
                    </div>
                    {inc.signature && (
                      <div className="text-[11px] font-mono text-muted-slate truncate mt-0.5" title={inc.signature}>
                        {inc.signature}
                      </div>
                    )}
                  </div>

                  {/* Col 4: Severity */}
                  <div className="xl:col-span-1 hidden xl:flex items-center">
                    <SeverityBadge severity={inc.severity} short />
                  </div>

                  {/* Col 5: Pipeline / Status */}
                  <div className="xl:col-span-2 flex items-center">
                    <StatusBadge status={inc.status} />
                  </div>

                  {/* Col 6: Detected */}
                  <div className="xl:col-span-1 text-[11px] font-mono text-muted-slate">
                    {inc.detectedTime || 'Just now'}
                  </div>

                  {/* Col 7: Action */}
                  <div className="xl:col-span-1 text-right w-full xl:w-auto">
                    <button
                      onClick={() => onSelectIncident(inc)}
                      className="px-3.5 py-1.5 rounded-full bg-white/80 hover:bg-deep-navy hover:text-white text-deep-navy border border-white text-xs font-semibold transition-all shadow-xs"
                    >
                      Inspect &rarr;
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
