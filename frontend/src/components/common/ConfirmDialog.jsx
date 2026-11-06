import React, { useState, useEffect } from 'react';

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  variant = "primary", // primary | danger
  requiresNote = false,
  notePlaceholder = "Enter decision notes...",
  reasons = null, // optional array of strings e.g. ['Patch introduces risk', 'Root cause incorrect', 'Needs manual fix', 'Other']
  details = null, // optional { incidentId, patchId, service, file }
  warning = null,
  onConfirm,
  onCancel
}) {
  const [note, setNote] = useState('');
  const [selectedReason, setSelectedReason] = useState(reasons && reasons.length > 0 ? reasons[0] : '');

  useEffect(() => {
    if (isOpen) {
      setNote('');
      if (reasons && reasons.length > 0) {
        setSelectedReason(reasons[0]);
      }
    }
  }, [isOpen, reasons]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const finalNote = reasons
      ? `${selectedReason}${note.trim() ? ` - ${note.trim()}` : ''}`
      : note.trim();
    onConfirm(finalNote);
  };

  return (
    <div className="fixed inset-0 bg-deep-navy/25 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="glass-panel border border-white/90 rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl animate-in zoom-in-95 duration-150 font-sans">
        <div className="flex items-start gap-3.5 mb-4">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm ${
            variant === 'danger'
              ? 'bg-rose-100 text-rose-600'
              : 'bg-powder-blue/30 text-deep-navy'
          }`}>
            <span className="material-symbols-outlined text-[24px]">
              {variant === 'danger' ? 'warning' : 'verified_user'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base text-deep-navy font-bold truncate">
              {title}
            </h3>
            <p className="text-xs text-muted-slate mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Structured context details if present */}
        {details && (
          <div className="mb-4 bg-white/70 rounded-2xl p-3.5 border border-white/80 font-mono text-xs space-y-1.5 shadow-xs">
            {details.incidentId && (
              <div className="flex justify-between items-center text-muted-slate">
                <span>Incident ID:</span>
                <span className="text-deep-navy font-bold">{details.incidentId}</span>
              </div>
            )}
            {details.patchId && (
              <div className="flex justify-between items-center text-muted-slate">
                <span>Patch ID:</span>
                <span className="text-tertiary font-bold">{details.patchId}</span>
              </div>
            )}
            {details.service && (
              <div className="flex justify-between items-center text-muted-slate">
                <span>Target Service:</span>
                <span className="text-deep-navy">{details.service}</span>
              </div>
            )}
            {details.file && (
              <div className="flex justify-between items-center text-muted-slate">
                <span>Affected File:</span>
                <span className="text-deep-navy truncate max-w-[260px]">{details.file}</span>
              </div>
            )}
          </div>
        )}

        {/* Warning Callout */}
        {warning && (
          <div className="mb-4 p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80 text-amber-900 flex items-start gap-2.5 text-xs shadow-xs">
            <span className="material-symbols-outlined text-amber-600 text-[18px] shrink-0 mt-0.5">warning</span>
            <span className="leading-relaxed">{warning}</span>
          </div>
        )}

        {/* Reason selector if applicable (e.g. rejection) */}
        {reasons && reasons.length > 0 && (
          <div className="mb-3.5">
            <label className="font-mono text-[11px] text-muted-slate block mb-1.5 uppercase tracking-wider font-semibold">
              Primary Reason:
            </label>
            <div className="grid grid-cols-2 gap-2 mb-2">
              {reasons.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setSelectedReason(r)}
                  className={`px-3 py-2 text-left rounded-xl text-xs font-mono transition-all border ${
                    selectedReason === r
                      ? 'bg-rose-100 border-rose-300 text-rose-900 font-bold shadow-xs'
                      : 'bg-white/70 border-white/80 text-muted-slate hover:bg-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes textarea */}
        {(requiresNote || reasons) && (
          <div className="my-4">
            <label className="font-mono text-[11px] text-muted-slate block mb-1.5 uppercase tracking-wider font-semibold">
              {reasons ? 'Additional Comments / Rationale:' : 'Audit Note / Rationale:'}
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholder}
              className="w-full bg-white/90 text-deep-navy text-xs p-3 rounded-2xl border border-white/80 focus:outline-none focus:ring-2 focus:ring-powder-blue transition-all shadow-xs"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-muted-slate/15 font-sans text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-white/80 hover:bg-white text-muted-slate hover:text-deep-navy border border-white/80 transition-colors font-semibold"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-all active:scale-95 shadow-md flex items-center gap-1.5 ${
              variant === 'danger'
                ? 'bg-error hover:bg-error/90 text-white'
                : 'bg-deep-navy hover:bg-deep-navy/90 text-white'
            }`}
          >
            <span>{confirmLabel}</span>
            <span className="material-symbols-outlined text-[16px]">check</span>
          </button>
        </div>
      </div>
    </div>
  );
}
