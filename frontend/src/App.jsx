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
import { initialIncidents } from './data/mockData';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [incidents, setIncidents] = useState(initialIncidents);
  const [selectedIncident, setSelectedIncident] = useState(initialIncidents[0]);
  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Toast notification state
  const [toast, setToast] = useState({
    visible: false,
    message: '',
    icon: 'check_circle',
    color: 'text-secondary'
  });

  const showToast = (message, icon = 'check_circle', color = 'text-secondary') => {
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
      // Fallback
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
    showToast(`Injected incident ${newInc.id} (${newInc.severity}) into active telemetry stream!`, 'bolt', 'text-error');
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
    <div className="min-h-screen bg-surface-dim text-on-surface flex">
      {/* Fixed Sidebar with responsive mobile drawer support */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        incidentsCount={incidents.filter(i => i.status !== 'recovered').length}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex-1 flex flex-col min-w-0">
        {/* Fixed Header */}
        <Header
          onSimulateClick={() => setIsSimulateOpen(true)}
          onSearch={(query) => {
            setSearchQuery(query);
            if (activeTab !== 'incidents') setActiveTab('incidents');
          }}
          searchQuery={searchQuery}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
        />

        {/* Viewport Content */}
        <main className="dashboard-main relative pt-16 bg-surface-dim min-h-screen w-full min-w-0 px-3 py-5 sm:px-4 lg:px-6 xl:px-8">
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

      {/* Floating Toast Notification */}
      <div
        className={`fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 z-50 transform transition-all duration-300 pointer-events-none ${
          toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0'
        }`}
      >
        <div className="mx-auto sm:mx-0 w-fit max-w-full bg-surface-container-highest text-on-surface px-4 py-3 rounded-lg shadow-2xl flex items-center gap-3 border border-surface-container-high">
          <span className={`material-symbols-outlined ${toast.color}`}>{toast.icon}</span>
          <span className="font-body-sm text-body-sm font-medium text-xs font-mono break-words">{toast.message}</span>
        </div>
      </div>

      {/* Simulate Incident Modal */}
      <SimulateIncidentModal
        isOpen={isSimulateOpen}
        onClose={() => setIsSimulateOpen(false)}
        onInjectIncident={handleInjectIncident}
      />
    </div>
  );
}
