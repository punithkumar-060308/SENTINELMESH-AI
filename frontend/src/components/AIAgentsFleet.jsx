import React, { useState } from 'react';
import { fleetAgents } from '../data/mockData';

export default function AIAgentsFleet({ showToast }) {
  const [selectedAgentId, setSelectedAgentId] = useState(null);

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
            <span className="flex items-center gap-1.5 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping"></span>
              Cluster Quorum Healthy
            </span>
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
            onClick={() => notify('Fleet Telemetry: 14 services healthy, Kafka latency 12ms', 'insights', 'text-powder-blue')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-full bg-white text-[#17233B] hover:bg-slate-50 transition-colors font-bold shadow-xs border border-[#CBD5E1]"
          >
            <span className="material-symbols-outlined text-[18px] text-[#2563EB]">insights</span>
            <span>Fleet Telemetry Status</span>
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
              <span className="text-[#2563EB] font-mono font-bold mt-1 text-[11px]">PR #1042 ready</span>
            </div>

            {/* Connector 3 */}
            <div className="flex-1 flex flex-col items-center px-3">
              <div className="w-full h-1 bg-[#CBD5E1] relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-powder-blue to-soft-lavender w-full opacity-60"></div>
              </div>
              <span className="text-[#64748B] mt-1.5 font-mono text-[10px] font-semibold">patch draft</span>
            </div>

            {/* Step 4: Human Gate */}
            <div className="flex flex-col items-center group p-3">
              <div className="w-14 h-14 rounded-2xl bg-soft-lavender flex items-center justify-center relative mb-2 shadow-xs border border-[#CBD5E1]">
                <span className="material-symbols-outlined text-[26px] text-[#17233B]">verified_user</span>
                <span className="absolute -bottom-1 px-1.5 py-0.2 rounded-full bg-[#17233B] text-white font-mono text-[9px] uppercase tracking-wider font-bold">
                  Gate
                </span>
              </div>
              <span className="font-bold text-xs text-[#17233B]">Human Gate</span>
              <span className="text-[#64748B] text-[11px] font-medium mt-0.5">Staff SRE Sign-off</span>
              <span className="text-[#17233B] font-mono font-bold mt-1 text-[11px]">Elena Vance</span>
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

      {/* Four Specialized Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {(fleetAgents || []).map((agent) => {
          const metricsList = [
            {
              label: agent.metricLabel1 || 'Tasks Completed',
              value: agent.metricValue1 || (agent.tasksCompleted ? agent.tasksCompleted.toLocaleString() : '1,429')
            },
            {
              label: agent.metricLabel2 || 'Precision',
              value: agent.metricValue2 || agent.accuracy || '99.4%'
            },
            {
              label: agent.metricLabel3 || 'MTTD / Latency',
              value: agent.metricValue3 || agent.latency || '1.4s'
            }
          ];

          return (
            <div
              key={agent.id}
              id={`agent-card-${agent.id}`}
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
                      agent-id: {agent.agentId || agent.id}
                    </span>
                  </div>
                </div>

                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-white text-[#17233B] border border-[#CBD5E1] shadow-xs uppercase">
                  {agent.status || 'RUNNING'}
                </span>
              </div>

              <p className="text-xs sm:text-sm text-[#334155] font-medium leading-relaxed mb-5">
                {agent.description}
              </p>

              {/* Agent Live Activity Pill */}
              <div className="p-3.5 rounded-2xl bg-white/90 border border-[#E2E8F0] mb-5 flex items-center gap-2 shadow-xs">
                <span className="material-symbols-outlined text-[18px] text-[#2563EB]">track_changes</span>
                <div className="text-xs text-[#17233B] font-semibold truncate">
                  <span className="text-[#64748B] font-medium">Last Activity: </span>
                  {agent.lastActivity || 'Active monitoring queue'}
                </div>
              </div>

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
                    onClick={() => notify(`${agent.name} telemetry stream: ${agent.streamRate || '42.8k events/s'}`, 'insights', 'text-[#2563EB]')}
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
    </div>
  );
}