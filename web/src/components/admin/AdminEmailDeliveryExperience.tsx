import type { FormEvent } from "react";
import { AdminEmailDeliveryShowcase } from "@/components/admin/AdminEmailDeliveryShowcase";
import { AdminInfoNote } from "@/components/admin/AdminInfoNote";
import { AdminSettingsSectionCard } from "@/components/admin/AdminSettingsSectionCard";

const DELAY_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: "Immediately after completion" },
  { value: 60, label: "1 hour" },
  { value: 1440, label: "24 hours" },
  { value: 2880, label: "2 days" },
  { value: 10080, label: "7 days" },
];

type AdminEmailDeliveryExperienceProps = {
  enabled: boolean;
  delayMinutes: number;
  saving: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onDelayChange: (delayMinutes: number) => void;
  onSave: (event: FormEvent) => void;
};

function EmailPreviewIllustration() {
  return (
    <div
      className="relative mx-auto flex h-20 w-20 shrink-0 items-center justify-center sm:mx-0"
      aria-hidden="true"
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-50 to-blue-100" />
      <div className="relative flex h-11 w-14 items-end justify-center rounded-md border-2 border-blue-500 bg-white shadow-sm">
        <div className="absolute -top-1 left-1/2 h-5 w-10 -translate-x-1/2 rounded-t-md border-2 border-b-0 border-blue-500 bg-blue-50" />
        <div className="absolute -right-1.5 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-amber-400 text-[10px] font-bold text-white shadow">
          ★
        </div>
        <div className="mb-1.5 space-y-0.5 px-1.5">
          <div className="h-0.5 w-6 rounded bg-blue-200" />
          <div className="h-0.5 w-4 rounded bg-blue-100" />
        </div>
      </div>
    </div>
  );
}

/**
 * Zone A — Settings content (review request settings + email preview).
 * Zone B — Showcase + consent note + Server email delivery (shell-width breakout).
 */
export function AdminEmailDeliveryExperience({
  enabled,
  delayMinutes,
  saving,
  onEnabledChange,
  onDelayChange,
  onSave,
}: AdminEmailDeliveryExperienceProps) {
  return (
    <>
      <div className="w-full space-y-5" data-testid="admin-email-delivery-experience">
        <div className="grid w-full gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.9fr)] lg:gap-5">
          <AdminSettingsSectionCard
            title="Review request emails"
            subtitle="Automatically send review request emails after a booking or request is completed."
            testId="admin-auto-review-request-settings"
          >
            <form onSubmit={onSave} className="space-y-3" noValidate>
              <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3 sm:p-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 space-y-1">
                    <p className="text-sm font-semibold text-gray-900">
                      Automatically send review request emails
                    </p>
                    <p className="flex items-start gap-1.5 text-xs leading-snug text-gray-500">
                      <span className="mt-0.5 text-gray-400" aria-hidden="true">
                        🔒
                      </span>
                      Only sent for completed bookings/requests when the client agreed to follow-up
                      emails.
                    </p>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={enabled}
                    disabled={saving}
                    onClick={() => onEnabledChange(!enabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                      enabled ? "bg-blue-600" : "bg-gray-300"
                    }`}
                    data-testid="admin-auto-review-request-enabled"
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                        enabled ? "translate-x-6" : "translate-x-1"
                      }`}
                    />
                  </button>
                </div>

                <div className="border-t border-gray-200 pt-3">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <label
                        htmlFor="auto-review-delay"
                        className="text-sm font-semibold text-gray-900"
                      >
                        Delay
                      </label>
                      <p className="mt-0.5 text-xs leading-snug text-gray-500">
                        Choose how long after completion the review request email should be sent.
                      </p>
                    </div>
                    <select
                      id="auto-review-delay"
                      value={delayMinutes}
                      disabled={saving || !enabled}
                      onChange={(event) => onDelayChange(Number(event.target.value))}
                      className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-800 shadow-sm disabled:opacity-60 sm:w-40"
                      data-testid="admin-auto-review-request-delay"
                    >
                      {DELAY_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <AdminInfoNote className="!px-3 !py-2.5 text-[13px]">
                This setting only applies to bookings/requests where the client has agreed to receive
                follow-up emails. It does not apply to marketing or promotional emails.
              </AdminInfoNote>

              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-9 items-center justify-center rounded-lg bg-blue-600 px-3.5 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-60"
                data-testid="admin-email-delivery-save"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </form>
          </AdminSettingsSectionCard>

          <AdminSettingsSectionCard title="Example review request email">
            <div className="overflow-hidden rounded-lg border border-gray-200 bg-[#fafbfc] p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0 flex-1 space-y-2.5">
                  <h4 className="text-base font-semibold leading-snug text-gray-900">
                    How was your visit with Bright Cleaners?
                  </h4>
                  <p className="text-sm leading-snug text-gray-600">
                    Hi Anna,
                    <br />
                    Thank you for choosing Bright Cleaners. We&apos;d love to hear about your
                    experience.
                  </p>
                  <button
                    type="button"
                    disabled
                    className="inline-flex rounded-lg bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm"
                  >
                    Leave a review
                  </button>
                  <p className="text-xs leading-snug text-gray-500">
                    This link will expire in 30 days. If you weren&apos;t expecting this email, you
                    can ignore it.
                    <br />— The Bright Cleaners team
                  </p>
                </div>
                <EmailPreviewIllustration />
              </div>
            </div>
          </AdminSettingsSectionCard>
        </div>
      </div>

      <AdminEmailDeliveryShowcase />
    </>
  );
}
