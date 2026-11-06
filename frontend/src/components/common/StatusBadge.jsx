import React from 'react';

const STATUS_CONFIG = {
  detected: {
    label: "Detected",
    bg: "bg-surface-container-highest text-on-surface",
    dot: "bg-outline",
    pulse: false
  },
  investigating: {
    label: "Investigating",
    bg: "bg-secondary-container/20 text-secondary border border-secondary/30",
    dot: "bg-secondary",
    pulse: true
  },
  awaiting_approval: {
    label: "Awaiting Approval",
    bg: "bg-primary-container/20 text-primary border border-primary/30",
    dot: "bg-primary",
    pulse: true
  },
  approved: {
    label: "Approved",
    bg: "bg-secondary-container/30 text-secondary border border-secondary/30",
    dot: "bg-secondary",
    pulse: false
  },
  verifying: {
    label: "Verifying in Sandbox",
    bg: "bg-tertiary-container/20 text-tertiary border border-tertiary/30",
    dot: "bg-tertiary",
    pulse: true
  },
  recovered: {
    label: "Recovered & Verified",
    bg: "bg-tertiary-container/30 text-tertiary border border-tertiary/40",
    dot: "bg-tertiary",
    pulse: false
  },
  failed: {
    label: "Verification Failed",
    bg: "bg-error-container text-on-error-container border border-error/30",
    dot: "bg-error",
    pulse: false
  },
  rejected: {
    label: "Patch Rejected",
    bg: "bg-surface-container-highest text-error border border-error/20",
    dot: "bg-error",
    pulse: false
  }
};

export default function StatusBadge({ status, className = "" }) {
  const normStatus = (status || "").toLowerCase().replace(/ /g, '_');
  const config = STATUS_CONFIG[normStatus] || {
    label: status,
    bg: "bg-surface-container-highest text-on-surface-variant",
    dot: "bg-outline",
    pulse: false
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[11px] font-semibold tracking-wide ${config.bg} ${className}`}
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

