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
    <div className="fixed inset-0 bg-surface-container-lowest/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-surface-container-highest rounded-2xl max-w-lg w-full p-space-lg shadow-2xl animate-in fade-in duration-150 font-sans">
        <div className="flex items-start gap-3 mb-space-md">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            variant === 'danger'
              ? 'bg-error-container/30 text-error'
              : 'bg-primary-container/20 text-primary'
          }`}>
            <span className="material-symbols-outlined text-[24px]">
              {variant === 'danger' ? 'warning' : 'verified_user'}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-headline-sm text-base text-on-surface font-semibold truncate">
              {title}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant text-xs mt-1 leading-relaxed">
              {message}
            </p>
          </div>
        </div>

        {/* Structured context details if present */}
        {details && (
          <div className="mb-4 bg-surface-container-low rounded-lg p-3 border border-surface-container-high/50 font-mono text-xs space-y-1.5">
            {details.incidentId && (
              <div className="flex justify-between items-center text-outline">
                <span>Incident ID:</span>
                <span className="text-secondary font-semibold">{details.incidentId}</span>
              </div>
            )}
            {details.patchId && (
              <div className="flex justify-between items-center text-outline">
                <span>Patch ID:</span>
                <span className="text-primary font-semibold">{details.patchId}</span>
              </div>
            )}
            {details.service && (
              <div className="flex justify-between items-center text-outline">
                <span>Target Service:</span>
                <span className="text-on-surface">{details.service}</span>
              </div>
            )}
            {details.file && (
              <div className="flex justify-between items-center text-outline">
                <span>Affected File:</span>
                <span className="text-on-surface truncate max-w-[260px]">{details.file}</span>
              </div>
            )}
          </div>
        )}

        {/* Warning Callout */}
        {warning && (
          <div className="mb-4 p-2.5 rounded-lg bg-error-container/15 border border-error/30 text-on-error-container flex items-start gap-2 text-xs">
            <span className="material-symbols-outlined text-error text-[18px] shrink-0 mt-0.5">warning</span>
            <span>{warning}</span>
          </div>
        )}

        {/* Reason selector if applicable (e.g. rejection) */}
        {reasons && reasons.length > 0 && (
          <div className="mb-3">
            <label className="font-mono text-[11px] text-outline block mb-1.5 uppercase tracking-wider">
              Primary Reason:
            </label>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {reasons.map((r) => (
                <button
                  type="button"
                  key={r}
                  onClick={() => setSelectedReason(r)}
                  className={`px-2.5 py-1.5 text-left rounded-md text-xs font-mono transition-colors border ${
                    selectedReason === r
                      ? 'bg-error-container/30 border-error/50 text-on-error-container font-semibold'
                      : 'bg-surface-container-low border-surface-container-high/40 text-on-surface-variant hover:bg-surface-container-high'
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
          <div className="my-space-md">
            <label className="font-mono text-[11px] text-outline block mb-1.5 uppercase tracking-wider">
              {reasons ? 'Additional Comments / Rationale:' : 'Audit Note / Rationale:'}
            </label>
            <textarea
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={notePlaceholder}
              className="w-full bg-surface-container-lowest text-on-surface font-body-sm text-xs p-2.5 rounded-lg border border-surface-container-high focus:outline-none focus:border-secondary transition-colors"
            />
          </div>
        )}

        <div className="flex items-center justify-end gap-space-sm pt-space-sm border-t border-surface-container-high/40 font-mono text-xs">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded bg-surface-container hover:bg-surface-container-high text-on-surface border border-surface-container-highest/30 transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className={`px-4 py-2 rounded font-semibold text-on-primary transition-all active:scale-95 shadow-md ${
              variant === 'danger'
                ? 'bg-error hover:bg-error/90'
                : 'bg-primary-container hover:bg-primary-container/90'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
