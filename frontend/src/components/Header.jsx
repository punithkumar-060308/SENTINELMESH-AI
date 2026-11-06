import React, { useState } from 'react';

export default function Header({
  onSimulateClick,
  onSearch,
  searchQuery = '',
  onOpenMobileMenu,
  onOpenAuth
}) {
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="fixed top-4 left-4 lg:left-32 right-4 lg:right-6 h-16 z-40 glass-panel rounded-2xl px-4 sm:px-6 flex items-center justify-between gap-3 shadow-glass">
      {/* Left: Mobile Toggle + Brand & Environment status */}
      <div className="flex items-center gap-3">
        {/* Mobile Hamburger Button */}
        <button
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 rounded-xl text-[#17233B] hover:bg-white/80 transition-colors"
          aria-label="Open navigation menu"
        >
          <span className="material-symbols-outlined text-[22px]">menu</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-extrabold text-sm text-[#17233B] tracking-tight hidden sm:inline">
            SentinelMesh AI
          </span>
          <span className="hidden md:inline px-3 py-0.5 rounded-full text-[11px] font-bold bg-powder-blue/40 text-[#17233B] border border-powder-blue/60 shadow-xs">
            Demo Mesh
          </span>
          <span className="hidden xl:flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
            All Systems Normal
          </span>
        </div>
      </div>

      {/* Global Search Bar (Floating Pill) */}
      <div className="hidden md:flex items-center flex-1 max-w-md mx-4 relative">
        <span className="material-symbols-outlined absolute left-3.5 text-[18px] text-[#475569] pointer-events-none">
          search
        </span>
        <input
          value={searchQuery}
          onChange={(e) => onSearch(e.target.value)}
          className="w-full pl-10 pr-12 py-2 bg-white/90 hover:bg-white border border-white rounded-full text-xs text-[#17233B] font-medium placeholder:text-[#64748B] focus:outline-none focus:ring-2 focus:ring-powder-blue focus:bg-white transition-all shadow-xs"
          placeholder="Search incidents, telemetry, traces..."
          type="text"
        />
        <kbd className="absolute right-3 px-2 py-0.5 rounded-md bg-white border border-[#CBD5E1] font-mono text-[10px] text-[#475569] font-bold shadow-xs">
          ⌘K
        </kbd>
      </div>

      {/* Header Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        {/* Simulate Incident Button */}
        <button
          onClick={onSimulateClick}
          aria-label="Simulate incident"
          className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-sunset-peach to-powder-blue hover:opacity-95 text-[#17233B] font-bold text-xs transition-all shadow-sm active:scale-95 border border-white"
        >
          <span className="material-symbols-outlined text-[16px] text-[#17233B]">bolt</span>
          <span className="hidden sm:inline">Simulate Incident</span>
        </button>

        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="w-9 h-9 rounded-full bg-white/90 hover:bg-white text-[#17233B] flex items-center justify-center transition-colors border border-white shadow-xs relative"
            title="Notifications"
          >
            <span className="material-symbols-outlined text-[20px]">notifications</span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sunset-peach animate-ping"></span>
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-sunset-peach"></span>
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] glass-panel rounded-2xl shadow-xl p-4 z-50 animate-in fade-in duration-150 border border-white">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] mb-2">
                <span className="text-xs font-bold text-[#17233B]">Recent Telemetry Events</span>
                <span className="text-[10px] font-bold text-[#D96D4B] bg-sunset-peach/30 px-2 py-0.5 rounded-full">Demo Stream</span>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto text-xs">
                <div className="p-2.5 rounded-xl bg-white/90 border border-white flex items-start gap-2 shadow-xs">
                  <span className="material-symbols-outlined text-sunset-peach text-[18px] shrink-0 mt-0.5">warning</span>
                  <div>
                    <div className="font-bold text-[#17233B]">NullPointer in StripeWebhook</div>
                    <div className="text-[11px] text-[#475569] font-medium mt-0.5">Automated patch proposed by Repair Agent</div>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-white/90 border border-white flex items-start gap-2 shadow-xs">
                  <span className="material-symbols-outlined text-powder-blue text-[18px] shrink-0 mt-0.5">verified</span>
                  <div>
                    <div className="font-bold text-[#17233B]">Verification Passed</div>
                    <div className="text-[11px] text-[#475569] font-medium mt-0.5">14/14 test suites OK in sandbox-992</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <button
          onClick={onOpenAuth}
          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/90 hover:bg-white border border-white transition-all shadow-xs group"
          title="Operator Profile"
        >
          <div className="w-7 h-7 rounded-full bg-[#17233B] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
            EV
          </div>
          <span className="text-xs font-bold text-[#17233B] hidden md:inline">
            Elena Vance
          </span>
        </button>
      </div>
    </header>
  );
}
