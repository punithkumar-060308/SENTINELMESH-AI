import React from 'react';

export function EmptyState({ icon = "search_off", title = "No records found", description, action }) {
  return (
    <div className="p-12 text-center text-on-surface-variant flex flex-col items-center justify-center gap-3">
      <div className="w-12 h-12 rounded-2xl bg-surface-container-high flex items-center justify-center text-outline">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <div>
        <h4 className="font-headline-sm text-sm font-semibold text-on-surface">{title}</h4>
        {description && <p className="text-xs text-on-surface-variant mt-1 max-w-sm">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = "Loading telemetry stream..." }) {
  return (
    <div className="p-12 flex flex-col items-center justify-center gap-3 text-on-surface-variant">
      <span className="material-symbols-outlined text-3xl text-secondary animate-spin">
        sync
      </span>
      <span className="font-mono text-xs">{message}</span>
    </div>
  );
}

export function ErrorState({ title = "Telemetry stream disconnected", error, onRetry }) {
  return (
    <div className="p-8 rounded-xl bg-error-container/20 border border-error/30 text-center flex flex-col items-center justify-center gap-2">
      <span className="material-symbols-outlined text-3xl text-error">error</span>
      <h4 className="font-headline-sm text-sm font-semibold text-error">{title}</h4>
      {error && <p className="text-xs text-on-error-container font-mono">{error}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-3 py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-xs font-mono text-on-surface transition-colors"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
}

export function DemoBadge({ className = "" }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-secondary-container/15 text-secondary font-mono text-[10px] uppercase tracking-wider border border-secondary/30 ${className}`}
      title="Synthetic Demo Telemetry. Not connected to external monitoring."
    >
      <span className="w-1 h-1 rounded-full bg-secondary"></span>
      Demo Data
    </span>
  );
}

