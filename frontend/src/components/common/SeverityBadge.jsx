import React from 'react';

const SEVERITY_CONFIG = {
  critical: {
    label: "CRITICAL (P0)",
    short: "P0",
    bg: "bg-error-container text-on-error-container border border-error/30 font-bold",
    ping: true
  },
  high: {
    label: "HIGH (P1)",
    short: "P1",
    bg: "bg-secondary-container/20 text-secondary border border-secondary/30 font-semibold",
    ping: false
  },
  medium: {
    label: "MEDIUM (P2)",
    short: "P2",
    bg: "bg-primary-container/20 text-primary border border-primary/30 font-medium",
    ping: false
  },
  low: {
    label: "LOW (P3)",
    short: "P3",
    bg: "bg-surface-container-highest text-on-surface-variant border border-surface-container-high font-normal",
    ping: false
  }
};

export default function SeverityBadge({ severity, short = false, className = "" }) {
  const normSev = (severity || "").toLowerCase().replace(/[\(\)p]/g, '').trim();
  const key = normSev === '0' || normSev === 'critical' ? 'critical'
    : normSev === '1' || normSev === 'high' ? 'high'
    : normSev === '2' || normSev === 'medium' ? 'medium'
    : 'low';

  const config = SEVERITY_CONFIG[key];

  return (
    <span
      role="status"
      aria-label={`Severity: ${config.label}`}
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px] uppercase tracking-wider ${config.bg} ${className}`}
    >
      {config.ping && (
        <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
      )}
      <span>{short ? config.short : config.label}</span>
    </span>
  );
}

