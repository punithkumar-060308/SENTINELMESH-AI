import React, { useState } from 'react';

const CHAOS_SCENARIOS = [
  {
    id: "stripe_npe",
    name: "Stripe Webhook NullPointerException (P0 Critical)",
    app: "payment-gateway-svc",
    desc: "Injects missing customer field in guest checkout webhook payloads, triggering dereference failures.",
    severity: "P0",
    impact: "54 req/s impact"
  },
  {
    id: "redis_exhaustion",
    name: "Redis Connection Pool Exhaustion (P1 High)",
    app: "auth-session-worker",
    desc: "Simulates sudden connection socket leaks during upstream Auth0 timeout events.",
    severity: "P1",
    impact: "Redis shard 02 unreachable"
  },
  {
    id: "postgres_deadlock",
    name: "PostgreSQL Multi-SKU Deadlock (P1 High)",
    app: "inventory-sync-db",
    desc: "Executes concurrent inverted row-lock transactions in warehouse reservations table.",
    severity: "P1",
    impact: "Lock table blocked"
  },
  {
    id: "oom_spike",
    name: "Container Memory Leak & OOMKill (P2 Medium)",
    app: "order-fulfillment-api",
    desc: "Generates massive unbuffered PDF invoice render payloads causing 98% memory consumption.",
    severity: "P2",
    impact: "Container restart triggered"
  }
];

export default function SimulateIncidentModal({ isOpen, onClose, onInjectIncident }) {
  const [selectedScenario, setSelectedScenario] = useState(CHAOS_SCENARIOS[0].id);
  const [isInjecting, setIsInjecting] = useState(false);

  if (!isOpen) return null;

  const handleInject = () => {
    const scenario = CHAOS_SCENARIOS.find(s => s.id === selectedScenario);
    setIsInjecting(true);

    setTimeout(() => {
      setIsInjecting(false);
      onInjectIncident({
        id: `INC-${Math.floor(1000 + Math.random() * 9000)}`,
        app: scenario.app,
        version: "v2.14",
        title: scenario.name,
        signature: `ChaosEngineError: Simulating ${scenario.name} in cluster-alpha-7`,
        location: "ChaosInjector.kt:88",
        traceId: Math.random().toString(16).substring(2, 10),
        impact: scenario.impact,
        severity: scenario.severity,
        severityLabel: `${scenario.severity === 'P0' ? 'CRITICAL' : scenario.severity === 'P1' ? 'HIGH' : 'MEDIUM'} (${scenario.severity})`,
        status: "Investigating",
        pipelineAgent: "Investigator Agent (parsing traces)",
        detectedTime: "Just now",
        confidence: 94.5,
        blastRadius: "Sandboxed",
        blastRadiusDetail: "Injected in isolated test pod namespace.",
        rootCause: scenario.desc,
        sourceFile: `src/main/services/${scenario.app}/Handler.java:42`,
        correlatedPR: "PR #410 by @chaos-engineer",
        stackTrace: `ChaosEngineException: Simulated failure triggered by SRE console on ${scenario.app}`,
        podLogs: [
          { time: "Just now", level: "WARN", message: "Chaos injected via SRE console." },
          { time: "Just now", level: "ERROR", message: `${scenario.name} triggered.` }
        ]
      });
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-surface-container-highest rounded-2xl max-w-xl w-full max-h-[calc(100dvh-2rem)] overflow-y-auto p-space-lg shadow-2xl animate-in fade-in duration-200">
        <div className="flex items-center justify-between pb-space-sm border-b border-surface-container-high/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl animate-pulse">bolt</span>
            <div>
              <h2 className="font-headline-sm text-base text-on-surface font-semibold">
                Chaos Engineering Sandbox
              </h2>
              <p className="text-xs text-on-surface-variant font-mono">Inject synthetic fault into SentinelMesh mesh</p>
            </div>
          </div>
          <button onClick={onClose} className="text-outline hover:text-on-surface">
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        <div className="my-space-md space-y-3">
          <p className="text-xs text-on-surface-variant">
            Select a failure signature to inject. SentinelMesh autonomous agents will detect the telemetry drift, isolate the root cause, and synthesize a defensive code patch:
          </p>

          <div className="space-y-2">
            {CHAOS_SCENARIOS.map((sc) => (
              <label
                key={sc.id}
                onClick={() => setSelectedScenario(sc.id)}
                className={`flex items-start gap-3 p-space-sm rounded-xl cursor-pointer border transition-all ${
                  selectedScenario === sc.id
                    ? 'bg-surface-container-high border-secondary ring-1 ring-secondary/30'
                    : 'bg-surface-container-low border-surface-container-high/40 hover:bg-surface-container'
                }`}
              >
                <input
                  type="radio"
                  name="scenario"
                  checked={selectedScenario === sc.id}
                  onChange={() => setSelectedScenario(sc.id)}
                  className="mt-1 accent-secondary"
                />
                <div className="flex flex-col flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-on-surface font-mono">{sc.name}</span>
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${
                      sc.severity === 'P0' ? 'bg-error-container text-on-error-container' : 'bg-secondary-container/20 text-secondary'
                    }`}>
                      {sc.severity}
                    </span>
                  </div>
                  <span className="text-[11px] text-outline font-mono mt-0.5">Target: {sc.app}</span>
                  <p className="text-[11px] text-on-surface-variant mt-1">{sc.desc}</p>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-surface-container-high/40 font-mono text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-highest/30 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleInject}
            disabled={isInjecting}
            className="flex items-center gap-1.5 px-4 py-2 rounded bg-primary-container text-on-primary font-semibold hover:opacity-90 active:scale-95 transition-all shadow-md"
          >
            {isInjecting ? (
              <>
                <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                <span>Injecting Telemetry Anomaly...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[16px]">bolt</span>
                <span>Trigger Simulation</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
