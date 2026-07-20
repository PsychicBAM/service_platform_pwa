import { useMemo, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  buildTaxPricePreview,
  normalizeServiceTaxMode,
} from "@/lib/serviceTaxDisplay";

const SLOT_INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;
const MIN_ADVANCE_OPTIONS = [0, 1, 2, 4, 6, 12, 24, 48] as const;
const DURATION_INCREMENT_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;
const CURRENCY_OPTIONS = [
  { value: "USD", label: "($) USD — US Dollar" },
  { value: "EUR", label: "(€) EUR — Euro" },
  { value: "GBP", label: "(£) GBP — British Pound" },
  { value: "RUB", label: "(₽) RUB — Russian Ruble" },
  { value: "CAD", label: "($) CAD — Canadian Dollar" },
  { value: "AUD", label: "($) AUD — Australian Dollar" },
  { value: "SAR", label: "(﷼) SAR — Saudi Riyal" },
  { value: "AED", label: "(د.إ) AED — UAE Dirham" },
] as const;

export type ServicesSettingsFormState = {
  auto_confirm_bookings: boolean;
  max_advance_booking_days: string;
  min_advance_booking_hours: string;
  slot_interval_minutes: string;
  booking_buffer_minutes: string;
  service_currency: string;
  tax_mode: string;
  tax_rate_percent: string;
  show_tax_note_to_customers: boolean;
  service_visibility: string;
  show_service_duration: boolean;
  show_service_description: boolean;
  show_service_capacity: boolean;
  show_service_images: boolean;
  show_service_categories: boolean;
  require_service_category: boolean;
  duration_unit: string;
  default_duration_minutes: string;
  duration_increment_minutes: string;
  auto_confirm_within_hours: string;
};

type AdminServicesSettingsPanelProps = {
  form: ServicesSettingsFormState;
  saving: boolean;
  dirty: boolean;
  successMessage: string | null;
  errorMessage: string | null;
  fieldErrors: Partial<Record<keyof ServicesSettingsFormState, string>>;
  onUpdateForm: <K extends keyof ServicesSettingsFormState>(
    key: K,
    value: ServicesSettingsFormState[K],
  ) => void;
  onSubmit: (event: FormEvent) => void;
  onResetDefaults: () => void;
};

function CardIcon({
  tone,
  children,
}: {
  tone: "blue" | "emerald" | "violet" | "amber" | "sky";
  children: ReactNode;
}) {
  const tones: Record<typeof tone, string> = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
    sky: "bg-sky-50 text-sky-600",
  };
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-800">
      {children}
    </label>
  );
}

function Helper({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs leading-relaxed text-gray-500">{children}</p>;
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }
  return (
    <p className="mt-1 text-xs text-red-600" role="alert">
      {message}
    </p>
  );
}

function SelectField({
  id,
  testId,
  label,
  helper,
  value,
  disabled,
  error,
  onChange,
  children,
}: {
  id: string;
  testId: string;
  label: string;
  helper?: string;
  value: string;
  disabled?: boolean;
  error?: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <select
        id={id}
        data-testid={testId}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        className="mt-1.5 w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
      >
        {children}
      </select>
      {helper ? <Helper>{helper}</Helper> : null}
      <FieldError message={error} />
    </div>
  );
}

function NumberField({
  id,
  testId,
  label,
  helper,
  value,
  disabled,
  error,
  suffix,
  step,
  inputMode = "numeric",
  onChange,
}: {
  id: string;
  testId: string;
  label: string;
  helper?: string;
  value: string;
  disabled?: boolean;
  error?: string;
  suffix?: string;
  step?: string;
  inputMode?: "numeric" | "decimal";
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={id}
          data-testid={testId}
          type="number"
          inputMode={inputMode}
          step={step}
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
        />
        {suffix ? <span className="shrink-0 text-sm text-gray-500">{suffix}</span> : null}
      </div>
      {helper ? <Helper>{helper}</Helper> : null}
      <FieldError message={error} />
    </div>
  );
}

function CheckboxRow({
  testId,
  checked,
  disabled,
  title,
  helper,
  onChange,
}: {
  testId: string;
  checked: boolean;
  disabled?: boolean;
  title: string;
  helper: string;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex items-start gap-3 text-sm text-gray-700">
      <input
        type="checkbox"
        data-testid={testId}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span>
        <span className="font-medium text-gray-900">{title}</span>
        <span className="mt-0.5 block text-xs text-gray-500">{helper}</span>
      </span>
    </label>
  );
}

export function AdminServicesSettingsPanel({
  form,
  saving,
  dirty,
  successMessage,
  errorMessage,
  fieldErrors,
  onUpdateForm,
  onSubmit,
  onResetDefaults,
}: AdminServicesSettingsPanelProps) {
  const minAdvanceValue = useMemo(() => {
    const parsed = Number(form.min_advance_booking_hours);
    if (MIN_ADVANCE_OPTIONS.includes(parsed as (typeof MIN_ADVANCE_OPTIONS)[number])) {
      return String(parsed);
    }
    return form.min_advance_booking_hours;
  }, [form.min_advance_booking_hours]);

  const taxPreview = useMemo(() => {
    const rate = Number(form.tax_rate_percent.trim().replace(",", "."));
    return buildTaxPricePreview({
      taxMode: normalizeServiceTaxMode(form.tax_mode),
      taxRatePercent: Number.isFinite(rate) ? rate : 0,
      showTaxNote: form.show_tax_note_to_customers,
      currency: form.service_currency || "USD",
    });
  }, [
    form.tax_mode,
    form.tax_rate_percent,
    form.show_tax_note_to_customers,
    form.service_currency,
  ]);

  return (
    <div className="space-y-5" data-testid="admin-services-settings-page">
      {successMessage ? (
        <p
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800"
          data-testid="admin-services-settings-success"
        >
          {successMessage}
        </p>
      ) : null}
      {errorMessage ? (
        <p
          className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          data-testid="admin-services-settings-error"
          role="alert"
        >
          {errorMessage}
        </p>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-5" noValidate>
        <section
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
          data-testid="admin-services-configuration-card"
        >
          <div className="mb-5 flex items-start gap-3">
            <CardIcon tone="blue">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                <path
                  d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9c.2.6.7 1 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </CardIcon>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Service configuration</h3>
              <p className="mt-1 text-sm text-gray-500">
                Default settings that apply to all your services.
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <SelectField
              id="serviceCurrency"
              testId="admin-services-currency"
              label="Service currency"
              helper="Default currency for new services and price display preferences."
              value={form.service_currency}
              disabled={saving}
              onChange={(value) => onUpdateForm("service_currency", value)}
            >
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </SelectField>

            <SelectField
              id="serviceVisibility"
              testId="admin-services-visibility"
              label="Service visibility"
              helper="Controls which services should appear on public pages (saved preference)."
              value={form.service_visibility}
              disabled={saving}
              onChange={(value) => onUpdateForm("service_visibility", value)}
            >
              <option value="all_visible">All services are visible</option>
              <option value="active_only">Only active services</option>
            </SelectField>
          </div>

          <div
            className="mt-5 space-y-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4"
            data-testid="admin-services-tax-block"
          >
            <div>
              <h4 className="text-sm font-semibold text-gray-900">Tax &amp; price display</h4>
              <p className="mt-1 text-xs text-gray-500">
                Controls how customers see tax on public service prices. Stored service prices stay
                unchanged.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <SelectField
                id="taxMode"
                testId="admin-services-tax"
                label="Tax mode"
                helper="How tax relates to the listed service price."
                value={form.tax_mode}
                disabled={saving}
                error={fieldErrors.tax_mode}
                onChange={(value) => {
                  onUpdateForm("tax_mode", value);
                  if (value === "none") {
                    onUpdateForm("tax_rate_percent", "0");
                    onUpdateForm("show_tax_note_to_customers", false);
                  } else {
                    if (
                      form.tax_mode === "none" &&
                      (!form.tax_rate_percent.trim() || form.tax_rate_percent.trim() === "0")
                    ) {
                      onUpdateForm("tax_rate_percent", "10");
                    }
                    if (form.tax_mode === "none") {
                      onUpdateForm("show_tax_note_to_customers", true);
                    }
                  }
                }}
              >
                <option value="none">No tax</option>
                <option value="inclusive">Tax included in price</option>
                <option value="exclusive">Add tax on top of price</option>
              </SelectField>

              <NumberField
                id="taxPercent"
                testId="admin-services-tax-percent"
                label="Tax percentage"
                helper="Any value from 0 to 100. Decimals like 7.5 are allowed."
                value={form.tax_rate_percent}
                disabled={saving || form.tax_mode === "none"}
                error={fieldErrors.tax_rate_percent}
                suffix="%"
                step="0.1"
                inputMode="decimal"
                onChange={(value) => onUpdateForm("tax_rate_percent", value)}
              />
            </div>

            <CheckboxRow
              testId="admin-services-show-tax-note"
              checked={form.show_tax_note_to_customers}
              disabled={saving || form.tax_mode === "none"}
              title="Show tax note to customers"
              helper="When enabled, public prices show a short tax note next to the base price."
              onChange={(checked) => onUpdateForm("show_tax_note_to_customers", checked)}
            />

            <div
              className="rounded-lg border border-emerald-100 bg-white px-3 py-2.5"
              data-testid="admin-services-tax-preview"
            >
              <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Live preview
              </p>
              <p className="mt-1 text-sm font-medium text-slate-800">{taxPreview}</p>
              {form.tax_mode === "exclusive" ? (
                <p className="mt-1 text-xs text-slate-500">
                  Checkout totals are not recalculated yet — customers see a clear tax note on
                  listed prices.
                </p>
              ) : null}
            </div>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-3">
          <section
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            data-testid="admin-services-display-options-card"
          >
            <div className="mb-4 flex items-start gap-3">
              <CardIcon tone="blue">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              </CardIcon>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Display options</h3>
                <p className="mt-1 text-xs text-gray-500">Control how your services are shown.</p>
              </div>
            </div>
            <div className="space-y-3">
              <CheckboxRow
                testId="admin-services-show-duration"
                checked={form.show_service_duration}
                disabled={saving}
                title="Show service duration"
                helper="Display duration on service cards"
                onChange={(checked) => onUpdateForm("show_service_duration", checked)}
              />
              <CheckboxRow
                testId="admin-services-show-description"
                checked={form.show_service_description}
                disabled={saving}
                title="Show service description"
                helper="Display description on service pages"
                onChange={(checked) => onUpdateForm("show_service_description", checked)}
              />
              <CheckboxRow
                testId="admin-services-show-capacity"
                checked={form.show_service_capacity}
                disabled={saving}
                title="Show service capacity"
                helper="Display available spots / capacity"
                onChange={(checked) => onUpdateForm("show_service_capacity", checked)}
              />
              <CheckboxRow
                testId="admin-services-show-images"
                checked={form.show_service_images}
                disabled={saving}
                title="Show service images"
                helper="Display images on service cards"
                onChange={(checked) => onUpdateForm("show_service_images", checked)}
              />
            </div>
            <p className="mt-4 rounded-lg bg-gray-50 px-3 py-2 text-[11px] leading-relaxed text-gray-500">
              These preferences are saved on your business. Public pages will use them as display
              settings are rolled out.
            </p>
          </section>

          <section
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            data-testid="admin-services-availability-card"
          >
            <div className="mb-4 flex items-start gap-3">
              <CardIcon tone="emerald">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M3 10h18M8 3v4M16 3v4" strokeLinecap="round" />
                </svg>
              </CardIcon>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Availability &amp; booking</h3>
                <p className="mt-1 text-xs text-gray-500">Default availability for all services.</p>
              </div>
            </div>
            <div className="space-y-3">
              <SelectField
                id="minAdvanceHours"
                testId="admin-services-min-advance-hours"
                label="Min. advance booking time"
                helper="Same setting as Business tab."
                value={minAdvanceValue}
                disabled={saving}
                error={fieldErrors.min_advance_booking_hours}
                onChange={(value) => onUpdateForm("min_advance_booking_hours", value)}
              >
                {MIN_ADVANCE_OPTIONS.map((hours) => (
                  <option key={hours} value={String(hours)}>
                    {hours === 0 ? "No minimum" : `${hours} hour${hours === 1 ? "" : "s"}`}
                  </option>
                ))}
                {!MIN_ADVANCE_OPTIONS.includes(
                  Number(form.min_advance_booking_hours) as (typeof MIN_ADVANCE_OPTIONS)[number],
                ) ? (
                  <option value={form.min_advance_booking_hours}>
                    {form.min_advance_booking_hours} hours
                  </option>
                ) : null}
              </SelectField>

              <NumberField
                id="maxAdvanceDays"
                testId="admin-services-max-advance-days"
                label="Max. advance booking days"
                helper="Same setting as Business tab."
                value={form.max_advance_booking_days}
                disabled={saving}
                error={fieldErrors.max_advance_booking_days}
                suffix="days"
                onChange={(value) => onUpdateForm("max_advance_booking_days", value)}
              />

              <NumberField
                id="bufferMinutes"
                testId="admin-services-buffer-minutes"
                label="Buffer time between bookings"
                helper="Same setting as Business tab."
                value={form.booking_buffer_minutes}
                disabled={saving}
                error={fieldErrors.booking_buffer_minutes}
                suffix="minutes"
                onChange={(value) => onUpdateForm("booking_buffer_minutes", value)}
              />

              <SelectField
                id="slotInterval"
                testId="admin-services-slot-interval"
                label="Slot interval"
                helper="Same setting as Business tab."
                value={form.slot_interval_minutes}
                disabled={saving}
                error={fieldErrors.slot_interval_minutes}
                onChange={(value) => onUpdateForm("slot_interval_minutes", value)}
              >
                {SLOT_INTERVAL_OPTIONS.map((minutes) => (
                  <option key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </option>
                ))}
              </SelectField>
            </div>
          </section>

          <section
            className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-5"
            data-testid="admin-services-addons-card"
            aria-disabled="true"
          >
            <div className="mb-4 flex items-start gap-3">
              <CardIcon tone="violet">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" />
                  <path d="M9 12h6M12 9v6" strokeLinecap="round" />
                </svg>
              </CardIcon>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-semibold text-gray-900">Service add-ons</h3>
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
                    Coming soon
                  </span>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Add-ons are optional extras customers can choose when booking a service, such as
                  extra time, materials, urgent delivery, or additional participants.
                </p>
              </div>
            </div>
            <div className="rounded-xl border border-violet-100 bg-white px-3 py-3">
              <p className="text-sm font-medium text-gray-800">Add-on builder is not available yet</p>
              <p className="mt-1 text-xs leading-relaxed text-gray-500">
                There is no working add-ons feature in this release, so settings here stay disabled
                until an add-on builder ships. Nothing is faked or locally toggled.
              </p>
            </div>
          </section>
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <section
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            data-testid="admin-services-categories-card"
          >
            <div className="mb-4 flex items-start gap-3">
              <CardIcon tone="amber">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M3 7.5A1.5 1.5 0 0 1 4.5 6H10l2 2h7.5A1.5 1.5 0 0 1 21 9.5v7A1.5 1.5 0 0 1 19.5 18h-15A1.5 1.5 0 0 1 3 16.5v-9Z" />
                </svg>
              </CardIcon>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Service categories</h3>
                <p className="mt-1 text-xs text-gray-500">Manage how service categories are used.</p>
              </div>
            </div>

            <fieldset className="space-y-3" data-testid="admin-services-categories-mode">
              <legend className="sr-only">Category visibility</legend>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="radio"
                  name="categories-mode"
                  checked={form.show_service_categories}
                  disabled={saving}
                  onChange={() => onUpdateForm("show_service_categories", true)}
                  className="mt-0.5 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="font-medium text-gray-900">Show categories to customers</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Customers can browse by categories
                  </span>
                </span>
              </label>
              <label className="flex items-start gap-3 text-sm text-gray-700">
                <input
                  type="radio"
                  name="categories-mode"
                  checked={!form.show_service_categories}
                  disabled={saving}
                  onChange={() => onUpdateForm("show_service_categories", false)}
                  className="mt-0.5 border-gray-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>
                  <span className="font-medium text-gray-900">Hide categories</span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Categories are hidden from customers
                  </span>
                </span>
              </label>
            </fieldset>

            <div className="mt-4 border-t border-gray-100 pt-4">
              <CheckboxRow
                testId="admin-services-require-category"
                checked={form.require_service_category}
                disabled={saving}
                title="Require category for new services"
                helper="Every service must be assigned a category when created or updated."
                onChange={(checked) => onUpdateForm("require_service_category", checked)}
              />
            </div>
          </section>

          <section
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            data-testid="admin-services-duration-card"
          >
            <div className="mb-4 flex items-start gap-3">
              <CardIcon tone="sky">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="8" />
                  <path d="M12 8v4l3 2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </CardIcon>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">Service duration settings</h3>
                <p className="mt-1 text-xs text-gray-500">
                  Configure how duration is managed for your services.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              <SelectField
                id="durationUnit"
                testId="admin-services-duration-unit"
                label="Duration unit"
                helper="Booking services currently use minutes only."
                value={form.duration_unit}
                disabled={saving}
                onChange={(value) => onUpdateForm("duration_unit", value)}
              >
                <option value="minutes">Minutes</option>
              </SelectField>
              <NumberField
                id="defaultDuration"
                testId="admin-services-default-duration"
                label="Default duration"
                helper="Suggested default when creating booking services."
                value={form.default_duration_minutes}
                disabled={saving}
                error={fieldErrors.default_duration_minutes}
                suffix="min"
                onChange={(value) => onUpdateForm("default_duration_minutes", value)}
              />
              <SelectField
                id="durationIncrement"
                testId="admin-services-duration-increment"
                label="Duration increments"
                helper="Services can only be created in these increments."
                value={form.duration_increment_minutes}
                disabled={saving}
                error={fieldErrors.duration_increment_minutes}
                onChange={(value) => onUpdateForm("duration_increment_minutes", value)}
              >
                {DURATION_INCREMENT_OPTIONS.map((minutes) => (
                  <option key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </option>
                ))}
              </SelectField>
            </div>
          </section>
        </div>

        <section
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
          data-testid="admin-services-auto-confirm-card"
        >
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_16rem] lg:items-start">
            <div>
              <div className="mb-4 flex items-start gap-3">
                <CardIcon tone="emerald">
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="8" />
                    <path d="m8.5 12 2.5 2.5 4.5-4.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </CardIcon>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Auto confirmations</h3>
                  <p className="mt-1 text-xs text-gray-500">
                    Automatically confirm bookings under specific conditions.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <CheckboxRow
                  testId="admin-services-auto-confirm"
                  checked={form.auto_confirm_bookings}
                  disabled={saving}
                  title="Auto-confirm bookings"
                  helper="Automatically confirm eligible bookings (same setting as Business tab)."
                  onChange={(checked) => onUpdateForm("auto_confirm_bookings", checked)}
                />
                <div>
                  <FieldLabel htmlFor="autoConfirmHours">Confirm bookings up to</FieldLabel>
                  <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <input
                      id="autoConfirmHours"
                      data-testid="admin-services-auto-confirm-hours"
                      type="number"
                      inputMode="numeric"
                      value={form.auto_confirm_within_hours}
                      disabled={saving || !form.auto_confirm_bookings}
                      onChange={(event) =>
                        onUpdateForm("auto_confirm_within_hours", event.target.value)
                      }
                      className="w-24 rounded-xl border border-gray-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 disabled:opacity-60"
                    />
                    <span className="text-sm text-gray-600">hours in advance</span>
                  </div>
                  <Helper>
                    0 means no time limit. Bookings starting later stay pending for review.
                  </Helper>
                  <FieldError message={fieldErrors.auto_confirm_within_hours} />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
              <div className="flex items-start gap-2">
                <span className="mt-0.5 text-emerald-600" aria-hidden>
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M12 3 4 7v5c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V7l-8-4Z" />
                    <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <p className="text-xs leading-relaxed text-emerald-900">
                  Auto-confirmation helps save time. Bookings that meet your criteria will be
                  confirmed instantly.
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              data-testid="admin-services-settings-save"
              className="inline-flex rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save changes"}
            </button>
            <p className="text-xs text-gray-500">
              {dirty ? "Unsaved changes will be lost." : "All changes saved."}
            </p>
          </div>
          <button
            type="button"
            disabled={saving}
            data-testid="admin-services-settings-reset"
            onClick={onResetDefaults}
            className="text-sm font-medium text-emerald-700 hover:underline disabled:opacity-60"
          >
            Reset to defaults
          </button>
        </div>
      </form>

      <p className="text-xs text-gray-500">
        Need to create or edit individual services?{" "}
        <Link to="/admin/services" className="font-medium text-emerald-700 hover:underline">
          Open Services
        </Link>
      </p>
    </div>
  );
}
