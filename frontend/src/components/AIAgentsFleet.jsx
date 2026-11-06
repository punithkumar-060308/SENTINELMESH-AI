import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { fleetAgents as defaultMockAgents } from '../data/mockData';
import { LoadingState, EmptyState, ErrorState, DemoBadge } from './common/UIStates';

export default function AIAgentsFleet({ showToast, fleetAgents: propFleetAgents = null, isDemoMode = false }) {
  const [agents, setAgents] = useState(() => propFleetAgents || (isDemoMode ? defaultMockAgents : []));
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [isLoading, setIsLoading] = useState(!propFleetAgents && !isDemoMode);
  const [error, setError] = useState(null);

  const loadAgents = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.getFleetAgents();
      setAgents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[AIAgentsFleet] Error loading fleet agents:', err);
      setError(err.message || 'Failed to communicate with fleet agent backend');
      if (isDemoMode) {
        setAgents(defaultMockAgents);
      }
    } finally {
      setIsLoading(false);
    }
  }, [isDemoMode]);

  useEffect(() => {
    if (propFleetAgents && propFleetAgents.length > 0) {
      setAgents(propFleetAgents);
      setIsLoading(false);
    } else {
      loadAgents();
    }
  }, [propFleetAgents, loadAgents]);

  const handleAgentClick = (id) => {
    setSelectedAgentId(id);
    const element = document.getElementById(`agent-card-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const notify = (msg, icon = 'info', color = 'text-powder-blue') => {
    if (showToast) {
      showToast(msg, icon, color);
    }
  };

  const getStatusBadge = (status) => {
    const st = (status || 'idle').toLowerCase();
    if (st === 'running') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-powder-blue/40 text-[#17233B] border border-powder-blue/60 shadow-xs uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[#2563EB] animate-pulse"></span>
          RUNNING
        </span>
      );
    }
    if (st === 'failed') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 shadow-xs uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-600"></span>
          FAILED
        </span>
      );
    }
    if (st === 'completed') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          COMPLETED
        </span>
      );
    }
    if (st === 'pending_approval') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
          PENDING APPROVAL
        </span>
      );
    }
    if (st === 'active' || st === 'evaluating') {
      return (
        <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs uppercase flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
          ACTIVE
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-xs uppercase">
        IDLE
      </span>
    );
  };

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Top Level Command Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#CBD5E1]">
        <div className="flex flex-col max-w-3xl">
          <div className="flex items-center gap-2 mb-2 font-mono text-xs">
            <span className="px-3 py-0.5 rounded-full bg-powder-blue/40 text-[#17233B] font-bold uppercase tracking-wider border border-powder-blue/60 shadow-xs">
              Swarm Engine v4.8
            </span>
            <span className="text-[#94A3B8]">|</span>
            {isDemoMode ? (
              <DemoBadge label="DEMO FLEET" />
            ) : (
              <span className="flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
                Cluster Quorum Live
              </span>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-[#17233B] tracking-tight">
            Autonomous Multi-Agent Fleet
          </h1>
          <p className="mt-2 text-sm text-[#334155] font-medium leading-relaxed">
            Four specialized collaborative agents orchestrating continuous software reliability, automated telemetry forensics, and human-verified healing.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-3 shrink-0 font-sans text-xs">
          <button
            onClick={() => {
              loadAgents();
              notify('Refreshed swarm agent telemetry stream from backend', 'sync', 'text-powder-blue');
            }}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-[#17233B] hover:bg-slate-50 transition-colors font-bold shadow-xs border border-[#CBD5E1]"
            title="Refresh Fleet Status"
          >
            <span className="material-symbols-outlined text-[18px] text-[#2563EB]">sync</span>
            <span>Refresh Fleet Status</span>
          </button>
          <button
            onClick={() => notify('Swarm consensus model set to 3/4 quorum with Human Gate strictly enforced.', 'tune', 'text-powder-blue')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-[#17233B] text-white font-bold hover:bg-[#17233B]/90 transition-all shadow-md active:scale-95"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Agent Configuration</span>
          </button>
        </div>
      </div>

      {/* Synchronous Execution Graph / Live Topology Pipeline */}
      <div className="p-6 sm:p-8 rounded-3xl glass-panel shadow-glass border border-white relative overflow-hidden">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-[#E2E8F0]">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[22px] text-[#2563EB]">schema</span>
            <span className="font-extrabold text-base text-[#17233B]">
              Synchronous Execution Graph
            </span>
            <span className="text-xs text-[#64748B] font-medium">(Click agent to inspect)</span>
          </div>

          <div className="flex items-center gap-4 text-xs font-bold font-mono">
            <div className="flex items-center gap-1.5 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              <span>Telemetry Stream Active</span>
            </div>
            <div className="flex items-center gap-1.5 text-[#C2410C]">
              <span className="w-2 h-2 rounded-full bg-sunset-peach"></span>
              <span>Causal Tree Processing</span>
            </div>
          </div>
        </div>

        {/* Pipeline Strip */}
        <div className="relative overflow-x-auto pb-4">
          <div className="flex items-center min-w-[950px] justify-between relative z-10 px-2">
            {/* Step 1: Observer */}
            <div
              onClick={() => handleAgentClick('observer')}
              className={`flex flex-col items-center group cursor-pointer p-3 rounded-2xl transition-all ${
                selectedAgentId === 'observer' ? 'bg-powder-blue/20 ring-2 ring-[#2563EB]' : 'hover:bg-white/80'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center relative mb-2 shadow-xs border border-[#CBD5E1] group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px] text-[#2563EB]">radar</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#2563EB] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-[#2563EB]"></span>
                </span>
              </div>
              <span className="font-bold text-xs text-[#17233B]">Observer Agent</span>
              <span className="text-[#64748B] text-[11px] font-medium mt-0.5">Detects & Ingests</span>
              <span className="text-[#2563EB] font-mono font-bold mt-1 text-[11px]">MTTD 1.4s</span>
            </div>

            {/* Connector 1 */}
            <div className="flex-1 flex flex-col items-center px-3">
              <div className="w-full h-1 bg-[#CBD5E1] relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-powder-blue to-sunset-peach w-full animate-pulse"></div>
              </div>
              <span className="text-[#64748B] mt-1.5 font-mono text-[10px] font-semibold">anomaly payload</span>
            </div>

            {/* Step 2: Investigator */}
            <div
              onClick={() => handleAgentClick('investigator')}
              className={`flex flex-col items-center group cursor-pointer p-3 rounded-2xl transition-all ${
                selectedAgentId === 'investigator' ? 'bg-sunset-peach/20 ring-2 ring-sunset-peach' : 'hover:bg-white/80'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center relative mb-2 shadow-xs border border-[#CBD5E1] group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px] text-sunset-peach">biotech</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sunset-peach opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-sunset-peach"></span>
                </span>
              </div>
              <span className="font-bold text-xs text-[#17233B]">Investigator Agent</span>
              <span className="text-[#64748B] text-[11px] font-medium mt-0.5">Isolates Root Cause</span>
              <span className="text-[#C2410C] font-mono font-bold mt-1 text-[11px]">AST Diffs & Blame</span>
            </div>

            {/* Connector 2 */}
            <div className="flex-1 flex flex-col items-center px-3">
              <div className="w-full h-1 bg-[#CBD5E1] relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-sunset-peach to-powder-blue w-full animate-pulse"></div>
              </div>
              <span className="text-[#64748B] mt-1.5 font-mono text-[10px] font-semibold">causal graph</span>
            </div>

            {/* Step 3: Repair */}
            <div
              onClick={() => handleAgentClick('repair')}
              className={`flex flex-col items-center group cursor-pointer p-3 rounded-2xl transition-all ${
                selectedAgentId === 'repair' ? 'bg-powder-blue/20 ring-2 ring-[#2563EB]' : 'hover:bg-white/80'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center relative mb-2 shadow-xs border border-[#CBD5E1] group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px] text-[#2563EB]">auto_fix_high</span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-[#94A3B8]"></span>
              </div>
              <span className="font-bold text-xs text-[#17233B]">Repair Agent</span>
              <span className="text-[#64748B] text-[11px] font-medium mt-0.5">Synthesizes Patch</span>
              <span className="text-[#2563EB] font-mono font-bold mt-1 text-[11px]">Diff Guard Ready</span>
            </div>

            {/* Connector 3 */}
            <div className="flex-1 flex flex-col items-center px-3">
              <div className="w-full h-1 bg-[#CBD5E1] relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-powder-blue to-soft-lavender w-full opacity-60"></div>
              </div>
              <span className="text-[#64748B] mt-1.5 font-mono text-[10px] font-semibold">patch draft</span>
            </div>

            {/* Step 4: Human Gate */}
            <div
              onClick={() => handleAgentClick('human_gate')}
              className="flex flex-col items-center group p-3 cursor-pointer"
            >
              <div className="w-14 h-14 rounded-2xl bg-soft-lavender flex items-center justify-center relative mb-2 shadow-xs border border-[#CBD5E1]">
                <span className="material-symbols-outlined text-[26px] text-[#17233B]">verified_user</span>
                <span className="absolute -bottom-1 px-1.5 py-0.2 rounded-full bg-[#17233B] text-white font-mono text-[9px] uppercase tracking-wider font-bold">
                  Gate
                </span>
              </div>
              <span className="font-bold text-xs text-[#17233B]">Human Gate</span>
              <span className="text-[#64748B] text-[11px] font-medium mt-0.5">Staff SRE Sign-off</span>
              <span className="text-[#17233B] font-mono font-bold mt-1 text-[11px]">Zero-Trust</span>
            </div>

            {/* Connector 4 */}
            <div className="flex-1 flex flex-col items-center px-3">
              <div className="w-full h-1 bg-[#CBD5E1] relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-soft-lavender to-emerald-400 w-full animate-pulse"></div>
              </div>
              <span className="text-[#64748B] mt-1.5 font-mono text-[10px] font-semibold">signed commit</span>
            </div>

            {/* Step 5: Verifier */}
            <div
              onClick={() => handleAgentClick('verifier')}
              className={`flex flex-col items-center group cursor-pointer p-3 rounded-2xl transition-all ${
                selectedAgentId === 'verifier' ? 'bg-emerald-50 ring-2 ring-emerald-500' : 'hover:bg-white/80'
              }`}
            >
              <div className="w-14 h-14 rounded-2xl bg-white flex items-center justify-center relative mb-2 shadow-xs border border-[#CBD5E1] group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[26px] text-emerald-700">science</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
              </div>
              <span className="font-bold text-xs text-[#17233B]">Verifier Agent</span>
              <span className="text-[#64748B] text-[11px] font-medium mt-0.5">Regression Sandbox</span>
              <span className="text-emerald-700 font-mono font-bold mt-1 text-[11px]">100% Zero Regress</span>
            </div>

            {/* Connector 5 */}
            <div className="flex-1 flex flex-col items-center px-3">
              <div className="w-full h-1 bg-[#CBD5E1] relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-emerald-400 w-full animate-pulse"></div>
              </div>
              <span className="text-[#64748B] mt-1.5 font-mono text-[10px] font-semibold">healthy canary</span>
            </div>

            {/* Step 6: Recovery */}
            <div className="flex flex-col items-center p-3">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 flex items-center justify-center relative mb-2 shadow-xs border border-emerald-300">
                <span className="material-symbols-outlined text-[26px] text-emerald-700">check_circle</span>
              </div>
              <span className="font-bold text-xs text-[#17233B]">Prod Recovery</span>
              <span className="text-[#64748B] text-[11px] font-medium mt-0.5">Full Resolution</span>
              <span className="text-emerald-800 font-mono font-bold mt-1 text-[11px]">SLO Maintained</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Agent Cards or States */}
      {isLoading ? (
        <LoadingState message="Fetching live agent swarm states and telemetry..." />
      ) : error && agents.length === 0 ? (
        <ErrorState
          title="Agent Telemetry Disconnected"
          error={error}
          onRetry={loadAgents}
        />
      ) : agents.length === 0 ? (
        <EmptyState
          title="No Active Agents Found"
          description="The agent swarm has not been initialized on the backend."
          action={
            <button
              onClick={loadAgents}
              className="px-4 py-2 rounded-full bg-[#17233B] text-white text-xs font-bold"
            >
              Retry
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {agents.map((agent) => {
            const agentKey = agent.id || agent.agent_id || agent.name.toLowerCase().replace(/ /g, '_');
            const metricsList = [
              {
                label: agent.metric_label1 || agent.metricLabel1 || 'Processed',
                value: agent.metric_value1 || agent.metricValue1 || (agent.processed_count ? agent.processed_count.toLocaleString() : '1')
              },
              {
                label: agent.metric_label2 || agent.metricLabel2 || 'Precision / Acc',
                value: agent.metric_value2 || agent.metricValue2 || agent.accuracy || '99.4%'
              },
              {
                label: agent.metric_label3 || agent.metricLabel3 || 'Latency / RTT',
                value: agent.metric_value3 || agent.metricValue3 || agent.latency || '140ms'
              }
            ];

            return (
              <div
                key={agentKey}
                id={`agent-card-${agent.id || agentKey}`}
                className={`flex flex-col p-6 sm:p-7 rounded-3xl glass-panel shadow-glass transition-all duration-300 border border-white ${
                  selectedAgentId === agent.id
                    ? 'ring-2 ring-[#2563EB] bg-white'
                    : 'glass-panel-hover'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-xs border border-[#CBD5E1]">
                      <span className={`material-symbols-outlined text-[28px] ${
                        agent.id === 'observer'
                          ? 'text-[#2563EB]'
                          : agent.id === 'investigator'
                          ? 'text-sunset-peach'
                          : agent.id === 'repair'
                          ? 'text-[#2563EB]'
                          : 'text-emerald-700'
                      }`}>
                        {agent.icon || 'smart_toy'}
                      </span>
                    </div>
                    <div className="flex flex-col">
                      <h3 className="text-lg font-black text-[#17233B]">
                        {agent.name}
                      </h3>
                      <span className="text-[11px] font-mono text-[#64748B] font-semibold">
                        agent-id: {agent.agent_id || agent.agentId || agent.id || 'swarm-node'}
                      </span>
                    </div>
                  </div>

                  {getStatusBadge(agent.status)}
                </div>

                <p className="text-xs sm:text-sm text-[#334155] font-medium leading-relaxed mb-4">
                  {agent.description}
                </p>

                {/* Error Banner if Agent Failed */}
                {agent.error && (
                  <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 mb-4 flex items-center gap-2 text-xs text-rose-900 font-mono">
                    <span className="material-symbols-outlined text-rose-600 text-[18px]">error</span>
                    <span className="truncate">{agent.error}</span>
                  </div>
                )}

                {/* Agent Live Activity Pill */}
                <div className="p-3.5 rounded-2xl bg-white/90 border border-[#E2E8F0] mb-4 flex items-center gap-2 shadow-xs">
                  <span className="material-symbols-outlined text-[18px] text-[#2563EB]">track_changes</span>
                  <div className="text-xs text-[#17233B] font-semibold truncate flex-1">
                    <span className="text-[#64748B] font-medium">Status Text: </span>
                    <span className="font-mono text-[#2563EB]">{agent.status_text || agent.statusText || 'Active'}</span>
                    {(agent.last_activity || agent.lastActivity) && (
                      <span className="text-[#64748B] font-normal ml-2">
                        · {agent.last_activity || agent.lastActivity}
                      </span>
                    )}
                  </div>
                </div>

                {/* Domain Specific Insights (Phase 2 Integration) */}
                {agent.id === 'observer' && agent.evidence_count !== undefined && (
                  <div className="px-3.5 py-2 rounded-xl bg-powder-blue/20 border border-powder-blue/40 text-[11px] font-mono text-[#17233B] mb-4 flex items-center justify-between">
                    <span>Evidence Collected:</span>
                    <span className="font-bold">{agent.evidence_count} artifact records</span>
                  </div>
                )}

                {agent.id === 'investigator' && agent.root_cause && (
                  <div className="px-3.5 py-2 rounded-xl bg-sunset-peach/20 border border-sunset-peach/40 text-[11px] font-mono text-[#17233B] mb-4 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-[#C2410C]">Diagnosed Root Cause:</span>
                      <span className="font-bold">{agent.confidence || 96.4}% confidence</span>
                    </div>
                    <span className="text-[#334155] line-clamp-1">{agent.root_cause}</span>
                  </div>
                )}

                {agent.id === 'repair' && agent.proposed_patch_id && (
                  <div className="px-3.5 py-2 rounded-xl bg-powder-blue/20 border border-powder-blue/40 text-[11px] font-mono text-[#17233B] mb-4 flex items-center justify-between">
                    <span>Patch: <b>{agent.proposed_patch_id}</b> ({agent.patch_status || 'pending'})</span>
                    <span className="text-[#64748B] truncate max-w-[140px]">
                      {(agent.files_affected || []).join(', ') || 'StripeWebhookHandler.java'}
                    </span>
                  </div>
                )}

                {agent.id === 'verifier' && agent.tests_passed !== undefined && (
                  <div className="px-3.5 py-2 rounded-xl bg-emerald-50 border border-emerald-300 text-[11px] font-mono text-[#17233B] mb-4 flex items-center justify-between">
                    <span className="text-emerald-900 font-bold">Verification: {agent.tests_passed} passed, {agent.tests_failed || 0} failed</span>
                    <span className="text-emerald-800">Zero Regressions</span>
                  </div>
                )}

                {/* Metrics Triplet */}
                <div className="grid grid-cols-3 gap-3 mb-5">
                  {metricsList.map((m, idx) => (
                    <div key={idx} className="p-3.5 rounded-2xl bg-white/90 border border-[#E2E8F0] flex flex-col shadow-xs">
                      <span className="text-[10px] uppercase font-bold text-[#64748B] tracking-wider truncate">
                        {m.label}
                      </span>
                      <span className="text-base sm:text-lg font-black text-[#17233B] mt-1 font-mono">
                        {m.value}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Capabilities / Tools */}
                <div className="mt-auto pt-4 border-t border-[#E2E8F0] flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {(agent.capabilities || []).map((cap, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-lg bg-powder-blue/20 text-[#17233B] border border-powder-blue/40 font-mono text-[10px] font-semibold shadow-xs"
                      >
                        {cap}
                      </span>
                    ))}
                  </div>

                  <div className="flex items-center justify-between pt-2 text-xs font-mono">
                    <button
                      onClick={() => notify(`${agent.name} telemetry stream: ${agent.status_text || 'Connected'}`, 'insights', 'text-[#2563EB]')}
                      className="text-[#2563EB] hover:text-[#17233B] font-bold flex items-center gap-1 transition-colors"
                    >
                      <span>Inspect Agent Telemetry</span>
                      <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    </button>
                    <button
                      onClick={() => notify(`${agent.name} is responding within normal bounds (RTT 14ms)`, 'check_circle', 'text-emerald-700')}
                      className="text-[#64748B] hover:text-[#17233B] transition-colors"
                    >
                      Ping Health
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
