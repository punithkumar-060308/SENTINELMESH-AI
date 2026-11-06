import React, { useState } from 'react';
import { DemoBadge } from './common/UIStates';

export default function Header({
  onSimulateClick,
  onSearch,
  searchQuery = '',
  onOpenMobileMenu
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="fixed top-0 left-0 lg:left-64 right-0 h-16 bg-surface-container-lowest/90 backdrop-blur-xl z-40 px-3 sm:px-4 xl:px-6 flex items-center justify-between gap-2 border-b border-surface-container-high/40 shadow-sm">
      {/* Left: Mobile Toggle + Breadcrumb & Live Watch status */}
      <div className="flex min-w-0 items-center gap-space-sm lg:gap-space-md">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <div className="flex min-w-0 items-center gap-space-xs font-label-md text-label-md text-on-surface-variant font-mono text-xs">
          <span className="material-symbols-outlined text-[16px] text-secondary">hub</span>
          <span className="hidden sm:inline">Mesh</span>
          <span className="hidden sm:inline text-outline">/</span>
          <span className="hidden text-on-surface font-medium truncate sm:inline sm:max-w-[140px] xl:max-w-none">Autonomous Swarm</span>
        </div>

        <DemoBadge className="hidden sm:inline-flex" />
      </div>

      {/* Global Search Bar */}
      <div className="hidden lg:flex min-w-0 items-center w-40 xl:w-64 relative">
        <span className="material-symbols-outlined absolute left-2.5 text-[18px] text-on-surface-variant">
          search
        </span>
        <input
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-9 pr-12 py-1.5 bg-surface-container-low border border-surface-container-high/40 rounded font-body-sm text-body-sm text-on-surface placeholder:text-outline focus:outline-none focus:border-primary/50 focus:bg-surface-container transition-all text-xs"
          placeholder="Search incidents, services, traces..."
          type="text"
        />
        <kbd className="absolute right-2 px-1.5 py-0.5 rounded bg-surface-container border border-surface-container-high font-mono text-[10px] text-on-surface-variant">
          ⌘K
        </kbd>
      </div>

      {/* Header Actions & Agent Pills */}
      <div className="flex shrink-0 items-center gap-space-xs sm:gap-space-sm lg:gap-space-md">
        {/* Simulate Incident Button */}
        <button
          onClick={onSimulateClick}
          aria-label="Simulate incident"
          className="flex items-center gap-space-xs px-2.5 sm:px-space-sm py-1.5 rounded bg-gradient-to-r from-primary-container via-inverse-primary to-secondary-container text-on-primary font-body-sm text-xs font-semibold hover:brightness-110 active:scale-95 transition-all shadow-md shadow-primary-container/20"
        >
          <span className="material-symbols-outlined text-[16px] sm:text-[18px] animate-pulse">bolt</span>
          <span className="hidden sm:inline">Simulate Incident</span>
        </button>

        {/* Live Swarm Micro Status Pills */}
        <div className="hidden xl:flex items-center gap-1.5 font-mono text-[10px]">
          <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-surface-container-highest" title="Observer Agent">
            Obs: <span className="text-tertiary font-semibold">Live</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-surface-container-highest" title="Investigator Agent">
            Inv: <span className="text-secondary font-semibold">Active</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-surface-container-highest" title="Repair Agent">
            Rep: <span className="text-primary font-semibold">Standby</span>
          </span>
          <span className="px-2 py-0.5 rounded bg-surface-container-high text-on-surface-variant border border-surface-container-highest" title="Verifier Agent">
            Ver: <span className="text-tertiary font-semibold">Ready</span>
          </span>
        </div>

        {/* Notifications & Profile Menu */}
        <div className="flex items-center gap-space-xs sm:gap-space-sm relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant hover:text-on-surface transition-colors relative"
            title="Notifications"
            aria-label="Alert streams"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error animate-ping"></span>
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-error"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-72 max-w-[calc(100vw-1rem)] bg-surface-container-high border border-surface-container-highest rounded-xl shadow-2xl p-space-sm z-50 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-surface-container-highest/60 mb-2">
                <span className="font-headline-sm text-xs font-semibold text-on-surface">Recent Alert Streams</span>
                <span className="font-label-sm text-[10px] text-secondary font-mono">Demo Telemetry</span>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <div className="p-2 rounded bg-surface-container-low border border-error/20 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-error font-mono text-[11px] font-bold">CRITICAL: INC-8921</span>
                    <span className="text-outline text-[10px] font-mono">4m ago</span>
                  </div>
                  <p className="text-xs text-on-surface">NullPointer in StripeWebhookHandler after v2.14.0</p>
                </div>
                <div className="p-2 rounded bg-surface-container-low border border-secondary/20 flex flex-col gap-0.5">
                  <div className="flex items-center justify-between">
                    <span className="text-secondary font-mono text-[11px] font-bold">HIGH: INC-001</span>
                    <span className="text-outline text-[10px] font-mono">10m ago</span>
                  </div>
                  <p className="text-xs text-on-surface">GET /users returns HTTP 500 internal server error</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-space-xs pl-space-xs border-l border-surface-container-high/40 cursor-pointer">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-primary/30 flex items-center justify-center font-bold text-primary text-xs">
              EV
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
