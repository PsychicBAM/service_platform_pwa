type FollowUpEmailConsentCheckboxProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  helperText?: string;
};

export const FOLLOW_UP_EMAIL_CONSENT_LABEL =
  "I agree to receive follow-up emails about this booking/request, including review requests.";

export const FOLLOW_UP_EMAIL_CONSENT_HELPER =
  "Optional. Only used for transactional follow-up about this booking or request — not for marketing newsletters.";

export function FollowUpEmailConsentCheckbox({
  id,
  checked,
  onChange,
  disabled = false,
  label = FOLLOW_UP_EMAIL_CONSENT_LABEL,
  helperText = FOLLOW_UP_EMAIL_CONSENT_HELPER,
}: FollowUpEmailConsentCheckboxProps) {
  return (
    <div className="space-y-1.5" data-testid="follow-up-email-consent">
      <label
        htmlFor={id}
        className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-3 text-sm text-slate-700"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500 disabled:opacity-60"
          data-testid="follow-up-email-consent-checkbox"
        />
        <span className="min-w-0 leading-snug">{label}</span>
      </label>
      {helperText ? (
        <p className="px-1 text-xs leading-relaxed text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
}
