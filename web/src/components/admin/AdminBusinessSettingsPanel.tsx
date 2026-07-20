import type { FormEvent, HTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { AdminBusinessLocationSection } from "@/components/admin/AdminBusinessLocationSection";
import { AdminBusinessLogoUpload } from "@/components/admin/AdminBusinessLogoUpload";
import { AdminBusinessMapPinSection } from "@/components/admin/AdminBusinessMapPinSection";
import { AdminMarketplaceCoverSection } from "@/components/admin/AdminMarketplaceCoverSection";
import { AdminSecurityPasswordCard } from "@/components/admin/AdminSecurityPasswordCard";
import { TextAreaField } from "@/components/TextAreaField";
import type { BusinessAdminRead, OperatingMode } from "@/types/api";
import { formatDateTimeLabel } from "@/utils/format";
import { formatPlanLabel } from "@/utils/planManagement";
import type { ServiceImageMedia } from "@/lib/serviceImage";

export type BusinessSettingsFormState = {
  name: string;
  description: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  timezone: string;
  operating_mode: OperatingMode;
  auto_confirm_bookings: boolean;
  cancellation_hours: string;
  max_advance_booking_days: string;
  min_advance_booking_hours: string;
  allow_guest_checkout: boolean;
  slot_interval_minutes: string;
  booking_buffer_minutes: string;
  require_payment_default: boolean;
  notification_email_enabled: boolean;
  auto_review_request_enabled: boolean;
  auto_review_request_delay_minutes: number;
};

const SLOT_INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;

const OPERATING_MODE_OPTIONS: Array<{
  value: OperatingMode;
  label: string;
  hint: string;
}> = [
  {
    value: "booking_only",
    label: "Appointments only",
    hint: "Customers can book time slots only.",
  },
  {
    value: "orders_only",
    label: "Requests only",
    hint: "Customers can submit service requests only.",
  },
  {
    value: "both",
    label: "Appointments and requests",
    hint: "Customers can book appointments and submit requests.",
  },
];

type AdminBusinessSettingsPanelProps = {
  businessId: string;
  business: BusinessAdminRead;
  form: BusinessSettingsFormState;
  saving: boolean;
  marketplaceCoverImage: ServiceImageMedia | null;
  onUpdateForm: <K extends keyof BusinessSettingsFormState>(
    key: K,
    value: BusinessSettingsFormState[K],
  ) => void;
  onSubmit: (event: FormEvent) => void;
  onLogoUrlChange: (logoUrl: string) => void;
  onMarketplaceCoverChange: (image: ServiceImageMedia | null) => void;
};

function FieldLabel({
  children,
  htmlFor,
  required,
}: {
  children: string;
  htmlFor: string;
  required?: boolean;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
}

function FieldInput({
  id,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
  required,
  inputMode,
  autoComplete,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  required?: boolean;
  inputMode?: HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
}) {
  return (
    <input
      id={id}
      type={type}
      inputMode={inputMode}
      autoComplete={autoComplete}
      value={value}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
    />
  );
}

function SettingsCard({
  letter,
  title,
  subtitle,
  children,
  testId,
}: {
  letter: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  testId?: string;
}) {
  return (
    <section
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
      data-testid={testId}
    >
      <div className="mb-4">
        <h3 className="text-base font-semibold tracking-tight text-gray-900">
          <span className="mr-1.5 text-emerald-700">{letter}.</span>
          {title}
        </h3>
        {subtitle ? <p className="mt-1 text-sm text-gray-500">{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

function Helper({ children }: { children: ReactNode }) {
  return <p className="mt-1 text-xs text-gray-500">{children}</p>;
}

export function AdminBusinessSettingsPanel({
  businessId,
  business,
  form,
  saving,
  marketplaceCoverImage,
  onUpdateForm,
  onSubmit,
  onLogoUrlChange,
  onMarketplaceCoverChange,
}: AdminBusinessSettingsPanelProps) {
  const operatingLabel =
    OPERATING_MODE_OPTIONS.find((option) => option.value === form.operating_mode)?.label ??
    formatPlanLabel(form.operating_mode);
  const statusLabel = formatPlanLabel(business.status);
  const isActive = business.status === "active";

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]" data-testid="admin-business-settings-layout">
      <form
        id="admin-business-settings-form"
        onSubmit={onSubmit}
        className="space-y-5"
        data-testid="admin-business-settings-form"
        noValidate
      >
        <SettingsCard
          letter="A"
          title="Business profile"
          subtitle="Your public name, description, and main logo."
          testId="admin-business-profile-card"
        >
          <div className="grid gap-6 lg:grid-cols-[9rem_minmax(0,1fr)] lg:items-start">
            <AdminBusinessLogoUpload
              businessId={businessId}
              logoUrl={form.logo_url}
              disabled={saving}
              onLogoUrlChange={onLogoUrlChange}
            />

            <div className="space-y-4">
              <div>
                <FieldLabel htmlFor="businessName" required>
                  Business name
                </FieldLabel>
                <FieldInput
                  id="businessName"
                  value={form.name}
                  disabled={saving}
                  required
                  onChange={(value) => onUpdateForm("name", value)}
                />
              </div>
              <TextAreaField
                name="description"
                label="Description"
                value={form.description}
                disabled={saving}
                onChange={(event) => onUpdateForm("description", event.target.value)}
              />
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          letter="B"
          title="Public business details"
          subtitle="How customers find and contact your business."
          testId="admin-business-details-card"
        >
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <FieldLabel htmlFor="publicSlug">Public page URL (slug)</FieldLabel>
                <div className="mt-1 flex overflow-hidden rounded-xl border border-gray-300 bg-gray-50">
                  <span className="shrink-0 border-r border-gray-200 px-2.5 py-2.5 text-xs text-gray-500">
                    /b/
                  </span>
                  <input
                    id="publicSlug"
                    value={business.slug}
                    readOnly
                    className="min-w-0 flex-1 bg-transparent px-3 py-2.5 font-mono text-sm text-gray-800 outline-none"
                  />
                  <span className="inline-flex items-center px-3 text-emerald-600" aria-hidden="true">
                    ✓
                  </span>
                </div>
                <Helper>Slug is set at registration and shown on your public page.</Helper>
              </div>

              <AdminBusinessLocationSection
                businessId={businessId}
                publicLocation={business.public_location}
                disabled={saving}
              />

              <div>
                <FieldLabel htmlFor="contactEmail">Contact email</FieldLabel>
                <FieldInput
                  id="contactEmail"
                  type="text"
                  inputMode="email"
                  autoComplete="email"
                  value={form.contact_email}
                  disabled={saving}
                  onChange={(value) => onUpdateForm("contact_email", value)}
                />
              </div>

              <div>
                <FieldLabel htmlFor="timezone" required>
                  Timezone
                </FieldLabel>
                <FieldInput
                  id="timezone"
                  value={form.timezone}
                  disabled={saving}
                  required
                  placeholder="Europe/Moscow, UTC, America/New_York"
                  onChange={(value) => onUpdateForm("timezone", value)}
                />
                <Helper>Used for booking times, reminders, and email notifications.</Helper>
              </div>
            </div>

            <div className="space-y-4">
              <AdminMarketplaceCoverSection
                businessId={businessId}
                image={marketplaceCoverImage}
                disabled={saving}
                onImageChange={onMarketplaceCoverChange}
              />

              <AdminBusinessMapPinSection
                businessId={businessId}
                publicLocation={business.public_location}
                disabled={saving}
              />

              <div>
                <FieldLabel htmlFor="contactPhone">Contact phone</FieldLabel>
                <FieldInput
                  id="contactPhone"
                  value={form.contact_phone}
                  disabled={saving}
                  onChange={(value) => onUpdateForm("contact_phone", value)}
                />
              </div>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          letter="C"
          title="Operating & booking settings"
          subtitle="Choose how customers book and the default booking rules."
          testId="admin-business-operating-card"
        >
          <div className="space-y-5">
            <div>
              <FieldLabel htmlFor="operatingMode">Operating mode</FieldLabel>
              <select
                id="operatingMode"
                value={form.operating_mode}
                disabled={saving}
                onChange={(event) =>
                  onUpdateForm("operating_mode", event.target.value as OperatingMode)
                }
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              >
                {OPERATING_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <Helper>
                {
                  OPERATING_MODE_OPTIONS.find((option) => option.value === form.operating_mode)
                    ?.hint
                }
              </Helper>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="cancellationHours">Cancellation hours</FieldLabel>
                <FieldInput
                  id="cancellationHours"
                  type="number"
                  value={form.cancellation_hours}
                  disabled={saving}
                  onChange={(value) => onUpdateForm("cancellation_hours", value)}
                />
                <Helper>Hours before booking start.</Helper>
              </div>
              <div>
                <FieldLabel htmlFor="maxAdvanceDays">Max advance booking days</FieldLabel>
                <FieldInput
                  id="maxAdvanceDays"
                  type="number"
                  value={form.max_advance_booking_days}
                  disabled={saving}
                  onChange={(value) => onUpdateForm("max_advance_booking_days", value)}
                />
                <Helper>Days customers can book in advance.</Helper>
              </div>
              <div>
                <FieldLabel htmlFor="minAdvanceHours">Min advance booking hours</FieldLabel>
                <FieldInput
                  id="minAdvanceHours"
                  type="number"
                  value={form.min_advance_booking_hours}
                  disabled={saving}
                  onChange={(value) => onUpdateForm("min_advance_booking_hours", value)}
                />
                <Helper>Minimum hours before booking.</Helper>
              </div>
              <div>
                <FieldLabel htmlFor="bookingBuffer">Booking buffer minutes</FieldLabel>
                <FieldInput
                  id="bookingBuffer"
                  type="number"
                  value={form.booking_buffer_minutes}
                  disabled={saving}
                  onChange={(value) => onUpdateForm("booking_buffer_minutes", value)}
                />
                <Helper>Buffer time between bookings.</Helper>
              </div>
            </div>

            <div>
              <FieldLabel htmlFor="slotInterval">Slot interval</FieldLabel>
              <select
                id="slotInterval"
                value={form.slot_interval_minutes}
                disabled={saving}
                onChange={(event) => onUpdateForm("slot_interval_minutes", event.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
              >
                {SLOT_INTERVAL_OPTIONS.map((minutes) => (
                  <option key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
              <label className="flex items-start gap-2.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.auto_confirm_bookings}
                  disabled={saving}
                  onChange={(event) =>
                    onUpdateForm("auto_confirm_bookings", event.target.checked)
                  }
                  className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="font-medium text-gray-900">Auto-confirm bookings</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Confirm new appointments automatically when they are created.
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-2.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.allow_guest_checkout}
                  disabled={saving}
                  onChange={(event) => onUpdateForm("allow_guest_checkout", event.target.checked)}
                  className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-gray-900">Allow guest checkout</span>
              </label>
              <label className="flex items-start gap-2.5 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={form.require_payment_default}
                  disabled={saving}
                  onChange={(event) =>
                    onUpdateForm("require_payment_default", event.target.checked)
                  }
                  className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span className="font-medium text-gray-900">
                  Require payment by default for new services
                </span>
              </label>
            </div>
          </div>
        </SettingsCard>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            data-testid="admin-settings-save"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
          <p className="text-xs text-gray-500">
            Location, map pin, and marketplace cover save separately when you update them.
          </p>
        </div>
      </form>

      <aside className="space-y-5 xl:sticky xl:top-4 xl:self-start">
        <section
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          data-testid="admin-business-summary-card"
        >
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex h-2.5 w-2.5 rounded-full ${
                isActive ? "bg-emerald-500" : "bg-gray-400"
              }`}
            />
            <p className="text-sm font-semibold text-gray-900">{statusLabel}</p>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {isActive
              ? "Your business is visible to customers."
              : "Your business visibility depends on the current status."}
          </p>

          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-gray-500">Business ID</dt>
              <dd className="mt-0.5 break-all font-mono text-xs text-gray-800">{business.id}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Member since</dt>
              <dd className="mt-0.5 text-gray-800">{formatDateTimeLabel(business.created_at)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Timezone</dt>
              <dd className="mt-0.5 text-gray-800">{form.timezone || business.timezone}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-500">Operating mode</dt>
              <dd className="mt-0.5 text-gray-800">{operatingLabel}</dd>
            </div>
          </dl>

          <Link
            to={`/b/${business.slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 text-sm font-semibold text-emerald-800 hover:bg-emerald-100"
            data-testid="admin-business-preview-public"
          >
            Preview public page
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M14 5h5v5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M10 14 19 5" strokeLinecap="round" />
              <path d="M19 14v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" strokeLinecap="round" />
            </svg>
          </Link>
        </section>

        <AdminSecurityPasswordCard disabled={saving} />

        <section
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          data-testid="admin-business-readonly-card"
        >
          <h3 className="text-base font-semibold text-gray-900">Read-only info</h3>
          <p className="mt-1 text-sm text-gray-500">System information for your business.</p>
          <dl className="mt-4 space-y-2.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">Status</dt>
              <dd className={`font-medium ${isActive ? "text-emerald-700" : "text-gray-900"}`}>
                {statusLabel}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-3">
              <dt className="text-gray-500">Slug</dt>
              <dd className="font-mono text-gray-900">{business.slug}</dd>
            </div>
            {business.subscription ? (
              <>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Plan</dt>
                  <dd className="font-medium text-gray-900">
                    {formatPlanLabel(business.subscription.plan)}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Total bookings</dt>
                  <dd className="font-medium text-gray-900">
                    {business.subscription.usage_bookings_count}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-gray-500">Total requests</dt>
                  <dd className="font-medium text-gray-900">
                    {business.subscription.usage_orders_count}
                  </dd>
                </div>
              </>
            ) : null}
          </dl>
        </section>
      </aside>
    </div>
  );
}
