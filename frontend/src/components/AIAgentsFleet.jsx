import React, { useState } from 'react';
import { fleetAgents } from '../data/mockData';

export default function AIAgentsFleet({ showToast }) {
  const [selectedAgentId, setSelectedAgentId] = useState(null);
  const [inspectAgent, setInspectAgent] = useState(null);

  const handleAgentClick = (id) => {
    setSelectedAgentId(id);
    const element = document.getElementById(`agent-card-${id}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  return (
    <div className="flex flex-col w-full">
      {/* Top Level Command Header */}
      <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-space-lg mb-space-lg pb-space-md border-b border-surface-container-high/40">
        <div className="flex flex-col gap-space-xs max-w-3xl">
          <div className="flex items-center gap-space-sm mb-space-xs font-mono text-xs">
            <span className="px-space-xs py-0.5 rounded bg-primary-container/20 text-primary font-label-sm text-label-sm uppercase tracking-wider border border-primary/20">
              Swarm Engine v4.8
            </span>
            <span className="text-outline-variant font-label-sm text-label-sm">|</span>
            <span className="flex items-center gap-1.5 font-label-sm text-label-sm text-tertiary">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-ping"></span>
              Cluster Quorum Healthy
            </span>
          </div>
          <h1 className="font-headline-xl text-headline-xl text-on-surface tracking-tight font-bold">
            Autonomous Multi-Agent Fleet
          </h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant leading-relaxed text-sm">
            Four specialized collaborative agents orchestrating continuous software reliability, automated telemetry forensics, and human-verified healing.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-space-sm flex-shrink-0 font-mono text-xs">
          <button
            onClick={() => showToast('Fleet Telemetry: 14 services healthy, Kafka latency 12ms', 'insights', 'text-secondary')}
            className="flex items-center gap-space-xs px-space-md py-2 rounded bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors font-body-sm text-body-sm shadow-sm border border-surface-container-highest/40"
          >
            <span className="material-symbols-outlined text-[18px] text-secondary">insights</span>
            <span>Fleet Telemetry Status</span>
          </button>
          <button
            onClick={() => showToast('Swarm consensus model set to 3/4 quorum with Human Gate strictly enforced.', 'tune', 'text-primary')}
            className="flex items-center gap-space-xs px-space-md py-2 rounded bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <span className="material-symbols-outlined text-[18px]">tune</span>
            <span>Agent Configuration</span>
          </button>
        </div>
      </div>

      {/* Synchronous Execution Graph / Live Topology Pipeline */}
      <div className="mb-space-xl p-space-lg rounded-xl bg-surface-container-low shadow-sm border border-surface-container-high/40 relative overflow-hidden">
        <div className="absolute -right-20 -top-20 w-80 h-80 rounded-full bg-secondary/5 blur-3xl pointer-events-none"></div>
        <div className="absolute -left-20 -bottom-20 w-80 h-80 rounded-full bg-primary/5 blur-3xl pointer-events-none"></div>

        <div className="flex items-center justify-between mb-space-lg relative z-10 border-b border-surface-container-high/30 pb-3">
          <div className="flex items-center gap-space-sm font-mono">
            <span className="material-symbols-outlined text-[20px] text-secondary">schema</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold text-sm">
              Synchronous Execution Graph
            </span>
            <span className="font-label-sm text-label-sm text-on-surface-variant text-xs">(Click agent to inspect)</span>
          </div>

          <div className="flex items-center gap-space-md font-label-sm text-label-sm text-on-surface-variant font-mono text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-tertiary"></span>
              <span>Telemetry Stream Active</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-secondary"></span>
              <span>Causal Tree Processing</span>
            </div>
          </div>
        </div>

        {/* Pipeline Strip */}
        <div className="relative overflow-x-auto pb-space-sm pt-space-xs">
          <div className="flex items-center min-w-[1050px] justify-between relative z-10 px-space-xs">
            {/* Step 1: Observer */}
            <div
              onClick={() => handleAgentClick('observer')}
              className={`flex flex-col items-center group cursor-pointer p-2 rounded-lg transition-all ${
                selectedAgentId === 'observer' ? 'bg-surface-container ring-1 ring-tertiary' : ''
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center relative mb-space-sm transition-transform duration-200 group-hover:scale-105 shadow-sm border border-surface-container-highest/40">
                <span className="material-symbols-outlined text-[26px] text-tertiary">radar</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-tertiary"></span>
                </span>
              </div>
              <span className="font-label-md text-label-md text-on-surface font-semibold text-xs">Observer Agent</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 text-[11px]">Detects & Ingests</span>
              <span className="font-label-sm text-label-sm text-tertiary font-mono mt-1 text-[11px]">MTTD 1.4s</span>
            </div>

            {/* Connector 1 */}
            <div className="flex-1 flex flex-col items-center px-2">
              <div className="w-full h-1 bg-surface-container-high relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-tertiary via-secondary to-secondary w-full animate-pulse opacity-80"></div>
              </div>
              <span className="font-label-sm text-label-sm text-outline-variant mt-1.5 font-mono text-[10px]">anomaly payload</span>
            </div>

            {/* Step 2: Investigator */}
            <div
              onClick={() => handleAgentClick('investigator')}
              className={`flex flex-col items-center group cursor-pointer p-2 rounded-lg transition-all ${
                selectedAgentId === 'investigator' ? 'bg-surface-container ring-1 ring-secondary' : ''
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center relative mb-space-sm transition-transform duration-200 group-hover:scale-105 shadow-sm border border-surface-container-highest/40">
                <span className="material-symbols-outlined text-[26px] text-secondary">biotech</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary"></span>
                </span>
              </div>
              <span className="font-label-md text-label-md text-on-surface font-semibold text-xs">Investigator Agent</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 text-[11px]">Isolates Root Cause</span>
              <span className="font-label-sm text-label-sm text-secondary font-mono mt-1 text-[11px]">AST Diffs & Blame</span>
            </div>

            {/* Connector 2 */}
            <div className="flex-1 flex flex-col items-center px-2">
              <div className="w-full h-1 bg-surface-container-high relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary via-primary to-primary w-full animate-pulse opacity-80"></div>
              </div>
              <span className="font-label-sm text-label-sm text-outline-variant mt-1.5 font-mono text-[10px]">causal graph</span>
            </div>

            {/* Step 3: Repair */}
            <div
              onClick={() => handleAgentClick('repair')}
              className={`flex flex-col items-center group cursor-pointer p-2 rounded-lg transition-all ${
                selectedAgentId === 'repair' ? 'bg-surface-container ring-1 ring-primary' : ''
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center relative mb-space-sm transition-transform duration-200 group-hover:scale-105 shadow-sm border border-surface-container-highest/40">
                <span className="material-symbols-outlined text-[26px] text-primary">auto_fix_high</span>
                <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-outline-variant"></span>
              </div>
              <span className="font-label-md text-label-md text-on-surface font-semibold text-xs">Repair Agent</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 text-[11px]">Synthesizes Patch</span>
              <span className="font-label-sm text-label-sm text-primary font-mono mt-1 text-[11px]">PR #1042 ready</span>
            </div>

            {/* Connector 3 */}
            <div className="flex-1 flex flex-col items-center px-2">
              <div className="w-full h-1 bg-surface-container-high relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary via-outline to-outline-variant w-full opacity-60"></div>
              </div>
              <span className="font-label-sm text-label-sm text-outline-variant mt-1.5 font-mono text-[10px]">patch draft</span>
            </div>

            {/* Step 4: Human Gate */}
            <div className="flex flex-col items-center group p-2">
              <div className="w-14 h-14 rounded-xl bg-surface-container-high flex items-center justify-center relative mb-space-sm shadow-sm ring-1 ring-secondary/30 border border-secondary/20">
                <span className="material-symbols-outlined text-[26px] text-secondary">verified_user</span>
                <span className="absolute -bottom-1 px-1.5 py-0.2 rounded-full bg-secondary-container text-on-secondary font-label-sm text-[9px] uppercase tracking-wider font-bold">
                  Gate
                </span>
              </div>
              <span className="font-label-md text-label-md text-on-surface font-semibold text-xs">Human Gate</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 text-[11px]">Staff SRE Sign-off</span>
              <span className="font-label-sm text-label-sm text-secondary font-mono mt-1 text-[11px]">Elena Vance</span>
            </div>

            {/* Connector 4 */}
            <div className="flex-1 flex flex-col items-center px-2">
              <div className="w-full h-1 bg-surface-container-high relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-secondary via-primary to-primary-container w-full animate-pulse opacity-80"></div>
              </div>
              <span className="font-label-sm text-label-sm text-outline-variant mt-1.5 font-mono text-[10px]">signed commit</span>
            </div>

            {/* Step 5: Verifier */}
            <div
              onClick={() => handleAgentClick('verifier')}
              className={`flex flex-col items-center group cursor-pointer p-2 rounded-lg transition-all ${
                selectedAgentId === 'verifier' ? 'bg-surface-container ring-1 ring-tertiary' : ''
              }`}
            >
              <div className="w-14 h-14 rounded-xl bg-surface-container flex items-center justify-center relative mb-space-sm transition-transform duration-200 group-hover:scale-105 shadow-sm border border-surface-container-highest/40">
                <span className="material-symbols-outlined text-[26px] text-tertiary">science</span>
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-tertiary"></span>
                </span>
              </div>
              <span className="font-label-md text-label-md text-on-surface font-semibold text-xs">Verifier Agent</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 text-[11px]">Regression Sandbox</span>
              <span className="font-label-sm text-label-sm text-tertiary font-mono mt-1 text-[11px]">100% Zero Regress</span>
            </div>

            {/* Connector 5 */}
            <div className="flex-1 flex flex-col items-center px-2">
              <div className="w-full h-1 bg-surface-container-high relative rounded-full overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-tertiary to-tertiary w-full animate-pulse opacity-80"></div>
              </div>
              <span className="font-label-sm text-label-sm text-outline-variant mt-1.5 font-mono text-[10px]">healthy canary</span>
            </div>

            {/* Step 6: Recovery */}
            <div className="flex flex-col items-center p-2">
              <div className="w-14 h-14 rounded-xl bg-tertiary-container/20 flex items-center justify-center relative mb-space-sm shadow-sm border border-tertiary/30">
                <span className="material-symbols-outlined text-[26px] text-tertiary">check_circle</span>
              </div>
              <span className="font-label-md text-label-md text-on-surface font-semibold text-xs">Prod Recovery</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant mt-0.5 text-[11px]">Full Resolution</span>
              <span className="font-label-sm text-label-sm text-tertiary font-mono mt-1 text-[11px]">SLO Maintained</span>
            </div>
          </div>
        </div>
      </div>

      {/* Four Specialized Agent Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-lg mb-space-xl">
        {fleetAgents.map((agent) => (
          <div
            key={agent.id}
            id={`agent-card-${agent.id}`}
            className={`flex flex-col p-space-lg rounded-xl bg-surface-container-low shadow-sm transition-all duration-300 hover:bg-surface-container border ${
              selectedAgentId === agent.id
                ? 'border-primary ring-1 ring-primary/40'
                : 'border-surface-container-high/40'
            }`}
          >
            <div className="flex items-start justify-between mb-space-md">
              <div className="flex items-center gap-space-sm">
                <div className="w-12 h-12 rounded-lg bg-surface-container-high flex items-center justify-center shadow-sm border border-surface-container-highest/30">
                  <span className={`material-symbols-outlined text-[28px] ${
                    agent.id === 'observer'
                      ? 'text-tertiary'
                      : agent.id === 'investigator'
                      ? 'text-secondary'
                      : agent.id === 'repair'
                      ? 'text-primary'
                      : 'text-tertiary'
                  }`}>
                    {agent.icon}
                  </span>
                </div>
                <div className="flex flex-col font-mono">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface text-base font-semibold">
                    {agent.name}
                  </h3>
                  <span className="font-label-sm text-label-sm text-on-surface-variant text-[11px]">
                    agent-id: {agent.agentId}
                  </span>
                </div>
              </div>

              <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full font-label-sm text-label-sm font-semibold font-mono text-[10px] ${
                agent.status === 'RUNNING'
                  ? 'bg-tertiary-container/20 text-tertiary border border-tertiary/20'
                  : 'bg-surface-container-highest text-on-surface-variant border border-surface-container-high'
              }`}>
                {agent.status === 'RUNNING' && <span className="w-2 h-2 rounded-full bg-tertiary animate-pulse"></span>}
                {agent.status}
              </span>
            </div>

            <p className="font-body-md text-body-md text-on-surface-variant mb-space-md min-h-[40px] text-xs">
              {agent.description}
            </p>

            {/* Activity Pill */}
            <div className="flex items-center gap-space-xs p-space-xs px-space-sm rounded bg-surface-container-lowest text-on-surface mb-space-md font-label-sm text-label-sm font-mono text-xs border border-surface-container-high/30">
              <span className="material-symbols-outlined text-[16px] text-tertiary">query_stats</span>
              <span className="text-on-surface-variant">Last Activity:</span>
              <span className="font-medium text-on-surface truncate">{agent.lastActivity}</span>
            </div>

            {/* Quantitative Visual Metrics */}
            <div className="grid grid-cols-3 gap-space-sm p-space-sm rounded bg-surface-container mb-space-md font-mono text-xs border border-surface-container-high/30">
              <div className="flex flex-col">
                <span className="text-on-surface-variant text-[10px]">{agent.metricLabel1}</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold mt-0.5">
                  {agent.metricValue1}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-on-surface-variant text-[10px]">{agent.metricLabel2}</span>
                <span className="font-headline-sm text-headline-sm text-tertiary font-semibold mt-0.5">
                  {agent.metricValue2}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-on-surface-variant text-[10px]">{agent.metricLabel3}</span>
                <span className="font-headline-sm text-headline-sm text-secondary font-semibold mt-0.5">
                  {agent.metricValue3}
                </span>
              </div>
            </div>

            {/* Visual Stream / Confidence Bar */}
            <div className="flex flex-col gap-1 mb-space-md font-mono text-xs">
              <div className="flex justify-between items-center text-on-surface-variant text-[11px]">
                <span>Telemetry Metric Stream</span>
                <span className="text-secondary">{agent.streamRate}</span>
              </div>
              <div className="w-full bg-surface-container-lowest h-2 rounded-full overflow-hidden border border-surface-container-high/30">
                <div
                  className={`h-full rounded-full ${
                    agent.id === 'observer'
                      ? 'bg-tertiary'
                      : agent.id === 'investigator'
                      ? 'bg-secondary'
                      : agent.id === 'repair'
                      ? 'bg-primary'
                      : 'bg-tertiary'
                  }`}
                  style={{ width: agent.id === 'repair' ? '70%' : '94%' }}
                />
              </div>
            </div>

            {/* Capabilities Pills */}
            <div className="mt-auto pt-space-xs flex flex-wrap gap-1.5 font-mono text-[10px]">
              {agent.capabilities.map((cap, idx) => (
                <span
                  key={idx}
                  className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface border border-surface-container-highest/30"
                >
                  {cap}
                </span>
              ))}
            </div>

            <div className="mt-space-md pt-space-xs flex items-center justify-between border-t border-surface-container-high/30">
              <button
                onClick={() => setInspectAgent(agent)}
                className="text-xs font-mono text-secondary hover:underline flex items-center gap-1"
              >
                <span>Inspect Agent Telemetry</span>
                <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
              <button
                onClick={() => showToast(`Triggered diagnostic ping on ${agent.agentId}: 0% packet loss, latency 12ms`, 'check_circle', 'text-tertiary')}
                className="px-2 py-1 rounded bg-surface-container hover:bg-surface-container-highest text-xs font-mono text-on-surface transition-colors"
              >
                Ping Health
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Inspect Agent Telemetry Modal */}
      {inspectAgent && (
        <div className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container border border-surface-container-highest rounded-xl max-w-2xl w-full p-space-md shadow-2xl animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high/40">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary text-2xl">{inspectAgent.icon}</span>
                <h3 className="font-headline-sm text-base text-on-surface font-semibold">{inspectAgent.name} Telemetry & Stream</h3>
              </div>
              <button
                onClick={() => setInspectAgent(null)}
                className="text-outline hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-xl">close</span>
              </button>
            </div>

            <div className="my-space-md font-mono text-xs space-y-2 bg-surface-container-lowest p-space-md rounded-lg border border-surface-container-high/40 max-h-72 overflow-y-auto">
              <div className="text-secondary">[STREAM ACTIVE] agent://sentinelmesh/{inspectAgent.agentId}</div>
              <div className="text-on-surface-variant">09:41:22.012 [INFO] Heartbeat: OK, Memory: 240MB / 1024MB</div>
              <div className="text-on-surface-variant">09:41:22.420 [CONSENSUS] Quorum vote: AGREE on target SHA e78f21c</div>
              <div className="text-tertiary">09:41:23.109 [EVENT] Task dispatch executed with latency 14ms</div>
              <div className="text-on-surface-variant">09:41:24.001 [INFO] OpenTelemetry span: trace_id=8a9f31c0e (indexed)</div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-surface-container-high/30">
              <button
                onClick={() => setInspectAgent(null)}
                className="px-4 py-2 rounded bg-primary-container text-on-primary font-mono text-xs font-semibold hover:opacity-90"
              >
                Close Stream
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

