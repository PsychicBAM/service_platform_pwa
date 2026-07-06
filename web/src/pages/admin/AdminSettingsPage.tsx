import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBillingCheckoutSession } from "@/api/billingApi";
import { getBusiness, updateBusiness } from "@/api/adminApi";
import { PlanFeatureComparison } from "@/components/admin/PlanFeatureComparison";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { TextAreaField } from "@/components/TextAreaField";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type {
  BusinessAdminRead,
  BusinessUpdatePayload,
  CheckoutPlanId,
  OperatingMode,
} from "@/types/api";
import { getAdminSettingsErrorMessage, getBillingCheckoutErrorMessage } from "@/utils/errors";
import { formatPlanLabel } from "@/utils/planManagement";

const CHECKOUT_PLANS: Array<{ id: CheckoutPlanId; label: string }> = [
  { id: "starter", label: "Starter" },
  { id: "business", label: "Business" },
  { id: "pro", label: "Pro" },
];

const SLOT_INTERVAL_OPTIONS = [5, 10, 15, 20, 30, 45, 60] as const;

const OPERATING_MODE_OPTIONS: Array<{
  value: OperatingMode;
  label: string;
  hint: string;
}> = [
  {
    value: "booking_only",
    label: "Appointments only",
    hint: "booking_only — customers can book time slots only",
  },
  {
    value: "orders_only",
    label: "Requests only",
    hint: "orders_only — customers can submit service requests only",
  },
  {
    value: "both",
    label: "Appointments and requests",
    hint: "both — customers can book appointments and submit requests",
  },
];

type SettingsFormState = {
  name: string;
  description: string;
  logo_url: string;
  contact_email: string;
  contact_phone: string;
  address: string;
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
};

function formFromBusiness(data: BusinessAdminRead): SettingsFormState {
  return {
    name: data.name,
    description: data.description ?? "",
    logo_url: data.logo_url ?? "",
    contact_email: data.contact_email ?? "",
    contact_phone: data.contact_phone ?? "",
    address: data.address ?? "",
    timezone: data.timezone,
    operating_mode: data.operating_mode,
    auto_confirm_bookings: data.settings.auto_confirm_bookings,
    cancellation_hours: String(data.settings.cancellation_hours),
    max_advance_booking_days: String(data.settings.max_advance_booking_days),
    min_advance_booking_hours: String(data.settings.min_advance_booking_hours),
    allow_guest_checkout: data.settings.allow_guest_checkout,
    slot_interval_minutes: String(data.settings.slot_interval_minutes),
    booking_buffer_minutes: String(data.settings.booking_buffer_minutes),
    require_payment_default: data.settings.require_payment_default,
    notification_email_enabled: data.settings.notification_email_enabled,
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function parseIntegerField(label: string, value: string): number | string {
  const trimmed = value.trim();
  if (!trimmed) {
    return `${label} is required.`;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    return `${label} must be a whole number.`;
  }
  return parsed;
}

function validateForm(form: SettingsFormState): string | null {
  if (!form.name.trim()) {
    return "Business name is required.";
  }
  if (!form.timezone.trim()) {
    return "Timezone is required.";
  }
  const email = form.contact_email.trim();
  if (email && !isValidEmail(email)) {
    return "Please enter a valid contact email.";
  }

  const cancellationHours = parseIntegerField("Cancellation hours", form.cancellation_hours);
  if (typeof cancellationHours === "string") {
    return cancellationHours;
  }
  if (cancellationHours < 0 || cancellationHours > 720) {
    return "Cancellation hours must be between 0 and 720.";
  }

  const maxAdvanceDays = parseIntegerField(
    "Max advance booking days",
    form.max_advance_booking_days,
  );
  if (typeof maxAdvanceDays === "string") {
    return maxAdvanceDays;
  }
  if (maxAdvanceDays < 1 || maxAdvanceDays > 365) {
    return "Max advance booking days must be between 1 and 365.";
  }

  const minAdvanceHours = parseIntegerField(
    "Min advance booking hours",
    form.min_advance_booking_hours,
  );
  if (typeof minAdvanceHours === "string") {
    return minAdvanceHours;
  }
  if (minAdvanceHours < 0 || minAdvanceHours > 720) {
    return "Min advance booking hours must be between 0 and 720.";
  }

  const slotInterval = parseIntegerField("Slot interval", form.slot_interval_minutes);
  if (typeof slotInterval === "string") {
    return slotInterval;
  }
  if (!SLOT_INTERVAL_OPTIONS.includes(slotInterval as (typeof SLOT_INTERVAL_OPTIONS)[number])) {
    return "Slot interval must be one of 5, 10, 15, 20, 30, 45, or 60 minutes.";
  }

  const bookingBuffer = parseIntegerField("Booking buffer minutes", form.booking_buffer_minutes);
  if (typeof bookingBuffer === "string") {
    return bookingBuffer;
  }
  if (bookingBuffer < 0 || bookingBuffer > 240) {
    return "Booking buffer minutes must be between 0 and 240.";
  }

  return null;
}

function buildUpdatePayload(form: SettingsFormState): BusinessUpdatePayload {
  return {
    name: form.name.trim(),
    description: form.description.trim() || null,
    logo_url: form.logo_url.trim() || null,
    contact_email: form.contact_email.trim() || null,
    contact_phone: form.contact_phone.trim() || null,
    address: form.address.trim() || null,
    timezone: form.timezone.trim(),
    operating_mode: form.operating_mode,
    settings: {
      auto_confirm_bookings: form.auto_confirm_bookings,
      cancellation_hours: Number(form.cancellation_hours),
      max_advance_booking_days: Number(form.max_advance_booking_days),
      min_advance_booking_hours: Number(form.min_advance_booking_hours),
      allow_guest_checkout: form.allow_guest_checkout,
      slot_interval_minutes: Number(form.slot_interval_minutes),
      booking_buffer_minutes: Number(form.booking_buffer_minutes),
      require_payment_default: form.require_payment_default,
      notification_email_enabled: form.notification_email_enabled,
    },
  };
}

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
    <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
      {children}
      {required ? <span className="text-red-600"> *</span> : null}
    </label>
  );
}

function TextInput({
  id,
  value,
  onChange,
  disabled,
  type = "text",
  placeholder,
  required,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      required={required}
      disabled={disabled}
      placeholder={placeholder}
      onChange={(event) => onChange(event.target.value)}
      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
    />
  );
}

export function AdminSettingsPage() {
  const { businessId } = useAdminBusiness();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<CheckoutPlanId | null>(null);

  const businessQuery = useQuery({
    queryKey: ["admin-business", businessId],
    queryFn: () => getBusiness(businessId!),
    enabled: Boolean(businessId),
  });

  useEffect(() => {
    if (businessQuery.data) {
      setForm(formFromBusiness(businessQuery.data));
    }
  }, [businessQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: BusinessUpdatePayload) => updateBusiness(businessId!, payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-business", businessId] });
      setForm(formFromBusiness(data));
    },
  });

  function updateForm<K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) {
      return;
    }
    setSuccessMessage(null);
    setActionError(null);

    const validationError = validateForm(form);
    if (validationError) {
      setActionError(validationError);
      return;
    }

    try {
      await saveMutation.mutateAsync(buildUpdatePayload(form));
      setSuccessMessage("Settings saved.");
    } catch (error) {
      setActionError(getAdminSettingsErrorMessage(error, "Could not save settings."));
    }
  }

  async function handleStartCheckout(plan: CheckoutPlanId) {
    if (!businessId) {
      return;
    }
    setBillingMessage(null);
    setCheckoutLoadingPlan(plan);
    try {
      const response = await createBillingCheckoutSession(businessId, plan);
      window.location.href = response.checkout_url;
    } catch (error) {
      setBillingMessage(getBillingCheckoutErrorMessage(error));
    } finally {
      setCheckoutLoadingPlan(null);
    }
  }

  const data = businessQuery.data;
  const saving = saveMutation.isPending;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Settings</h2>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? <ErrorState title="Could not save settings" message={actionError} /> : null}

      {businessQuery.isLoading ? <LoadingState message="Loading settings…" /> : null}
      {businessQuery.isError ? (
        <ErrorState
          title="Could not load settings"
          message={getAdminSettingsErrorMessage(businessQuery.error, "Unable to load settings")}
        />
      ) : null}

      {!businessQuery.isLoading && !businessQuery.isError && data && form ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Business profile</h3>
            <div>
              <FieldLabel htmlFor="businessName" required>
                Business name
              </FieldLabel>
              <TextInput
                id="businessName"
                value={form.name}
                disabled={saving}
                required
                onChange={(value) => updateForm("name", value)}
              />
            </div>
            <TextAreaField
              name="description"
              label="Description"
              value={form.description}
              disabled={saving}
              onChange={(event) => updateForm("description", event.target.value)}
            />
            <div>
              <FieldLabel htmlFor="logoUrl">Logo URL</FieldLabel>
              <TextInput
                id="logoUrl"
                value={form.logo_url}
                disabled={saving}
                placeholder="https://…"
                onChange={(value) => updateForm("logo_url", value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="contactEmail">Contact email</FieldLabel>
              <TextInput
                id="contactEmail"
                type="email"
                value={form.contact_email}
                disabled={saving}
                onChange={(value) => updateForm("contact_email", value)}
              />
            </div>
            <div>
              <FieldLabel htmlFor="contactPhone">Contact phone</FieldLabel>
              <TextInput
                id="contactPhone"
                value={form.contact_phone}
                disabled={saving}
                onChange={(value) => updateForm("contact_phone", value)}
              />
            </div>
            <TextAreaField
              name="address"
              label="Address"
              value={form.address}
              disabled={saving}
              onChange={(event) => updateForm("address", event.target.value)}
            />
            <div>
              <FieldLabel htmlFor="timezone" required>
                Timezone
              </FieldLabel>
              <TextInput
                id="timezone"
                value={form.timezone}
                disabled={saving}
                required
                placeholder="Europe/Moscow, UTC, America/New_York"
                onChange={(value) => updateForm("timezone", value)}
              />
              <p className="mt-1 text-xs text-slate-500">
                IANA timezone name, e.g. Europe/Moscow, UTC, America/New_York
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-medium text-slate-700">Operating mode</h3>
            <label htmlFor="operatingMode" className="block text-sm">
              <span className="font-medium text-slate-700">Mode</span>
              <select
                id="operatingMode"
                value={form.operating_mode}
                disabled={saving}
                onChange={(event) =>
                  updateForm("operating_mode", event.target.value as OperatingMode)
                }
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
              >
                {OPERATING_MODE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-xs text-slate-500">
              {
                OPERATING_MODE_OPTIONS.find((option) => option.value === form.operating_mode)
                  ?.hint
              }
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Booking settings</h3>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.auto_confirm_bookings}
                disabled={saving}
                onChange={(event) => updateForm("auto_confirm_bookings", event.target.checked)}
                className="rounded border-slate-300"
              />
              Auto-confirm bookings
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <FieldLabel htmlFor="cancellationHours">Cancellation hours</FieldLabel>
                <TextInput
                  id="cancellationHours"
                  type="number"
                  value={form.cancellation_hours}
                  disabled={saving}
                  onChange={(value) => updateForm("cancellation_hours", value)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="maxAdvanceDays">Max advance booking days</FieldLabel>
                <TextInput
                  id="maxAdvanceDays"
                  type="number"
                  value={form.max_advance_booking_days}
                  disabled={saving}
                  onChange={(value) => updateForm("max_advance_booking_days", value)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="minAdvanceHours">Min advance booking hours</FieldLabel>
                <TextInput
                  id="minAdvanceHours"
                  type="number"
                  value={form.min_advance_booking_hours}
                  disabled={saving}
                  onChange={(value) => updateForm("min_advance_booking_hours", value)}
                />
              </div>
              <div>
                <FieldLabel htmlFor="bookingBuffer">Booking buffer minutes</FieldLabel>
                <TextInput
                  id="bookingBuffer"
                  type="number"
                  value={form.booking_buffer_minutes}
                  disabled={saving}
                  onChange={(value) => updateForm("booking_buffer_minutes", value)}
                />
              </div>
            </div>

            <label htmlFor="slotInterval" className="block text-sm">
              <span className="font-medium text-slate-700">Slot interval (minutes)</span>
              <select
                id="slotInterval"
                value={form.slot_interval_minutes}
                disabled={saving}
                onChange={(event) => updateForm("slot_interval_minutes", event.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
              >
                {SLOT_INTERVAL_OPTIONS.map((minutes) => (
                  <option key={minutes} value={String(minutes)}>
                    {minutes} minutes
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.allow_guest_checkout}
                disabled={saving}
                onChange={(event) => updateForm("allow_guest_checkout", event.target.checked)}
                className="rounded border-slate-300"
              />
              Allow guest checkout
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.require_payment_default}
                disabled={saving}
                onChange={(event) => updateForm("require_payment_default", event.target.checked)}
                className="rounded border-slate-300"
              />
              Require payment by default for new services
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.notification_email_enabled}
                disabled={saving}
                onChange={(event) =>
                  updateForm("notification_email_enabled", event.target.checked)
                }
                className="rounded border-slate-300"
              />
              Notification email enabled (sending not implemented yet)
            </label>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm space-y-4">
            <h3 className="text-sm font-medium text-slate-700">Billing / plan</h3>
            <p className="text-sm text-slate-600">
              Stripe checkout is optional and may be disabled in this environment. After a
              successful payment, your plan is activated by the billing webhook — not from this
              page directly.
            </p>

            {data.subscription ? (
              <dl className="grid gap-2 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Current active plan</dt>
                  <dd className="font-medium text-slate-900">
                    {formatPlanLabel(data.subscription.plan)}
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Subscription status</dt>
                  <dd className="font-medium text-slate-900">
                    {formatPlanLabel(data.subscription.status)}
                  </dd>
                </div>
                {data.settings.selected_plan_intent ? (
                  <div className="sm:col-span-2">
                    <dt className="text-slate-500">Signup plan intent</dt>
                    <dd className="font-medium text-slate-900">
                      {formatPlanLabel(data.settings.selected_plan_intent)}
                    </dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No subscription summary available.</p>
            )}

            <PlanFeatureComparison currentPlan={data.subscription?.plan} />

            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {CHECKOUT_PLANS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  disabled={saving || checkoutLoadingPlan !== null}
                  onClick={() => handleStartCheckout(plan.id)}
                  className="rounded-lg border border-brand-600 px-3 py-2 text-sm font-medium text-brand-700 hover:bg-brand-50 disabled:opacity-60"
                >
                  {checkoutLoadingPlan === plan.id
                    ? "Starting checkout…"
                    : `Start ${plan.label} checkout`}
                </button>
              ))}
            </div>

            {billingMessage ? (
              <p
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
              >
                {billingMessage}
              </p>
            ) : null}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3 text-sm">
            <h3 className="font-medium text-slate-700">Read-only</h3>
            <dl className="space-y-2">
              <div>
                <dt className="text-slate-500">Slug</dt>
                <dd className="font-mono text-slate-900">{data.slug}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="text-slate-900">{data.status}</dd>
              </div>
              {data.subscription ? (
                <div>
                  <dt className="text-slate-500">Usage</dt>
                  <dd className="text-slate-900">
                    {data.subscription.usage_bookings_count} bookings ·{" "}
                    {data.subscription.usage_orders_count} orders
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
        </form>
      ) : null}
    </section>
  );
}
