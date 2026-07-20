import { useState, type FormEvent } from "react";
import { changePassword } from "@/api/authApi";
import { ApiClientError } from "@/api/client";
import { getApiErrorMessage } from "@/utils/errors";

type AdminSecurityPasswordCardProps = {
  disabled?: boolean;
};

function PasswordField({
  id,
  label,
  value,
  onChange,
  disabled,
  autoComplete,
  testId,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  autoComplete: string;
  testId: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="relative mt-1">
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          disabled={disabled}
          autoComplete={autoComplete}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 pr-10 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
          data-testid={testId}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className="absolute inset-y-0 right-0 px-3 text-gray-400 hover:text-gray-600"
          aria-label={visible ? "Hide password" : "Show password"}
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            {visible ? (
              <>
                <path d="M3 3l18 18" strokeLinecap="round" />
                <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" strokeLinecap="round" />
                <path
                  d="M9.9 5.1A9.8 9.8 0 0 1 12 5c5 0 8.5 4.5 9.5 6-.4.6-1.2 1.7-2.5 2.9M6.1 6.1C4.2 7.5 3 9.2 2.5 11c1 1.5 4.5 6 9.5 6 1.2 0 2.3-.2 3.3-.6"
                  strokeLinecap="round"
                />
              </>
            ) : (
              <>
                <path d="M2.5 12C3.5 10.5 7 6 12 6s8.5 4.5 9.5 6c-1 1.5-4.5 6-9.5 6s-8.5-4.5-9.5-6Z" />
                <circle cx="12" cy="12" r="2.5" />
              </>
            )}
          </svg>
        </button>
      </div>
    </div>
  );
}

export function AdminSecurityPasswordCard({ disabled = false }: AdminSecurityPasswordCardProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSuccess(null);
    setError(null);

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("Fill in all password fields.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (currentPassword === newPassword) {
      setError("New password must be different from the current password.");
      return;
    }

    setSaving(true);
    try {
      await changePassword(currentPassword, newPassword);
      setSuccess("Password updated successfully.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      if (err instanceof ApiClientError && err.code === "INVALID_CURRENT_PASSWORD") {
        setError("Current password is incorrect.");
      } else {
        setError(getApiErrorMessage(err, "Could not update password. Please try again."));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
      data-testid="admin-settings-security-card"
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold text-gray-900">Security</h3>
        <p className="mt-1 text-sm text-gray-500">
          Update your password to keep your account secure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3" noValidate>
        <PasswordField
          id="admin-current-password"
          label="Current password"
          value={currentPassword}
          onChange={setCurrentPassword}
          disabled={disabled || saving}
          autoComplete="current-password"
          testId="admin-security-current-password"
        />
        <PasswordField
          id="admin-new-password"
          label="New password"
          value={newPassword}
          onChange={setNewPassword}
          disabled={disabled || saving}
          autoComplete="new-password"
          testId="admin-security-new-password"
        />
        <PasswordField
          id="admin-confirm-password"
          label="Confirm new password"
          value={confirmPassword}
          onChange={setConfirmPassword}
          disabled={disabled || saving}
          autoComplete="new-password"
          testId="admin-security-confirm-password"
        />

        {error ? (
          <p
            role="alert"
            className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950"
            data-testid="admin-settings-security-error"
          >
            {error}
          </p>
        ) : null}
        {success ? (
          <p
            role="status"
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-900"
            data-testid="admin-settings-security-success"
          >
            {success}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={disabled || saving}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          data-testid="admin-settings-security-save"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8">
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V8a4 4 0 0 1 8 0v3" strokeLinecap="round" />
          </svg>
          {saving ? "Updating…" : "Update password"}
        </button>
      </form>
    </section>
  );
}
