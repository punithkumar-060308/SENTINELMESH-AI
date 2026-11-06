import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import StatusBadge from './common/StatusBadge';
import ConfirmDialog from './common/ConfirmDialog';
import { EmptyState, LoadingState, DemoBadge } from './common/UIStates';

export default function PatchReview({ incidents, onSelectIncident, showToast, onRefresh }) {
  const [loading, setLoading] = useState(false);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' | 'history'
  
  // Confirmation dialogs
  const [dialogState, setDialogState] = useState({
    isOpen: false,
    type: null, // 'approve' | 'reject'
    incident: null
  });

  // Filter incidents having patches
  const pendingPatches = (incidents || []).filter(
    (inc) => inc.status === 'awaiting_approval' || inc.status === 'detected' || inc.status === 'investigating'
  );
  
  const historyPatches = (incidents || []).filter(
    (inc) => inc.status === 'approved' || inc.status === 'verifying' || inc.status === 'recovered' || inc.status === 'rejected' || inc.status === 'failed'
  );

  const displayedList = activeTab === 'pending' ? pendingPatches : historyPatches;

  // Selected incident
  const activeIncident = (incidents || []).find((i) => i.id === selectedIncidentId) || displayedList[0] || (incidents && incidents[0]);

  useEffect(() => {
    if (!selectedIncidentId && displayedList.length > 0) {
      setSelectedIncidentId(displayedList[0].id);
    }
  }, [displayedList, selectedIncidentId]);

  const handleOpenApprove = (inc) => {
    setDialogState({
      isOpen: true,
      type: 'approve',
      incident: inc
    });
  };

  const handleOpenReject = (inc) => {
    setDialogState({
      isOpen: true,
      type: 'reject',
      incident: inc
    });
  };

  const handleConfirmDecision = async (notes) => {
    const { type, incident } = dialogState;
    if (!incident) return;

    setDialogState({ isOpen: false, type: null, incident: null });
    setLoading(true);

    try {
      if (type === 'approve') {
        await api.approvePatch(incident.id, notes);
        showToast(`Patch approved for ${incident.id}! Sandbox verification initiated.`, 'verified_user', 'text-tertiary');
      } else {
        await api.rejectPatch(incident.id, notes);
        showToast(`Patch rejected for ${incident.id}. Repair agent notified.`, 'cancel', 'text-error');
      }
      if (onRefresh) onRefresh();
    } catch (err) {
      showToast(`Action failed: ${err.message}`, 'error', 'text-error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container-high/40">
        <div>
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">healing</span>
            <h1 className="font-headline-lg text-headline-lg text-on-surface font-semibold">
              Autonomous Patch Review & Approval
            </h1>
            <DemoBadge label="Human-in-the-Loop Gate" />
          </div>
          <p className="text-xs text-on-surface-variant font-mono mt-1">
            Zero-Trust Human Gate: Inspect synthesized patches, diffs, and AST validations before containerized execution.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center bg-surface-container-high p-1 rounded-lg border border-surface-container-highest/40 font-mono text-xs">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'pending'
                ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Pending Review</span>
            <span className="w-5 h-5 rounded-full bg-surface-container-lowest text-[10px] flex items-center justify-center font-bold">
              {pendingPatches.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-md transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-secondary-container text-on-secondary-container font-semibold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span>Audit History</span>
            <span className="w-5 h-5 rounded-full bg-surface-container-lowest text-[10px] flex items-center justify-center font-bold">
              {historyPatches.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid: List on Left, Detail & Diff on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg">
        {/* Left Column: Patches List (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-space-sm">
          <div className="flex items-center justify-between text-xs font-mono text-outline px-1">
            <span>{activeTab === 'pending' ? 'PROPOSED CANDIDATES' : 'HISTORICAL DECISIONS'}</span>
            <span>{displayedList.length} total</span>
          </div>

          {displayedList.length === 0 ? (
            <div className="bg-surface-container rounded-xl p-8 border border-surface-container-high/40 text-center font-mono">
              <span className="material-symbols-outlined text-4xl text-outline mb-2">task_alt</span>
              <p className="text-sm font-semibold text-on-surface">Queue is Clear</p>
              <p className="text-xs text-outline mt-1">
                {activeTab === 'pending'
                  ? 'No patches currently awaiting human approval.'
                  : 'No past patch decisions recorded yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayedList.map((inc) => {
                const isSelected = activeIncident && activeIncident.id === inc.id;
                const patchId = `PAT-${inc.id.replace('INC-', '')}`;

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-surface-container-high border-secondary/50 shadow-md ring-1 ring-secondary/20'
                        : 'bg-surface-container hover:bg-surface-container-high/70 border-surface-container-high/40'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-1.5 font-mono text-xs">
                        <span className="font-semibold text-secondary">{inc.id}</span>
                        <span className="text-outline">·</span>
                        <span className="text-primary font-bold text-[11px]">{patchId}</span>
                      </div>
                      <StatusBadge status={inc.status} />
                    </div>

                    <div className="font-sans font-medium text-xs text-on-surface line-clamp-1 mb-1">
                      {inc.title}
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px] text-outline mt-2 pt-2 border-t border-surface-container-high/40">
                      <span className="truncate max-w-[160px]">{inc.application}</span>
                      <span>{inc.detectedTime || 'Active'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Patch Inspection & Diff (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {activeIncident ? (
            <div className="bg-surface-container rounded-xl p-space-md border border-surface-container-high/50 shadow-xl flex flex-col gap-space-md">
              {/* Top Banner: Incident & Patch Info */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-sm border-b border-surface-container-high/40">
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    <span className="px-2 py-0.5 rounded bg-surface-container-high text-secondary font-semibold border border-surface-container-highest">
                      {activeIncident.id}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-primary-container/20 text-primary font-semibold border border-primary/20">
                      PAT-{activeIncident.id.replace('INC-', '')}
                    </span>
                    <StatusBadge status={activeIncident.status} />
                  </div>
                  <h2 className="font-headline-sm text-base text-on-surface font-semibold mt-1">
                    {activeIncident.title}
                  </h2>
                  <div className="text-xs font-mono text-outline flex items-center gap-2">
                    <span>App: <strong className="text-on-surface">{activeIncident.application}</strong></span>
                    <span>·</span>
                    <span>Target: <code className="text-secondary">{activeIncident.sourceFile || 'src/main/Handler.java:142'}</code></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  {activeIncident.status === 'awaiting_approval' || activeIncident.status === 'investigating' || activeIncident.status === 'detected' ? (
                    <>
                      <button
                        onClick={() => handleOpenReject(activeIncident)}
                        disabled={loading}
                        className="px-3 py-1.5 rounded bg-surface-container-high hover:bg-error-container hover:text-on-error-container text-error font-mono text-xs font-medium transition-all border border-surface-container-highest flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleOpenApprove(activeIncident)}
                        disabled={loading}
                        className="px-4 py-1.5 rounded bg-primary-container text-on-primary font-mono text-xs font-semibold hover:opacity-95 shadow-md flex items-center gap-1.5 transition-all"
                      >
                        <span className="material-symbols-outlined text-[16px]">play_circle</span>
                        <span>Approve & Verify</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="px-3 py-1 rounded bg-surface-container-high text-outline border border-surface-container-highest">
                        Decision Recorded ({activeIncident.status.toUpperCase()})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Workflow stage clarification banner */}
              <div className="bg-surface-container-low rounded-lg p-3 border border-secondary/20 flex items-start gap-2.5 text-xs font-mono">
                <span className="material-symbols-outlined text-secondary text-[20px] shrink-0">info</span>
                <div className="text-on-surface-variant">
                  <strong className="text-on-surface">Lifecycle Integrity:</strong> Approval triggers controlled execution inside an ephemeral Docker container. Independent verifier tests must report 100% pass before recovery is declared.
                </div>
              </div>

              {/* Repair Explanation & Root Cause */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-space-sm font-mono text-xs">
                <div className="bg-surface-container-low rounded-lg p-3 border border-surface-container-high/40 flex flex-col gap-1">
                  <span className="text-outline uppercase text-[10px] font-bold">Identified Root Cause</span>
                  <p className="text-on-surface-variant text-xs leading-relaxed font-sans mt-1">
                    {activeIncident.rootCause || "Missing defensive null check on payload evaluation, triggering fatal exception during high-volume webhook ingestion."}
                  </p>
                </div>
                <div className="bg-surface-container-low rounded-lg p-3 border border-surface-container-high/40 flex flex-col gap-1">
                  <span className="text-outline uppercase text-[10px] font-bold">Repair Agent Strategy</span>
                  <p className="text-on-surface-variant text-xs leading-relaxed font-sans mt-1">
                    Synthesized an explicit null-guard boundary with fallback to guest handling, safeguarding against malformed or missing customer objects.
                  </p>
                </div>
              </div>

              {/* Code Diff Viewer */}
              <div className="bg-surface-container-lowest rounded-xl border border-surface-container-high/50 overflow-hidden font-mono shadow-md">
                <div className="bg-surface-container-high px-3 py-2 flex items-center justify-between text-xs border-b border-surface-container-highest/40">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-primary">code</span>
                    <span className="text-on-surface font-semibold">Diff Viewer</span>
                    <span className="text-outline">|</span>
                    <span className="text-outline text-[11px]">{activeIncident.sourceFile || "StripeWebhookHandler.java:142"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-error font-bold">-2 lines</span>
                    <span className="text-tertiary font-bold">+5 lines</span>
                  </div>
                </div>

                <div className="p-3 text-[12px] overflow-x-auto space-y-0.5">
                  <div className="flex text-outline py-0.5">
                    <span className="w-10 select-none text-right pr-3 text-outline/60 text-[11px]">139</span>
                    <span className="text-on-surface-variant">public void processEvent(StripeWebhookPayload payload) {'{'}</span>
                  </div>
                  <div className="flex text-outline py-0.5">
                    <span className="w-10 select-none text-right pr-3 text-outline/60 text-[11px]">140</span>
                    <span className="text-on-surface-variant">    Objects.requireNonNull(payload, "Payload cannot be null");</span>
                  </div>
                  <div className="flex bg-error-container/20 text-on-error-container py-0.5 rounded">
                    <span className="w-10 select-none text-right pr-3 text-error font-bold text-[11px]">141</span>
                    <span className="font-semibold"><span className="text-error font-bold mr-2">-</span>    String customerId = payload.getCustomer().getId();</span>
                  </div>
                  <div className="flex bg-error-container/20 text-on-error-container py-0.5 rounded">
                    <span className="w-10 select-none text-right pr-3 text-error font-bold text-[11px]">142</span>
                    <span className="font-semibold"><span className="text-error font-bold mr-2">-</span>    billingService.recordTransaction(customerId, payload.getAmount());</span>
                  </div>
                  <div className="flex bg-tertiary-container/20 text-on-tertiary-container py-0.5 rounded">
                    <span className="w-10 select-none text-right pr-3 text-tertiary font-bold text-[11px]">141</span>
                    <span className="font-semibold"><span className="text-tertiary font-bold mr-2">+</span>    // Defensive null-guard for guest checkout invoices</span>
                  </div>
                  <div className="flex bg-tertiary-container/20 text-on-tertiary-container py-0.5 rounded">
                    <span className="w-10 select-none text-right pr-3 text-tertiary font-bold text-[11px]">142</span>
                    <span className="font-semibold"><span className="text-tertiary font-bold mr-2">+</span>    String customerId = (payload.getCustomer() != null)</span>
                  </div>
                  <div className="flex bg-tertiary-container/20 text-on-tertiary-container py-0.5 rounded">
                    <span className="w-10 select-none text-right pr-3 text-tertiary font-bold text-[11px]">143</span>
                    <span className="font-semibold"><span className="text-tertiary font-bold mr-2">+</span>        ? payload.getCustomer().getId()</span>
                  </div>
                  <div className="flex bg-tertiary-container/20 text-on-tertiary-container py-0.5 rounded">
                    <span className="w-10 select-none text-right pr-3 text-tertiary font-bold text-[11px]">144</span>
                    <span className="font-semibold"><span className="text-tertiary font-bold mr-2">+</span>        : "GUEST_CHECKOUT_" + payload.getInvoiceId();</span>
                  </div>
                  <div className="flex bg-tertiary-container/20 text-on-tertiary-container py-0.5 rounded">
                    <span className="w-10 select-none text-right pr-3 text-tertiary font-bold text-[11px]">145</span>
                    <span className="font-semibold"><span className="text-tertiary font-bold mr-2">+</span>    billingService.recordTransaction(customerId, payload.getAmount());</span>
                  </div>
                  <div className="flex text-outline py-0.5">
                    <span className="w-10 select-none text-right pr-3 text-outline/60 text-[11px]">146</span>
                    <span className="text-on-surface-variant">{'}'}</span>
                  </div>
                </div>
              </div>

              {/* Safety & Risk Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
                <div className="bg-surface-container-low p-2 rounded-lg border border-surface-container-high/40">
                  <span className="text-outline text-[10px] block">Syntactic Risk</span>
                  <span className="text-tertiary font-bold">0.2% (Minimal)</span>
                </div>
                <div className="bg-surface-container-low p-2 rounded-lg border border-surface-container-high/40">
                  <span className="text-outline text-[10px] block">Database Schema</span>
                  <span className="text-tertiary font-bold">Zero DB Ops</span>
                </div>
                <div className="bg-surface-container-low p-2 rounded-lg border border-surface-container-high/40">
                  <span className="text-outline text-[10px] block">Regression Baseline</span>
                  <span className="text-secondary font-bold">Master Frozen</span>
                </div>
                <div className="bg-surface-container-low p-2 rounded-lg border border-surface-container-high/40">
                  <span className="text-outline text-[10px] block">Automated Rollback</span>
                  <span className="text-on-surface font-bold">&lt; 15 seconds</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-surface-container rounded-xl p-12 text-center text-outline font-mono border border-surface-container-high/40">
              Select an incident patch from the left column to inspect diffs and telemetry.
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        variant={dialogState.type === 'reject' ? 'danger' : 'primary'}
        title={dialogState.type === 'approve' ? 'Confirm Patch Approval' : 'Confirm Patch Rejection'}
        message={
          dialogState.type === 'approve'
            ? 'Approving will record your cryptographic signature in the audit ledger and dispatch the patch for execution in an isolated Docker sandbox.'
            : 'Rejecting will halt this patch candidate and instruct the Repair Agent to generate an alternative fix or escalate.'
        }
        warning={
          dialogState.type === 'approve'
            ? 'Approving triggers sandbox execution. Recovery will only be declared after independent test verification.'
            : null
        }
        details={dialogState.incident ? {
          incidentId: dialogState.incident.id,
          patchId: `PAT-${dialogState.incident.id.replace('INC-', '')}`,
          service: dialogState.incident.application,
          file: dialogState.incident.sourceFile || 'StripeWebhookHandler.java:142'
        } : null}
        confirmLabel={dialogState.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        requiresNote={dialogState.type === 'approve'}
        notePlaceholder={dialogState.type === 'approve' ? 'Add sign-off notes (optional)...' : 'Additional comments...'}
        reasons={dialogState.type === 'reject' ? [
          'Patch introduces risk',
          'Root cause incorrect',
          'Needs manual fix',
          'Other'
        ] : null}
        onConfirm={handleConfirmDecision}
        onCancel={() => setDialogState({ isOpen: false, type: null, incident: null })}
      />
    </div>
  );
}

