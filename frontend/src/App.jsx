import React, { useState, useEffect } from 'react';
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
import { initialIncidents } from './data/mockData';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [incidents, setIncidents] = useState(initialIncidents);
  const [selectedIncident, setSelectedIncident] = useState(initialIncidents[0]);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    icon: 'check_circle',
    color: 'text-powder-blue'
  });

  const showToast = (message, icon = 'check_circle', color = 'text-powder-blue') => {
    setToast({
      visible: true,
      message,
      icon,
      color
    });
    setTimeout(() => {
      setToast(prev => ({ ...prev, visible: false }));
    }, 4000);
  };

  const syncIncidents = async () => {
    try {
      const data = await api.getIncidents();
      setIncidents(data);
      if (selectedIncident) {
        const updated = data.find(i => i.id === selectedIncident.id);
        if (updated) setSelectedIncident(updated);
      }
    } catch {
      // Fallback to local store
    }
  };

  useEffect(() => {
    syncIncidents();
  }, []);

  const handleSelectIncident = (inc) => {
    setSelectedIncident(inc);
    setActiveTab('investigation');
  };

  const handleInjectIncident = (newInc) => {
    setIncidents(prev => [newInc, ...prev]);
    setSelectedIncident(newInc);
    showToast(`Injected incident ${newInc.id} (${newInc.severity}) into active telemetry stream!`, 'bolt', 'text-sunset-peach');
  };

  const handleApprovePatch = (incidentId, notes) => {
    setIncidents(prev =>
      prev.map(i => (i.id === incidentId ? { ...i, status: 'recovered', pipelineAgent: 'Verifier Agent (Verified & Closed)' } : i))
    );
    syncIncidents();
  };

  const handleRejectPatch = (incidentId) => {
    setIncidents(prev =>
      prev.map(i => (i.id === incidentId ? { ...i, status: 'rejected', pipelineAgent: 'Repair Agent (Regenerating alternative)' } : i))
    );
    syncIncidents();
  };

  return (
    <div className="min-h-screen mesh-canvas text-deep-navy flex flex-col relative font-sans">
      {/* Floating Vertical Navigation Rail (Image 2 style) */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        incidentsCount={incidents.filter(i => i.status !== 'recovered').length}
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
        />

        {/* Viewport Content */}
        <main className="dashboard-main relative pt-24 min-h-screen w-full min-w-0 px-4 sm:px-6 lg:px-8 pb-12">
          {activeTab === 'overview' && (
            <Overview
              incidents={incidents}
              onSelectIncident={handleSelectIncident}
              onSimulateClick={() => setIsSimulateOpen(true)}
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          )}

          {activeTab === 'incidents' && (
            <IncidentsConsole
              incidents={incidents}
              onSelectIncident={handleSelectIncident}
              onSimulateClick={() => setIsSimulateOpen(true)}
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
            <AIAgentsFleet showToast={showToast} />
          )}

          {activeTab === 'patch-review' && (
            <PatchReview
              incidents={incidents}
              onSelectIncident={handleSelectIncident}
              showToast={showToast}
              onRefresh={syncIncidents}
            />
          )}

          {activeTab === 'verification' && (
            <VerificationView showToast={showToast} />
          )}

          {activeTab === 'audit-logs' && (
            <AuditLogs showToast={showToast} />
          )}

          {activeTab === 'settings' && (
            <Settings showToast={showToast} />
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

      {/* Login & Registration Modal (Section 5 of new_design.md) */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        showToast={showToast}
      />
    </div>
  );
}
