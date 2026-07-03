import { Link } from "react-router-dom";

export const LEGAL_CONSENT_ERROR_MESSAGE =
  "Please acknowledge the draft Privacy Policy and Personal Data Consent.";

type LegalConsentCheckboxProps = {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  disabled?: boolean;
};

export function LegalConsentCheckbox({
  id,
  checked,
  onChange,
  error,
  disabled = false,
}: LegalConsentCheckboxProps) {
  return (
    <div className="space-y-1">
      <label htmlFor={id} className="flex items-start gap-2 text-sm text-slate-700">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          disabled={disabled}
          className="mt-1"
        />
        <span>
          I acknowledge the draft{" "}
          <Link to="/legal/privacy" className="font-medium text-brand-700 hover:underline">
            Privacy Policy
          </Link>{" "}
          and{" "}
          <Link to="/legal/consent" className="font-medium text-brand-700 hover:underline">
            Personal Data Consent
          </Link>{" "}
          terms (see also{" "}
          <Link to="/legal/terms" className="font-medium text-brand-700 hover:underline">
            Terms
          </Link>
          ).
        </span>
      </label>
      <p id={`${id}-note`} className="text-xs text-slate-500">
        Draft legal pages — final text pending review before public launch.
      </p>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
