import React, { useState } from 'react';
import StatusBadge from './common/StatusBadge';
import SeverityBadge from './common/SeverityBadge';
import { DemoBadge, EmptyState } from './common/UIStates';

export default function Overview({ incidents = [], onSelectIncident, onSimulateClick, onNavigateTab, isDemoMode = false, fleetAgents = [] }) {
  const [lastRefreshed, setLastRefreshed] = useState('12s ago');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setLastRefreshed('Just now');
    }, 600);
  };

  const safeIncidents = Array.isArray(incidents) ? incidents : [];
  const activeIncidents = safeIncidents.filter(i => i.status !== 'recovered' && i.status !== 'rejected');
  const investigatingCount = safeIncidents.filter(i => i.status === 'investigating' || i.status === 'detected').length;
  const pendingCount = safeIncidents.filter(i => i.status === 'awaiting_approval' || i.status === 'Patch Proposed' || i.status === 'patch_pending_approval').length;
  const recoveredCount = safeIncidents.filter(i => i.status === 'recovered').length;

  return (
    <div className="flex flex-col w-full gap-8">
      {/* SECTION 1: HERO DASHBOARD (Section 3.C of new_design.md) */}
      <div className="relative p-8 sm:p-10 rounded-3xl glass-panel shadow-glass overflow-hidden border border-white">
        {/* Ambient atmospheric glows */}
        <div className="absolute -right-20 -top-20 w-96 h-96 rounded-full bg-powder-blue/35 blur-3xl pointer-events-none"></div>
        <div className="absolute right-1/3 -bottom-24 w-80 h-80 rounded-full bg-sunset-peach/30 blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white text-[#17233B] border border-[#CBD5E1] shadow-xs">
                Autonomous SRE Mesh
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-sunset-peach"></span>
              <span className="text-xs font-mono font-semibold text-[#475569]">
                US-East-1 · Swarm v4.8
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

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-[#17233B] tracking-tight leading-tight">
              Your AI Command Center
            </h1>

            <p className="mt-3 text-sm sm:text-base text-[#334155] font-medium leading-relaxed">
              Detect incidents, investigate root causes, repair safely, and verify recovery with intelligent multi-agent automation.
            </p>

            <div className="flex flex-wrap items-center gap-3 mt-6">
              <button
                onClick={onSimulateClick}
                className="px-5 py-2.5 rounded-full bg-[#17233B] text-white text-xs font-bold hover:bg-[#17233B]/90 transition-all shadow-md active:scale-95 flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-sunset-peach">bolt</span>
                <span>Simulate Incident</span>
              </button>

              <button
                onClick={() => onNavigateTab('patch-review')}
                className="px-5 py-2.5 rounded-full bg-white hover:bg-slate-50 text-[#17233B] text-xs font-bold border border-[#CBD5E1] transition-all shadow-xs flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[16px] text-[#2563EB]">call_merge</span>
                <span>Review Patches</span>
                {pendingCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-powder-blue text-[#17233B] text-[10px] font-bold flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </button>

              <button
                onClick={handleRefresh}
                className="px-4 py-2.5 rounded-full bg-white/80 hover:bg-white text-[#334155] hover:text-[#17233B] text-xs font-semibold transition-colors flex items-center gap-1.5 shadow-xs border border-white"
                title="Refresh Telemetry Stream"
              >
                <span className={`material-symbols-outlined text-[16px] text-[#17233B] ${isRefreshing ? 'animate-spin' : ''}`}>
                  sync
                </span>
                <span className="text-[11px] font-mono font-bold text-[#17233B]">{lastRefreshed}</span>
              </button>
            </div>
          </div>

          {/* Quick System Quorum Widget */}
          <div className="p-5 rounded-2xl bg-white/95 border border-white shadow-sm flex flex-col gap-3 min-w-[250px]">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-[#17233B]">Mesh Reliability Quorum</span>
              <span className="text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                99.98% SLO
              </span>
            </div>
            <div className="space-y-1.5 text-xs text-[#334155] font-medium">
              <div className="flex justify-between">
                <span>Autonomous Healing:</span>
                <span className="font-bold text-[#17233B]">88.4%</span>
              </div>
              <div className="flex justify-between">
                <span>Zero-Drift Baseline:</span>
                <span className="font-bold text-[#17233B]">Guaranteed</span>
              </div>
              <div className="flex justify-between">
                <span>Human Gate Quorum:</span>
                <span className="font-bold text-[#17233B]">Enforced (P0/P1)</span>
              </div>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div className="bg-gradient-to-r from-powder-blue to-sunset-peach h-2 rounded-full" style={{ width: '88.4%' }}></div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: INCIDENT OVERVIEW CARDS (Section 3.D of new_design.md) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Card 1: Active Incidents */}
        <div className="p-6 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between relative overflow-hidden group border border-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#475569] uppercase tracking-wider block">
                Active Incidents
              </span>
              <span className="text-3xl font-black text-[#17233B] mt-1 block">
                {activeIncidents.length}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-sunset-peach/35 text-[#17233B] border border-sunset-peach/50 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">warning</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
            <span className="text-[#475569] font-medium">Prioritized queue</span>
            <span className="flex items-center gap-1 font-bold text-[#C2410C]">
              <span className="w-2 h-2 rounded-full bg-sunset-peach animate-ping"></span>
              Live Triaging
            </span>
          </div>
        </div>

        {/* Card 2: Investigating */}
        <div className="p-6 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between relative overflow-hidden group border border-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#475569] uppercase tracking-wider block">
                Investigating
              </span>
              <span className="text-3xl font-black text-[#17233B] mt-1 block">
                {investigatingCount}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-powder-blue/40 text-[#17233B] border border-powder-blue/60 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">psychology</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
            <span className="text-[#475569] font-medium">Causal trees active</span>
            <span className="font-bold text-[#1D4ED8]">DeepForensics</span>
          </div>
        </div>

        {/* Card 3: Pending Approval */}
        <div className="p-6 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between relative overflow-hidden group border border-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#475569] uppercase tracking-wider block">
                Pending Approval
              </span>
              <span className="text-3xl font-black text-[#17233B] mt-1 block">
                {pendingCount}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-soft-lavender text-[#17233B] flex items-center justify-center shadow-xs border border-[#CBD5E1]">
              <span className="material-symbols-outlined text-[24px]">gavel</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
            <span className="text-[#475569] font-medium">Human Gate sign-off</span>
            <button
              onClick={() => onNavigateTab('patch-review')}
              className="font-bold text-[#17233B] hover:underline"
            >
              Inspect &rarr;
            </button>
          </div>
        </div>

        {/* Card 4: Verified Recoveries */}
        <div className="p-6 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between relative overflow-hidden group border border-white">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-bold text-[#475569] uppercase tracking-wider block">
                Verified Recoveries
              </span>
              <span className="text-3xl font-black text-[#17233B] mt-1 block">
                {recoveredCount}
              </span>
            </div>
            <div className="w-11 h-11 rounded-2xl bg-emerald-100 text-emerald-900 border border-emerald-300 flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[24px]">verified</span>
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-xs">
            <span className="text-[#475569] font-medium">0 Regressions</span>
            <span className="font-bold text-emerald-800">100% Suites Passed</span>
          </div>
        </div>
      </div>

      {/* SECTION 3: MULTI-AGENT SWARM SECTION (Section 3.E of new_design.md) */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between px-1">
          <div>
            <h2 className="text-lg font-extrabold text-[#17233B]">Autonomous Multi-Agent Fleet</h2>
            <p className="text-xs text-[#475569] font-medium">Four specialized intelligent agents collaborating on continuous reliability.</p>
          </div>
          <button
            onClick={() => onNavigateTab('agents')}
            className="text-xs font-bold text-[#17233B] hover:underline flex items-center gap-1"
          >
            <span>View Fleet Telemetry</span>
            <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
          {/* Agent 1: Observer */}
          {(() => {
            const agent = fleetAgents.find(a => a.id === 'observer' || a.name?.toLowerCase().includes('observer'));
            const st = (agent?.status || 'active').toLowerCase();
            const badgeClass =
              st === 'failed' ? 'bg-rose-100 text-rose-900 border-rose-300' :
              st === 'running' ? 'bg-powder-blue/40 text-[#17233B] border-powder-blue/60 animate-pulse' :
              st === 'idle' ? 'bg-slate-100 text-slate-700 border-slate-300' :
              'bg-emerald-100 text-emerald-900 border-emerald-300';
            return (
              <div className="p-6 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between border border-white">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-powder-blue/40 text-[#17233B] flex items-center justify-center border border-powder-blue/60 shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">visibility</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass} uppercase`}>
                      {agent?.status || 'LIVE'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#17233B]">{agent?.name || 'Observer Agent'}</h3>
                  <p className="text-xs text-[#334155] font-medium mt-1.5 leading-relaxed line-clamp-2">
                    {agent?.last_activity || agent?.description || 'Detects anomalies and aggregates distributed trace metrics in real-time.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono text-[#1E293B] font-semibold">
                  <span>{agent?.status_text || 'Telemetry: 1.4k ev/s'}</span>
                  <span>{agent?.evidence_count !== undefined ? `${agent.evidence_count} evidence` : 'Live'}</span>
                </div>
              </div>
            );
          })()}

          {/* Agent 2: Investigator */}
          {(() => {
            const agent = fleetAgents.find(a => a.id === 'investigator' || a.name?.toLowerCase().includes('investigator'));
            const st = (agent?.status || 'evaluating').toLowerCase();
            const badgeClass =
              st === 'failed' ? 'bg-rose-100 text-rose-900 border-rose-300' :
              st === 'running' ? 'bg-sunset-peach/40 text-[#17233B] border-sunset-peach/60 animate-pulse' :
              st === 'idle' ? 'bg-slate-100 text-slate-700 border-slate-300' :
              'bg-sunset-peach/30 text-[#17233B] border-sunset-peach/50';
            return (
              <div className="p-6 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between border border-white">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-sunset-peach/40 text-[#17233B] flex items-center justify-center border border-sunset-peach/60 shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">manage_search</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass} uppercase`}>
                      {agent?.status || 'ACTIVE'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#17233B]">{agent?.name || 'Investigator Agent'}</h3>
                  <p className="text-xs text-[#334155] font-medium mt-1.5 leading-relaxed line-clamp-2">
                    {agent?.root_cause || agent?.last_activity || agent?.description || 'Analyzes evidence, correlates commits with git blame, and constructs causal failure trees.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono text-[#1E293B] font-semibold">
                  <span>{agent?.status_text || 'Root Cause Isolated'}</span>
                  <span>{agent?.confidence ? `${agent.confidence}% conf` : 'AST Diffs'}</span>
                </div>
              </div>
            );
          })()}

          {/* Agent 3: Repair */}
          {(() => {
            const agent = fleetAgents.find(a => a.id === 'repair' || a.name?.toLowerCase().includes('repair'));
            const st = (agent?.status || 'active').toLowerCase();
            const badgeClass =
              st === 'failed' ? 'bg-rose-100 text-rose-900 border-rose-300' :
              st === 'running' ? 'bg-powder-blue/40 text-[#17233B] border-powder-blue/60 animate-pulse' :
              st === 'idle' ? 'bg-slate-100 text-slate-700 border-slate-300' :
              'bg-powder-blue/40 text-[#17233B] border-powder-blue/60';
            return (
              <div className="p-6 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between border border-white">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-powder-blue/40 text-[#17233B] flex items-center justify-center border border-powder-blue/60 shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">healing</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass} uppercase`}>
                      {agent?.status || 'READY'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#17233B]">{agent?.name || 'Repair Agent'}</h3>
                  <p className="text-xs text-[#334155] font-medium mt-1.5 leading-relaxed line-clamp-2">
                    {agent?.last_activity || agent?.description || 'Synthesizes minimal defensive AST patches adhering strictly to language invariants.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono text-[#1E293B] font-semibold">
                  <span>{agent?.status_text || 'Diff Engine v2'}</span>
                  <span>{agent?.proposed_patch_id || 'Patch Ready'}</span>
                </div>
              </div>
            );
          })()}

          {/* Agent 4: Verifier */}
          {(() => {
            const agent = fleetAgents.find(a => a.id === 'verifier' || a.name?.toLowerCase().includes('verifier'));
            const st = (agent?.status || 'completed').toLowerCase();
            const badgeClass =
              st === 'failed' ? 'bg-rose-100 text-rose-900 border-rose-300' :
              st === 'running' ? 'bg-emerald-100 text-emerald-900 border-emerald-300 animate-pulse' :
              st === 'idle' ? 'bg-slate-100 text-slate-700 border-slate-300' :
              'bg-emerald-100 text-emerald-900 border-emerald-300';
            return (
              <div className="p-6 rounded-3xl glass-panel glass-panel-hover flex flex-col justify-between border border-white">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="w-10 h-10 rounded-2xl bg-soft-lavender text-[#17233B] flex items-center justify-center border border-[#CBD5E1] shadow-xs">
                      <span className="material-symbols-outlined text-[20px]">science</span>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass} uppercase`}>
                      {agent?.status || 'READY'}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-[#17233B]">{agent?.name || 'Verifier Agent'}</h3>
                  <p className="text-xs text-[#334155] font-medium mt-1.5 leading-relaxed line-clamp-2">
                    {agent?.verification_result || agent?.last_activity || agent?.description || 'Runs independent regression and synthetic edge suites inside isolated testcontainers.'}
                  </p>
                </div>
                <div className="mt-4 pt-3 border-t border-[#E2E8F0] flex items-center justify-between text-[11px] font-mono text-[#1E293B] font-semibold">
                  <span>{agent?.status_text || 'Docker Rootless'}</span>
                  <span>{agent?.tests_passed !== undefined ? `${agent.tests_passed} passed` : '0 Regress'}</span>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* SECTION 4: TELEMETRY TREND CHART & INCIDENTS (Section 3.F of new_design.md) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Telemetry Trend & Severity Bar (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div className="p-6 sm:p-7 rounded-3xl glass-panel flex flex-col gap-5 border border-white">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-black text-base text-[#17233B]">Autonomous Healing Invariant</h3>
                <p className="text-xs text-[#475569] font-medium">Comparing real-time ingress alert spikes vs verified recoveries.</p>
              </div>
              <div className="flex items-center gap-3 text-xs font-mono font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-sunset-peach"></span>
                  <span className="text-[#C2410C]">Ingress</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-powder-blue"></span>
                  <span className="text-[#1D4ED8]">Auto-Healed</span>
                </div>
              </div>
            </div>

            {/* SVG Trend Chart */}
            <div className="w-full h-56 relative bg-white/70 rounded-2xl border border-white p-2 flex items-center justify-center overflow-hidden">
              <svg className="w-full h-full overflow-visible" preserveAspectRatio="none" viewBox="0 0 760 220">
                <defs>
                  <linearGradient id="ingressGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#F5B69E" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#F5B69E" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="healedGrad" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="#8DB9F0" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#8DB9F0" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                <line stroke="rgba(71, 85, 105, 0.2)" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="740" y1="30" y2="30" />
                <line stroke="rgba(71, 85, 105, 0.2)" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="740" y1="80" y2="80" />
                <line stroke="rgba(71, 85, 105, 0.2)" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="740" y1="130" y2="130" />
                <line stroke="rgba(71, 85, 105, 0.2)" strokeDasharray="3,3" strokeWidth="1" x1="40" x2="740" y1="180" y2="180" />

                <path d="M 50 150 Q 120 130 180 80 T 320 60 T 450 110 T 580 40 T 730 90 L 730 190 L 50 190 Z" fill="url(#ingressGrad)" />
                <path d="M 50 150 Q 120 130 180 80 T 320 60 T 450 110 T 580 40 T 730 90" fill="none" stroke="#F5B69E" strokeLinecap="round" strokeWidth="3" />

                <path d="M 50 165 Q 120 155 180 100 T 320 70 T 450 120 T 580 48 T 730 95 L 730 190 L 50 190 Z" fill="url(#healedGrad)" />
                <path d="M 50 165 Q 120 155 180 100 T 320 70 T 450 120 T 580 48 T 730 95" fill="none" stroke="#8DB9F0" strokeLinecap="round" strokeWidth="3" />

                <circle cx="180" cy="100" fill="#FFFFFF" r="5" stroke="#2563EB" strokeWidth="3" />
                <circle cx="320" cy="70" fill="#FFFFFF" r="5" stroke="#2563EB" strokeWidth="3" />
                <circle cx="450" cy="120" fill="#FFFFFF" r="5" stroke="#2563EB" strokeWidth="3" />
                <circle cx="580" cy="48" fill="#2563EB" r="6" stroke="#FFFFFF" strokeWidth="2.5" />
                <circle cx="730" cy="95" fill="#FFFFFF" r="5" stroke="#2563EB" strokeWidth="3" />

                <rect fill="#17233B" height="26" rx="13" width="150" x="505" y="6" />
                <text fill="#FFFFFF" fontFamily="Inter" fontSize="11" fontWeight="700" textAnchor="middle" x="580" y="23">98% Verified Auto-Heal</text>
              </svg>
            </div>

            {/* Severity Distribution */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#E2E8F0]">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-[#17233B]">Severity Breakdown</span>
                <span className="font-mono font-bold text-[#475569] text-[11px]">{incidents.length} total monitored</span>
              </div>
              <div className="h-3.5 w-full rounded-full bg-slate-200 overflow-hidden flex shadow-inner">
                <div className="bg-rose-500 h-full" style={{ width: '25%' }} title="Critical" />
                <div className="bg-sunset-peach h-full" style={{ width: '35%' }} title="High" />
                <div className="bg-powder-blue h-full" style={{ width: '25%' }} title="Medium" />
                <div className="bg-slate-400 h-full" style={{ width: '15%' }} title="Low" />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Recent Incidents Cards (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="font-black text-base text-[#17233B]">Recent Incidents</h3>
            <button
              onClick={() => onNavigateTab('incidents')}
              className="text-xs font-bold text-[#17233B] hover:underline"
            >
              Console &rarr;
            </button>
          </div>

          <div className="space-y-3">
            {safeIncidents.length === 0 ? (
              <div className="p-6 rounded-3xl glass-panel text-center border border-white">
                <span className="material-symbols-outlined text-3xl text-emerald-600 mb-1">verified</span>
                <p className="text-xs font-bold text-[#17233B]">Zero Active Incidents</p>
                <p className="text-[11px] text-[#475569] mt-0.5">All monitored microservices are healthy.</p>
              </div>
            ) : (
              safeIncidents.slice(0, 4).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => onSelectIncident(inc)}
                  className="p-4 rounded-3xl glass-panel glass-panel-hover cursor-pointer flex flex-col gap-2 group border border-white"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-[#17233B]">{inc.id}</span>
                      <SeverityBadge severity={inc.severity} short />
                    </div>
                    <StatusBadge status={inc.status} />
                  </div>

                  <div className="text-xs font-bold text-[#17233B] line-clamp-1 group-hover:text-[#17233B]/80">
                    {inc.title}
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#334155] font-semibold pt-2 border-t border-[#E2E8F0]">
                    <span className="truncate max-w-[160px]">{inc.application}</span>
                    <span className="flex items-center gap-1 font-sans font-bold text-[#17233B] group-hover:translate-x-0.5 transition-transform">
                      <span>Investigate</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
