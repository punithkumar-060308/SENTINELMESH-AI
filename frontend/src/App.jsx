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
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
  const syncIncidents = useCallback(async () => {
    setIsLoading(true);
    setConnectionStatus('checking');

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
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    syncIncidents();
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
    await syncIncidents();
  };

  const handleRejectPatch = async (incidentId) => {
    await syncIncidents();
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
      />

      {/* Main Content Area */}
      <div className="lg:pl-28 flex-1 flex flex-col min-w-0">
        {/* Floating Horizontal Header */}
        <Header
          onSimulateClick={() => setIsSimulateOpen(true)}
          onSearch={(query) => {
            setSearchQuery(query);
            if (activeTab !== 'incidents') setActiveTab('incidents');
          }}
          searchQuery={searchQuery}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          onOpenAuth={() => setIsAuthOpen(true)}
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
                <Overview
                  incidents={incidents}
                  fleetAgents={fleetAgents}
                  onSelectIncident={handleSelectIncident}
                  onSimulateClick={() => setIsSimulateOpen(true)}
                  onNavigateTab={(tab) => setActiveTab(tab)}
                  isDemoMode={isDemoMode}
                />
              )}

              {activeTab === 'incidents' && (
                <IncidentsConsole
                  incidents={incidents}
                  onSelectIncident={handleSelectIncident}
                  onSimulateClick={() => setIsSimulateOpen(true)}
                  isDemoMode={isDemoMode}
                />
              )}

              {activeTab === 'investigation' && (
                <IncidentInvestigation
                  incident={selectedIncident}
                  onBack={() => setActiveTab('incidents')}
                  onApprovePatch={handleApprovePatch}
                  onRejectPatch={handleRejectPatch}
                  showToast={showToast}
                />
              )}

              {activeTab === 'agents' && (
                <AIAgentsFleet
                  showToast={showToast}
                  fleetAgents={fleetAgents}
                  isDemoMode={isDemoMode}
                />
              )}

              {activeTab === 'patch-review' && (
                <PatchReview
                  incidents={incidents}
                  onSelectIncident={handleSelectIncident}
                  showToast={showToast}
                  onRefresh={syncIncidents}
                  isDemoMode={isDemoMode}
                />
              )}

              {activeTab === 'verification' && (
                <VerificationView showToast={showToast} incidents={incidents} />
              )}

              {activeTab === 'audit-logs' && <AuditLogs showToast={showToast} />}

              {activeTab === 'settings' && <Settings showToast={showToast} />}
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
      <AuthModal isOpen={isAuthOpen} onClose={() => setIsAuthOpen(false)} showToast={showToast} />
    </div>
  );
}
