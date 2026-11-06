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
    bg: "bg-sunset-peach/30 text-deep-navy border border-sunset-peach/50 font-semibold",
    ping: false
  },
  medium: {
    label: "MEDIUM (P2)",
    short: "P2",
    bg: "bg-powder-blue/30 text-deep-navy border border-powder-blue/50 font-medium",
    ping: false
  },
  low: {
    label: "LOW (P3)",
    short: "P3",
    bg: "bg-white/80 text-muted-slate border border-white/90 font-normal",
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
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full font-mono text-[11px] uppercase tracking-wider shadow-xs ${config.bg} ${className}`}
    >
      {config.ping && (
        <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping" />
      )}
      <span>{short ? config.short : config.label}</span>
    </span>
  );
}
