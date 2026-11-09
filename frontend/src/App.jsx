import React, { useState, useEffect, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Overview from './components/Overview';
import IncidentsConsole from './components/IncidentsConsole';
import IncidentInvestigation from './components/IncidentInvestigation';
import AIAgentsFleet from './components/AIAgentsFleet';
import PatchReview from './components/PatchReview';
import VerificationView from './components/VerificationView';
import AuditLogs from './components/AuditLogs';
import Settings from './components/Settings';
import UserProfile from './components/UserProfile';
import SimulateIncidentModal from './components/SimulateIncidentModal';
import AuthModal from './components/AuthModal';
import { initialIncidents, fleetAgents as defaultFleetAgents } from './data/mockData';
import { api, ApiError } from './services/api';
import { LoadingState } from './components/common/UIStates';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [isDemoMode, setIsDemoMode] = useState(() => api.isDemoMode());
  const [connectionStatus, setConnectionStatus] = useState('checking'); // 'connected' | 'disconnected' | 'checking'
  const [apiError, setApiError] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [incidents, setIncidents] = useState(() => (api.isDemoMode() ? initialIncidents : []));
  const [fleetAgents, setFleetAgents] = useState(() => (api.isDemoMode() ? defaultFleetAgents : []));
  const [selectedIncident, setSelectedIncident] = useState(() => (api.isDemoMode() ? initialIncidents[0] : null));

  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(() => api.getStoredUser());
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Check and refresh authenticated session on mount
  useEffect(() => {
    if (api.getAuthToken()) {
      api.getProfile()
        .then((user) => setCurrentUser(user))
        .catch((err) => {
          console.warn('[SentinelMesh App] Session check:', err.message);
          if (err.status === 401) {
            setCurrentUser(null);
          }
        });
    }
  }, []);

  // Toast notification state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    icon: 'check_circle',
    color: 'text-powder-blue',
  });

  const showToast = (message, icon = 'check_circle', color = 'text-powder-blue') => {
    setToast({
      visible: true,
      message,
      icon,
      color,
    });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 4000);
  };

  /**
   * Synchronize incidents from live backend or explicit demo store.
   * Never silently falls back to mock data when backend fails.
   */
  const syncIncidents = useCallback(async (isSilent = false) => {
    if (!isSilent) {
      setIsLoading(true);
      setConnectionStatus('checking');
    }

    try {
      // 1. Verify health & connectivity
      await api.getHealth();

      // 2. Fetch incidents and live fleet agents concurrently
      const [incidentData, fleetData] = await Promise.all([
        api.getIncidents(),
        api.getFleetAgents().catch((err) => {
          console.warn('[SentinelMesh App] Fleet agents warning:', err);
          return [];
        }),
      ]);

      const incidentList = Array.isArray(incidentData) ? incidentData : [];
      const fleetList = Array.isArray(fleetData) ? fleetData : [];
      setIncidents(incidentList);
      setFleetAgents(fleetList);
      setConnectionStatus('connected');
      setApiError(null);

      setSelectedIncident((prev) => {
        if (!prev && incidentList.length > 0) return incidentList[0];
        if (prev) {
          const updated = incidentList.find((i) => i.id === prev.id);
          return updated || incidentList[0] || null;
        }
        return null;
      });
    } catch (err) {
      if (!isSilent) {
        console.error('[SentinelMesh API Error] Failed to fetch incidents:', {
          message: err.message,
          status: err.status,
          endpoint: err.endpoint,
          stack: err.stack,
        });

        setConnectionStatus('disconnected');
        setApiError(err.message || 'Unable to communicate with SentinelMesh backend');

        if (!api.isDemoMode()) {
          // Do not silently load mock data in live mode
          setIncidents([]);
          setSelectedIncident(null);
        }
      }
    } finally {
      if (!isSilent) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    // Initial fetch
    syncIncidents(false);

    // Live real-time background polling every 2.5 seconds
    const interval = setInterval(() => {
      syncIncidents(true);
    }, 2500);

    return () => clearInterval(interval);
  }, [syncIncidents]);

  const handleToggleDemoMode = () => {
    const nextMode = !isDemoMode;
    api.setDemoMode(nextMode);
    setIsDemoMode(nextMode);

    if (nextMode) {
      setConnectionStatus('connected');
      setApiError(null);
      setIncidents(initialIncidents);
      setSelectedIncident(initialIncidents[0]);
      showToast('Switched to EXPLICIT DEMO DATA mode', 'info', 'text-amber-500');
    } else {
      showToast('Connecting to Live Backend...', 'sync', 'text-powder-blue');
      syncIncidents();
    }
  };

  const handleSelectIncident = (inc) => {
    setSelectedIncident(inc);
    setActiveTab('investigation');
  };

  const handleInjectIncident = async (newInc) => {
    try {
      const created = await api.simulateIncident(newInc);
      await syncIncidents();
      setSelectedIncident(created);
      showToast(
        `Injected incident ${created.id || newInc.id} (${created.severity || newInc.severity}) into active telemetry stream!`,
        'bolt',
        'text-sunset-peach'
      );
    } catch (err) {
      console.error('[SentinelMesh] Incident simulation error:', err);
      showToast(`Simulation failed: ${err.message}`, 'error', 'text-rose-500');
    }
  };

  const handleApprovePatch = async (incidentId, notes) => {
    setSelectedIncident((prev) => (prev && prev.id === incidentId ? { ...prev, status: 'recovered' } : prev));
    await syncIncidents();
  };

  const handleRejectPatch = async (incidentId) => {
    setSelectedIncident((prev) => (prev && prev.id === incidentId ? { ...prev, status: 'rejected' } : prev));
    await syncIncidents();
  };

  const [pendingAction, setPendingAction] = useState(null);

  /**
   * Reusable Authentication Guard:
   * If user is authenticated, executes action immediately.
   * If user is unauthenticated, stores intended action in pendingAction,
   * displays a friendly notice, and opens AuthModal without loops or redundant popups.
   */
  const requireAuth = useCallback((action, options = {}) => {
    if (currentUser) {
      if (typeof action === 'function') action();
      return true;
    }

    if (typeof action === 'function') {
      setPendingAction(() => action);
    }

    if (options.message) {
      showToast(options.message, 'lock', 'text-amber-500');
    }

    if (!isAuthOpen) {
      setIsAuthOpen(true);
    }
    return false;
  }, [currentUser, isAuthOpen]);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    setIsAuthOpen(false);

    if (pendingAction) {
      const actionToRun = pendingAction;
      setPendingAction(null);
      try {
        actionToRun();
      } catch (err) {
        console.warn('[SentinelMesh AuthGuard] Error replaying action:', err);
      }
    } else if (activeTab !== 'profile') {
      setActiveTab('overview');
    }
  };

  const handleLogout = async () => {
    try {
      await api.logout();
    } catch (err) {
      console.warn('[SentinelMesh App] Logout error:', err);
    }
    setCurrentUser(null);
    showToast('Logged out of SentinelMesh.', 'logout', 'text-deep-navy');
    if (activeTab === 'profile') {
      setActiveTab('overview');
    }
  };

  const renderProtectedTab = (tabName, component) => {
    if (currentUser) {
      return component;
    }
    return (
      <div className="glass-panel rounded-3xl p-8 max-w-md mx-auto text-center space-y-4 my-12 border border-white/80 shadow-glass animate-in fade-in duration-200">
        <div className="w-16 h-16 rounded-2xl bg-powder-blue/30 text-deep-navy mx-auto flex items-center justify-center">
          <span className="material-symbols-outlined text-[32px]">shield_person</span>
        </div>
        <h2 className="text-xl font-bold text-deep-navy">Operator Authentication Required</h2>
        <p className="text-xs text-muted-slate">
          Access to {tabName} is restricted to verified SentinelMesh SRE operators.
        </p>
        <button
          onClick={() => requireAuth(() => setActiveTab(activeTab))}
          className="px-6 py-2.5 bg-deep-navy text-white text-xs font-bold rounded-xl shadow-md hover:bg-deep-navy/90 transition-all cursor-pointer"
        >
          Sign In to Continue
        </button>
      </div>
    );
  };

  return (
    <div className="min-h-screen mesh-canvas text-deep-navy flex flex-col relative font-sans">
      {/* Floating Vertical Navigation Rail */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        incidentsCount={incidents.filter((i) => i.status !== 'recovered').length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthOpen(true)}
        requireAuth={requireAuth}
      />

      {/* Main Content Area */}
      <div className="lg:pl-28 flex-1 flex flex-col min-w-0">
        {/* Floating Horizontal Header */}
        <Header
          onSimulateClick={() => requireAuth(() => setIsSimulateOpen(true))}
          onSearch={(query) => {
            setSearchQuery(query);
            requireAuth(() => setActiveTab('incidents'));
          }}
          searchQuery={searchQuery}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
          onOpenProfile={() => requireAuth(() => setActiveTab('profile'))}
          currentUser={currentUser}
          connectionStatus={connectionStatus}
          isDemoMode={isDemoMode}
          onRetryConnection={syncIncidents}
          onToggleDemoMode={handleToggleDemoMode}
        />

        {/* Viewport Content */}
        <main className="dashboard-main relative pt-24 min-h-screen w-full min-w-0 px-4 sm:px-6 lg:px-8 pb-12">
          {/* Disconnected Banner: Unobtrusive alert when backend is unreachable in live mode */}
          {connectionStatus === 'disconnected' && !isDemoMode && (
            <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-deep-navy flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2.5">
                <span className="material-symbols-outlined text-rose-600 text-[22px]">wifi_off</span>
                <div>
                  <p className="text-xs font-bold text-rose-900">Backend Disconnected</p>
                  <p className="text-[11px] text-rose-700 font-mono mt-0.5">
                    {apiError || `Failed to reach FastAPI server at ${api.getBaseUrl() || 'http://localhost:8000'}`}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={syncIncidents}
                  className="px-3.5 py-1.5 rounded-full bg-rose-600 text-white font-bold text-xs hover:bg-rose-700 transition-colors shadow-xs"
                >
                  Retry Connection
                </button>
                <button
                  onClick={handleToggleDemoMode}
                  className="px-3.5 py-1.5 rounded-full bg-white text-rose-900 border border-rose-300 font-bold text-xs hover:bg-rose-100 transition-colors shadow-xs"
                >
                  Switch to Demo Data
                </button>
              </div>
            </div>
          )}

          {/* Loading indicator when connecting initially */}
          {isLoading && incidents.length === 0 && connectionStatus === 'checking' ? (
            <LoadingState message="Connecting to SentinelMesh AI backend..." />
          ) : (
            <>
              {activeTab === 'overview' && (
                <>
                  {!currentUser && (
                    <div className="mb-6 p-4 rounded-2xl bg-powder-blue/20 border border-powder-blue/60 text-deep-navy flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in duration-200">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-deep-navy text-[22px]">lock_open</span>
                        <div>
                          <p className="text-xs font-bold text-deep-navy">Visitor Mode — Public Telemetry Overview</p>
                          <p className="text-[11px] text-muted-slate mt-0.5">
                            Sign in or create an operator account to approve patches, run Docker verification, or inject simulated incidents.
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => requireAuth(() => setActiveTab('overview'))}
                        className="px-4 py-2 rounded-xl bg-deep-navy text-white text-xs font-bold shadow-sm hover:bg-deep-navy/90 transition-all cursor-pointer shrink-0"
                      >
                        Sign In / Register
                      </button>
                    </div>
                  )}
                  <Overview
                    incidents={incidents}
                    fleetAgents={fleetAgents}
                    onSelectIncident={(inc) => requireAuth(() => handleSelectIncident(inc))}
                    onSimulateClick={() => requireAuth(() => setIsSimulateOpen(true))}
                    onNavigateTab={(tab) => tab === 'overview' ? setActiveTab('overview') : requireAuth(() => setActiveTab(tab))}
                    isDemoMode={isDemoMode}
                  />
                </>
              )}

              {activeTab === 'incidents' && renderProtectedTab(
                'Incidents Console',
                <IncidentsConsole
                  incidents={incidents}
                  onSelectIncident={(inc) => requireAuth(() => handleSelectIncident(inc))}
                  onSimulateClick={() => requireAuth(() => setIsSimulateOpen(true))}
                  isDemoMode={isDemoMode}
                />
              )}

              {activeTab === 'investigation' && renderProtectedTab(
                'Incident Investigation',
                <IncidentInvestigation
                  incident={selectedIncident}
                  onBack={() => setActiveTab('incidents')}
                  onApprovePatch={(incidentId, notes) => requireAuth(() => handleApprovePatch(incidentId, notes))}
                  onRejectPatch={(incidentId) => requireAuth(() => handleRejectPatch(incidentId))}
                  showToast={showToast}
                />
              )}

              {activeTab === 'agents' && renderProtectedTab(
                'AI Agents Fleet',
                <AIAgentsFleet
                  showToast={showToast}
                  fleetAgents={fleetAgents}
                  isDemoMode={isDemoMode}
                />
              )}

              {activeTab === 'patch-review' && renderProtectedTab(
                'Patch Review & Human Gate',
                <PatchReview
                  incidents={incidents}
                  onSelectIncident={(inc) => requireAuth(() => handleSelectIncident(inc))}
                  showToast={showToast}
                  onRefresh={syncIncidents}
                  isDemoMode={isDemoMode}
                />
              )}

              {activeTab === 'verification' && renderProtectedTab(
                'Docker Sandbox Verification',
                <VerificationView showToast={showToast} incidents={incidents} />
              )}

              {activeTab === 'audit-logs' && renderProtectedTab(
                'Immutable Audit Logs',
                <AuditLogs showToast={showToast} />
              )}

              {activeTab === 'settings' && renderProtectedTab(
                'Platform Settings',
                <Settings
                  showToast={showToast}
                  onResetData={() => requireAuth(() => {
                    setIncidents([]);
                    setSelectedIncident(null);
                  })}
                />
              )}

              {activeTab === 'profile' && renderProtectedTab(
                'Operator Profile',
                <UserProfile
                  currentUser={currentUser}
                  onUpdateUser={setCurrentUser}
                  onLogout={handleLogout}
                  showToast={showToast}
                  onNavigateTab={setActiveTab}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Floating Toast Notification (Frosted Pill) */}
      <div
        className={`fixed bottom-5 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 transform transition-all duration-300 pointer-events-none ${
          toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
        }`}
      >
        <div className="mx-auto sm:mx-0 w-fit max-w-full glass-panel text-deep-navy px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/90">
          <span className={`material-symbols-outlined text-[20px] ${toast.color}`}>{toast.icon}</span>
          <span className="font-sans font-semibold text-xs break-words">{toast.message}</span>
        </div>
      </div>

      {/* Simulate Incident Modal */}
      <SimulateIncidentModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onInjectIncident={handleInjectIncident}
      />

      {/* Login & Registration Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        showToast={showToast}
        onLoginSuccess={handleLoginSuccess}
      />
    </div>
  );
}
