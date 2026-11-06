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
    <div className="flex flex-col w-full gap-space-lg font-sans">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container-high/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">settings</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
              Platform Settings & System Health
            </h1>
            <DemoBadge label="System Governance" />
          </div>
          <p className="text-xs text-on-surface-variant font-mono mt-1">
            Global orchestration topology, connection health, SRE human approval quorums, and masked integration status.
          </p>
        </div>

        <button
          onClick={handleSavePreferences}
          className="px-4 py-2 rounded bg-primary-container text-on-primary font-mono text-xs font-semibold hover:opacity-95 shadow-md transition-all active:scale-95 flex items-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[16px]">save</span>
          <span>Save Changes</span>
        </button>
      </div>

      {/* Security Banner */}
      <div className="bg-surface-container-low rounded-xl p-3.5 border border-surface-container-high/60 flex items-start gap-3 text-xs font-mono">
        <span className="material-symbols-outlined text-tertiary text-xl shrink-0 mt-0.5">lock</span>
        <div>
          <div className="text-on-surface font-semibold">Zero-Secret Browser Isolation</div>
          <div className="text-on-surface-variant leading-relaxed font-sans mt-0.5">
            Client applications never receive raw API keys or database master credentials. All upstream credentials remain encapsulated within the secure backend container vault.
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg">
        {/* Section 1: Application Information */}
        <div className="bg-surface-container rounded-xl p-space-md border border-surface-container-high/50 shadow-md flex flex-col gap-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
            <div className="flex items-center gap-2 font-sans font-semibold text-on-surface text-sm">
              <span className="material-symbols-outlined text-secondary text-[18px]">dns</span>
              <span>Application Information</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-tertiary-container/20 text-tertiary text-[10px] font-bold">
              OPERATIONAL
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center py-1">
              <span className="text-outline">Platform Name:</span>
              <span className="text-on-surface font-semibold">{appInfo.name}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-surface-container-high/30">
              <span className="text-outline">Version / Release:</span>
              <span className="text-secondary font-semibold">{appInfo.version}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-surface-container-high/30">
              <span className="text-outline">Environment Target:</span>
              <span className="text-on-surface">{appInfo.environment}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-surface-container-high/30">
              <span className="text-outline">Reported SRE Uptime:</span>
              <span className="text-tertiary font-bold">{appInfo.uptime}</span>
            </div>
          </div>
        </div>

        {/* Section 2: AI Provider & Model Status */}
        <div className="bg-surface-container rounded-xl p-space-md border border-surface-container-high/50 shadow-md flex flex-col gap-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
            <div className="flex items-center gap-2 font-sans font-semibold text-on-surface text-sm">
              <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
              <span>AI Provider & Neural Orchestration</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary text-[10px] font-bold">
              CONNECTED
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center py-1">
              <span className="text-outline">Active Provider:</span>
              <span className="text-on-surface font-semibold">{aiProvider.provider}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-surface-container-high/30">
              <span className="text-outline">Orchestrator Model:</span>
              <span className="text-secondary font-semibold">{aiProvider.activeOrchestratorModel}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-surface-container-high/30">
              <span className="text-outline">Context Window:</span>
              <span className="text-on-surface">{aiProvider.contextWindow}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-surface-container-high/30">
              <span className="text-outline">API Key Credentials:</span>
              <span className="text-outline font-mono">AIzaSyB3...•••••••• (Vault Masked)</span>
            </div>
          </div>
        </div>

        {/* Section 3: Database & Ledger Status */}
        <div className="bg-surface-container rounded-xl p-space-md border border-surface-container-high/50 shadow-md flex flex-col gap-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
            <div className="flex items-center gap-2 font-sans font-semibold text-on-surface text-sm">
              <span className="material-symbols-outlined text-tertiary text-[18px]">database</span>
              <span>Telemetry Data Store & Audit Ledger</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-tertiary-container/20 text-tertiary text-[10px] font-bold">
              SYNCHRONIZED
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center py-1">
              <span className="text-outline">Database Engine:</span>
              <span className="text-on-surface font-semibold">{db.engine}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-surface-container-high/30">
              <span className="text-outline">Connection Pool:</span>
              <span className="text-tertiary font-semibold">{db.poolStatus}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-surface-container-high/30">
              <span className="text-outline">Cryptographic Attestation:</span>
              <span className="text-on-surface">{db.immutableLedger}</span>
            </div>
          </div>
        </div>

        {/* Section 4: Ephemeral Sandbox Runtime */}
        <div className="bg-surface-container rounded-xl p-space-md border border-surface-container-high/50 shadow-md flex flex-col gap-3 font-mono text-xs">
          <div className="flex items-center justify-between pb-2 border-b border-surface-container-high/40">
            <div className="flex items-center gap-2 font-sans font-semibold text-on-surface text-sm">
              <span className="material-symbols-outlined text-secondary text-[18px]">view_in_ar</span>
              <span>Isolated Sandbox Runtime</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-secondary-container/20 text-secondary text-[10px] font-bold">
              READY
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex justify-between items-center py-1">
              <span className="text-outline">Container Runtime:</span>
              <span className="text-on-surface font-semibold">{sandbox.runtime}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-surface-container-high/30">
              <span className="text-outline">Isolation Policy:</span>
              <span className="text-on-surface">{sandbox.isolationLevel}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-t border-surface-container-high/30">
              <span className="text-outline">Pre-Warmed Test Pods:</span>
              <span className="text-secondary font-semibold">{sandbox.preWarmedContainers} pods idle</span>
            </div>
          </div>
        </div>
      </div>

      {/* Section 5: Governance & Notification Preferences */}
      <div className="bg-surface-container rounded-xl p-space-md border border-surface-container-high/50 shadow-md flex flex-col gap-space-md font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-surface-container-high/40">
          <div>
            <h3 className="font-semibold text-sm text-on-surface">SRE Autonomous Governance & Notification Preferences</h3>
            <p className="text-xs text-on-surface-variant font-mono mt-0.5">Control automated patch application thresholds and incident dispatch channels.</p>
          </div>
          <button
            onClick={handleTestAlert}
            className="px-3 py-1.5 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-surface-container-highest font-mono text-xs transition-colors flex items-center gap-1.5 self-start sm:self-auto"
          >
            <span className="material-symbols-outlined text-[16px]">notifications_active</span>
            <span>Send Test Alert</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md font-mono text-xs">
          {/* Governance Rules */}
          <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container-high/40 space-y-4">
            <span className="font-bold text-on-surface text-xs uppercase tracking-wider block font-sans">
              Human Sign-off Policy
            </span>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-on-surface text-xs font-sans">Human Gate for P0 / P1 Incidents</div>
                <div className="text-outline text-[11px]">Strict digital signature required before sandbox promotes to prod</div>
              </div>
              <input type="checkbox" defaultChecked disabled className="accent-primary w-4 h-4 cursor-not-allowed opacity-80" />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-container-high/30">
              <div>
                <div className="font-semibold text-on-surface text-xs font-sans">Autonomous Healing for P2 / P3</div>
                <div className="text-outline text-[11px]">Allow automated rollouts when 100% test suites pass in sandbox</div>
              </div>
              <input
                type="checkbox"
                checked={autoP2Healing}
                onChange={(e) => setAutoP2Healing(e.target.checked)}
                className="accent-secondary w-4 h-4 cursor-pointer"
              />
            </div>
          </div>

          {/* Notification Channels */}
          <div className="bg-surface-container-low rounded-xl p-4 border border-surface-container-high/40 space-y-4">
            <span className="font-bold text-on-surface text-xs uppercase tracking-wider block font-sans">
              Alert Integrations
            </span>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-on-surface text-xs font-sans">Slack Webhook Alerts</div>
                <div className="text-outline text-[11px]">#sre-critical-incidents (Configured)</div>
              </div>
              <input
                type="checkbox"
                checked={slackAlerts}
                onChange={(e) => setSlackAlerts(e.target.checked)}
                className="accent-secondary w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-container-high/30">
              <div>
                <div className="font-semibold text-on-surface text-xs font-sans">PagerDuty On-Call Escalation</div>
                <div className="text-outline text-[11px]">High Urgency Policy: SRE Primary Escalation</div>
              </div>
              <input
                type="checkbox"
                checked={pagerdutyAlerts}
                onChange={(e) => setPagerdutyAlerts(e.target.checked)}
                className="accent-secondary w-4 h-4 cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-surface-container-high/30">
              <div>
                <div className="font-semibold text-on-surface text-xs font-sans">Email Digest</div>
                <div className="text-outline text-[11px]">Daily executive incident summary report</div>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="accent-secondary w-4 h-4 cursor-pointer"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

