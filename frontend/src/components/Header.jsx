import React, { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';

export default function Header({
  onSimulateClick,
  onSearch,
  searchQuery = '',
  onOpenMobileMenu,
  onOpenAuth,
  onOpenProfile,
  currentUser = null,
  connectionStatus = 'connected',
  isDemoMode = false,
  onRetryConnection,
  onToggleDemoMode
}) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [agentLogs, setAgentLogs] = useState([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [logsError, setLogsError] = useState(null);

  const getInitials = (name) => {
    if (!name) return 'OP';
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  };

  const fetchAgentLogs = useCallback(async () => {
    setLogsLoading(true);
    setLogsError(null);
    try {
      const data = await api.getAgentLogs();
      setAgentLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.warn('[Header] Error fetching agent logs:', err);
      setLogsError(err.message || 'Failed to fetch agent logs');
      setAgentLogs([]);
    } finally {
      setLogsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (showNotifications) {
      fetchAgentLogs();
    }
  }, [showNotifications, fetchAgentLogs]);

  // Initial fetch on mount to populate unread or count
  useEffect(() => {
    fetchAgentLogs();
  }, [fetchAgentLogs]);

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

          {/* Explicit Demo Data vs Live Mesh badge */}
          {isDemoMode ? (
            <span
              onClick={onToggleDemoMode}
              className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-xs cursor-pointer hover:bg-amber-200 transition-colors"
              title="Explicit Demo Data enabled. Click to switch to Live Backend."
            >
              <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse"></span>
              DEMO DATA
            </span>
          ) : (
            <span className="hidden md:inline px-3 py-0.5 rounded-full text-[11px] font-bold bg-powder-blue/40 text-[#17233B] border border-powder-blue/60 shadow-xs">
              Live Mesh
            </span>
          )}

          {/* Connection status indicator */}
          {connectionStatus === 'connected' && (
            <span className="hidden xl:flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              Backend Connected
            </span>
          )}

          {connectionStatus === 'checking' && (
            <span className="hidden xl:flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-800 border border-slate-300 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-slate-400 animate-ping"></span>
              Checking Backend...
            </span>
          )}

          {connectionStatus === 'disconnected' && !isDemoMode && (
            <button
              onClick={onRetryConnection}
              className="hidden xl:flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-900 border border-rose-300 shadow-xs hover:bg-rose-200 transition-colors"
              title="Click to retry connection"
            >
              <span className="w-2 h-2 rounded-full bg-rose-600"></span>
              Backend Disconnected (Retry)
            </button>
          )}
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
            <div className="absolute right-0 top-12 w-80 sm:w-96 max-w-[calc(100vw-2rem)] glass-panel rounded-2xl shadow-xl p-4 z-50 animate-in fade-in duration-150 border border-white">
              <div className="flex items-center justify-between pb-2 border-b border-[#E2E8F0] mb-2">
                <span className="text-xs font-bold text-[#17233B]">Recent Agent Telemetry Events</span>
                <div className="flex items-center gap-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isDemoMode
                      ? 'text-[#D96D4B] bg-sunset-peach/30'
                      : 'text-emerald-800 bg-emerald-100 border border-emerald-300'
                  }`}>
                    {isDemoMode ? 'Demo Stream' : 'Live Stream'}
                  </span>
                  <button
                    onClick={fetchAgentLogs}
                    className="p-1 rounded-full hover:bg-slate-100 text-[#475569] transition-colors"
                    title="Refresh Agent Logs"
                  >
                    <span className={`material-symbols-outlined text-[14px] ${logsLoading ? 'animate-spin' : ''}`}>
                      sync
                    </span>
                  </button>
                </div>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto text-xs pr-1">
                {logsLoading && agentLogs.length === 0 ? (
                  <div className="py-6 flex flex-col items-center justify-center gap-1.5 text-[#64748B]">
                    <span className="material-symbols-outlined text-[20px] animate-spin text-[#2563EB]">sync</span>
                    <span className="text-[11px] font-mono">Fetching telemetry events...</span>
                  </div>
                ) : logsError && agentLogs.length === 0 ? (
                  <div className="py-4 text-center text-rose-700 font-mono text-[11px] space-y-1">
                    <p>Failed to load events.</p>
                    <button
                      onClick={fetchAgentLogs}
                      className="px-2.5 py-1 rounded-lg bg-white border border-rose-200 text-rose-800 text-[10px] font-bold hover:bg-rose-50"
                    >
                      Retry
                    </button>
                  </div>
                ) : agentLogs.length === 0 ? (
                  <div className="py-6 text-center text-[#64748B] text-xs">
                    <span className="material-symbols-outlined text-2xl text-[#94A3B8] mb-1">notifications_off</span>
                    <p className="font-bold text-[#17233B]">No Recent Agent Events</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">Autonomous activity will appear here.</p>
                  </div>
                ) : (
                  agentLogs.slice(0, 10).map((log, idx) => {
                    const agentName = log.agent_name || log.agentName || 'Agent';
                    const status = (log.status || 'completed').toLowerCase();
                    const isErr = status === 'failed';
                    const isVerifier = agentName.toLowerCase().includes('verifier');
                    const iconName = isErr ? 'warning' : isVerifier ? 'verified' : 'smart_toy';
                    const iconColor = isErr
                      ? 'text-rose-600'
                      : isVerifier
                      ? 'text-powder-blue'
                      : 'text-[#2563EB]';
                    const summary =
                      log.output_summary ||
                      log.outputSummary ||
                      log.input_summary ||
                      log.inputSummary ||
                      log.action ||
                      log.details ||
                      'Telemetry event recorded';
                    const timestamp = log.timestamp || log.created_at || 'Just now';
                    const incidentTag = log.incident_id || log.incidentId;

                    return (
                      <div
                        key={log.id || `agent-log-${idx}`}
                        className="p-2.5 rounded-xl bg-white/90 border border-white flex items-start gap-2.5 shadow-xs hover:bg-white transition-colors"
                      >
                        <span className={`material-symbols-outlined text-[18px] shrink-0 mt-0.5 ${iconColor}`}>
                          {iconName}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-[#17233B] truncate">{agentName}</span>
                            {incidentTag && (
                              <span className="font-mono text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-[#475569] shrink-0">
                                {incidentTag}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#475569] font-medium mt-0.5 line-clamp-2 leading-relaxed">
                            {summary}
                          </div>
                          <div className="text-[10px] text-[#94A3B8] font-mono mt-1">
                            {timestamp}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Avatar */}
        <button
          onClick={currentUser ? onOpenProfile : onOpenAuth}
          className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full bg-white/90 hover:bg-white border border-white transition-all shadow-xs group cursor-pointer"
          title={currentUser ? `Operator: ${currentUser.name} (Click for Profile)` : "Sign In to SentinelMesh"}
        >
          {currentUser?.avatar_url ? (
            <img
              src={currentUser.avatar_url}
              alt={currentUser.name}
              className="w-7 h-7 rounded-full object-cover border border-white shadow-xs"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-[#17233B] text-white text-[11px] font-bold flex items-center justify-center shadow-xs">
              {currentUser ? getInitials(currentUser.name) : 'OP'}
            </div>
          )}
          <span className="text-xs font-bold text-[#17233B] hidden md:inline">
            {currentUser?.name || 'Sign In'}
          </span>
        </button>
      </div>
    </header>
  );
}
