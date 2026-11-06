import React from 'react';

export default function Sidebar({
  activeTab,
  setActiveTab,
  incidentsCount = 3,
  pendingPatchesCount = 1,
  isOpenMobile = false,
  onCloseMobile
}) {
  const navItems = [
    { id: 'overview', label: 'Overview', icon: 'grid_view' },
    { id: 'incidents', label: 'Incidents', icon: 'warning', badge: incidentsCount, badgeColor: 'bg-error-container text-on-error-container' },
    { id: 'agents', label: 'AI Agents', icon: 'smart_toy', badge: '4', isAgentsBadge: true },
    { id: 'patch-review', label: 'Patch Review', icon: 'call_merge', badge: pendingPatchesCount, badgeColor: 'bg-surface-container-highest text-secondary' },
    { id: 'verification', label: 'Verification', icon: 'check_circle' },
    { id: 'audit-logs', label: 'Audit Logs', icon: 'receipt_long' },
    { id: 'settings', label: 'Settings', icon: 'tune' },
  ];

  const handleNavClick = (id) => {
    setActiveTab(id);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside className={`fixed left-0 top-0 h-screen w-64 bg-surface-container-lowest flex flex-col z-50 border-r border-surface-container-high/40 shadow-xl transition-transform duration-200 lg:translate-x-0 ${
        isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      }`}>
        {/* Brand & Logo Header */}
        <div className="p-space-md flex flex-col gap-space-xs border-b border-surface-container-high/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-space-sm cursor-pointer" onClick={() => handleNavClick('overview')}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary via-secondary to-tertiary p-0.5 flex items-center justify-center shadow-md">
                <div className="w-full h-full bg-surface-container-lowest rounded-[6px] flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-[20px]">shield</span>
                </div>
              </div>
              <span className="font-headline-sm text-headline-sm text-on-surface tracking-tight font-semibold">
                SentinelMesh
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span className="px-space-xs py-0.5 rounded-full bg-secondary-container/20 text-secondary font-label-sm text-label-sm border border-secondary/30 font-mono font-medium text-[10px]">
                PROD
              </span>
              {/* Mobile close button */}
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1 text-on-surface-variant hover:text-on-surface"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>
          </div>
          <p className="font-label-sm text-label-sm text-on-surface-variant font-mono text-[11px]">
            Detect. Investigate. Repair. Verify.
          </p>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 px-space-xs py-space-sm space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-space-sm py-2 rounded transition-all duration-150 ${
                  isActive
                    ? 'bg-surface-container-high text-on-surface font-semibold shadow-sm'
                    : 'text-on-surface-variant hover:bg-surface-container/60 hover:text-on-surface font-body-sm text-body-sm'
                }`}
              >
                <div className="flex items-center gap-space-sm">
                  <span className={`material-symbols-outlined text-[18px] ${isActive ? 'text-primary' : 'text-outline'}`}>
                    {item.icon}
                  </span>
                  <span className="tracking-wide text-xs">{item.label}</span>
                </div>

                {item.isAgentsBadge ? (
                  <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-tertiary-container/20 text-tertiary font-label-sm text-[10px] font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-tertiary animate-pulse"></span>
                    4
                  </span>
                ) : item.badge !== undefined && item.badge > 0 ? (
                  <span className={`px-1.5 py-0.5 rounded-full font-label-sm text-[10px] font-bold ${item.badgeColor}`}>
                    {item.badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>

        {/* Bottom Status & Profile */}
        <div className="p-space-sm flex flex-col gap-space-sm bg-surface-container-low/70 border-t border-surface-container-high/40">
          {/* Agent Cluster Status Box */}
          <div
            onClick={() => handleNavClick('agents')}
            className="p-space-xs rounded bg-surface-container-high/70 hover:bg-surface-container-high transition-colors cursor-pointer flex items-center justify-between border border-surface-container-highest/40"
          >
            <div className="flex items-center gap-space-xs">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-tertiary opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-tertiary"></span>
              </span>
              <span className="font-label-sm text-label-sm text-on-surface font-mono text-[11px]">4 Agents Active</span>
            </div>
            <span className="font-label-sm text-label-sm text-secondary font-mono font-bold text-[11px]">100%</span>
          </div>

          {/* Environment details */}
          <div className="flex flex-col gap-0.5 px-space-xs">
            <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider text-[10px] font-mono">
              Environment
            </span>
            <span className="font-body-sm text-body-sm text-on-surface truncate font-mono text-[11px]">
              Demo Mode (Mock Telemetry)
            </span>
          </div>

          {/* User Profile */}
          <div className="flex items-center gap-space-sm pt-space-xs border-t border-surface-container-high/30">
            <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-primary/30 flex items-center justify-center font-bold text-primary text-xs">
              EV
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-body-sm text-body-sm text-on-surface font-medium truncate text-xs">
                Elena Vance
              </span>
              <span className="font-label-sm text-label-sm text-secondary truncate font-mono text-[11px]">
                Staff SRE Lead
              </span>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
              unfold_more
            </span>
          </div>
        </div>
      </aside>
    </>
  );
}
