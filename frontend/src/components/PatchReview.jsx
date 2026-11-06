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
    <div className="flex flex-col w-full gap-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 pb-6 border-b border-[#CBD5E1]">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2 font-mono text-xs">
            <span className="px-3 py-0.5 rounded-full bg-powder-blue/40 text-[#17233B] font-bold uppercase tracking-wider border border-powder-blue/60 shadow-xs">
              Zero-Trust Verification
            </span>
            <span className="text-[#94A3B8]">|</span>
            <DemoBadge label="Human-in-the-Loop Gate" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-black text-[#17233B] tracking-tight">
            Autonomous Patch Review & Approval
          </h1>
          <p className="mt-2 text-sm text-[#334155] font-medium leading-relaxed max-w-3xl">
            Zero-Trust Human Gate: Inspect synthesized patches, AST diffs, and verification guarantees before sandbox execution.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center glass-panel p-1.5 rounded-full border border-white shadow-xs font-mono text-xs self-start lg:self-auto">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 font-bold ${
              activeTab === 'pending'
                ? 'bg-[#17233B] text-white shadow-sm'
                : 'text-[#475569] hover:text-[#17233B]'
            }`}
          >
            <span>Pending Review</span>
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
              activeTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#475569]'
            }`}>
              {pendingPatches.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-full transition-all flex items-center gap-2 font-bold ${
              activeTab === 'history'
                ? 'bg-[#17233B] text-white shadow-sm'
                : 'text-[#475569] hover:text-[#17233B]'
            }`}
          >
            <span>Audit History</span>
            <span className={`w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-bold ${
              activeTab === 'history' ? 'bg-white/20 text-white' : 'bg-slate-200 text-[#475569]'
            }`}>
              {historyPatches.length}
            </span>
          </button>
        </div>
      </div>

      {/* Main Grid: List on Left, Detail & Diff on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Patches List (4 cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="flex items-center justify-between text-xs font-bold font-mono text-[#475569] uppercase tracking-wider px-1">
            <span>{activeTab === 'pending' ? 'PROPOSED CANDIDATES' : 'HISTORICAL DECISIONS'}</span>
            <span className="bg-white/80 px-2 py-0.5 rounded-full border border-white text-[11px]">{displayedList.length} total</span>
          </div>

          {displayedList.length === 0 ? (
            <div className="glass-panel rounded-3xl p-8 border border-white text-center font-mono shadow-glass">
              <span className="material-symbols-outlined text-4xl text-[#94A3B8] mb-2">task_alt</span>
              <p className="text-sm font-bold text-[#17233B]">Queue is Clear</p>
              <p className="text-xs text-[#64748B] mt-1">
                {activeTab === 'pending'
                  ? 'No patches currently awaiting human approval.'
                  : 'No past patch decisions recorded yet.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {displayedList.map((inc) => {
                const isSelected = activeIncident && activeIncident.id === inc.id;
                const patchId = `PAT-${inc.id.replace('INC-', '')}`;

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncidentId(inc.id)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-white border-2 border-[#8DB9F0] shadow-glass ring-2 ring-[#8DB9F0]/30'
                        : 'glass-panel glass-panel-hover border-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 font-mono text-xs">
                        <span className="font-bold text-[#17233B]">{inc.id}</span>
                        <span className="text-[#94A3B8]">·</span>
                        <span className="text-[#2563EB] bg-powder-blue/25 px-2 py-0.5 rounded-md font-bold text-[11px]">
                          {patchId}
                        </span>
                      </div>
                      <StatusBadge status={inc.status} />
                    </div>

                    <div className="font-sans font-semibold text-xs text-[#17233B] line-clamp-1 mb-2">
                      {inc.title}
                    </div>

                    <div className="flex items-center justify-between font-mono text-[11px] text-[#64748B] pt-2 border-t border-slate-100">
                      <span className="truncate max-w-[160px] font-medium">{inc.application}</span>
                      <span>{inc.detectedTime || 'Active'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Active Patch Inspection & Diff (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-6">
          {activeIncident ? (
            <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white shadow-glass flex flex-col gap-6">
              {/* Top Banner: Incident & Patch Info */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-6 border-b border-[#CBD5E1]">
                <div className="flex flex-col gap-2 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                    <span className="px-2.5 py-1 rounded-lg bg-white text-[#17233B] font-bold border border-[#CBD5E1] shadow-xs">
                      {activeIncident.id}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-powder-blue/30 text-[#17233B] font-bold border border-powder-blue/50">
                      PAT-{activeIncident.id.replace('INC-', '')}
                    </span>
                    <StatusBadge status={activeIncident.status} />
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-[#17233B] tracking-tight">
                    {activeIncident.title}
                  </h2>
                  <div className="text-xs font-mono text-[#64748B] flex flex-wrap items-center gap-2">
                    <span>App: <strong className="text-[#17233B]">{activeIncident.application}</strong></span>
                    <span>·</span>
                    <span>Target: <code className="break-all text-[#2563EB] bg-blue-50/80 px-2 py-0.5 rounded border border-blue-100 font-semibold">{activeIncident.sourceFile || 'src/main/Handler.java:142'}</code></span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-3 shrink-0">
                  {activeIncident.status === 'awaiting_approval' || activeIncident.status === 'investigating' || activeIncident.status === 'detected' ? (
                    <>
                      <button
                        onClick={() => handleOpenReject(activeIncident)}
                        disabled={loading}
                        className="px-4 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all border border-rose-200 shadow-xs flex items-center gap-1.5 active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span>
                        <span>Reject</span>
                      </button>
                      <button
                        onClick={() => handleOpenApprove(activeIncident)}
                        disabled={loading}
                        className="px-5 py-2.5 rounded-full bg-[#17233B] hover:bg-[#1e2f4f] text-white font-bold text-xs shadow-md flex items-center gap-1.5 transition-all active:scale-95"
                      >
                        <span className="material-symbols-outlined text-[16px] text-emerald-400">play_circle</span>
                        <span>Approve & Verify</span>
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 font-mono text-xs">
                      <span className="px-3.5 py-1.5 rounded-full bg-white text-[#17233B] font-bold border border-[#CBD5E1] shadow-xs">
                        Decision Recorded ({activeIncident.status.toUpperCase()})
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Workflow stage clarification banner */}
              <div className="rounded-2xl p-4 bg-[#E9E8F8]/70 border border-[#8DB9F0]/40 flex items-start gap-3 text-xs shadow-xs">
                <span className="material-symbols-outlined text-[#2563EB] text-[22px] shrink-0 mt-0.5">info</span>
                <div className="text-[#334155] leading-relaxed">
                  <strong className="text-[#17233B] font-bold">Lifecycle Integrity:</strong> Approval triggers controlled execution inside an ephemeral Docker container. Independent verifier tests must report 100% pass before recovery is declared.
                </div>
              </div>

              {/* Repair Explanation & Root Cause */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="bg-white/85 rounded-2xl p-4 border border-white shadow-xs flex flex-col gap-1.5">
                  <span className="text-[#64748B] uppercase text-[10px] font-bold tracking-wider">Identified Root Cause</span>
                  <p className="text-[#17233B] text-xs leading-relaxed font-medium mt-1">
                    {activeIncident.rootCause || "Missing defensive null check on payload evaluation, triggering fatal exception during high-volume webhook ingestion."}
                  </p>
                </div>
                <div className="bg-white/85 rounded-2xl p-4 border border-white shadow-xs flex flex-col gap-1.5">
                  <span className="text-[#64748B] uppercase text-[10px] font-bold tracking-wider">Repair Agent Strategy</span>
                  <p className="text-[#17233B] text-xs leading-relaxed font-medium mt-1">
                    Synthesized an explicit null-guard boundary with fallback to guest handling, safeguarding against malformed or missing customer objects.
                  </p>
                </div>
              </div>

              {/* Code Diff Viewer - Soft light clean frosted code editor */}
              <div className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden font-mono text-xs">
                <div className="bg-slate-50/90 px-4 py-3 flex items-center justify-between border-b border-slate-200 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[18px] text-[#2563EB]">code</span>
                    <span className="text-[#17233B] font-bold">Diff Viewer</span>
                    <span className="text-[#94A3B8]">|</span>
                    <span className="text-[#64748B] font-semibold text-[11px]">{activeIncident.sourceFile || "StripeWebhookHandler.java:142"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] font-bold">
                    <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">-2 lines</span>
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">+5 lines</span>
                  </div>
                </div>

                <div className="p-4 text-[12px] overflow-x-auto space-y-1 bg-white">
                  <div className="flex text-[#64748B] py-0.5 font-medium">
                    <span className="w-10 select-none text-right pr-3 text-[#94A3B8] text-[11px]">139</span>
                    <span className="text-[#334155]">public void processEvent(StripeWebhookPayload payload) {'{'}</span>
                  </div>
                  <div className="flex text-[#64748B] py-0.5 font-medium">
                    <span className="w-10 select-none text-right pr-3 text-[#94A3B8] text-[11px]">140</span>
                    <span className="text-[#334155]">    Objects.requireNonNull(payload, "Payload cannot be null");</span>
                  </div>
                  <div className="flex bg-rose-50/80 text-rose-900 py-1 rounded border-l-4 border-rose-500">
                    <span className="w-10 select-none text-right pr-3 text-rose-600 font-bold text-[11px]">141</span>
                    <span className="font-semibold"><span className="text-rose-600 font-bold mr-2">-</span>    String customerId = payload.getCustomer().getId();</span>
                  </div>
                  <div className="flex bg-rose-50/80 text-rose-900 py-1 rounded border-l-4 border-rose-500">
                    <span className="w-10 select-none text-right pr-3 text-rose-600 font-bold text-[11px]">142</span>
                    <span className="font-semibold"><span className="text-rose-600 font-bold mr-2">-</span>    billingService.recordTransaction(customerId, payload.getAmount());</span>
                  </div>
                  <div className="flex bg-emerald-50/80 text-emerald-950 py-1 rounded border-l-4 border-emerald-500">
                    <span className="w-10 select-none text-right pr-3 text-emerald-700 font-bold text-[11px]">141</span>
                    <span className="font-semibold"><span className="text-emerald-700 font-bold mr-2">+</span>    // Defensive null-guard for guest checkout invoices</span>
                  </div>
                  <div className="flex bg-emerald-50/80 text-emerald-950 py-1 rounded border-l-4 border-emerald-500">
                    <span className="w-10 select-none text-right pr-3 text-emerald-700 font-bold text-[11px]">142</span>
                    <span className="font-semibold"><span className="text-emerald-700 font-bold mr-2">+</span>    String customerId = (payload.getCustomer() != null)</span>
                  </div>
                  <div className="flex bg-emerald-50/80 text-emerald-950 py-1 rounded border-l-4 border-emerald-500">
                    <span className="w-10 select-none text-right pr-3 text-emerald-700 font-bold text-[11px]">143</span>
                    <span className="font-semibold"><span className="text-emerald-700 font-bold mr-2">+</span>        ? payload.getCustomer().getId()</span>
                  </div>
                  <div className="flex bg-emerald-50/80 text-emerald-950 py-1 rounded border-l-4 border-emerald-500">
                    <span className="w-10 select-none text-right pr-3 text-emerald-700 font-bold text-[11px]">144</span>
                    <span className="font-semibold"><span className="text-emerald-700 font-bold mr-2">+</span>        : "GUEST_CHECKOUT_" + payload.getInvoiceId();</span>
                  </div>
                  <div className="flex bg-emerald-50/80 text-emerald-950 py-1 rounded border-l-4 border-emerald-500">
                    <span className="w-10 select-none text-right pr-3 text-emerald-700 font-bold text-[11px]">145</span>
                    <span className="font-semibold"><span className="text-emerald-700 font-bold mr-2">+</span>    billingService.recordTransaction(customerId, payload.getAmount());</span>
                  </div>
                  <div className="flex text-[#64748B] py-0.5 font-medium">
                    <span className="w-10 select-none text-right pr-3 text-[#94A3B8] text-[11px]">146</span>
                    <span className="text-[#334155]">{'}'}</span>
                  </div>
                </div>
              </div>

              {/* Safety & Risk Matrix */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
                <div className="bg-white/80 p-3.5 rounded-2xl border border-white shadow-xs">
                  <span className="text-[#64748B] text-[10px] uppercase font-bold tracking-wider block">Syntactic Risk</span>
                  <span className="text-emerald-700 font-black text-sm mt-1 block">0.2% (Minimal)</span>
                </div>
                <div className="bg-white/80 p-3.5 rounded-2xl border border-white shadow-xs">
                  <span className="text-[#64748B] text-[10px] uppercase font-bold tracking-wider block">Database Schema</span>
                  <span className="text-emerald-700 font-black text-sm mt-1 block">Zero DB Ops</span>
                </div>
                <div className="bg-white/80 p-3.5 rounded-2xl border border-white shadow-xs">
                  <span className="text-[#64748B] text-[10px] uppercase font-bold tracking-wider block">Regression Baseline</span>
                  <span className="text-[#2563EB] font-black text-sm mt-1 block">Master Frozen</span>
                </div>
                <div className="bg-white/80 p-3.5 rounded-2xl border border-white shadow-xs">
                  <span className="text-[#64748B] text-[10px] uppercase font-bold tracking-wider block">Automated Rollback</span>
                  <span className="text-[#17233B] font-black text-sm mt-1 block">&lt; 15 seconds</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-panel rounded-3xl p-12 text-center text-[#64748B] font-mono border border-white shadow-glass">
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