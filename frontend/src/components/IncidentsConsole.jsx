import React, { useState, useMemo } from 'react';
import SeverityBadge from './common/SeverityBadge';
import StatusBadge from './common/StatusBadge';
import { EmptyState, DemoBadge } from './common/UIStates';

export default function IncidentsConsole({ incidents, onSelectIncident, onSimulateClick }) {
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
    <div className="flex flex-col w-full gap-space-lg">
      {/* Ambient Top Gradient & Quick Metrics Row */}
      <div className="relative overflow-hidden rounded-xl bg-surface-container-low p-space-md shadow-md border border-surface-container-high/40">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary-container/10 blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 -bottom-24 h-48 w-48 rounded-full bg-secondary-container/10 blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
          {/* Titles & Live Stream Badge */}
          <div className="flex flex-col gap-space-xs">
            <div className="flex flex-wrap items-center gap-space-sm">
              <span className="px-space-xs py-0.5 rounded bg-surface-container-high font-mono text-[11px] text-secondary uppercase tracking-wider border border-surface-container-highest">
                Mesh Telemetry v4.2
              </span>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface-variant font-mono text-[11px]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                </span>
                Streaming events from Kafka event bus (topic: telemetry.prod.cluster-us-east-1)
              </span>
              <DemoBadge />
            </div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
              Incident Management Console
            </h1>
            <p className="font-body-md text-body-md text-on-surface-variant max-w-3xl text-sm">
              Real-time telemetry, automated triage, and agent dispatch pipeline across 14 services. Continuous synthesis by Observer, Investigator, Repair, and Verifier swarm nodes.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-space-sm shrink-0">
            <button
              onClick={handleExportCSV}
              className="flex items-center gap-space-xs px-space-md py-2 rounded bg-surface-container-high text-on-surface hover:bg-surface-container-highest transition-colors font-mono text-xs shadow-sm border border-surface-container-highest/40"
            >
              <span className="material-symbols-outlined text-[18px] text-on-surface-variant">download</span>
              <span>Export CSV</span>
            </button>
            <button
              onClick={onSimulateClick}
              className="relative overflow-hidden flex items-center gap-space-xs px-space-md py-2 rounded bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-on-primary font-headline-sm text-xs font-semibold shadow-lg hover:shadow-xl hover:brightness-110 active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-[18px] animate-bounce">bolt</span>
              <span>Simulate Incident</span>
            </button>
          </div>
        </div>

        {/* Telemetry Pulse Strip (6 metrics) */}
        <div className="mt-space-md pt-space-sm grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-6 gap-space-sm border-t border-surface-container-high/40 font-mono text-xs">
          <div className="p-space-xs rounded bg-surface-container flex flex-col">
            <span className="text-outline uppercase text-[10px]">Active Critical/High</span>
            <span className="font-headline-md text-headline-md text-error font-semibold flex items-center gap-1">
              {incidents.filter(i => (i.severity === 'critical' || i.severity === 'high' || i.severity === 'P0' || i.severity === 'P1') && i.status !== 'recovered').length}
              <span className="text-[10px] text-error bg-error-container/40 px-1 py-0.2 rounded">+1 vs 1h</span>
            </span>
          </div>

          <div className="p-space-xs rounded bg-surface-container flex flex-col">
            <span className="text-outline uppercase text-[10px]">MTTR (AI-Assisted)</span>
            <span className="font-headline-md text-headline-md text-tertiary font-semibold flex items-center gap-1">
              4.2m
              <span className="text-[10px] text-tertiary">-68% baseline</span>
            </span>
          </div>

          <div className="p-space-xs rounded bg-surface-container flex flex-col">
            <span className="text-outline uppercase text-[10px]">Patches Generated</span>
            <span className="font-headline-md text-headline-md text-secondary font-semibold">
              18 <span className="text-outline font-normal text-[11px]">today</span>
            </span>
          </div>

          <div className="p-space-xs rounded bg-surface-container flex flex-col">
            <span className="text-outline uppercase text-[10px]">Swarm Confidence</span>
            <span className="font-headline-md text-headline-md text-primary font-semibold">94.8%</span>
          </div>

          <div className="p-space-xs rounded bg-surface-container hidden xl:flex flex-col">
            <span className="text-outline uppercase text-[10px]">Services Monitored</span>
            <span className="font-headline-md text-headline-md text-on-surface font-semibold">14 / 14</span>
          </div>

          <div className="p-space-xs rounded bg-surface-container hidden xl:flex flex-col">
            <span className="text-outline uppercase text-[10px]">Auto-Recoveries</span>
            <span className="font-headline-md text-headline-md text-tertiary font-semibold">89.2%</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Control Bar */}
      <div className="rounded-xl bg-surface-container-low p-space-md shadow-sm border border-surface-container-high/40 flex flex-col lg:flex-row gap-space-sm items-stretch lg:items-center justify-between">
        {/* Instant Search Input */}
        <div className="relative flex-1 min-w-[280px]">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">
            search
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-2 bg-surface-container rounded font-body-sm text-xs text-on-surface placeholder:text-outline focus:outline-none focus:bg-surface-container-high border border-surface-container-highest/30 transition-colors"
            placeholder="Search by incident ID, application, or error text..."
            type="text"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          )}
        </div>

        {/* Filter Dropdowns Group */}
        <div className="flex flex-wrap items-center gap-space-xs font-mono text-xs">
          {/* Severity Filter */}
          <div className="relative">
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="appearance-none bg-surface-container hover:bg-surface-container-high text-on-surface pl-3 pr-8 py-2 rounded focus:outline-none cursor-pointer border border-surface-container-highest/40 transition-colors"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical (P0)</option>
              <option value="high">High (P1)</option>
              <option value="medium">Medium (P2)</option>
              <option value="low">Low (P3)</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">
              arrow_drop_down
            </span>
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-surface-container hover:bg-surface-container-high text-on-surface pl-3 pr-8 py-2 rounded focus:outline-none cursor-pointer border border-surface-container-highest/40 transition-colors"
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
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">
              arrow_drop_down
            </span>
          </div>

          {/* App Filter */}
          <div className="relative">
            <select
              value={appFilter}
              onChange={(e) => setAppFilter(e.target.value)}
              className="appearance-none bg-surface-container hover:bg-surface-container-high text-on-surface pl-3 pr-8 py-2 rounded focus:outline-none cursor-pointer border border-surface-container-highest/40 transition-colors"
            >
              <option value="all">All Applications</option>
              {uniqueApps.map(app => (
                <option key={app} value={app}>{app}</option>
              ))}
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">
              arrow_drop_down
            </span>
          </div>

          {/* Sort Filter */}
          <div className="relative">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="appearance-none bg-surface-container hover:bg-surface-container-high text-on-surface pl-3 pr-8 py-2 rounded focus:outline-none cursor-pointer border border-surface-container-highest/40 transition-colors"
            >
              <option value="newest">Sort: Detected (Newest)</option>
              <option value="severity">Sort: Severity (High → Low)</option>
            </select>
            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-outline pointer-events-none text-[18px]">
              sort
            </span>
          </div>

          {/* Reset button */}
          <button
            onClick={resetFilters}
            className="p-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors border border-surface-container-highest/30"
            title="Reset Filters"
          >
            <span className="material-symbols-outlined text-[18px]">restart_alt</span>
          </button>
        </div>
      </div>

      {/* Incident Data Grid / Table Surface */}
      <div className="rounded-xl bg-surface-container-low shadow-md overflow-hidden flex flex-col border border-surface-container-high/40">
        {/* Grid Column Headers */}
        <div className="bg-surface-container px-space-md py-space-sm hidden md:grid grid-cols-12 gap-space-sm items-center font-mono uppercase text-[11px] text-on-surface-variant select-none border-b border-surface-container-high/40">
          <div className="col-span-1 flex items-center gap-2">
            <input
              checked={selectedIds.length === filteredIncidents.length && filteredIncidents.length > 0}
              onChange={handleSelectAll}
              className="w-4 h-4 rounded bg-surface-container-high accent-primary cursor-pointer"
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

        {/* Grid Rows List */}
        <div className="flex flex-col divide-y divide-surface-container-high/30">
          {filteredIncidents.length === 0 ? (
            <EmptyState
              title="No incidents match filter criteria"
              description="Try adjusting your search terms, changing the severity filter, or reset all filters."
              action={
                <button
                  onClick={resetFilters}
                  className="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-xs font-mono text-secondary transition-colors"
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
                  className="group p-space-md hover:bg-surface-container/60 transition-colors flex flex-col md:grid md:grid-cols-12 gap-space-sm items-start md:items-center bg-surface-container-low"
                >
                  {/* Col 1: ID + Select */}
                  <div className="md:col-span-1 flex items-center gap-2 w-full md:w-auto justify-between md:justify-start">
                    <div className="flex items-center gap-2">
                      <input
                        checked={selectedIds.includes(inc.id)}
                        onChange={() => handleToggleRow(inc.id)}
                        className="w-4 h-4 rounded bg-surface-container-high accent-primary cursor-pointer"
                        type="checkbox"
                      />
                      <span 
                        onClick={() => onSelectIncident(inc)}
                        className="font-mono text-primary font-bold tracking-tight cursor-pointer hover:underline text-xs"
                      >
                        {inc.id}
                      </span>
                    </div>
                    <div className="md:hidden">
                      <SeverityBadge severity={inc.severity} short />
                    </div>
                  </div>

                  {/* Col 2: Service Tag */}
                  <div className="md:col-span-2 flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[16px] text-outline shrink-0">
                      dns
                    </span>
                    <span className="font-mono text-on-surface truncate font-medium text-xs">
                      {appName}
                    </span>
                    {inc.version && (
                      <span className="px-1 py-0.2 rounded bg-surface-container font-mono text-outline text-[10px]">
                        {inc.version}
                      </span>
                    )}
                  </div>

                  {/* Col 3: Error Message & Signature */}
                  <div className="md:col-span-4 flex flex-col min-w-0 pr-space-xs">
                    <span className="font-mono text-error font-medium truncate text-xs">
                      {inc.signature || inc.title}
                    </span>
                    <div className="flex items-center gap-2 font-mono text-on-surface-variant truncate mt-0.5 text-[11px]">
                      {inc.location && <span className="text-outline">{inc.location}</span>}
                      {inc.traceId && (
                        <>
                          <span>•</span>
                          <span className="text-outline">
                            trace: <span className="text-secondary">{inc.traceId}</span>
                          </span>
                        </>
                      )}
                      {inc.impact && (
                        <>
                          <span>•</span>
                          <span className="text-outline">{inc.impact}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Col 4: Severity Badge */}
                  <div className="hidden md:flex md:col-span-1 items-center">
                    <SeverityBadge severity={inc.severity} />
                  </div>

                  {/* Col 5: Pipeline & Agent Tag */}
                  <div className="md:col-span-2 flex flex-col gap-1 w-full md:w-auto font-mono">
                    <StatusBadge status={inc.status} />
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-container text-on-surface-variant text-[10px]">
                      <span className="material-symbols-outlined text-[14px] text-primary">auto_fix_high</span>
                      <span className="truncate">{inc.pipelineAgent || 'Swarm Triage'}</span>
                    </div>
                  </div>

                  {/* Col 6: Detected Time */}
                  <div className="md:col-span-1 flex items-center font-mono text-on-surface-variant text-[11px]">
                    <span className="material-symbols-outlined text-[14px] mr-1 text-outline">schedule</span>
                    <span>{inc.detectedTime || 'Recently'}</span>
                  </div>

                  {/* Col 7: View Details CTA */}
                  <div className="md:col-span-1 flex items-center justify-end w-full md:w-auto pt-2 md:pt-0">
                    <button
                      onClick={() => onSelectIncident(inc)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded bg-primary text-on-primary font-body-sm text-xs font-semibold hover:bg-primary-fixed transition-colors shadow-sm"
                    >
                      <span>Investigate</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
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
