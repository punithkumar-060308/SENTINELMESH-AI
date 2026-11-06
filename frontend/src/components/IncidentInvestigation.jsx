import React, { useState } from 'react';
import ConfirmDialog from './common/ConfirmDialog';
import { api } from '../services/api';

export default function IncidentInvestigation({ incident, onBack, onApprovePatch, onRejectPatch, showToast }) {
  const [auditComment, setAuditComment] = useState('Verified against Stripe API 2024-04 docs. Safe to execute in isolated sandbox.');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationPassed, setVerificationPassed] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [dialogState, setDialogState] = useState({ isOpen: false, type: null });

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
      showToast('Patch approved! Verifier Agent triggered in isolated mesh-sandbox-992...', 'rocket_launch', 'text-tertiary');
      try {
        await api.approvePatch(inc.id, notes);
        setTimeout(async () => {
          setIsVerifying(false);
          setVerificationPassed(true);
          showToast('Verification passed! 14/14 test suites OK with 0 regressions. Recovered.', 'verified', 'text-tertiary');
          if (onApprovePatch) onApprovePatch(inc.id, notes || auditComment);
        }, 2400);
      } catch (err) {
        setIsVerifying(false);
        showToast(`Approval failed: ${err.message}`, 'error', 'text-error');
      }
    } else if (type === 'reject') {
      try {
        await api.rejectPatch(inc.id, notes);
        showToast('Patch rejected. Requesting alternative synthesis from Repair Agent...', 'cancel', 'text-error');
        if (onRejectPatch) onRejectPatch(inc.id);
      } catch (err) {
        showToast(`Rejection failed: ${err.message}`, 'error', 'text-error');
      }
    }
  };

  return (
    <div className="flex flex-col w-full gap-space-lg">
      {/* Top Breadcrumb & Return CTA */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-on-surface-variant hover:text-on-surface font-body-sm text-body-sm transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          <span>Back to Incidents</span>
        </button>
      </div>

      {/* Top Context & Command Bar */}
      <div className="relative bg-surface-container rounded-xl p-space-md shadow-xl overflow-hidden border border-surface-container-high/50">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-error/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute left-1/3 -bottom-24 w-72 h-72 bg-secondary/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col xl:flex-row xl:items-center justify-between gap-space-md">
          {/* Identity & Badges */}
          <div className="flex flex-col gap-space-xs min-w-0">
            <div className="flex flex-wrap items-center gap-space-sm font-mono">
              <div className="flex items-center gap-1.5 px-space-xs py-0.5 rounded bg-surface-container-high text-on-surface border border-surface-container-highest">
                <span className="font-label-md text-label-md font-semibold tracking-wider text-secondary">
                  {inc.id}
                </span>
                <button
                  onClick={() => handleCopy(inc.id, 'Incident ID')}
                  className="text-outline hover:text-on-surface transition-colors flex items-center"
                  title="Copy Incident ID"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {copiedField === 'Incident ID' ? 'check' : 'content_copy'}
                  </span>
                </button>
              </div>

              <span className="px-2 py-0.5 rounded bg-error-container text-on-error-container font-label-sm text-label-sm font-bold flex items-center gap-1 shadow-sm text-[11px]">
                <span className="w-1.5 h-1.5 rounded-full bg-error animate-ping"></span>
                {inc.severityLabel}
              </span>

              <span className="relative flex items-center gap-1.5 px-2.5 py-0.5 rounded bg-surface-container-highest text-secondary font-label-sm text-label-sm font-semibold text-[11px] border border-secondary/20">
                {verificationPassed ? (
                  <span className="text-tertiary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">check_circle</span>
                    RECOVERED & CLOSED
                  </span>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                    </span>
                    AWAITING HUMAN APPROVAL
                  </>
                )}
              </span>

              <span className="font-label-sm text-label-sm text-outline flex items-center gap-1 text-[11px]">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Today at 09:41:22 UTC ({inc.detectedTime})
              </span>
            </div>

            <h1 className="font-headline-lg text-headline-lg text-on-surface tracking-tight truncate mt-0.5">
              {inc.title}
            </h1>

            <div className="flex flex-wrap items-center gap-x-space-md gap-y-1 text-on-surface-variant font-label-sm text-label-sm mt-0.5 font-mono text-xs">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-outline">dns</span>
                App: <strong className="text-on-surface">{inc.app}</strong>
              </span>
              <span className="text-outline">/</span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px] text-outline">device_hub</span>
                Node: <code className="text-secondary font-code-block text-[11px]">k8s-worker-us-east-1a</code>
              </span>
              <span className="text-outline">/</span>
              <span className="flex items-center gap-1 text-primary">
                <span className="material-symbols-outlined text-[15px]">deployed_code</span>
                Deploy: SHA <code className="text-on-surface font-code-block text-[11px]">e78f21c</code>
              </span>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="flex items-center gap-space-xs sm:gap-space-sm shrink-0 flex-wrap">
            <button
              onClick={() => showToast('Escalated to Primary On-Call SRE via PagerDuty.', 'notification_important', 'text-error')}
              className="px-space-sm py-2 rounded bg-surface-container-high hover:bg-surface-container-highest text-on-surface font-body-sm text-body-sm font-medium transition-all shadow-sm flex items-center gap-1.5 border border-surface-container-highest"
            >
              <span className="material-symbols-outlined text-[18px] text-outline">call</span>
              <span>Escalate to SRE</span>
            </button>
            <button
              onClick={handleOpenReject}
              disabled={verificationPassed}
              className="px-space-sm py-2 rounded bg-surface-container-high hover:bg-error-container hover:text-on-error-container text-error font-body-sm text-body-sm font-medium transition-all shadow-sm flex items-center gap-1.5 border border-surface-container-highest disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">close</span>
              <span>Reject Patch</span>
            </button>
            <button
              onClick={handleOpenApprove}
              disabled={isVerifying || verificationPassed}
              className="px-space-md py-2 rounded bg-primary-container text-on-primary font-body-sm text-body-sm font-semibold hover:opacity-95 shadow-md flex items-center gap-1.5 transition-all disabled:opacity-75"
            >
              {isVerifying ? (
                <>
                  <span className="material-symbols-outlined text-[18px] animate-spin">sync</span>
                  <span>Verifying in Sandbox...</span>
                </>
              ) : verificationPassed ? (
                <>
                  <span className="material-symbols-outlined text-[18px]">task_alt</span>
                  <span>Patch Verified & Deployed</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[18px]">play_circle</span>
                  <span>Approve & Trigger Sandbox</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 1: Autonomous Agent Pipeline Timeline */}
      <div className="bg-surface-container rounded-xl p-space-md shadow-md border border-surface-container-high/40">
        <div className="flex items-center justify-between pb-space-xs mb-space-sm border-b border-surface-container-high/30">
          <div className="flex items-center gap-space-xs font-mono">
            <span className="material-symbols-outlined text-[18px] text-secondary">alt_route</span>
            <span className="font-headline-sm text-headline-sm text-on-surface">Multi-Agent Autonomy Pipeline</span>
            <span className="font-label-sm text-label-sm text-outline ml-2 text-xs">Orchestration Swarm v4.2</span>
          </div>
          <div className="flex items-center gap-2 font-mono text-xs">
            <span className="font-label-sm text-label-sm text-tertiary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-tertiary"></span>
              {verificationPassed ? '5 Completed' : '3 Completed'}
            </span>
            <span className="text-outline">·</span>
            <span className="font-label-sm text-label-sm text-secondary flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-ping"></span>
              {verificationPassed ? '0 Pending' : '1 Pending Action'}
            </span>
          </div>
        </div>

        {/* Stepper horizontal track (5 steps) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-space-xs relative">
          {/* Step 1: Observer */}
          <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col justify-between gap-space-xs relative overflow-hidden border border-surface-container-high/40">
            <div className="h-1 absolute top-0 inset-x-0 bg-tertiary"></div>
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-tertiary-container/30 text-tertiary flex items-center justify-center font-bold">✓</span>
                <span className="font-semibold text-tertiary">Observer Agent</span>
              </div>
              <span className="text-outline">09:41:23</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 text-xs">
              Detected failure spike (<span className="text-error font-mono">+420 err/sec</span> in 5xx telemetry).
            </p>
            <span className="font-label-sm text-tertiary-fixed-dim uppercase tracking-wider font-mono text-[10px]">
              State: Complete
            </span>
          </div>

          {/* Step 2: Investigator */}
          <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col justify-between gap-space-xs relative overflow-hidden border border-surface-container-high/40">
            <div className="h-1 absolute top-0 inset-x-0 bg-tertiary"></div>
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-tertiary-container/30 text-tertiary flex items-center justify-center font-bold">✓</span>
                <span className="font-semibold text-tertiary">Investigator</span>
              </div>
              <span className="text-outline">09:42:05</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 text-xs">
              Isolated commit <code className="text-secondary font-code-block text-[11px]">e78f21</code> & nullable payload crash.
            </p>
            <span className="font-label-sm text-tertiary-fixed-dim uppercase tracking-wider font-mono text-[10px]">
              State: Complete
            </span>
          </div>

          {/* Step 3: Repair Agent */}
          <div className="bg-surface-container-low rounded-lg p-space-sm flex flex-col justify-between gap-space-xs relative overflow-hidden border border-surface-container-high/40">
            <div className="h-1 absolute top-0 inset-x-0 bg-tertiary"></div>
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-tertiary-container/30 text-tertiary flex items-center justify-center font-bold">✓</span>
                <span className="font-semibold text-tertiary">Repair Agent</span>
              </div>
              <span className="text-outline">09:43:10</span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 text-xs">
              Synthesized minimal defensive null-check patch & regression spec.
            </p>
            <span className="font-label-sm text-tertiary-fixed-dim uppercase tracking-wider font-mono text-[10px]">
              State: Complete
            </span>
          </div>

          {/* Step 4: Human Approval */}
          <div className={`rounded-lg p-space-sm flex flex-col justify-between gap-space-xs relative overflow-hidden shadow-lg border ${
            verificationPassed ? 'bg-surface-container-low border-surface-container-high/40' : 'bg-surface-container-high border-secondary/40 ring-1 ring-secondary/30'
          }`}>
            <div className={`h-1 absolute top-0 inset-x-0 ${verificationPassed ? 'bg-tertiary' : 'bg-secondary'}`}></div>
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1.5">
                {verificationPassed ? (
                  <span className="w-5 h-5 rounded-full bg-tertiary-container/30 text-tertiary flex items-center justify-center font-bold">✓</span>
                ) : (
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
                  </span>
                )}
                <span className="font-semibold text-secondary-fixed">Human Approval</span>
              </div>
              <span className={`font-label-sm font-mono text-[10px] ${verificationPassed ? 'text-tertiary' : 'text-secondary animate-pulse'}`}>
                {verificationPassed ? 'SIGNED' : 'ACTIVE'}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface font-medium line-clamp-2 text-xs">
              {verificationPassed ? 'Approved by Lead Engineer Elena Vance' : 'Awaiting Lead Engineer Elena Vance confirmation.'}
            </p>
            <span className="font-label-sm text-secondary uppercase tracking-wider font-mono text-[10px]">
              Gate: {verificationPassed ? 'Passed' : 'In Progress'}
            </span>
          </div>

          {/* Step 5: Verifier Agent */}
          <div className={`rounded-lg p-space-sm flex flex-col justify-between gap-space-xs relative overflow-hidden border ${
            verificationPassed 
              ? 'bg-surface-container-high border-tertiary/50' 
              : 'bg-surface-container-low opacity-75 border-surface-container-high/40'
          }`}>
            <div className={`h-1 absolute top-0 inset-x-0 ${verificationPassed ? 'bg-tertiary' : 'bg-surface-container-highest'}`}></div>
            <div className="flex items-center justify-between font-mono text-xs">
              <div className="flex items-center gap-1.5">
                {verificationPassed ? (
                  <span className="w-5 h-5 rounded-full bg-tertiary-container/30 text-tertiary flex items-center justify-center font-bold">✓</span>
                ) : (
                  <span className="w-5 h-5 rounded-full bg-surface-container-highest text-outline flex items-center justify-center text-[10px]">5</span>
                )}
                <span className={`font-medium ${verificationPassed ? 'text-tertiary font-bold' : 'text-outline'}`}>Verifier Agent</span>
              </div>
              <span className="text-outline font-mono text-[10px]">
                {verificationPassed ? '14/14 PASS' : 'Standby'}
              </span>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2 text-xs">
              {verificationPassed ? 'Executed 14 regression suites in ephemeral sandbox with 0 failures.' : 'Sandbox pre-flight ready (isolated test container created).'}
            </p>
            <span className={`font-label-sm uppercase tracking-wider font-mono text-[10px] ${verificationPassed ? 'text-tertiary' : 'text-outline'}`}>
              Gate: {verificationPassed ? 'Verified' : 'Queued'}
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Two-Column Deep-Dive Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md items-start">
        {/* Left Column: Evidence & Telemetry (7 cols) */}
        <div className="lg:col-span-7 flex flex-col gap-space-md">
          {/* Stack Trace Terminal */}
          <div className="bg-surface-container-lowest rounded-xl overflow-hidden shadow-lg border border-surface-container-high/50">
            <div className="bg-surface-container-high px-space-md py-space-xs flex items-center justify-between border-b border-surface-container-highest/40">
              <div className="flex items-center gap-space-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-error inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-secondary inline-block"></span>
                <span className="w-2.5 h-2.5 rounded-full bg-tertiary inline-block"></span>
                <span className="font-label-sm text-label-sm text-on-surface font-semibold ml-2 font-mono text-xs">
                  Stack Trace: stripe-worker-4
                </span>
              </div>
              <button
                onClick={() => handleCopy(inc.stackTrace, 'Stack Trace')}
                className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface font-label-sm text-label-sm px-2 py-0.5 rounded bg-surface-container hover:bg-surface-container-highest transition-colors font-mono text-[11px]"
              >
                <span className="material-symbols-outlined text-[14px]">file_copy</span>
                <span>Copy Trace</span>
              </button>
            </div>
            <div className="p-space-md font-code-block text-[12px] overflow-x-auto text-on-surface bg-surface-container-lowest selection:bg-error-container selection:text-on-error-container">
              <div className="flex items-start gap-3">
                <div className="select-none text-outline text-right font-mono text-[11px] leading-5 pr-2 border-r border-surface-container-high/50">
                  1<br />2<br />3<br />4
                </div>
                <div className="leading-5 font-mono">
                  <span className="text-error font-semibold">Exception in thread "stripe-worker-4" java.lang.NullPointerException:</span><br />
                  <span className="text-on-error-container bg-error-container/30 px-1 rounded">
                    Cannot read field "customerMetadata" because "payload.customer" is null
                  </span><br />
                  <span className="text-outline">    at </span>
                  <span className="text-secondary">com.sentinelmesh.billing.StripeWebhookHandler.processEvent</span>
                  <span className="text-outline">(StripeWebhookHandler.java:142)</span><br />
                  <span className="text-outline">    at </span>
                  <span className="text-secondary">com.sentinelmesh.billing.StripeWebhookHandler.handleInvoicePaid</span>
                  <span className="text-outline">(StripeWebhookHandler.java:88)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Pod Stream Live Logs */}
          <div className="bg-surface-container rounded-xl p-space-md shadow-md border border-surface-container-high/40">
            <div className="flex items-center justify-between mb-space-sm pb-1 border-b border-surface-container-high/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-outline">terminal</span>
                <span className="font-headline-sm text-headline-sm text-on-surface text-sm">
                  Recent Pod Stream (payment-gateway-svc-78bd4f)
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-outline font-mono text-xs">Tail -n 5</span>
            </div>
            <div className="space-y-1.5 font-code-block text-[11px] bg-surface-container-lowest rounded-lg p-space-sm border border-surface-container-high/40 font-mono">
              {inc.podLogs.map((log, idx) => (
                <div
                  key={idx}
                  className={`flex items-start gap-2 p-0.5 rounded ${
                    log.level === 'ERROR'
                      ? 'bg-error-container/15 text-on-error-container font-semibold'
                      : log.level === 'WARN'
                      ? 'text-on-surface'
                      : 'text-on-surface-variant'
                  }`}
                >
                  <span className="text-outline shrink-0">{log.time}</span>
                  <span className={`px-1 rounded text-[10px] shrink-0 font-bold ${
                    log.level === 'ERROR'
                      ? 'bg-error-container text-on-error-container'
                      : log.level === 'WARN'
                      ? 'bg-secondary-container text-on-secondary-container'
                      : 'bg-surface-container-highest text-tertiary'
                  }`}>
                    {log.level}
                  </span>
                  <span className="truncate">{log.message}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Service Health Telemetry Sparklines */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-sm font-mono">
            {/* Metric 1 */}
            <div className="bg-surface-container rounded-xl p-space-sm shadow-sm flex flex-col justify-between border border-surface-container-high/40">
              <div className="flex items-center justify-between text-outline text-xs">
                <span>Error Rate</span>
                <span className="material-symbols-outlined text-[16px] text-error">trending_up</span>
              </div>
              <div className="my-1">
                <div className="font-headline-lg text-headline-lg text-error font-bold">14.8%</div>
                <div className="text-xs text-on-surface-variant flex items-center justify-between">
                  <span>Base: 0.01%</span>
                  <span className="text-error font-semibold">+1,479x</span>
                </div>
              </div>
              <svg className="w-full h-8 text-error" fill="none" viewBox="0 0 100 24">
                <path d="M0 20 L20 20 L35 19 L45 20 L55 18 L65 4 L75 2 L85 5 L100 2" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M0 20 L20 20 L35 19 L45 20 L55 18 L65 4 L75 2 L85 5 L100 2 L100 24 L0 24 Z" fill="currentColor" fillOpacity="0.1" />
              </svg>
            </div>

            {/* Metric 2 */}
            <div className="bg-surface-container rounded-xl p-space-sm shadow-sm flex flex-col justify-between border border-surface-container-high/40">
              <div className="flex items-center justify-between text-outline text-xs">
                <span>Latency (p99)</span>
                <span className="material-symbols-outlined text-[16px] text-secondary">speed</span>
              </div>
              <div className="my-1">
                <div className="font-headline-lg text-headline-lg text-secondary font-bold">
                  1,420<span className="text-xs font-normal text-on-surface-variant ml-0.5">ms</span>
                </div>
                <div className="text-xs text-on-surface-variant flex items-center justify-between">
                  <span>SLO: &lt; 250ms</span>
                  <span className="text-secondary font-semibold">Degraded</span>
                </div>
              </div>
              <svg className="w-full h-8 text-secondary" fill="none" viewBox="0 0 100 24">
                <path d="M0 21 L20 20 L40 21 L55 17 L65 10 L80 6 L100 4" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
                <path d="M0 21 L20 20 L40 21 L55 17 L65 10 L80 6 L100 4 L100 24 L0 24 Z" fill="currentColor" fillOpacity="0.1" />
              </svg>
            </div>

            {/* Metric 3 */}
            <div className="bg-surface-container rounded-xl p-space-sm shadow-sm flex flex-col justify-between border border-surface-container-high/40">
              <div className="flex items-center justify-between text-outline text-xs">
                <span>Container Memory</span>
                <span className="material-symbols-outlined text-[16px] text-tertiary">memory</span>
              </div>
              <div className="my-1">
                <div className="font-headline-lg text-headline-lg text-on-surface font-bold">72.4%</div>
                <div className="text-xs text-on-surface-variant flex items-center justify-between">
                  <span>Limit: 4.0 GiB</span>
                  <span className="text-tertiary font-semibold">Stable</span>
                </div>
              </div>
              <div className="w-full bg-surface-container-highest rounded-full h-2 mt-2 overflow-hidden">
                <div className="bg-tertiary h-2 rounded-full" style={{ width: '72.4%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: AI Investigation Findings (5 cols) */}
        <div className="lg:col-span-5 flex flex-col gap-space-md">
          <div className="bg-surface-container rounded-xl p-space-md shadow-xl border border-surface-container-high/40 relative overflow-hidden">
            <div className="flex items-center justify-between pb-space-xs mb-space-sm border-b border-surface-container-high/30">
              <div className="flex items-center gap-space-xs">
                <div className="w-6 h-6 rounded bg-primary-container text-on-primary flex items-center justify-center font-bold">
                  <span className="material-symbols-outlined text-[16px]">psychology</span>
                </div>
                <span className="font-headline-sm text-headline-sm text-on-surface text-sm">
                  Investigator Agent Findings
                </span>
              </div>
              <span className="px-2 py-0.5 rounded bg-tertiary-container/30 text-tertiary font-label-sm text-label-sm font-mono text-[10px]">
                Synthesis ID: AG-401
              </span>
            </div>

            {/* Confidence Dial + Blast Radius */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm bg-surface-container-low rounded-lg p-space-sm mb-space-sm border border-surface-container-high/30">
              {/* Dial */}
              <div className="flex items-center gap-3">
                <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
                  <svg className="w-16 h-16 -rotate-90" viewBox="0 0 36 36">
                    <path className="text-surface-container-highest" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3.5" />
                    <path className="text-secondary drop-shadow-[0_0_6px_rgba(76,215,246,0.6)]" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeDasharray="96.4, 100" strokeLinecap="round" strokeWidth="3.5" />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center font-mono">
                    <span className="font-bold text-on-surface text-xs">{inc.confidence}%</span>
                  </div>
                </div>
                <div className="flex flex-col font-mono text-xs">
                  <span className="text-outline uppercase text-[10px]">Confidence</span>
                  <span className="font-semibold text-secondary">High Certainty</span>
                  <span className="text-on-surface-variant text-[10px]">DeepRepair-v3</span>
                </div>
              </div>

              {/* Blast Radius */}
              <div className="flex flex-col justify-center pl-2 border-l border-surface-container-high/40">
                <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider mb-1 font-mono text-[10px]">
                  Blast Radius
                </span>
                <div className="flex items-center gap-1.5 text-on-surface font-semibold text-sm">
                  <span className="material-symbols-outlined text-[18px] text-secondary">shield_with_heart</span>
                  <span>{inc.blastRadius}</span>
                </div>
                <span className="text-on-surface-variant mt-0.5 text-[11px] leading-tight">
                  {inc.blastRadiusDetail}
                </span>
              </div>
            </div>

            {/* Root Cause */}
            <div className="flex flex-col gap-1.5 mb-space-sm">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider flex items-center gap-1 font-mono text-[10px]">
                <span className="material-symbols-outlined text-[14px] text-secondary">manage_search</span>
                Probable Root Cause
              </span>
              <div className="bg-surface-container-low rounded-lg p-space-sm text-on-surface font-body-sm text-body-sm leading-relaxed text-xs border border-surface-container-high/30">
                {inc.rootCause}
              </div>
            </div>

            {/* Source File */}
            <div className="flex flex-col gap-1.5 mb-space-sm">
              <span className="font-label-sm text-label-sm text-outline uppercase tracking-wider font-mono text-[10px]">
                Relevant Source File
              </span>
              <div className="bg-surface-container-low rounded-lg p-space-sm flex items-center justify-between border border-surface-container-high/30">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-primary">data_object</span>
                  <span className="font-code-block text-[11px] text-on-surface truncate font-mono">
                    {inc.sourceFile}
                  </span>
                </div>
                <button
                  onClick={() => handleCopy(inc.sourceFile, 'Source Path')}
                  className="shrink-0 text-outline hover:text-on-surface p-1 rounded hover:bg-surface-container"
                  title="Copy path"
                >
                  <span className="material-symbols-outlined text-[16px]">content_copy</span>
                </button>
              </div>
            </div>

            {/* Correlated Commit */}
            <div className="bg-surface-container-high/60 rounded-lg p-space-sm flex items-center justify-between border border-surface-container-highest/30">
              <div className="flex items-center gap-space-sm">
                <div className="w-7 h-7 rounded-full bg-secondary-container/30 text-secondary flex items-center justify-center font-bold text-xs font-mono">
                  JC
                </div>
                <div className="flex flex-col font-mono text-xs">
                  <span className="text-on-surface font-medium">{inc.correlatedPR}</span>
                  <span className="text-outline text-[10px]">Git author reference</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded bg-surface-container text-on-surface-variant font-mono text-[10px]">
                {inc.version}
              </span>
            </div>
          </div>

          {/* Quick Safety Matrix Card */}
          <div className="bg-surface-container rounded-xl p-space-md shadow-md border border-surface-container-high/40 font-mono text-xs">
            <span className="font-headline-sm text-headline-sm text-on-surface mb-2 block font-sans font-semibold">
              Autonomous Safety Matrix
            </span>
            <div className="grid grid-cols-2 gap-2 text-on-surface">
              <div className="bg-surface-container-low p-2 rounded flex items-center justify-between border border-surface-container-high/20">
                <span className="text-outline">Syntactic Risk:</span>
                <span className="text-tertiary font-semibold">LOW (0.2%)</span>
              </div>
              <div className="bg-surface-container-low p-2 rounded flex items-center justify-between border border-surface-container-high/20">
                <span className="text-outline">Schema Impact:</span>
                <span className="text-tertiary font-semibold">NONE (0 DB ops)</span>
              </div>
              <div className="bg-surface-container-low p-2 rounded flex items-center justify-between border border-surface-container-high/20">
                <span className="text-outline">Test Delta:</span>
                <span className="text-secondary font-semibold">+2 Edge Specs</span>
              </div>
              <div className="bg-surface-container-low p-2 rounded flex items-center justify-between border border-surface-container-high/20">
                <span className="text-outline">Rollback ETA:</span>
                <span className="text-on-surface font-semibold">&lt; 14 seconds</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: Proposed Repair & Split Code Diff Viewer */}
      <div className="bg-surface-container rounded-xl p-space-md shadow-xl flex flex-col gap-space-md border border-surface-container-high/40">
        {/* Diff Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-xs border-b border-surface-container-high/30">
          <div className="flex items-center gap-space-sm min-w-0">
            <span className="w-8 h-8 rounded bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[20px]">healing</span>
            </span>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                  Proposed Automated Patch
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-container-high text-primary font-label-sm text-label-sm font-semibold font-mono text-xs border border-primary/20">
                  Diff: -2 lines / +5 lines
                </span>
              </div>
              <span className="font-label-sm text-label-sm text-outline truncate font-mono text-xs">
                Target: <code className="text-secondary font-code-block text-[11px]">{inc.sourceFile}</code>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-surface-container-low px-space-sm py-1.5 rounded-lg shrink-0 border border-tertiary/20">
            <span className="material-symbols-outlined text-[18px] text-tertiary">verified</span>
            <span className="font-label-sm text-label-sm text-on-surface text-xs">
              Repair Agent verified syntactically sound & compliant with <strong className="text-tertiary font-mono">Java 21 LTS</strong>.
            </span>
          </div>
        </div>

        {/* Code Diff Workspace (Split View) */}
        <div className="rounded-xl overflow-hidden shadow-lg bg-surface-container-lowest border border-surface-container-high/50 font-mono">
          <div className="bg-surface-container-high px-space-md py-space-xs flex items-center justify-between text-on-surface-variant font-label-sm text-label-sm text-xs border-b border-surface-container-highest/40">
            <div className="flex items-center gap-space-md">
              <span className="text-on-surface font-semibold">@@ -139,4 +139,7 @@ public void processEvent(StripeWebhookPayload payload)</span>
              <span className="hidden sm:inline text-outline">|</span>
              <span className="hidden sm:inline text-outline">Context: StripeWebhookHandler#processEvent</span>
            </div>
            <span className="px-2 py-0.5 rounded bg-surface-container text-outline text-[11px]">Split View</span>
          </div>

          {/* Split Code Diff Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-surface-container-high/40 text-[12px]">
            {/* Left Pane: Original (Red) */}
            <div className="bg-surface-container-lowest p-space-sm overflow-x-auto">
              <div className="text-outline font-mono text-[11px] mb-2 px-2 uppercase tracking-wider flex items-center justify-between">
                <span>Original (HEAD at e78f21c)</span>
                <span className="text-error font-bold">DELETED LINES</span>
              </div>
              <table className="w-full text-left">
                <tbody>
                  <tr className="text-outline hover:bg-surface-container/30">
                    <td className="w-8 select-none text-right pr-3 text-outline text-[11px]">139</td>
                    <td className="px-2 py-0.5 text-on-surface-variant whitespace-pre">public void processEvent(StripeWebhookPayload payload) {'{'}</td>
                  </tr>
                  <tr className="text-outline hover:bg-surface-container/30">
                    <td className="w-8 select-none text-right pr-3 text-outline text-[11px]">140</td>
                    <td className="px-2 py-0.5 text-on-surface-variant whitespace-pre">    Objects.requireNonNull(payload, "Payload cannot be null");</td>
                  </tr>
                  <tr className="text-outline hover:bg-surface-container/30">
                    <td className="w-8 select-none text-right pr-3 text-outline text-[11px]">141</td>
                    <td className="px-2 py-0.5 text-on-surface-variant whitespace-pre"> </td>
                  </tr>
                  <tr className="bg-error-container/20 text-on-error-container">
                    <td className="w-8 select-none text-right pr-3 text-error text-[11px] font-bold">142</td>
                    <td className="px-2 py-0.5 whitespace-pre font-medium">
                      <span className="text-error font-bold">-</span>   String customerId = payload.getCustomer().getId();
                    </td>
                  </tr>
                  <tr className="bg-error-container/20 text-on-error-container">
                    <td className="w-8 select-none text-right pr-3 text-error text-[11px] font-bold">143</td>
                    <td className="px-2 py-0.5 whitespace-pre font-medium">
                      <span className="text-error font-bold">-</span>   billingService.recordTransaction(customerId, payload.getAmount());
                    </td>
                  </tr>
                  <tr className="text-outline hover:bg-surface-container/30">
                    <td className="w-8 select-none text-right pr-3 text-outline text-[11px]">144</td>
                    <td className="px-2 py-0.5 text-on-surface-variant whitespace-pre">{'}'}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right Pane: Proposed Patch (Green) */}
            <div className="bg-surface-container-lowest p-space-sm overflow-x-auto bg-surface-container-low/20">
              <div className="text-outline font-mono text-[11px] mb-2 px-2 uppercase tracking-wider flex items-center justify-between">
                <span>Synthesized Patch (DeepRepair Agent)</span>
                <span className="text-tertiary font-bold">ADDED LINES</span>
              </div>
              <table className="w-full text-left">
                <tbody>
                  <tr className="text-outline hover:bg-surface-container/30">
                    <td className="w-8 select-none text-right pr-3 text-outline text-[11px]">139</td>
                    <td className="px-2 py-0.5 text-on-surface-variant whitespace-pre">public void processEvent(StripeWebhookPayload payload) {'{'}</td>
                  </tr>
                  <tr className="text-outline hover:bg-surface-container/30">
                    <td className="w-8 select-none text-right pr-3 text-outline text-[11px]">140</td>
                    <td className="px-2 py-0.5 text-on-surface-variant whitespace-pre">    Objects.requireNonNull(payload, "Payload cannot be null");</td>
                  </tr>
                  <tr className="text-outline hover:bg-surface-container/30">
                    <td className="w-8 select-none text-right pr-3 text-outline text-[11px]">141</td>
                    <td className="px-2 py-0.5 text-on-surface-variant whitespace-pre"> </td>
                  </tr>
                  <tr className="bg-tertiary-container/20 text-tertiary">
                    <td className="w-8 select-none text-right pr-3 text-tertiary text-[11px] font-bold">142</td>
                    <td className="px-2 py-0.5 whitespace-pre font-medium">
                      <span className="text-tertiary font-bold">+</span>   String customerId = Optional.ofNullable(payload.getCustomer())
                    </td>
                  </tr>
                  <tr className="bg-tertiary-container/20 text-tertiary">
                    <td className="w-8 select-none text-right pr-3 text-tertiary text-[11px] font-bold">143</td>
                    <td className="px-2 py-0.5 whitespace-pre font-medium">
                      <span className="text-tertiary font-bold">+</span>           .map(Customer::getId)
                    </td>
                  </tr>
                  <tr className="bg-tertiary-container/20 text-tertiary">
                    <td className="w-8 select-none text-right pr-3 text-tertiary text-[11px] font-bold">144</td>
                    <td className="px-2 py-0.5 whitespace-pre font-medium">
                      <span className="text-tertiary font-bold">+</span>           .orElseGet(() -&gt; payload.getMetadata().getOrDefault("guest_customer_id", "GUEST_UNKNOWN"));
                    </td>
                  </tr>
                  <tr className="bg-tertiary-container/20 text-tertiary">
                    <td className="w-8 select-none text-right pr-3 text-tertiary text-[11px] font-bold">145</td>
                    <td className="px-2 py-0.5 whitespace-pre font-medium">
                      <span className="text-tertiary font-bold">+</span>   billingService.recordTransaction(customerId, payload.getAmount());
                    </td>
                  </tr>
                  <tr className="bg-tertiary-container/20 text-tertiary">
                    <td className="w-8 select-none text-right pr-3 text-tertiary text-[11px] font-bold">146</td>
                    <td className="px-2 py-0.5 whitespace-pre font-medium">
                      <span className="text-tertiary font-bold">+</span>   log.info("Handled webhook event for customer: {'{}'}", customerId);
                    </td>
                  </tr>
                  <tr className="text-outline hover:bg-surface-container/30">
                    <td className="w-8 select-none text-right pr-3 text-outline text-[11px]">147</td>
                    <td className="px-2 py-0.5 text-on-surface-variant whitespace-pre">{'}'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Human Decision Execution Deck */}
        <div className="bg-surface-container-high rounded-xl p-space-md flex flex-col lg:flex-row lg:items-center justify-between gap-space-md border border-surface-container-highest/40">
          <div className="flex-1 flex flex-col gap-1.5">
            <label className="font-label-sm text-label-sm text-on-surface flex items-center gap-1.5 font-mono text-xs">
              <span className="material-symbols-outlined text-[16px] text-secondary">history_edu</span>
              <span>Audit Log Trail Annotation (Recorded to Immutable Mesh Ledger):</span>
            </label>
            <input
              value={auditComment}
              onChange={(e) => setAuditComment(e.target.value)}
              className="w-full bg-surface-container-lowest text-on-surface font-body-sm text-body-sm px-3 py-2.5 rounded-lg placeholder:text-outline focus:outline-none focus:ring-1 focus:ring-secondary border border-surface-container-high"
              type="text"
            />
          </div>

          <div className="flex items-center gap-space-sm shrink-0 flex-wrap">
            <button
              onClick={handleReject}
              disabled={verificationPassed}
              className="px-space-md py-3 rounded-lg bg-surface-container-highest hover:bg-error-container hover:text-on-error-container text-error font-body-sm text-body-sm font-semibold transition-all shadow-sm flex items-center gap-2 border border-surface-container-highest disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[20px]">cancel</span>
              <span>Reject & Request Alternative</span>
            </button>
            <button
              onClick={handleApprove}
              disabled={isVerifying || verificationPassed}
              className="px-space-lg py-3 rounded-lg bg-primary-container hover:bg-primary-container/90 text-on-primary font-body-sm text-body-sm font-bold shadow-xl flex items-center gap-2 transform active:scale-95 transition-all disabled:opacity-75"
            >
              {isVerifying ? (
                <>
                  <span className="material-symbols-outlined text-[22px] animate-spin">sync</span>
                  <span>Running Verifier Agent...</span>
                </>
              ) : verificationPassed ? (
                <>
                  <span className="material-symbols-outlined text-[22px]">check_circle</span>
                  <span>Patch Verified & Auto-Applied</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-[22px]">verified</span>
                  <span>✓ Approve Patch & Run Verifier Agent</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 4: Pre-Execution Sandbox State */}
      <div className="bg-surface-container rounded-xl p-space-md shadow-md border border-surface-container-high/40">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-sm pb-space-xs mb-space-sm border-b border-surface-container-high/30">
          <div className="flex items-center gap-space-xs">
            <span className="material-symbols-outlined text-[20px] text-secondary">verified_user</span>
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Verification Engine Pre-Flight State
            </span>
          </div>
          <span className="px-2.5 py-0.5 rounded-full bg-surface-container-high text-secondary font-label-sm text-label-sm font-mono flex items-center gap-1.5 border border-secondary/20 text-xs">
            <span className="w-2 h-2 rounded-full bg-secondary animate-pulse"></span>
            Container: mesh-sandbox-992
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md">
          {/* Card 1 */}
          <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between border border-surface-container-high/30">
            <div>
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm mb-1 font-mono text-xs">
                <span>Synthesized Test Suite</span>
                <span className="text-tertiary font-semibold">{verificationPassed ? '14 Passed' : '14 Ready'}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg text-on-surface font-bold">14 Suites</span>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-mono text-xs">(0 failing)</span>
              </div>
              <div className="flex flex-col gap-1 mt-2 text-on-surface-variant font-body-sm text-body-sm text-xs font-mono">
                <div className="flex items-center justify-between">
                  <span>• Baseline Regression:</span>
                  <span className="text-on-surface">12 existing tests</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>• Synthetic Edge Cases:</span>
                  <span className="text-tertiary">+2 guest webhook cases</span>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 text-outline font-mono text-[11px] flex items-center gap-1 border-t border-surface-container-high/30">
              <span className="material-symbols-outlined text-[14px] text-tertiary">check</span>
              Regression baseline frozen to master
            </div>
          </div>

          {/* Card 2 */}
          <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between border border-surface-container-high/30">
            <div>
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm mb-1 font-mono text-xs">
                <span>Ephemeral Sandbox Status</span>
                <span className="text-secondary font-semibold font-mono">{verificationPassed ? 'Completed' : 'Pre-Warmed'}</span>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="font-headline-lg text-headline-lg text-secondary font-bold font-mono">
                  {verificationPassed ? 'Verified' : 'Ready'}
                </span>
                <span className="font-label-sm text-label-sm text-outline font-mono text-xs">0.00s cold start</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 text-xs">
                In-memory Mock Stripe Gateway spun up on port <code className="text-secondary font-code-block text-[11px] font-mono">18080</code>.
              </p>
            </div>
            <div className="mt-3 pt-2 text-outline font-mono text-[11px] flex items-center gap-1 border-t border-surface-container-high/30">
              <span className="material-symbols-outlined text-[14px] text-secondary">memory</span>
              Isolated cgroup: 2 CPU / 4GB RAM allocated
            </div>
          </div>

          {/* Card 3 */}
          <div className="bg-surface-container-low rounded-lg p-space-md flex flex-col justify-between border border-surface-container-high/30">
            <div>
              <div className="flex items-center justify-between text-outline font-label-sm text-label-sm mb-1 font-mono text-xs">
                <span>Zero-Drift Guarantee</span>
                <span className="text-tertiary font-semibold font-mono">Enforced</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="material-symbols-outlined text-tertiary text-[26px]">lock</span>
                <span className="font-headline-sm text-headline-sm text-on-surface font-semibold text-sm">Immutable Isolation</span>
              </div>
              <p className="font-body-sm text-body-sm text-on-surface-variant mt-2 text-xs">
                Database operations strictly directed to transient testcontainers with automated transaction rollbacks.
              </p>
            </div>
            <div className="mt-3 pt-2 text-outline font-mono text-[11px] flex items-center gap-1 border-t border-surface-container-high/30">
              <span className="material-symbols-outlined text-[14px] text-tertiary">security</span>
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
          incidentId: inc.id,
          patchId: `PAT-${inc.id.replace('INC-', '')}`,
          service: inc.app,
          file: inc.sourceFile || 'StripeWebhookHandler.java:142'
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

