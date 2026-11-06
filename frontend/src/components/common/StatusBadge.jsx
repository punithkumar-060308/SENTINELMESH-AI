import React from 'react';

const STATUS_CONFIG = {
  detected: {
    label: "Detected",
    bg: "bg-white/80 text-deep-navy border-white/90",
    dot: "bg-muted-slate",
    pulse: false
  },
  investigating: {
    label: "Investigating",
    bg: "bg-sunset-peach/30 text-deep-navy border-sunset-peach/40",
    dot: "bg-sunset-peach",
    pulse: true
  },
  awaiting_approval: {
    label: "Awaiting Approval",
    bg: "bg-powder-blue/30 text-deep-navy border-powder-blue/40",
    dot: "bg-powder-blue",
    pulse: true
  },
  approved: {
    label: "Approved",
    bg: "bg-sunset-peach/25 text-deep-navy border-sunset-peach/30",
    dot: "bg-sunset-peach",
    pulse: false
  },
  verifying: {
    label: "Verifying in Sandbox",
    bg: "bg-powder-blue/35 text-deep-navy border-powder-blue/50",
    dot: "bg-powder-blue",
    pulse: true
  },
  recovered: {
    label: "Recovered & Verified",
    bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
    dot: "bg-emerald-500",
    pulse: false
  },
  failed: {
    label: "Verification Failed",
    bg: "bg-error-container text-on-error-container border-error/30",
    dot: "bg-error",
    pulse: false
  },
  rejected: {
    label: "Patch Rejected",
    bg: "bg-rose-50 text-rose-800 border-rose-200",
    dot: "bg-rose-500",
    pulse: false
  }
};

export default function StatusBadge({ status, className = "" }) {
  const normStatus = (status || "").toLowerCase().replace(/ /g, '_');
  const config = STATUS_CONFIG[normStatus] || {
    label: status,
    bg: "bg-white/80 text-deep-navy border-white/90",
    dot: "bg-muted-slate",
    pulse: false
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-mono text-[11px] font-semibold border shadow-xs ${config.bg} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {config.pulse && (
          <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${config.dot}`} />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${config.dot}`} />
      </span>
      <span>{config.label}</span>
    </span>
  );
}
