import { useEffect, useState, type FormEvent, type HTMLAttributes } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createBillingCheckoutSession } from "@/api/billingApi";
import { getBusiness, updateBusiness } from "@/api/adminApi";
import { AdminEmailDeliveryExperience } from "@/components/admin/AdminEmailDeliveryExperience";
import { AdminMarketplaceCoverSection } from "@/components/admin/AdminMarketplaceCoverSection";
import { AdminBusinessLocationSection } from "@/components/admin/AdminBusinessLocationSection";
import { AdminBusinessMapPinSection } from "@/components/admin/AdminBusinessMapPinSection";
import { AdminPaymentsBillingPanel } from "@/components/admin/payments/AdminPaymentsBillingPanel";
import { AdminSettingsSectionCard } from "@/components/admin/AdminSettingsSectionCard";
import {
  AdminSettingsTabs,
  type AdminSettingsTabId,
} from "@/components/admin/AdminSettingsTabs";
import { PublicProfileSettingsCard } from "@/components/admin/PublicProfileSettingsCard";
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
import { normalizeServiceImageMedia, type ServiceImageMedia } from "@/lib/serviceImage";

const VALID_SETTINGS_TABS = new Set<AdminSettingsTabId>([
  "business",
  "services",
  "team",
  "notifications",
  "email-delivery",
  "payments",
  "appearance",
]);

function parseSettingsTab(value: string | null): AdminSettingsTabId {
  if (value && VALID_SETTINGS_TABS.has(value as AdminSettingsTabId)) {
    return value as AdminSettingsTabId;
  }
  return "business";
}

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

function formFromBusiness(data: BusinessAdminRead): SettingsFormState {
  return {
    name: data.name,
    description: data.description ?? "",
    logo_url: data.logo_url ?? "",
    contact_email: data.contact_email ?? "",
    contact_phone: data.contact_phone ?? "",
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
    auto_review_request_enabled: data.settings.auto_review_request_enabled,
    auto_review_request_delay_minutes: data.settings.auto_review_request_delay_minutes,
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
      auto_review_request_enabled: form.auto_review_request_enabled,
      auto_review_request_delay_minutes: form.auto_review_request_delay_minutes,
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
      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
    />
  );
}

export function AdminSettingsPage() {
  const { businessId } = useAdminBusiness();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseSettingsTab(searchParams.get("tab"));
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [billingMessage, setBillingMessage] = useState<string | null>(null);
  const [checkoutLoadingPlan, setCheckoutLoadingPlan] = useState<CheckoutPlanId | null>(null);
  const [marketplaceCoverImage, setMarketplaceCoverImage] = useState<ServiceImageMedia | null>(null);

  function setActiveTab(tab: AdminSettingsTabId) {
    const next = new URLSearchParams(searchParams);
    if (tab === "business") {
      next.delete("tab");
    } else {
      next.set("tab", tab);
    }
    setSearchParams(next, { replace: true });
  }

  const businessQuery = useQuery({
    queryKey: ["admin-business", businessId],
    queryFn: () => getBusiness(businessId!),
    enabled: Boolean(businessId),
  });

  useEffect(() => {
    if (businessQuery.data) {
      setForm(formFromBusiness(businessQuery.data));
      setMarketplaceCoverImage(normalizeServiceImageMedia(businessQuery.data.marketplace_cover_image));
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
    <section className="w-full max-w-none space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Settings</h2>
        <p className="mt-1 text-sm text-gray-500">
          {activeTab === "payments" ? (
            <>
              <span className="text-gray-400">Settings</span>
              <span className="mx-1.5 text-gray-300">›</span>
              <span className="font-medium text-emerald-700">Payments &amp; Billing</span>
            </>
          ) : (
            "Manage business profile, notifications, email delivery, and billing."
          )}
        </p>
      </div>

      <AdminSettingsTabs activeTab={activeTab} onChange={setActiveTab} />

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
        <div className="space-y-5">
          {activeTab === "business" ? (
            <form
              id="admin-business-settings-form"
              onSubmit={handleSubmit}
              className="space-y-4"
              data-testid="admin-business-settings-form"
              noValidate
            >
              <AdminSettingsSectionCard title="Business profile">
                <div className="space-y-4">
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
                  <AdminMarketplaceCoverSection
                    businessId={businessId!}
                    image={marketplaceCoverImage}
                    disabled={saving}
                    onImageChange={(nextImage) => {
                      setMarketplaceCoverImage(nextImage);
                      void queryClient.invalidateQueries({
                        queryKey: ["admin-business", businessId],
                      });
                    }}
                  />
                  <AdminBusinessLocationSection
                    businessId={businessId!}
                    publicLocation={businessQuery.data?.public_location}
                    disabled={saving}
                  />
                  <AdminBusinessMapPinSection
                    businessId={businessId!}
                    publicLocation={businessQuery.data?.public_location}
                    disabled={saving}
                  />
                  <div>
                    <FieldLabel htmlFor="contactEmail">Contact email</FieldLabel>
                    <TextInput
                      id="contactEmail"
                      type="text"
                      inputMode="email"
                      autoComplete="email"
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
                    <p className="mt-1 text-xs text-gray-500">
                      IANA timezone name, e.g. Europe/Moscow, UTC, America/New_York
                    </p>
                  </div>
                </div>
              </AdminSettingsSectionCard>

              <AdminSettingsSectionCard title="Operating mode">
                <label htmlFor="operatingMode" className="block text-sm">
                  <span className="font-medium text-gray-700">Mode</span>
                  <select
                    id="operatingMode"
                    value={form.operating_mode}
                    disabled={saving}
                    onChange={(event) =>
                      updateForm("operating_mode", event.target.value as OperatingMode)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
                  >
                    {OPERATING_MODE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <p className="mt-2 text-xs text-gray-500">
                  {
                    OPERATING_MODE_OPTIONS.find((option) => option.value === form.operating_mode)
                      ?.hint
                  }
                </p>
              </AdminSettingsSectionCard>

              <AdminSettingsSectionCard title="Booking settings">
                <div className="space-y-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.auto_confirm_bookings}
                      disabled={saving}
                      onChange={(event) =>
                        updateForm("auto_confirm_bookings", event.target.checked)
                      }
                      className="rounded border-gray-300"
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
                    <span className="font-medium text-gray-700">Slot interval (minutes)</span>
                    <select
                      id="slotInterval"
                      value={form.slot_interval_minutes}
                      disabled={saving}
                      onChange={(event) => updateForm("slot_interval_minutes", event.target.value)}
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm disabled:opacity-60"
                    >
                      {SLOT_INTERVAL_OPTIONS.map((minutes) => (
                        <option key={minutes} value={String(minutes)}>
                          {minutes} minutes
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.allow_guest_checkout}
                      disabled={saving}
                      onChange={(event) => updateForm("allow_guest_checkout", event.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Allow guest checkout
                  </label>

                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                      type="checkbox"
                      checked={form.require_payment_default}
                      disabled={saving}
                      onChange={(event) =>
                        updateForm("require_payment_default", event.target.checked)
                      }
                      className="rounded border-gray-300"
                    />
                    Require payment by default for new services
                  </label>
                </div>
              </AdminSettingsSectionCard>

              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm">
                <h3 className="font-semibold text-gray-800">Read-only</h3>
                <dl className="mt-3 space-y-2">
                  <div>
                    <dt className="text-gray-500">Slug</dt>
                    <dd className="font-mono text-gray-900">{data.slug}</dd>
                  </div>
                  <div>
                    <dt className="text-gray-500">Status</dt>
                    <dd className="text-gray-900">{data.status}</dd>
                  </div>
                  {data.subscription ? (
                    <div>
                      <dt className="text-gray-500">Usage</dt>
                      <dd className="text-gray-900">
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
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                data-testid="admin-settings-save"
              >
                {saving ? "Saving…" : "Save settings"}
              </button>
            </form>
          ) : null}

          {activeTab === "services" ? (
            <AdminSettingsSectionCard
              title="Services"
              subtitle="Manage your bookable services and request offerings from the Services page."
            >
              <Link
                to="/admin/services"
                className="inline-flex rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Open Services
              </Link>
            </AdminSettingsSectionCard>
          ) : null}

          {activeTab === "team" ? (
            <AdminSettingsSectionCard
              title="Team"
              subtitle="Team member management will live here. For now, account access is managed from your business owner login."
            >
              <p className="text-sm text-gray-500">
                Invite and role controls are planned for a later release.
              </p>
            </AdminSettingsSectionCard>
          ) : null}

          {activeTab === "notifications" ? (
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <AdminSettingsSectionCard
                title="Notifications"
                subtitle="Control operational notification emails for this business."
              >
                <label className="flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50/80 p-4 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={form.notification_email_enabled}
                    disabled={saving}
                    onChange={(event) =>
                      updateForm("notification_email_enabled", event.target.checked)
                    }
                    className="mt-0.5 rounded border-gray-300"
                  />
                  <span>
                    <span className="block font-semibold text-gray-900">
                      Notification email enabled
                    </span>
                    <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                      When enabled, this business can receive booking/request notification emails
                      (if server email delivery is configured).
                    </span>
                  </span>
                </label>
                <button
                  type="submit"
                  disabled={saving}
                  className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save changes"}
                </button>
              </AdminSettingsSectionCard>
            </form>
          ) : null}

          {activeTab === "email-delivery" ? (
            <AdminEmailDeliveryExperience
              enabled={form.auto_review_request_enabled}
              delayMinutes={form.auto_review_request_delay_minutes}
              saving={saving}
              onEnabledChange={(enabled) => updateForm("auto_review_request_enabled", enabled)}
              onDelayChange={(delayMinutes) =>
                updateForm("auto_review_request_delay_minutes", delayMinutes)
              }
              onSave={handleSubmit}
            />
          ) : null}

          {activeTab === "payments" ? (
            <AdminPaymentsBillingPanel
              businessId={businessId!}
              business={data}
              checkoutLoadingPlan={checkoutLoadingPlan}
              billingMessage={billingMessage}
              onStartCheckout={(plan) => {
                void handleStartCheckout(plan);
              }}
            />
          ) : null}

          {activeTab === "appearance" ? (
            <PublicProfileSettingsCard
              businessId={businessId!}
              businessName={data.name}
              currentPlan={data.subscription?.plan}
            />
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
