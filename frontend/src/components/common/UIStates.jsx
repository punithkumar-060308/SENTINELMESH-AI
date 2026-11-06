import React from 'react';

export function EmptyState({ icon = "search_off", title = "No records found", description, action }) {
  return (
    <div className="p-12 text-center text-muted-slate flex flex-col items-center justify-center gap-3">
      <div className="w-14 h-14 rounded-3xl bg-white/80 border border-white/90 flex items-center justify-center text-muted-slate shadow-xs">
        <span className="material-symbols-outlined text-3xl">{icon}</span>
      </div>
      <div>
        <h4 className="text-sm font-bold text-deep-navy">{title}</h4>
        {description && <p className="text-xs text-muted-slate mt-1 max-w-sm">{description}</p>}
      </div>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

export function LoadingState({ message = "Loading telemetry stream..." }) {
  return (
    <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-slate">
      <span className="material-symbols-outlined text-3xl text-powder-blue animate-spin">
        sync
      </span>
      <span className="font-mono text-xs text-deep-navy">{message}</span>
    </div>
  );
}

export function ErrorState({ title = "Telemetry stream disconnected", error, onRetry }) {
  return (
    <div className="p-8 rounded-3xl bg-rose-50/80 border border-rose-200 text-center flex flex-col items-center justify-center gap-2 shadow-xs">
      <span className="material-symbols-outlined text-3xl text-rose-600">error</span>
      <h4 className="text-sm font-bold text-rose-900">{title}</h4>
      {error && <p className="text-xs text-rose-700 font-mono">{error}</p>}
      {onRetry && (
        <button
          onClick={onRetry}
          className="mt-2 px-4 py-2 rounded-xl bg-white text-xs font-semibold text-rose-800 border border-rose-200 hover:bg-rose-50 transition-colors shadow-xs"
        >
          Retry Connection
        </button>
      )}
    </div>
  );
}

export function DemoBadge({ className = "", label = "Demo Telemetry" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-powder-blue/20 text-deep-navy font-mono text-[10px] font-semibold tracking-wide border border-powder-blue/40 shadow-xs ${className}`}
      title="Synthetic Demo Telemetry. Not connected to external monitoring."
    >
      <span className="w-1.5 h-1.5 rounded-full bg-sunset-peach animate-pulse"></span>
      {label}
    </span>
  );
}
