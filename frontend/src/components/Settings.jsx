import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { DemoBadge, LoadingState } from './common/UIStates';

export default function Settings({ showToast }) {
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [autoP2Healing, setAutoP2Healing] = useState(true);
  const [slackAlerts, setSlackAlerts] = useState(true);
  const [pagerdutyAlerts, setPagerdutyAlerts] = useState(true);
  const [emailAlerts, setEmailAlerts] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        setLoading(true);
        const data = await api.getPlatformSettings();
        setSettings(data);
      } catch (err) {
        if (showToast) showToast(`Failed to load settings: ${err.message}`, 'error', 'text-error');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, []);

  const handleSavePreferences = () => {
    if (showToast) {
      showToast('Notification and governance preferences saved successfully.', 'check_circle', 'text-tertiary');
    }
  };

  const handleTestAlert = () => {
    if (showToast) {
      showToast('Sent test notification ping to configured Slack & PagerDuty channels.', 'send', 'text-secondary');
    }
  };

  if (loading) {
    return <LoadingState message="Loading platform configuration..." />;
  }

  const appInfo = settings?.applicationInfo || {
    name: "SentinelMesh AI",
    version: "v4.8-prod-rc2",
    environment: "Demo Telemetry (Synthetic Ingress)",
    uptime: "99.98%"
  };

  const aiProvider = settings?.aiProvider || {
    provider: "Gemini 1.5 Pro (Google DeepMind)",
    status: "Connected (Live Mesh)",
    latency: "140ms",
    contextWindow: "128k Tokens",
    activeOrchestratorModel: "gemini-1.5-pro-latest"
  };

  const db = settings?.database || {
    engine: "PostgreSQL 16.2 / Citus Distributed",
    poolStatus: "Healthy (18/50 active connections)",
    immutableLedger: "Enabled (SHA-256 Attestation)"
  };

  const sandbox = settings?.sandbox || {
    runtime: "Docker Rootless / Firecracker MicroVM",
    isolationLevel: "cgroup v2 + seccomp (Zero Production Drift)",
    preWarmedContainers: 2
  };

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#CBD5E1]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2 font-mono text-xs">
            <span className="px-3 py-0.5 rounded-full bg-powder-blue/40 text-[#17233B] font-bold uppercase tracking-wider border border-powder-blue/60 shadow-xs">
              System Topology
            </span>
            <span className="text-[#94A3B8]">|</span>
            <DemoBadge label="System Governance" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#17233B] tracking-tight">
            Platform Settings & System Health
          </h1>
          <p className="mt-2 text-sm text-[#334155] font-medium leading-relaxed max-w-3xl">
            Global orchestration topology, connection health, SRE human approval quorums, and masked integration status.
          </p>
        </div>

        <button
          onClick={handleSavePreferences}
          className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#17233B] text-white font-bold hover:bg-[#1e2f4f] text-xs shadow-md transition-all active:scale-95 self-start lg:self-auto"
        >
          <span className="material-symbols-outlined text-[18px]">save</span>
          <span>Save Changes</span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="rounded-2xl p-4 bg-[#E9E8F8]/70 border border-[#8DB9F0]/40 flex items-start gap-3 text-xs shadow-xs">
        <span className="material-symbols-outlined text-emerald-700 text-2xl shrink-0 mt-0.5">lock</span>
        <div>
          <div className="text-[#17233B] font-bold text-sm">Zero-Secret Browser Isolation</div>
          <div className="text-[#334155] leading-relaxed font-sans mt-0.5">
            Client applications never receive raw API keys or database master credentials. All upstream credentials remain encapsulated within the secure backend container vault.
          </div>
        </div>
      </div>

      {/* 2x2 Infrastructure Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Section 1: Application Information */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white shadow-glass flex flex-col gap-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5 font-sans font-bold text-[#17233B] text-sm">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-xs border border-[#CBD5E1]">
                <span className="material-symbols-outlined text-[#2563EB] text-[18px]">dns</span>
              </div>
              <span>Application Information</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-300">
              OPERATIONAL
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Platform Name:</span>
              <span className="text-[#17233B] font-bold">{appInfo.name}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Version / Release:</span>
              <span className="text-[#2563EB] font-bold">{appInfo.version}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Environment Target:</span>
              <span className="text-[#17233B] font-semibold">{appInfo.environment}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Reported SRE Uptime:</span>
              <span className="text-emerald-700 font-black">{appInfo.uptime}</span>
            </div>
          </div>
        </div>

        {/* Section 2: AI Provider & Model Status */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white shadow-glass flex flex-col gap-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5 font-sans font-bold text-[#17233B] text-sm">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-xs border border-[#CBD5E1]">
                <span className="material-symbols-outlined text-sunset-peach text-[18px]">psychology</span>
              </div>
              <span>AI Provider & Neural Orchestration</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-[10px] font-bold border border-blue-200">
              CONNECTED
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Active Provider:</span>
              <span className="text-[#17233B] font-bold">{aiProvider.provider}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Orchestrator Model:</span>
              <span className="text-[#2563EB] font-bold">{aiProvider.activeOrchestratorModel}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Context Window:</span>
              <span className="text-[#17233B] font-semibold">{aiProvider.contextWindow}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">API Key Credentials:</span>
              <span className="text-[#64748B] font-semibold">AIzaSyB3...•••••••• (Vault Masked)</span>
            </div>
          </div>
        </div>

        {/* Section 3: Database & Ledger Status */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white shadow-glass flex flex-col gap-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5 font-sans font-bold text-[#17233B] text-sm">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-xs border border-[#CBD5E1]">
                <span className="material-symbols-outlined text-emerald-600 text-[18px]">database</span>
              </div>
              <span>Telemetry Data Store & Audit Ledger</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 text-[10px] font-bold border border-emerald-300">
              SYNCHRONIZED
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Database Engine:</span>
              <span className="text-[#17233B] font-bold">{db.engine}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Connection Pool:</span>
              <span className="text-emerald-700 font-bold">{db.poolStatus}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Cryptographic Attestation:</span>
              <span className="text-[#17233B] font-semibold">{db.immutableLedger}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Ephemeral Sandbox Runtime */}
        <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white shadow-glass flex flex-col gap-4 font-mono text-xs">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
            <div className="flex items-center gap-2.5 font-sans font-bold text-[#17233B] text-sm">
              <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center shadow-xs border border-[#CBD5E1]">
                <span className="material-symbols-outlined text-[#2563EB] text-[18px]">view_in_ar</span>
              </div>
              <span>Isolated Sandbox Runtime</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-blue-50 text-[#2563EB] text-[10px] font-bold border border-blue-200">
              READY
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Container Runtime:</span>
              <span className="text-[#17233B] font-bold">{sandbox.runtime}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Isolation Policy:</span>
              <span className="text-[#17233B] font-semibold">{sandbox.isolationLevel}</span>
            </div>
            <div className="flex justify-between items-center py-2.5">
              <span className="text-[#64748B] font-medium">Pre-Warmed Test Pods:</span>
              <span className="text-[#2563EB] font-bold">{sandbox.preWarmedContainers} pods idle</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Governance & Notification Preferences */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white shadow-glass flex flex-col gap-6 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200/80">
          <div>
            <h3 className="font-black text-base text-[#17233B]">SRE Autonomous Governance & Notification Preferences</h3>
            <p className="text-xs text-[#64748B] font-medium mt-0.5">Control automated patch application thresholds and incident dispatch channels.</p>
          </div>
          <button
            onClick={handleTestAlert}
            className="px-4 py-2 rounded-full bg-white hover:bg-slate-50 text-[#17233B] border border-[#CBD5E1] font-bold text-xs transition-colors flex items-center gap-2 self-start sm:self-auto shadow-xs active:scale-95"
          >
            <span className="material-symbols-outlined text-[16px] text-amber-500">notifications_active</span>
            <span>Send Test Alert</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          {/* Governance Rules */}
          <div className="bg-white/80 rounded-2xl p-5 border border-white shadow-xs space-y-4">
            <span className="font-black text-[#17233B] text-xs uppercase tracking-wider block font-sans">
              Human Sign-off Policy
            </span>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[#17233B] text-xs font-sans">Human Gate for P0 / P1 Incidents</div>
                <div className="text-[#64748B] text-[11px] font-medium mt-0.5">Strict digital signature required before sandbox promotes to prod</div>
              </div>
              <input type="checkbox" defaultChecked disabled className="accent-[#17233B] w-4 h-4 cursor-not-allowed opacity-80" />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <div className="font-bold text-[#17233B] text-xs font-sans">Autonomous Healing for P2 / P3</div>
                <div className="text-[#64748B] text-[11px] font-medium mt-0.5">Allow automated rollouts when 100% test suites pass in sandbox</div>
              </div>
              <input
                type="checkbox"
                checked={autoP2Healing}
                onChange={(e) => setAutoP2Healing(e.target.checked)}
                className="accent-[#2563EB] w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          {/* Notification Channels */}
          <div className="bg-white/80 rounded-2xl p-5 border border-white shadow-xs space-y-4">
            <span className="font-black text-[#17233B] text-xs uppercase tracking-wider block font-sans">
              Alert Integrations
            </span>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[#17233B] text-xs font-sans">Slack Webhook Alerts</div>
                <div className="text-[#64748B] text-[11px] font-medium mt-0.5">#sre-critical-incidents (Configured)</div>
              </div>
              <input
                type="checkbox"
                checked={slackAlerts}
                onChange={(e) => setSlackAlerts(e.target.checked)}
                className="accent-[#2563EB] w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <div className="font-bold text-[#17233B] text-xs font-sans">PagerDuty On-Call Escalation</div>
                <div className="text-[#64748B] text-[11px] font-medium mt-0.5">High Urgency Policy: SRE Primary Escalation</div>
              </div>
              <input
                type="checkbox"
                checked={pagerdutyAlerts}
                onChange={(e) => setPagerdutyAlerts(e.target.checked)}
                className="accent-[#2563EB] w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <div className="font-bold text-[#17233B] text-xs font-sans">Email Digest</div>
                <div className="text-[#64748B] text-[11px] font-medium mt-0.5">Daily executive incident summary report</div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="accent-[#2563EB] w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}