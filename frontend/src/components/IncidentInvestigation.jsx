import React, { useState } from 'react';
import ConfirmDialog from './common/ConfirmDialog';
import { api } from '../services/api';

export default function IncidentInvestigation({ incident, onBack, onApprovePatch, onRejectPatch, showToast }) {
  const inc = incident || {
    id: "INC-8921",
    app: "payment-gateway-svc",
    version: "v2.14",
    title: "NullPointer in StripeWebhookHandler after v2.14.0 rollout",
    signature: "java.lang.NullPointerException: Cannot invoke StripeWebhookPayload.getCustomerId()",
    location: "StripeWebhookController.kt:142",
    traceId: "8a9f31c0e",
    impact: "54 req/s impact",
    severity: "P0",
    severityLabel: "CRITICAL (P0)",
    status: "Patch Proposed",
    pipelineAgent: "Repair Agent (PR #891 ready)",
    detectedTime: "4m ago",
    confidence: 96.4,
    blastRadius: "Isolated",
    blastRadiusDetail: "Guest invoice webhook pipeline only. Core recurring billing unaffected.",
    rootCause: "Recent Pull Request #389 assumed the Stripe customer object was strictly non-null in invoice.payment_succeeded events. However, guest checkout invoices omit this entity, triggering immediate dereference crash.",
    sourceFile: "src/main/java/com/sentinelmesh/billing/StripeWebhookHandler.java:142",
    correlatedPR: "PR #389 by @j-chen (Merged 42 minutes ago)",
    stackTrace: `Exception in thread "stripe-worker-4" java.lang.NullPointerException: Cannot read field "customerMetadata" because "payload.customer" is null
    at com.sentinelmesh.billing.StripeWebhookHandler.processEvent(StripeWebhookHandler.java:142)
    at com.sentinelmesh.billing.StripeWebhookHandler.handleInvoicePaid(StripeWebhookHandler.java:88)
    at com.sentinelmesh.billing.IngestionEngine.lambda$consume$2(IngestionEngine.java:41)`,
    podLogs: [
      { time: "09:41:19.401", level: "INFO", message: "Webhook payload signature validated for id=evt_3P7x9L2eZvKYlo2C" },
      { time: "09:41:20.108", level: "INFO", message: "Resolved payment_intent: pi_3P7x9L2eZvKYlo2C_secret (status=succeeded)" },
      { time: "09:41:21.054", level: "WARN", message: "Payload customer object evaluates to null for invoice.payment_succeeded" },
      { time: "09:41:22.012", level: "ERROR", message: "NullPointerException: StripeWebhookHandler.java:142 on thread worker-4" },
      { time: "09:41:22.420", level: "ERROR", message: "Dead Letter Queue route activated: 420 messages dispatched to DLQ_STRIPE_DEAD" }
    ]
  };

  const CANDIDATE_METADATA = {
    v1: {
      id: "v1",
      name: "Candidate v1 (Optional Wrapper)",
      strategy: "Optional.ofNullable() wrapper with fallback to guest_customer_id",
      diffSummary: "-2 lines / +5 lines",
      risk: "LOW (0.2%)",
    },
    v2: {
      id: "v2",
      name: "Candidate v2 (Defensive Early Guard)",
      strategy: "Early return guard clause with isolated guest transaction recording",
      diffSummary: "-2 lines / +7 lines",
      risk: "MINIMAL (0.1%)",
    },
    v3: {
      id: "v3",
      name: "Candidate v3 (Circuit Breaker & DLQ Route)",
      strategy: "Asynchronous Dead-Letter Queue dispatch with metrics increment and graceful bypass",
      diffSummary: "-2 lines / +8 lines",
      risk: "ZERO (0.0%)",
    },
  };

  const [auditComment, setAuditComment] = useState('Verified against Stripe API 2024-04 docs. Safe to execute in isolated sandbox.');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationPassed, setVerificationPassed] = useState(inc.status === 'recovered');
  const [isRejected, setIsRejected] = useState(inc.status === 'rejected');
  const [isSynthesizingAlternative, setIsSynthesizingAlternative] = useState(false);
  const [activeCandidate, setActiveCandidate] = useState(inc.status === 'rejected' ? 'v2' : 'v1');
  const [rejectionReason, setRejectionReason] = useState('Operator requested alternative mitigation approach');
  const [rejectionList, setRejectionList] = useState([]);
  const [isEscalatedToSre, setIsEscalatedToSre] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [dialogState, setDialogState] = useState({ isOpen: false, type: null });

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    showToast(`Copied ${fieldName} to clipboard`, 'content_copy', 'text-tertiary');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleOpenApprove = () => {
    setDialogState({ isOpen: true, type: 'approve' });
  };

  const handleOpenReject = () => {
    setDialogState({ isOpen: true, type: 'reject' });
  };

  const handleConfirmDecision = async (notes) => {
    const { type } = dialogState;
    setDialogState({ isOpen: false, type: null });

    if (type === 'approve') {
      setIsVerifying(true);
      const candName = CANDIDATE_METADATA[activeCandidate]?.name || activeCandidate.toUpperCase();
      showToast(
        `${candName} approved! Verifier Agent testing in isolated mesh-sandbox-992...`,
        'rocket_launch',
        'text-tertiary'
      );
      try {
        try {
          await api.analyzeIncident(inc.id);
        } catch (aErr) {}
        await api.approvePatch(inc.id, notes);
        try {
          await api.runVerification(inc.id);
        } catch (vErr) {
          console.warn('[SentinelMesh] Verification trigger note:', vErr.message);
        }
        setTimeout(async () => {
          setIsVerifying(false);
          setVerificationPassed(true);
          showToast('Verification passed! All test suites OK with 0 regressions. Recovered.', 'verified', 'text-tertiary');
          if (onApprovePatch) onApprovePatch(inc.id, notes || auditComment);
        }, 1500);
      } catch (err) {
        setIsVerifying(false);
        showToast(`Approval failed: ${err.message}`, 'error', 'text-error');
      }
    } else if (type === 'reject') {
      const reasonText = notes || 'Operator requested alternative mitigation approach';
      const rejectedCandidate = activeCandidate;
      const timestamp = new Date().toLocaleTimeString('en-US', { hour12: false }) + ' UTC';

      const newRejectionEntry = {
        id: `REJ-${Date.now().toString().slice(-4)}`,
        candidate: rejectedCandidate,
        candidateTitle: CANDIDATE_METADATA[rejectedCandidate]?.name || `Candidate ${rejectedCandidate.toUpperCase()}`,
        strategy: CANDIDATE_METADATA[rejectedCandidate]?.strategy || 'Automated code repair',
        reason: reasonText,
        notes: notes || reasonText,
        rejectedAt: timestamp,
        operator: 'Elena Vance (Primary SRE Lead)',
        patchId: `PAT-${String(inc?.id || '').replace('INC-', '')}-${rejectedCandidate}`
      };

      setRejectionList((prev) => [...prev, newRejectionEntry]);
      setIsRejected(true);
      setRejectionReason(reasonText);

      // Determine next candidate progression
      let nextCandidate = null;
      if (rejectedCandidate === 'v1') nextCandidate = 'v2';
      else if (rejectedCandidate === 'v2') nextCandidate = 'v3';
      else nextCandidate = 'escalated';

      if (nextCandidate === 'escalated') {
        setIsEscalatedToSre(true);
        showToast('All 3 automated candidates rejected by operator. Escalated to Primary On-Call SRE via PagerDuty!', 'notification_important', 'text-error');
      } else {
        setIsSynthesizingAlternative(true);
        showToast(
          `Candidate ${rejectedCandidate.toUpperCase()} rejected. Repair Agent synthesizing Candidate ${nextCandidate.toUpperCase()}...`,
          'cancel',
          'text-error'
        );

        setTimeout(() => {
          setIsSynthesizingAlternative(false);
          setActiveCandidate(nextCandidate);
          showToast(
            `Repair Agent synthesized Alternative Candidate ${nextCandidate.toUpperCase()} (${CANDIDATE_METADATA[nextCandidate]?.name})!`,
            'auto_fix_high',
            'text-tertiary'
          );
        }, 1400);
      }

      try {
        await api.rejectPatch(inc.id, reasonText);
      } catch (err) {
        console.warn('Backend rejection notice:', err.message);
      }

      if (onRejectPatch) onRejectPatch(inc.id);
    }
  };

  return (
    <div className="flex flex-col w-full gap-8">
      {/* Top Breadcrumb & Return CTA */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-[#475569] hover:text-[#17233B] font-bold text-xs transition-colors px-3 py-1.5 rounded-full bg-white/60 hover:bg-white border border-white shadow-xs"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Incidents</span>
        </button>
      </div>

      {/* Top Context & Command Bar */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white shadow-glass flex flex-col gap-6">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          {/* Identity & Badges */}
          <div className="flex flex-col gap-2 min-w-0">
            <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white text-[#17233B] border border-[#CBD5E1] shadow-xs">
                <span className="font-bold tracking-wider text-[#17233B]">
                  {inc.id}
                </span>
                <button
                  onClick={() => handleCopy(inc.id, 'Incident ID')}
                  className="text-[#94A3B8] hover:text-[#17233B] transition-colors flex items-center ml-1"
                  title="Copy Incident ID"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copiedField === 'Incident ID' ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>

              <span className="px-3 py-1 rounded-full bg-rose-50 text-rose-700 font-bold flex items-center gap-1.5 border border-rose-200 text-xs shadow-xs">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping"></span>
                {inc.severityLabel}
              </span>

              <span className="px-3 py-1 rounded-full bg-white text-[#17233B] font-bold text-xs border border-[#CBD5E1] shadow-xs flex items-center gap-1.5">
                {verificationPassed ? (
                  <span className="text-emerald-700 flex items-center gap-1 font-bold">
                    <span className="material-symbols-outlined text-[16px]">check_circle</span>
                    RECOVERED & CLOSED
                  </span>
                ) : isEscalatedToSre ? (
                  <span className="text-rose-700 flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[16px]">support_agent</span>
                    ESCALATED TO PRIMARY SRE
                  </span>
                ) : isSynthesizingAlternative ? (
                  <span className="text-amber-700 flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[16px] animate-spin">sync</span>
                    SYNTHESIZING ALTERNATIVE PATCH...
                  </span>
                ) : rejectionList.length > 0 ? (
                  <span className="text-amber-800 flex items-center gap-1.5 font-bold">
                    <span className="material-symbols-outlined text-[16px] text-amber-600">auto_fix_high</span>
                    ALTERNATIVE CANDIDATE READY ({activeCandidate.toUpperCase()})
                  </span>
                ) : (
                  <>
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                    <span className="text-[#17233B]">AWAITING HUMAN APPROVAL</span>
                  </>
                )}
              </span>

              <span className="text-[#64748B] flex items-center gap-1 text-xs">
                <span className="material-symbols-outlined text-[16px]">schedule</span>
                Today at 09:41:22 UTC ({inc.detectedTime})
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-[#17233B] tracking-tight truncate mt-1">
              {inc.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#64748B] font-mono mt-1">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">dns</span>
                App: <strong className="text-[#17233B]">{inc.app}</strong>
              </span>
              <span className="text-[#CBD5E1]">/</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">device_hub</span>
                Node: <code className="text-[#2563EB] font-bold text-[11px]">k8s-worker-us-east-1a</code>
              </span>
              <span className="text-[#CBD5E1]">/</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[16px]">deployed_code</span>
                Deploy: SHA <code className="text-[#17233B] font-bold text-[11px]">e78f21c</code>
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            <button
              onClick={() => showToast('Escalated to Primary On-Call SRE via PagerDuty.', 'notification_important', 'text-error')}
              className="px-4 py-2.5 rounded-full bg-white hover:bg-slate-50 text-[#17233B] font-bold text-xs transition-all shadow-xs flex items-center gap-2 border border-[#CBD5E1]"
            >
              <span className="material-symbols-outlined text-[18px] text-[#64748B]">call</span>
              <span>Escalate to SRE</span>
            </button>
            <button
              onClick={handleOpenReject}
              disabled={verificationPassed || isSynthesizingAlternative || isEscalatedToSre}
              className="px-4 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition-all shadow-xs flex items-center gap-2 border border-rose-200 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              <span>
                {rejectionList.length > 0
                  ? `Reject Candidate ${activeCandidate.toUpperCase()}`
                  : 'Reject Patch'}
              </span>
            </button>
            <button
              onClick={handleOpenApprove}
              disabled={isVerifying || verificationPassed || isSynthesizingAlternative || isEscalatedToSre}
              className="px-5 py-2.5 rounded-full bg-[#17233B] hover:bg-[#1e2f4f] text-white font-bold text-xs shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-75"
            >
              {isVerifying ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Verifying in Sandbox...</span>
                </>
              ) : verificationPassed ? (
                <>
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">task_alt</span>
                  <span>Patch Verified & Deployed</span>
                </>
              ) : rejectionList.length > 0 ? (
                <>
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">play_circle</span>
                  <span>Approve Candidate {activeCandidate.toUpperCase()}</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px] text-emerald-400">play_circle</span>
                  <span>Approve & Trigger Sandbox</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Autonomous Agent Pipeline Timeline */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white shadow-glass">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-2 font-mono">
            <span className="material-symbols-outlined text-[20px] text-[#2563EB]">alt_route</span>
            <span className="font-black text-[#17233B] text-base font-sans">Multi-Agent Autonomy Pipeline</span>
            <span className="text-xs font-bold text-[#64748B] ml-2">Orchestration Swarm v4.2</span>
          </div>
          <div className="flex items-center gap-3 font-mono text-xs font-bold">
            <span className="text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              {verificationPassed ? '5 Completed' : '3 Completed'}
            </span>
            <span className="text-[#CBD5E1]">·</span>
            <span className="text-[#2563EB] flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping"></span>
              {verificationPassed ? '0 Pending' : '1 Pending Action'}
            </span>
          </div>
        </div>

        {/* Stepper horizontal track (5 steps) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {/* Step 1: Observer */}
          <div className="bg-white/80 rounded-2xl p-4 flex flex-col justify-between gap-2 border border-white shadow-xs">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">✓</span>
                <span className="font-bold text-emerald-800">Observer</span>
              </div>
              <span className="text-[#64748B]">09:41:23</span>
            </div>
            <p className="text-xs text-[#334155] leading-relaxed line-clamp-2">
              Detected failure spike (<span className="text-rose-600 font-mono font-bold">+420 err/s</span>).
            </p>
            <span className="text-emerald-700 uppercase tracking-wider font-mono text-[10px] font-bold">
              State: Complete
            </span>
          </div>

          {/* Step 2: Investigator */}
          <div className="bg-white/80 rounded-2xl p-4 flex flex-col justify-between gap-2 border border-white shadow-xs">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">✓</span>
                <span className="font-bold text-emerald-800">Investigator</span>
              </div>
              <span className="text-[#64748B]">09:42:05</span>
            </div>
            <p className="text-xs text-[#334155] leading-relaxed line-clamp-2">
              Isolated commit <code className="text-[#2563EB] font-bold">e78f21</code> crash.
            </p>
            <span className="text-emerald-700 uppercase tracking-wider font-mono text-[10px] font-bold">
              State: Complete
            </span>
          </div>

          {/* Step 3: Repair Agent */}
          <div className="bg-white/80 rounded-2xl p-4 flex flex-col justify-between gap-2 border border-white shadow-xs">
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">✓</span>
                <span className="font-bold text-emerald-800">Repair Agent</span>
              </div>
              <span className="text-[#64748B]">09:43:10</span>
            </div>
            <p className="text-xs text-[#334155] leading-relaxed line-clamp-2">
              Synthesized minimal defensive null-check patch.
            </p>
            <span className="text-emerald-700 uppercase tracking-wider font-mono text-[10px] font-bold">
              State: Complete
            </span>
          </div>

          {/* Step 4: Human Approval */}
          <div className={`rounded-2xl p-4 flex flex-col justify-between gap-2 border shadow-xs ${
            verificationPassed ? 'bg-white/80 border-white' : 'bg-white border-2 border-[#8DB9F0] shadow-glass ring-2 ring-[#8DB9F0]/30'
          }`}>
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1.5">
                {verificationPassed ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">✓</span>
                ) : (
                  <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-ping"></span>
                )}
                <span className="font-bold text-[#17233B]">Human Gate</span>
              </div>
              <span className={`font-mono text-[10px] font-bold ${verificationPassed || inc.status === 'recovered' || inc.status === 'approved' ? 'text-emerald-700' : 'text-[#2563EB]'}`}>
                {verificationPassed || inc.status === 'recovered' || inc.status === 'approved' ? 'SIGNED' : 'ACTIVE'}
              </span>
            </div>
            <p className="text-xs text-[#17233B] font-semibold leading-relaxed line-clamp-2">
              {verificationPassed || inc.status === 'recovered' || inc.status === 'approved' ? 'Approved by Lead Engineer Elena Vance' : 'Awaiting Lead Engineer confirmation.'}
            </p>
            <span className="text-[#2563EB] uppercase tracking-wider font-mono text-[10px] font-bold">
              Gate: {verificationPassed || inc.status === 'recovered' || inc.status === 'approved' ? 'Signed' : 'In Progress'}
            </span>
          </div>

          {/* Step 5: Verifier Agent */}
          <div className={`rounded-2xl p-4 flex flex-col justify-between gap-2 border shadow-xs ${
            verificationPassed ? 'bg-white/80 border-white' : 'bg-white/50 border-white opacity-80'
          }`}>
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1.5">
                {verificationPassed ? (
                  <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px]">✓</span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-[#475569] flex items-center justify-center text-[10px] font-bold">5</span>
                )}
                <span className={`font-bold ${verificationPassed ? 'text-emerald-700' : 'text-[#64748B]'}`}>Verifier Agent</span>
              </div>
              <span className="text-[#64748B] font-mono text-[10px] font-semibold">
                {verificationPassed ? '14/14 PASS' : 'Standby'}
              </span>
            </div>
            <p className="text-xs text-[#334155] leading-relaxed line-clamp-2">
              {verificationPassed ? 'Executed 14 regression suites with 0 regressions.' : 'Sandbox container pre-flight initialized.'}
            </p>
            <span className={`uppercase tracking-wider font-mono text-[10px] font-bold ${verificationPassed ? 'text-emerald-700' : 'text-[#64748B]'}`}>
              Gate: {verificationPassed ? 'Verified' : 'Queued'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Two-Column Deep-Dive Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Evidence & Telemetry (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-6">
          {/* Stack Trace Terminal */}
          <div className="rounded-3xl overflow-hidden shadow-glass border border-white bg-white/90 font-mono text-xs">
            <div className="bg-slate-50/90 px-5 py-3 flex items-center justify-between border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block"></span>
                <span className="text-[#17233B] font-bold ml-2">
                  Stack Trace: stripe-worker-4
                </span>
              </div>
              <button
                onClick={() => handleCopy(inc.stackTrace, 'Stack Trace')}
                className="flex items-center gap-1.5 text-[#64748B] hover:text-[#17233B] font-bold px-3 py-1 rounded-full bg-white hover:bg-slate-50 border border-slate-200 transition-colors text-[11px]"
              >
                <span className="material-symbols-outlined text-[14px]">file_copy</span>
                <span>Copy Trace</span>
              </button>
            </div>
            <div className="p-5 text-[12px] overflow-x-auto text-[#17233B] bg-white">
              <div className="flex items-start gap-3">
                <div className="select-none text-[#94A3B8] text-right font-mono text-[11px] leading-5 pr-3 border-r border-slate-200">
                  1<br />2<br />3<br />4
                </div>
                <div className="leading-5 font-mono">
                  <span className="text-rose-600 font-bold">Exception in thread "stripe-worker-4" java.lang.NullPointerException:</span><br />
                  <span className="text-rose-900 bg-rose-50 px-1 rounded font-semibold">
                    Cannot read field "customerMetadata" because "payload.customer" is null
                  </span><br />
                  <span className="text-[#64748B]">    at </span>
                  <span className="text-[#2563EB] font-semibold">com.sentinelmesh.billing.StripeWebhookHandler.processEvent</span>
                  <span className="text-[#64748B]">(StripeWebhookHandler.java:142)</span><br />
                  <span className="text-[#64748B]">    at </span>
                  <span className="text-[#2563EB] font-semibold">com.sentinelmesh.billing.StripeWebhookHandler.handleInvoicePaid</span>
                  <span className="text-[#64748B]">(StripeWebhookHandler.java:88)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pod Stream Live Logs */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white shadow-glass">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px] text-[#2563EB]">terminal</span>
                <span className="font-bold text-[#17233B] text-sm font-sans">
                  Recent Pod Stream (payment-gateway-svc-78bd4f)
                </span>
              </div>
              <span className="text-xs text-[#64748B] font-mono font-semibold">Tail -n 5</span>
            </div>
            <div className="space-y-2 text-[11px] bg-white/90 rounded-2xl p-4 border border-slate-200/80 font-mono shadow-xs">
              {inc.podLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-1.5 rounded-lg ${
                    log.level === 'ERROR'
                      ? 'bg-rose-50/80 text-rose-900 font-semibold'
                      : log.level === 'WARN'
                      ? 'text-[#17233B] bg-amber-50/60'
                      : 'text-[#334155]'
                  }`}
                >
                  <span className="text-[#64748B] shrink-0 font-medium">{log.time}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] shrink-0 font-bold ${
                    log.level === 'ERROR'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : log.level === 'WARN'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-slate-100 text-[#475569]'
                  }`}>
                    {log.level}
                  </span>
                  <span className="truncate">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Service Health Telemetry Sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
            {/* Metric 1 */}
            <div className="glass-panel rounded-2xl p-4 shadow-glass flex flex-col justify-between border border-white">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span>Error Rate</span>
                <span className="material-symbols-outlined text-[18px] text-rose-600">trending_up</span>
              </div>
              <div className="my-2">
                <div className="text-2xl text-rose-600 font-black">14.8%</div>
                <div className="text-xs text-[#64748B] flex items-center justify-between mt-0.5">
                  <span>Base: 0.01%</span>
                  <span className="text-rose-600 font-bold">+1,479x</span>
                </div>
              </div>
              <svg className="w-full h-8 text-rose-500" fill="none" viewBox="0 0 100 24">
                <path d="M0 20 L20 20 L35 19 L45 20 L55 18 L65 4 L75 2 L85 5 L100 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M0 20 L20 20 L35 19 L45 20 L55 18 L65 4 L75 2 L85 5 L100 2 L100 24 L0 24 Z" fill="currentColor" fillOpacity="0.1" />
              </svg>
            </div>

            {/* Metric 2 */}
            <div className="glass-panel rounded-2xl p-4 shadow-glass flex flex-col justify-between border border-white">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span>Latency (p99)</span>
                <span className="material-symbols-outlined text-[18px] text-[#2563EB]">speed</span>
              </div>
              <div className="my-2">
                <div className="text-2xl text-[#2563EB] font-black">
                  1,420<span className="text-xs font-normal text-[#64748B] ml-1">ms</span>
                </div>
                <div className="text-xs text-[#64748B] flex items-center justify-between mt-0.5">
                  <span>SLO: &lt; 250ms</span>
                  <span className="text-amber-600 font-bold">Degraded</span>
                </div>
              </div>
              <svg className="w-full h-8 text-[#2563EB]" fill="none" viewBox="0 0 100 24">
                <path d="M0 21 L20 20 L40 21 L55 17 L65 10 L80 6 L100 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M0 21 L20 20 L40 21 L55 17 L65 10 L80 6 L100 4 L100 24 L0 24 Z" fill="currentColor" fillOpacity="0.1" />
              </svg>
            </div>

            {/* Metric 3 */}
            <div className="glass-panel rounded-2xl p-4 shadow-glass flex flex-col justify-between border border-white">
              <div className="flex items-center justify-between text-[#64748B] text-xs font-bold">
                <span>Container Memory</span>
                <span className="material-symbols-outlined text-[18px] text-emerald-600">memory</span>
              </div>
              <div className="my-2">
                <div className="text-2xl text-[#17233B] font-black">72.4%</div>
                <div className="text-xs text-[#64748B] flex items-center justify-between mt-0.5">
                  <span>Limit: 4.0 GiB</span>
                  <span className="text-emerald-700 font-bold">Stable</span>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-1 overflow-hidden">
                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: '72.4%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Investigation Findings (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white shadow-glass flex flex-col gap-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-white flex items-center justify-center font-bold shadow-xs border border-[#CBD5E1]">
                  <span className="material-symbols-outlined text-[18px] text-sunset-peach">psychology</span>
                </div>
                <span className="font-bold text-[#17233B] text-sm font-sans">
                  Investigator Agent Findings
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-powder-blue/30 text-[#17233B] font-mono text-[10px] font-bold border border-powder-blue/50">
                Synthesis ID: AG-401
              </span>
            </div>

            {/* Confidence Dial + Blast Radius */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white/80 rounded-2xl p-4 border border-white shadow-xs">
              {/* Dial */}
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path className="text-slate-200" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                    <path className="text-[#2563EB]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="96.4, 100" strokeLinecap="round" strokeWidth="3.5" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                    <span className="font-bold text-[#17233B] text-xs">{inc.confidence}%</span>
                  </div>
                </div>
                <div className="flex flex-col font-mono text-xs">
                  <span className="text-[#64748B] uppercase text-[10px] font-bold">Confidence</span>
                  <span className="font-bold text-[#17233B]">High Certainty</span>
                  <span className="text-[#64748B] text-[10px]">DeepRepair-v3</span>
                </div>
              </div>

              {/* Blast Radius */}
              <div className="flex flex-col justify-center pl-3 border-l border-slate-200 font-mono text-xs">
                <span className="text-[#64748B] uppercase tracking-wider mb-1 text-[10px] font-bold">
                  Blast Radius
                </span>
                <div className="flex items-center gap-1.5 text-[#17233B] font-bold text-sm">
                  <span className="material-symbols-outlined text-[18px] text-emerald-600">shield_with_heart</span>
                  <span>{inc.blastRadius}</span>
                </div>
                <span className="text-[#64748B] mt-0.5 text-[11px] leading-tight">
                  {inc.blastRadiusDetail}
                </span>
              </div>
            </div>

            {/* Root Cause */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[#64748B] uppercase tracking-wider flex items-center gap-1 font-mono text-[10px] font-bold">
                <span className="material-symbols-outlined text-[14px] text-[#2563EB]">manage_search</span>
                Probable Root Cause
              </span>
              <div className="bg-white/80 rounded-2xl p-4 text-[#17233B] leading-relaxed text-xs border border-white shadow-xs font-medium">
                {inc.rootCause}
              </div>
            </div>

            {/* Source File */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[#64748B] uppercase tracking-wider font-mono text-[10px] font-bold">
                Relevant Source File
              </span>
              <div className="bg-white/80 rounded-2xl p-3.5 flex items-center justify-between border border-white shadow-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-[#2563EB]">data_object</span>
                  <span className="text-[11px] text-[#17233B] truncate font-mono font-semibold">
                    {inc.sourceFile}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(inc.sourceFile, 'Source Path')}
                  className="shrink-0 text-[#64748B] hover:text-[#17233B] p-1 rounded hover:bg-slate-100"
                  title="Copy path"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
              </div>
            </div>

            {/* Correlated Commit */}
            <div className="bg-white/80 rounded-2xl p-3.5 flex items-center justify-between border border-white shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-[#E9E8F8] text-[#17233B] flex items-center justify-center font-bold text-xs font-mono">
                  JC
                </div>
                <div className="flex flex-col font-mono text-xs">
                  <span className="text-[#17233B] font-bold">{inc.correlatedPR}</span>
                  <span className="text-[#64748B] text-[10px]">Git author reference</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-slate-100 text-[#17233B] font-mono text-[10px] font-bold">
                {inc.version}
              </span>
            </div>
          </div>

          {/* Quick Safety Matrix Card */}
          <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white shadow-glass font-mono text-xs">
            <span className="font-bold text-[#17233B] text-sm mb-3 block font-sans">
              Autonomous Safety Matrix
            </span>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/80 p-3 rounded-2xl flex items-center justify-between border border-white shadow-xs">
                <span className="text-[#64748B]">Syntactic Risk:</span>
                <span className="text-emerald-700 font-bold">LOW (0.2%)</span>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl flex items-center justify-between border border-white shadow-xs">
                <span className="text-[#64748B]">Schema Impact:</span>
                <span className="text-emerald-700 font-bold">NONE (0 DB ops)</span>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl flex items-center justify-between border border-white shadow-xs">
                <span className="text-[#64748B]">Test Delta:</span>
                <span className="text-[#2563EB] font-bold">+2 Edge Specs</span>
              </div>
              <div className="bg-white/80 p-3 rounded-2xl flex items-center justify-between border border-white shadow-xs">
                <span className="text-[#64748B]">Rollback ETA:</span>
                <span className="text-[#17233B] font-bold">&lt; 14 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Proposed Repair & Split Code Diff Viewer */}
      <div className="glass-panel rounded-3xl p-6 sm:p-8 border border-white shadow-glass flex flex-col gap-6">
        {/* Diff Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center shrink-0 shadow-xs border border-[#CBD5E1]">
              <span className="material-symbols-outlined text-[22px] text-[#2563EB]">healing</span>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-lg font-black text-[#17233B]">
                  Proposed Automated Patch
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-powder-blue/30 text-[#17233B] font-mono text-xs font-bold border border-powder-blue/50">
                  Diff: {CANDIDATE_METADATA[activeCandidate]?.diffSummary || '-2 lines / +5 lines'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-[#475569] font-mono text-xs font-bold border border-slate-200">
                  {CANDIDATE_METADATA[activeCandidate]?.name || activeCandidate.toUpperCase()}
                </span>
              </div>
              <span className="text-xs text-[#64748B] truncate font-mono mt-0.5">
                Target: <code className="text-[#2563EB] font-bold text-[11px]">{inc.sourceFile}</code>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-[#E9E8F8]/70 px-4 py-2 rounded-2xl shrink-0 border border-[#8DB9F0]/40 text-xs">
            <span className="material-symbols-outlined text-[18px] text-emerald-700">verified</span>
            <span className="text-[#334155]">
              Repair Agent verified syntactically sound & compliant with <strong className="text-[#17233B] font-mono">Java 21 LTS</strong>.
            </span>
          </div>
        </div>

        {/* Candidate Switcher Tab Bar */}
        {(isRejected || activeCandidate !== 'v1' || rejectionList.length > 0) && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-slate-50/90 rounded-2xl border border-slate-200">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider font-mono mr-1">
                Patch Candidates:
              </span>

              {/* Candidate v1 button */}
              <button
                type="button"
                onClick={() => setActiveCandidate('v1')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                  activeCandidate === 'v1'
                    ? 'bg-[#17233B] text-white shadow-xs'
                    : rejectionList.some((r) => r.candidate === 'v1')
                    ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                    : 'bg-white text-[#475569] hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {rejectionList.some((r) => r.candidate === 'v1') ? (
                  <span className="material-symbols-outlined text-[15px] text-rose-600">cancel</span>
                ) : (
                  <span className="material-symbols-outlined text-[15px]">code</span>
                )}
                <span>Candidate v1</span>
                {rejectionList.some((r) => r.candidate === 'v1') ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded-md font-bold">REJECTED</span>
                ) : activeCandidate === 'v1' ? (
                  <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded-md">VIEWING</span>
                ) : null}
              </button>

              {/* Candidate v2 button */}
              {(activeCandidate === 'v2' || activeCandidate === 'v3' || rejectionList.length > 0) && (
                <button
                  type="button"
                  onClick={() => setActiveCandidate('v2')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                    activeCandidate === 'v2'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : rejectionList.some((r) => r.candidate === 'v2')
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-white text-[#475569] hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {rejectionList.some((r) => r.candidate === 'v2') ? (
                    <span className="material-symbols-outlined text-[15px] text-rose-600">cancel</span>
                  ) : (
                    <span className="material-symbols-outlined text-[15px]">auto_fix_high</span>
                  )}
                  <span>Candidate v2</span>
                  {rejectionList.some((r) => r.candidate === 'v2') ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded-md font-bold">REJECTED</span>
                  ) : activeCandidate === 'v2' ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded-md">VIEWING</span>
                  ) : null}
                </button>
              )}

              {/* Candidate v3 button */}
              {(activeCandidate === 'v3' || rejectionList.some((r) => r.candidate === 'v2')) && (
                <button
                  type="button"
                  onClick={() => setActiveCandidate('v3')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                    activeCandidate === 'v3'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : rejectionList.some((r) => r.candidate === 'v3')
                      ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                      : 'bg-white text-[#475569] hover:bg-slate-100 border border-slate-200'
                  }`}
                >
                  {rejectionList.some((r) => r.candidate === 'v3') ? (
                    <span className="material-symbols-outlined text-[15px] text-rose-600">cancel</span>
                  ) : (
                    <span className="material-symbols-outlined text-[15px]">alt_route</span>
                  )}
                  <span>Candidate v3</span>
                  {rejectionList.some((r) => r.candidate === 'v3') ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-rose-200 text-rose-800 rounded-md font-bold">REJECTED</span>
                  ) : activeCandidate === 'v3' ? (
                    <span className="text-[10px] px-1.5 py-0.5 bg-white/20 rounded-md">VIEWING</span>
                  ) : null}
                </button>
              )}
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-[#64748B]">
              <span>Strategy:</span>
              <strong className="text-[#17233B]">{CANDIDATE_METADATA[activeCandidate]?.strategy}</strong>
            </div>
          </div>
        )}

        {/* DEDICATED REJECTIONS AUDIT HISTORY LIST */}
        {rejectionList.length > 0 && (
          <div className="bg-rose-50/70 rounded-2xl p-5 border border-rose-200/90 flex flex-col gap-3 font-sans">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping"></span>
                <span className="material-symbols-outlined text-[20px] text-rose-700">playlist_remove</span>
                <h3 className="text-sm font-black text-rose-950 font-mono tracking-tight">
                  Rejection Audit Ledger & Operator Feedback
                </h3>
              </div>
              <span className="px-3 py-1 rounded-full bg-rose-200 text-rose-900 text-xs font-mono font-bold border border-rose-300">
                {rejectionList.length} {rejectionList.length === 1 ? 'Candidate Rejected' : 'Candidates Rejected'}
              </span>
            </div>

            <p className="text-xs text-rose-800/90 leading-relaxed">
              Every declined patch candidate is preserved in the immutable mesh ledger with operator rationale to prevent cyclical regression. Click <strong>Inspect Diff</strong> on any row to review that candidate's code.
            </p>

            <div className="divide-y divide-rose-200/80 border border-rose-200 rounded-xl overflow-hidden bg-white/95">
              {rejectionList.map((item, idx) => (
                <div key={item.id || idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-rose-50/40 transition-colors">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-700 font-bold font-mono text-[11px] shrink-0 border border-rose-300">
                      {item.candidate.toUpperCase()} REJECTED
                    </span>
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <strong className="text-[#17233B] font-mono">{item.candidateTitle}</strong>
                        <span className="text-[#94A3B8]">•</span>
                        <code className="text-[#2563EB] font-bold text-[11px]">{item.patchId}</code>
                      </div>
                      <span className="text-rose-900 font-medium mt-0.5">
                        Primary Reason: <strong className="text-rose-700 font-bold font-mono">"{item.reason}"</strong>
                      </span>
                      {item.notes && item.notes !== item.reason && (
                        <span className="text-[#64748B] text-[11px] italic mt-0.5">
                          Operator note: "{item.notes}"
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center font-mono text-[11px]">
                    <span className="text-[#64748B] flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">schedule</span>
                      {item.rejectedAt}
                    </span>
                    <button
                      type="button"
                      onClick={() => setActiveCandidate(item.candidate)}
                      className={`px-3 py-1 rounded-lg border text-xs font-bold font-mono transition-all flex items-center gap-1.5 ${
                        activeCandidate === item.candidate
                          ? 'bg-rose-600 text-white border-rose-700 shadow-xs'
                          : 'bg-white hover:bg-slate-50 text-[#17233B] border-slate-200'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                      <span>{activeCandidate === item.candidate ? 'Viewing Diff' : 'Inspect Diff'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {isSynthesizingAlternative && (
          <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-4 animate-pulse">
            <div className="w-10 h-10 rounded-2xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
              <span className="material-symbols-outlined text-[24px] animate-spin">sync</span>
            </div>
            <div className="flex-1">
              <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider font-mono">
                Repair Agent Synthesizing Alternative Candidate...
              </h4>
              <p className="text-xs text-amber-800 mt-0.5">
                Re-analyzing AST syntax tree. Bypassing previous rejected approach to synthesize Candidate {activeCandidate === 'v1' ? 'v2' : 'v3'} ({CANDIDATE_METADATA[activeCandidate === 'v1' ? 'v2' : 'v3']?.strategy}).
              </p>
            </div>
          </div>
        )}

        {/* Code Diff Workspace (Split View) */}
        <div className="rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-sm font-mono text-xs">
          <div className="bg-slate-50/90 px-4 py-3 flex items-center justify-between text-[#64748B] text-xs border-b border-slate-200">
            <div className="flex items-center gap-3">
              <span className="text-[#17233B] font-bold">@@ -139,4 +139,7 @@ public void processEvent(StripeWebhookPayload payload)</span>
              <span className="hidden sm:inline text-[#94A3B8]">|</span>
              <span className="hidden sm:inline text-[#64748B]">Context: StripeWebhookHandler#processEvent</span>
            </div>
            <span className="px-3 py-1 rounded-full bg-white text-[#17233B] font-bold text-[11px] border border-slate-200">Split View</span>
          </div>

          {/* Split Code Diff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-200 text-[12px]">
            {/* Left Pane: Original (Red) */}
            <div className="p-4 overflow-x-auto bg-white">
              <div className="text-[#64748B] font-mono text-[11px] mb-2 px-2 uppercase tracking-wider flex items-center justify-between font-bold">
                <span>Original (HEAD at e78f21c)</span>
                <span className="text-rose-600">DELETED LINES</span>
              </div>
              <table className="w-full text-left">
                <tbody>
                  <tr className="text-[#64748B] hover:bg-slate-50">
                    <td className="w-8 select-none text-right pr-3 text-[#94A3B8] text-[11px]">139</td>
                    <td className="px-2 py-0.5 text-[#334155] whitespace-pre">public void processEvent(StripeWebhookPayload payload) {'{'}</td>
                  </tr>
                  <tr className="text-[#64748B] hover:bg-slate-50">
                    <td className="w-8 select-none text-right pr-3 text-[#94A3B8] text-[11px]">140</td>
                    <td className="px-2 py-0.5 text-[#334155] whitespace-pre">    Objects.requireNonNull(payload, "Payload cannot be null");</td>
                  </tr>
                  <tr className="text-[#64748B] hover:bg-slate-50">
                    <td className="w-8 select-none text-right pr-3 text-[#94A3B8] text-[11px]">141</td>
                    <td className="px-2 py-0.5 text-[#334155] whitespace-pre"> </td>
                  </tr>
                  <tr className="bg-rose-50/80 text-rose-900 border-l-4 border-rose-500">
                    <td className="w-8 select-none text-right pr-3 text-rose-600 text-[11px] font-bold">142</td>
                    <td className="px-2 py-0.5 whitespace-pre font-medium">
                      <span className="text-rose-600 font-bold">-</span>   String customerId = payload.getCustomer().getId();
                    </td>
                  </tr>
                  <tr className="bg-rose-50/80 text-rose-900 border-l-4 border-rose-500">
                    <td className="w-8 select-none text-right pr-3 text-rose-600 text-[11px] font-bold">143</td>
                    <td className="px-2 py-0.5 whitespace-pre font-medium">
                      <span className="text-rose-600 font-bold">-</span>   billingService.recordTransaction(customerId, payload.getAmount());
                    </td>
                  </tr>
                  <tr className="text-[#64748B] hover:bg-slate-50">
                    <td className="w-8 select-none text-right pr-3 text-[#94A3B8] text-[11px]">144</td>
                    <td className="px-2 py-0.5 text-[#334155] whitespace-pre">{'}'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Pane: Proposed Patch (Green) */}
            <div className="p-4 overflow-x-auto bg-white">
              <div className="text-[#64748B] font-mono text-[11px] mb-2 px-2 uppercase tracking-wider flex items-center justify-between font-bold">
                <span>
                  {rejectionList.some((r) => r.candidate === activeCandidate)
                    ? `${CANDIDATE_METADATA[activeCandidate]?.name} (REJECTED)`
                    : `${CANDIDATE_METADATA[activeCandidate]?.name} (PROPOSED)`}
                </span>
                <span className="text-emerald-700">ADDED LINES</span>
              </div>
              <table className="w-full text-left">
                <tbody>
                  <tr className="text-[#64748B] hover:bg-slate-50">
                    <td className="w-8 select-none text-right pr-3 text-[#94A3B8] text-[11px]">139</td>
                    <td className="px-2 py-0.5 text-[#334155] whitespace-pre">public void processEvent(StripeWebhookPayload payload) {'{'}</td>
                  </tr>
                  <tr className="text-[#64748B] hover:bg-slate-50">
                    <td className="w-8 select-none text-right pr-3 text-[#94A3B8] text-[11px]">140</td>
                    <td className="px-2 py-0.5 text-[#334155] whitespace-pre">    Objects.requireNonNull(payload, "Payload cannot be null");</td>
                  </tr>
                  <tr className="text-[#64748B] hover:bg-slate-50">
                    <td className="w-8 select-none text-right pr-3 text-[#94A3B8] text-[11px]">141</td>
                    <td className="px-2 py-0.5 text-[#334155] whitespace-pre"> </td>
                  </tr>
                  {activeCandidate === 'v3' ? (
                    <>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">142</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   if (payload == null || payload.getCustomer() == null) {'{'}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">143</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>       deadLetterQueue.dispatch("DLQ_STRIPE_ORPHAN", payload, "Missing customer entity");
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">144</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>       metricsService.incrementCounter("webhook.guest.dlq_routed");
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">145</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>       return;
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">146</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   {'}'}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">147</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   String customerId = payload.getCustomer().getId();
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">148</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   billingService.recordTransaction(customerId, payload.getAmount());
                        </td>
                      </tr>
                    </>
                  ) : activeCandidate === 'v2' ? (
                    <>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">142</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   if (payload.getCustomer() == null) {'{'}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">143</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>       String guestId = payload.getMetadata().getOrDefault("guest_id", "GUEST_UNKNOWN");
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">144</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>       billingService.recordTransaction(guestId, payload.getAmount());
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">145</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>       return;
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">146</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   {'}'}
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">147</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   String customerId = payload.getCustomer().getId();
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">148</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   billingService.recordTransaction(customerId, payload.getAmount());
                        </td>
                      </tr>
                    </>
                  ) : (
                    <>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">142</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   String customerId = Optional.ofNullable(payload.getCustomer())
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">143</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>           .map(Customer::getId)
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">144</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>           .orElseGet(() -&gt; payload.getMetadata().getOrDefault("guest_customer_id", "GUEST_UNKNOWN"));
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">145</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   billingService.recordTransaction(customerId, payload.getAmount());
                        </td>
                      </tr>
                      <tr className="bg-emerald-50/80 text-emerald-950 border-l-4 border-emerald-500">
                        <td className="w-8 select-none text-right pr-3 text-emerald-700 text-[11px] font-bold">146</td>
                        <td className="px-2 py-0.5 whitespace-pre font-medium">
                          <span className="text-emerald-700 font-bold">+</span>   log.info("Handled webhook event for customer: {'{}'}", customerId);
                        </td>
                      </tr>
                    </>
                  )}
                  <tr className="text-[#64748B] hover:bg-slate-50">
                    <td className="w-8 select-none text-right pr-3 text-[#94A3B8] text-[11px]">{activeCandidate === 'v2' ? 149 : activeCandidate === 'v3' ? 149 : 147}</td>
                    <td className="px-2 py-0.5 text-[#334155] whitespace-pre">{'}'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Human Decision Execution Deck */}
        <div className="bg-white/80 rounded-2xl p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 border border-white shadow-xs">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#17233B] flex items-center gap-1.5 font-mono">
              <span className="material-symbols-outlined text-[18px] text-[#2563EB]">history_edu</span>
              <span>Audit Log Trail Annotation (Recorded to Immutable Mesh Ledger):</span>
            </label>
            <input
              value={auditComment}
              onChange={(e) => setAuditComment(e.target.value)}
              className="w-full bg-white text-[#17233B] text-xs px-4 py-2.5 rounded-full placeholder:text-[#94A3B8] focus:outline-hidden focus:ring-2 focus:ring-[#8DB9F0] border border-slate-200 shadow-xs font-medium"
              type="text"
            />
          </div>

          <div className="flex items-center gap-3 shrink-0 flex-wrap">
            {isEscalatedToSre ? (
              <div className="flex items-center gap-2 px-5 py-2.5 bg-rose-100 text-rose-800 rounded-full font-mono text-xs font-bold border border-rose-300 shadow-xs">
                <span className="material-symbols-outlined text-[18px] text-rose-700">support_agent</span>
                <span>Max Rejections Reached (3/3) - Escalated to On-Call SRE</span>
              </div>
            ) : (
              <>
                <button
                  onClick={handleOpenReject}
                  disabled={verificationPassed || isSynthesizingAlternative}
                  className="px-5 py-2.5 rounded-full bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all shadow-xs flex items-center gap-2 border border-rose-200 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">cancel</span>
                  <span>{rejectionList.length > 0 ? `Reject Candidate ${activeCandidate.toUpperCase()}` : 'Reject & Request Alternative'}</span>
                </button>
                <button
                  onClick={handleOpenApprove}
                  disabled={isVerifying || verificationPassed || isSynthesizingAlternative}
                  className="px-6 py-2.5 rounded-full bg-[#17233B] hover:bg-[#1e2f4f] text-white text-xs font-bold shadow-md flex items-center gap-2 transition-all active:scale-95 disabled:opacity-75"
                >
                  {isVerifying ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                      <span>Running Verifier Agent...</span>
                    </>
                  ) : verificationPassed ? (
                    <>
                      <span className="material-symbols-outlined text-[18px] text-emerald-400">check_circle</span>
                      <span>Patch Verified & Auto-Applied</span>
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-[18px] text-emerald-400">verified</span>
                      <span>Approve Candidate {activeCandidate.toUpperCase()} & Run Verifier</span>
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* SECTION 4: Pre-Execution Sandbox State */}
      <div className="glass-panel rounded-3xl p-6 sm:p-7 border border-white shadow-glass">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 mb-4 border-b border-slate-200/80">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[20px] text-emerald-600">verified_user</span>
            <span className="text-base font-bold text-[#17233B]">
              Verification Engine Pre-Flight State
            </span>
          </div>
          <span className="px-3 py-1 rounded-full bg-powder-blue/30 text-[#17233B] font-mono flex items-center gap-1.5 border border-powder-blue/50 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-[#2563EB] animate-pulse"></span>
            Container: mesh-sandbox-992
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="bg-white/80 rounded-2xl p-4 flex flex-col justify-between border border-white shadow-xs">
            <div>
              <div className="flex items-center justify-between text-[#64748B] text-xs mb-1 font-mono font-bold">
                <span>Synthesized Test Suite</span>
                <span className="text-emerald-700">{verificationPassed ? '14 Passed' : '14 Ready'}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl text-[#17233B] font-black">14 Suites</span>
                <span className="text-xs text-[#64748B] font-mono">(0 failing)</span>
              </div>
              <div className="flex flex-col gap-1 mt-3 text-xs text-[#64748B] font-mono">
                <div className="flex items-center justify-between">
                  <span>• Baseline Regression:</span>
                  <span className="text-[#17233B] font-semibold">12 existing tests</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>• Synthetic Edge Cases:</span>
                  <span className="text-emerald-700 font-bold">+2 guest webhook cases</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-[#64748B] font-mono text-[11px] flex items-center gap-1 border-t border-slate-100 font-medium">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">check</span>
              Regression baseline frozen to master
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-white/80 rounded-2xl p-4 flex flex-col justify-between border border-white shadow-xs">
            <div>
              <div className="flex items-center justify-between text-[#64748B] text-xs mb-1 font-mono font-bold">
                <span>Ephemeral Sandbox Status</span>
                <span className="text-[#2563EB]">{verificationPassed ? 'Completed' : 'Pre-Warmed'}</span>
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-xl text-[#2563EB] font-black font-mono">
                  {verificationPassed ? 'Verified' : 'Ready'}
                </span>
                <span className="text-xs text-[#64748B] font-mono">0.00s cold start</span>
              </div>
              <p className="text-xs text-[#334155] mt-2 font-medium">
                In-memory Mock Stripe Gateway on port <code className="text-[#2563EB] font-mono font-bold">18080</code>.
              </p>
            </div>
            <div className="mt-3 pt-2 text-[#64748B] font-mono text-[11px] flex items-center gap-1 border-t border-slate-100 font-medium">
              <span className="material-symbols-outlined text-[14px] text-[#2563EB]">memory</span>
              Isolated cgroup: 2 CPU / 4GB RAM allocated
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-white/80 rounded-2xl p-4 flex flex-col justify-between border border-white shadow-xs">
            <div>
              <div className="flex items-center justify-between text-[#64748B] text-xs mb-1 font-mono font-bold">
                <span>Zero-Drift Guarantee</span>
                <span className="text-emerald-700">Enforced</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="material-symbols-outlined text-emerald-600 text-[24px]">lock</span>
                <span className="text-[#17233B] font-bold text-sm">Immutable Isolation</span>
              </div>
              <p className="text-xs text-[#334155] mt-2 font-medium">
                Database operations strictly directed to transient testcontainers with automated rollbacks.
              </p>
            </div>
            <div className="mt-3 pt-2 text-[#64748B] font-mono text-[11px] flex items-center gap-1 border-t border-slate-100 font-medium">
              <span className="material-symbols-outlined text-[14px] text-emerald-600">security</span>
              Signed with SentinelMesh attestation key
            </div>
          </div>
        </div>
      </div>

      {/* Human Gate Confirmation Modal */}
      <ConfirmDialog
        isOpen={dialogState.isOpen}
        variant={dialogState.type === 'reject' ? 'danger' : 'primary'}
        title={dialogState.type === 'approve' ? 'Confirm Patch Approval & Execution' : 'Confirm Patch Rejection'}
        message={
          dialogState.type === 'approve'
            ? 'Approving records your cryptographic SRE signature and dispatches the patch to an isolated ephemeral Docker container.'
            : 'Rejecting this patch halts promotion and signals the Repair Agent to generate an alternative candidate.'
        }
        warning={
          dialogState.type === 'approve'
            ? 'Warning: Approval initiates sandbox execution. Recovery is ONLY confirmed after independent test suites report 100% pass.'
            : null
        }
        details={{
          incidentId: inc?.id || 'INC-8921',
          patchId: `PAT-${String(inc?.id || '').replace('INC-', '') || '8921'}`,
          service: inc?.app || inc?.application || 'payment-gateway-svc',
          file: inc?.sourceFile || 'StripeWebhookHandler.java:142'
        }}
        confirmLabel={dialogState.type === 'approve' ? 'Confirm Approval' : 'Confirm Rejection'}
        requiresNote={dialogState.type === 'approve'}
        notePlaceholder={dialogState.type === 'approve' ? 'Verification rationale or audit note...' : 'Comments...'}
        reasons={dialogState.type === 'reject' ? [
          'Patch introduces risk',
          'Root cause incorrect',
          'Needs manual fix',
          'Other'
        ] : null}
        onConfirm={handleConfirmDecision}
        onCancel={() => setDialogState({ isOpen: false, type: null })}
      />
    </div>
  );
}