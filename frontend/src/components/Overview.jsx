import React, { useState } from 'react';
import StatusBadge from './common/StatusBadge';
import SeverityBadge from './common/SeverityBadge';
import { DemoBadge } from './common/UIStates';

export default function Overview({ incidents, onSelectIncident, onSimulateClick, onNavigateTab }) {
  const [lastRefreshed, setLastRefreshed] = useState('12s ago');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed('Just now');
    }, 600);
  };

  const criticalCount = incidents.filter(i => (i.severity || '').toLowerCase().includes('0') || (i.severity || '').toLowerCase() === 'critical').length;
  const highCount = incidents.filter(i => (i.severity || '').toLowerCase().includes('1') || (i.severity || '').toLowerCase() === 'high').length;
  const recoveredCount = incidents.filter(i => i.status === 'recovered').length;
  const pendingCount = incidents.filter(i => i.status === 'awaiting_approval' || i.status === 'Patch Proposed').length;

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Greeting & Header Actions Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-label-sm text-label-sm uppercase tracking-wider text-secondary font-mono text-xs">
              Telemetry Node // US-East-1
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            <span className="font-label-sm text-label-sm text-outline font-mono text-xs">
              Cluster-Alpha-7
            </span>
            <DemoBadge />
          </div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold tracking-tight">
            Good morning, Elena
          </h1>
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">
            Here's what's happening across your monitored applications and multi-agent meshes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-space-sm self-start lg:self-center">
          <button
            onClick={handleRefresh}
            className="flex items-center gap-1.5 px-3 py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface transition-colors font-body-sm text-xs shadow-sm border border-surface-container-highest/40"
          >
            <span className={`material-symbols-outlined text-[16px] text-secondary ${isRefreshing ? 'animate-spin' : ''}`}>
              sync
            </span>
            <span>Refresh Telemetry</span>
            <span className="font-mono text-outline ml-1 text-[11px]">
              {lastRefreshed}
            </span>
          </button>
          <button
            onClick={onSimulateClick}
            className="flex items-center gap-2 px-4 py-2 rounded bg-primary-container text-on-primary font-body-sm text-xs font-semibold hover:opacity-95 shadow-md shadow-primary-container/20 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined text-[18px]">bolt</span>
            <span>Simulate Incident</span>
          </button>
        </div>
      </div>

      {/* Four Top Statistic Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md">
        {/* Card 1: Total Incidents */}
        <div className="p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-all shadow-sm border border-surface-container-high/40 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-primary/5 blur-2xl group-hover:bg-primary/10 transition-colors pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-outline uppercase tracking-wider text-[11px]">
                Total Incidents
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-1 tracking-tight">
                {incidents.length + 20}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-surface-container-highest text-secondary font-mono text-[11px] font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">trending_up</span>
              +2 this week
            </span>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs text-on-surface-variant border-t border-surface-container-high/30">
            <span className="font-body-sm text-body-sm text-[12px]">Across 14 microservices</span>
            <span className="material-symbols-outlined text-[18px] text-outline">lan</span>
          </div>
        </div>

        {/* Card 2: Active Incidents */}
        <div className="p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-all shadow-sm border border-surface-container-high/40 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-error/15 blur-2xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-error uppercase tracking-wider flex items-center gap-1.5 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                Active Incidents
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-1 tracking-tight">
                {incidents.filter(i => i.status !== 'recovered').length}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-error-container/30 text-error font-mono text-[11px] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">search_activity</span>
              Active triage
            </span>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs text-on-surface-variant border-t border-surface-container-high/30">
            <span className="font-body-sm text-body-sm text-on-surface text-[12px]">
              <span className="text-error font-semibold">{criticalCount} Critical</span>, {highCount} High
            </span>
            <span className="material-symbols-outlined text-[18px] text-error">priority_high</span>
          </div>
        </div>

        {/* Card 3: Successfully Recovered */}
        <div className="p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-all shadow-sm border border-surface-container-high/40 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-tertiary/10 blur-2xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-tertiary uppercase tracking-wider text-[11px]">
                Successfully Recovered
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-1 tracking-tight">
                {recoveredCount + 17}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-tertiary-container/30 text-tertiary font-mono text-[11px] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">speed</span>
              75.0% MTTR reduction
            </span>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs text-on-surface-variant border-t border-surface-container-high/30">
            <span className="font-body-sm text-body-sm text-[12px]">Auto-verified zero regression</span>
            <span className="material-symbols-outlined text-[18px] text-tertiary">task_alt</span>
          </div>
        </div>

        {/* Card 4: Pending Approval */}
        <div className="p-space-md rounded-lg bg-surface-container-low hover:bg-surface-container transition-all shadow-sm border border-surface-container-high/40 flex flex-col justify-between relative overflow-hidden group">
          <div className="absolute -right-4 -bottom-4 w-24 h-24 rounded-full bg-secondary/15 blur-2xl pointer-events-none"></div>
          <div className="flex items-start justify-between">
            <div className="flex flex-col">
              <span className="font-mono text-secondary uppercase tracking-wider text-[11px]">
                Pending Approval
              </span>
              <span className="font-headline-xl text-headline-xl text-on-surface font-bold mt-1 tracking-tight">
                {pendingCount}
              </span>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-secondary-container/30 text-secondary font-mono text-[11px] font-semibold flex items-center gap-1">
              <span className="material-symbols-outlined text-[12px]">pending_actions</span>
              Human sign-off
            </span>
          </div>
          <div className="flex items-center justify-between mt-space-md pt-space-xs text-on-surface-variant border-t border-surface-container-high/30">
            <span className="font-body-sm text-body-sm text-[12px]">Code patches awaiting review</span>
            <span className="material-symbols-outlined text-[18px] text-secondary">approval</span>
          </div>
        </div>
      </div>

      {/* Middle Visual Layout: Chart (8 cols) + AI Swarm Panel (4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* Left: Trend Chart & Resolution Metrics */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          <div className="p-space-md rounded-lg bg-surface-container-low border border-surface-container-high/40 shadow-sm flex flex-col gap-space-sm relative">
            <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 pb-2 border-b border-surface-container-high/30">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-headline-sm text-headline-sm text-on-surface font-semibold text-sm">
                    Incident Ingress vs Autonomous Resolution
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-tertiary font-mono text-[10px]">
                    24h Rolling
                  </span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
                  Sample telemetry ingress tracked against AI swarm autonomous self-healing
                </p>
              </div>

              <div className="flex items-center gap-4 font-mono text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-error"></span>
                  <span className="text-on-surface-variant">Ingress Events</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-tertiary"></span>
                  <span className="text-on-surface-variant">Auto-Healed</span>
                </div>
              </div>
            </div>

            {/* Inline SVG Multi-Line Trend Chart */}
            <div className="w-full h-60 relative bg-surface-container-lowest/80 rounded border border-surface-container-high/30 p-2 flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 760 220">
                <defs>
                  <linearGradient id="ingressGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#ffb4ab" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#ffb4ab" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="healedGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#4edea3" stopOpacity="0.35" />
                    <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line stroke="#262a36" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="740" y1="20" y2="20" />
                <line stroke="#262a36" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="740" y1="70" y2="70" />
                <line stroke="#262a36" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="740" y1="120" y2="120" />
                <line stroke="#262a36" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="740" y1="170" y2="170" />

                <text fill="#908fa0" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="30" y="24">12</text>
                <text fill="#908fa0" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="30" y="74">8</text>
                <text fill="#908fa0" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="30" y="124">4</text>
                <text fill="#908fa0" fontFamily="JetBrains Mono" fontSize="10" textAnchor="end" x="30" y="174">0</text>

                <path d="M 50 150 Q 120 130 180 80 T 320 60 T 450 110 T 580 40 T 730 90 L 730 190 L 50 190 Z" fill="url(#ingressGrad)" />
                <path d="M 50 150 Q 120 130 180 80 T 320 60 T 450 110 T 580 40 T 730 90" fill="none" stroke="#ffb4ab" strokeLinecap="round" strokeWidth="2.5" />

                <path d="M 50 165 Q 120 155 180 100 T 320 70 T 450 120 T 580 48 T 730 95 L 730 190 L 50 190 Z" fill="url(#healedGrad)" />
                <path d="M 50 165 Q 120 155 180 100 T 320 70 T 450 120 T 580 48 T 730 95" fill="none" stroke="#4edea3" strokeLinecap="round" strokeWidth="2.5" />

                <circle cx="180" cy="100" fill="#0f131e" r="4" stroke="#4edea3" strokeWidth="2.5" />
                <circle cx="320" cy="70" fill="#0f131e" r="4" stroke="#4edea3" strokeWidth="2.5" />
                <circle cx="450" cy="120" fill="#0f131e" r="4" stroke="#4edea3" strokeWidth="2.5" />
                <circle cx="580" cy="48" fill="#4edea3" r="5" stroke="#0f131e" strokeWidth="2" className="animate-pulse" />
                <circle cx="730" cy="95" fill="#0f131e" r="4" stroke="#4edea3" strokeWidth="2.5" />

                <rect fill="#262a36" height="22" rx="3" width="130" x="515" y="8" stroke="#4edea3" strokeWidth="0.5" />
                <text fill="#4edea3" fontFamily="JetBrains Mono" fontSize="10" fontWeight="600" textAnchor="middle" x="580" y="23">Swarm Peak: 98% Recovery</text>

                <text fill="#908fa0" fontFamily="JetBrains Mono" fontSize="10" x="60" y="205">00:00</text>
                <text fill="#908fa0" fontFamily="JetBrains Mono" fontSize="10" x="200" y="205">06:00</text>
                <text fill="#908fa0" fontFamily="JetBrains Mono" fontSize="10" x="350" y="205">12:00</text>
                <text fill="#908fa0" fontFamily="JetBrains Mono" fontSize="10" x="500" y="205">18:00</text>
                <text fill="#908fa0" fontFamily="JetBrains Mono" fontSize="10" x="680" y="205">NOW</text>
              </svg>
            </div>

            {/* Severity Distribution Breakdown Bar */}
            <div className="flex flex-col gap-2 pt-2">
              <div className="flex items-center justify-between text-body-sm font-body-sm">
                <span className="text-on-surface font-medium text-xs">Incident Severity Distribution</span>
                <span className="font-mono text-outline text-[11px]">Total 24 incidents analyzed</span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-surface-container-highest overflow-hidden flex shadow-inner">
                <div className="bg-error h-full" style={{ width: '16.6%' }} title="Critical" />
                <div className="bg-secondary-container h-full" style={{ width: '29.2%' }} title="High" />
                <div className="bg-primary h-full" style={{ width: '37.5%' }} title="Medium" />
                <div className="bg-outline-variant h-full" style={{ width: '16.7%' }} title="Low" />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-xs">
                <div className="flex items-center justify-between p-2 rounded bg-surface-container-high/40 border border-surface-container-highest/20">
                  <span className="flex items-center gap-1.5 text-on-surface">
                    <span className="w-2 h-2 rounded-full bg-error"></span>Critical
                  </span>
                  <span className="font-bold text-on-surface">{criticalCount + 3}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-surface-container-high/40 border border-surface-container-highest/20">
                  <span className="flex items-center gap-1.5 text-on-surface">
                    <span className="w-2 h-2 rounded-full bg-secondary-container"></span>High
                  </span>
                  <span className="font-bold text-on-surface">{highCount + 5}</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-surface-container-high/40 border border-surface-container-highest/20">
                  <span className="flex items-center gap-1.5 text-on-surface">
                    <span className="w-2 h-2 rounded-full bg-primary"></span>Medium
                  </span>
                  <span className="font-bold text-on-surface">9</span>
                </div>
                <div className="flex items-center justify-between p-2 rounded bg-surface-container-high/40 border border-surface-container-highest/20">
                  <span className="flex items-center gap-1.5 text-on-surface">
                    <span className="w-2 h-2 rounded-full bg-outline-variant"></span>Low
                  </span>
                  <span className="font-bold text-on-surface">4</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Swarm Orchestrator Panel */}
        <div className="lg:col-span-4 flex flex-col gap-space-md">
          <div className="p-space-md rounded-lg bg-surface-container-low border border-surface-container-high/40 shadow-sm flex flex-col gap-space-sm">
            <div className="flex items-center justify-between pb-1 border-b border-surface-container-high/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-tertiary">smart_toy</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold text-sm">Swarm Orchestrator</span>
              </div>
              <span className="font-mono text-tertiary flex items-center gap-1 text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>Live
              </span>
            </div>
            <p className="font-body-sm text-on-surface-variant text-[12px]">
              4 autonomous agents collaborating via consensus pipeline
            </p>

            <div className="flex flex-col gap-2 pt-1 font-mono text-xs">
              <div 
                onClick={() => onNavigateTab('agents')} 
                className="p-2.5 rounded bg-surface-container hover:bg-surface-container-high transition-colors flex flex-col gap-1 cursor-pointer border border-surface-container-highest/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                    <span className="font-semibold text-on-surface">Observer Agent</span>
                  </div>
                  <span className="text-tertiary bg-tertiary-container/20 px-1.5 py-0.5 rounded text-[10px]">Running</span>
                </div>
                <p className="text-on-surface-variant pl-4 text-[11px]">24/24 services polled · Ping: 42ms</p>
              </div>

              <div 
                onClick={() => onNavigateTab('agents')} 
                className="p-2.5 rounded bg-surface-container hover:bg-surface-container-high transition-colors flex flex-col gap-1 cursor-pointer border border-surface-container-highest/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                    </span>
                    <span className="font-semibold text-on-surface">Investigator Agent</span>
                  </div>
                  <span className="text-secondary bg-secondary-container/20 px-1.5 py-0.5 rounded text-[10px]">INC-8921</span>
                </div>
                <p className="text-on-surface-variant pl-4 text-[11px]">Root cause isolation & AST trace</p>
              </div>

              <div 
                onClick={() => onNavigateTab('agents')} 
                className="p-2.5 rounded bg-surface-container hover:bg-surface-container-high transition-colors flex flex-col gap-1 cursor-pointer border border-surface-container-highest/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-primary-container"></span>
                    <span className="font-semibold text-on-surface">Repair Agent</span>
                  </div>
                  <span className="text-primary bg-primary-container/20 px-1.5 py-0.5 rounded text-[10px]">PR Ready</span>
                </div>
                <p className="text-on-surface-variant pl-4 text-[11px]">Patch pending human review</p>
              </div>

              <div 
                onClick={() => onNavigateTab('agents')} 
                className="p-2.5 rounded bg-surface-container hover:bg-surface-container-high transition-colors flex flex-col gap-1 cursor-pointer border border-surface-container-highest/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-tertiary"></span>
                    <span className="font-semibold text-on-surface">Verifier Agent</span>
                  </div>
                  <span className="text-tertiary bg-tertiary-container/20 px-1.5 py-0.5 rounded text-[10px]">Ready</span>
                </div>
                <p className="text-on-surface-variant pl-4 text-[11px]">Isolated sandbox dry-run pre-warmed</p>
              </div>
            </div>

            {/* System Health Telemetry Summary */}
            <div className="pt-space-sm mt-space-xs flex flex-col gap-2 bg-surface-container-lowest/60 p-2.5 rounded border border-surface-container-high/40 font-mono">
              <span className="text-outline uppercase text-[10px]">System Health (Simulated)</span>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="flex flex-col">
                  <span className="text-secondary font-bold">14ms</span>
                  <span className="text-on-surface-variant text-[10px]">Latency</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-tertiary font-bold">0.08%</span>
                  <span className="text-on-surface-variant text-[10px]">Error Rate</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-primary font-bold">99.98%</span>
                  <span className="text-on-surface-variant text-[10px]">Cluster Up</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Full-Width Section: Real-Time Incident Stream Table */}
      <div className="p-space-md rounded-lg bg-surface-container-low border border-surface-container-high/40 shadow-sm flex flex-col gap-space-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-container-high/30">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-headline-sm text-headline-sm text-on-surface font-semibold text-sm">
                Real-Time Incident Stream
              </span>
              <span className="px-2 py-0.5 rounded-full bg-error-container/30 text-error font-mono text-[11px] font-bold">
                {incidents.filter(i => i.status !== 'recovered').length} Requiring Attention
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant text-[12px]">
              Traces captured by SentinelMesh Autonomous Observers
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('incidents')}
            className="px-2.5 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-on-surface font-mono text-xs flex items-center gap-1 transition-colors border border-surface-container-highest/30 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
            <span>View All Incidents</span>
          </button>
        </div>

        {/* Table Container */}
        <div className="overflow-x-auto w-full">
          <table className="w-full min-w-[720px] text-left font-body-sm text-xs">
            <thead>
              <tr className="bg-surface-container-lowest/80 text-on-surface-variant font-mono uppercase text-[11px] border-b border-surface-container-high/40">
                <th className="py-2.5 px-3">INCIDENT ID</th>
                <th className="py-2.5 px-3">APPLICATION</th>
                <th className="py-2.5 px-3">DESCRIPTION</th>
                <th className="py-2.5 px-3">SEVERITY</th>
                <th className="py-2.5 px-3">STATUS</th>
                <th className="py-2.5 px-3">DETECTED</th>
                <th className="py-2.5 px-3 text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container-high/40">
              {incidents.map((inc) => (
                <tr key={inc.id} className="hover:bg-surface-container/60 transition-colors group">
                  <td className="py-3 px-3 whitespace-nowrap">
                    <span 
                      onClick={() => onSelectIncident(inc)}
                      className="font-mono text-secondary font-bold cursor-pointer hover:underline"
                    >
                      {inc.id}
                    </span>
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-on-surface">
                    <span className="px-2 py-1 rounded bg-surface-container-highest border border-surface-container-high">
                      {inc.application || inc.app}
                    </span>
                  </td>
                  <td className="py-3 px-3 max-w-xs truncate text-on-surface text-[12px]" title={inc.title}>
                    {inc.title}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <SeverityBadge severity={inc.severity} />
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    <StatusBadge status={inc.status} />
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap font-mono text-on-surface-variant text-[11px]">
                    {inc.detectedTime}
                  </td>
                  <td className="py-3 px-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => onSelectIncident(inc)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded bg-primary-container text-on-primary font-body-sm text-xs font-medium hover:opacity-90 transition-opacity shadow-sm"
                    >
                      <span>Investigate</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
