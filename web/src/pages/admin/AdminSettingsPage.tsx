import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiClientError } from "@/api/client";
import { createBillingCheckoutSession } from "@/api/billingApi";
import { getBusiness, updateBusiness } from "@/api/adminApi";
import { AdminBusinessSettingsPanel } from "@/components/admin/AdminBusinessSettingsPanel";
import { AdminEmailDeliveryExperience } from "@/components/admin/AdminEmailDeliveryExperience";
import {
  AdminPaymentsBillingPanel,
  type CheckoutActionResult,
} from "@/components/admin/payments/AdminPaymentsBillingPanel";
import { AdminServicesSettingsPanel } from "@/components/admin/AdminServicesSettingsPanel";
import { AdminTeamSettingsPanel } from "@/components/admin/AdminTeamSettingsPanel";
import { AdminSettingsSectionCard } from "@/components/admin/AdminSettingsSectionCard";
import {
  AdminSettingsTabs,
  type AdminSettingsTabId,
} from "@/components/admin/AdminSettingsTabs";
import { PublicProfileSettingsCard } from "@/components/admin/PublicProfileSettingsCard";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { useAuth } from "@/hooks/useAuth";
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

const SERVICES_SETTINGS_DEFAULTS = {
  service_currency: "USD",
  tax_mode: "none",
  tax_rate_percent: "0",
  show_tax_note_to_customers: true,
  service_visibility: "all_visible",
  show_service_duration: true,
  show_service_description: true,
  show_service_capacity: false,
  show_service_images: true,
  show_service_categories: true,
  require_service_category: false,
  duration_unit: "minutes",
  default_duration_minutes: "60",
  duration_increment_minutes: "15",
  auto_confirm_within_hours: "0",
  min_advance_booking_hours: "2",
  max_advance_booking_days: "60",
  booking_buffer_minutes: "0",
  slot_interval_minutes: "30",
  auto_confirm_bookings: false,
} as const;

function formFromBusiness(data: BusinessAdminRead): SettingsFormState {
  const settings = data.settings;
  return {
    name: data.name,
    description: data.description ?? "",
    logo_url: data.logo_url ?? "",
    contact_email: data.contact_email ?? "",
    contact_phone: data.contact_phone ?? "",
    timezone: data.timezone,
    operating_mode: data.operating_mode,
    auto_confirm_bookings: settings.auto_confirm_bookings,
    cancellation_hours: String(settings.cancellation_hours),
    max_advance_booking_days: String(settings.max_advance_booking_days),
    min_advance_booking_hours: String(settings.min_advance_booking_hours),
    allow_guest_checkout: settings.allow_guest_checkout,
    slot_interval_minutes: String(settings.slot_interval_minutes),
    booking_buffer_minutes: String(settings.booking_buffer_minutes),
    require_payment_default: settings.require_payment_default,
    notification_email_enabled: settings.notification_email_enabled,
    auto_review_request_enabled: settings.auto_review_request_enabled,
    auto_review_request_delay_minutes: settings.auto_review_request_delay_minutes,
    service_currency: settings.service_currency ?? SERVICES_SETTINGS_DEFAULTS.service_currency,
    tax_mode: settings.tax_mode ?? SERVICES_SETTINGS_DEFAULTS.tax_mode,
    tax_rate_percent: String(
      settings.tax_rate_percent ?? Number(SERVICES_SETTINGS_DEFAULTS.tax_rate_percent),
    ),
    show_tax_note_to_customers:
      settings.show_tax_note_to_customers ?? settings.price_display !== "hide_tax",
    service_visibility:
      settings.service_visibility ?? SERVICES_SETTINGS_DEFAULTS.service_visibility,
    show_service_duration:
      settings.show_service_duration ?? SERVICES_SETTINGS_DEFAULTS.show_service_duration,
    show_service_description:
      settings.show_service_description ?? SERVICES_SETTINGS_DEFAULTS.show_service_description,
    show_service_capacity:
      settings.show_service_capacity ?? SERVICES_SETTINGS_DEFAULTS.show_service_capacity,
    show_service_images:
      settings.show_service_images ?? SERVICES_SETTINGS_DEFAULTS.show_service_images,
    show_service_categories:
      settings.show_service_categories ?? SERVICES_SETTINGS_DEFAULTS.show_service_categories,
    require_service_category:
      settings.require_service_category ?? SERVICES_SETTINGS_DEFAULTS.require_service_category,
    duration_unit: settings.duration_unit ?? SERVICES_SETTINGS_DEFAULTS.duration_unit,
    default_duration_minutes: String(
      settings.default_duration_minutes ??
        Number(SERVICES_SETTINGS_DEFAULTS.default_duration_minutes),
    ),
    duration_increment_minutes: String(
      settings.duration_increment_minutes ??
        Number(SERVICES_SETTINGS_DEFAULTS.duration_increment_minutes),
    ),
    auto_confirm_within_hours: String(
      settings.auto_confirm_within_hours ??
        Number(SERVICES_SETTINGS_DEFAULTS.auto_confirm_within_hours),
    ),
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

function parseTaxPercentField(value: string): number | string {
  const trimmed = value.trim().replace(",", ".");
  if (!trimmed) {
    return "Tax percentage is required.";
  }
  if (!/^\d+(\.\d+)?$/.test(trimmed)) {
    return "Tax percentage must be a number.";
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) {
    return "Tax percentage must be a number.";
  }
  if (parsed < 0 || parsed > 100) {
    return "Tax percentage must be between 0 and 100.";
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

  const defaultDuration = parseIntegerField(
    "Default duration",
    form.default_duration_minutes,
  );
  if (typeof defaultDuration === "string") {
    return defaultDuration;
  }
  if (defaultDuration < 1 || defaultDuration > 1440) {
    return "Default duration must be between 1 and 1440 minutes.";
  }

  const durationIncrement = parseIntegerField(
    "Duration increments",
    form.duration_increment_minutes,
  );
  if (typeof durationIncrement === "string") {
    return durationIncrement;
  }
  if (![5, 10, 15, 20, 30, 45, 60].includes(durationIncrement)) {
    return "Duration increments must be one of 5, 10, 15, 20, 30, 45, or 60 minutes.";
  }

  const autoConfirmHours = parseIntegerField(
    "Auto-confirm hours",
    form.auto_confirm_within_hours,
  );
  if (typeof autoConfirmHours === "string") {
    return autoConfirmHours;
  }
  if (autoConfirmHours < 0 || autoConfirmHours > 720) {
    return "Auto-confirm hours must be between 0 and 720.";
  }

  if (!["none", "inclusive", "exclusive"].includes(form.tax_mode)) {
    return "Tax mode is invalid.";
  }
  const taxPercent = parseTaxPercentField(form.tax_rate_percent);
  if (typeof taxPercent === "string") {
    return taxPercent;
  }
  if (form.tax_mode !== "none" && taxPercent <= 0) {
    return "Tax percentage must be greater than 0 when tax is enabled.";
  }

  return null;
}

function collectServicesFieldErrors(
  form: SettingsFormState,
): Partial<Record<keyof SettingsFormState, string>> {
  const errors: Partial<Record<keyof SettingsFormState, string>> = {};

  const minAdvanceHours = parseIntegerField(
    "Min advance booking hours",
    form.min_advance_booking_hours,
  );
  if (typeof minAdvanceHours === "string") {
    errors.min_advance_booking_hours = minAdvanceHours;
  } else if (minAdvanceHours < 0) {
    errors.min_advance_booking_hours = "Min advance booking hours must be 0 or greater.";
  }

  const maxAdvanceDays = parseIntegerField(
    "Max advance booking days",
    form.max_advance_booking_days,
  );
  if (typeof maxAdvanceDays === "string") {
    errors.max_advance_booking_days = maxAdvanceDays;
  } else if (maxAdvanceDays < 0) {
    errors.max_advance_booking_days = "Max advance booking days must be 0 or greater.";
  }

  const bookingBuffer = parseIntegerField(
    "Booking buffer minutes",
    form.booking_buffer_minutes,
  );
  if (typeof bookingBuffer === "string") {
    errors.booking_buffer_minutes = bookingBuffer;
  } else if (bookingBuffer < 0) {
    errors.booking_buffer_minutes = "Buffer minutes must be 0 or greater.";
  }

  const defaultDuration = parseIntegerField(
    "Default duration",
    form.default_duration_minutes,
  );
  if (typeof defaultDuration === "string") {
    errors.default_duration_minutes = defaultDuration;
  } else if (defaultDuration <= 0) {
    errors.default_duration_minutes = "Default duration must be greater than 0.";
  }

  const durationIncrement = parseIntegerField(
    "Duration increments",
    form.duration_increment_minutes,
  );
  if (typeof durationIncrement === "string") {
    errors.duration_increment_minutes = durationIncrement;
  } else if (durationIncrement <= 0) {
    errors.duration_increment_minutes = "Duration increment must be greater than 0.";
  }

  const autoConfirmHours = parseIntegerField(
    "Auto-confirm hours",
    form.auto_confirm_within_hours,
  );
  if (typeof autoConfirmHours === "string") {
    errors.auto_confirm_within_hours = autoConfirmHours;
  } else if (autoConfirmHours < 0) {
    errors.auto_confirm_within_hours = "Auto-confirm hours must be 0 or greater.";
  }

  if (!["none", "inclusive", "exclusive"].includes(form.tax_mode)) {
    errors.tax_mode = "Select a valid tax mode.";
  }
  const taxPercent = parseTaxPercentField(form.tax_rate_percent);
  if (typeof taxPercent === "string") {
    errors.tax_rate_percent = taxPercent;
  } else if (form.tax_mode !== "none" && taxPercent <= 0) {
    errors.tax_rate_percent = "Tax percentage must be greater than 0 when tax is enabled.";
  }

  return errors;
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
      service_currency: form.service_currency,
      tax_mode: form.tax_mode,
      tax_rate_percent:
        form.tax_mode === "none" ? 0 : Number(form.tax_rate_percent.trim().replace(",", ".")),
      show_tax_note_to_customers:
        form.tax_mode === "none" ? false : form.show_tax_note_to_customers,
      // Keep legacy price_display aligned for older readers.
      price_display:
        form.tax_mode === "none" || !form.show_tax_note_to_customers
          ? "hide_tax"
          : form.tax_mode === "inclusive"
            ? "including_tax"
            : "excluding_tax",
      service_visibility: form.service_visibility,
      show_service_duration: form.show_service_duration,
      show_service_description: form.show_service_description,
      show_service_capacity: form.show_service_capacity,
      show_service_images: form.show_service_images,
      show_service_categories: form.show_service_categories,
      require_service_category: form.require_service_category,
      duration_unit: form.duration_unit,
      default_duration_minutes: Number(form.default_duration_minutes),
      duration_increment_minutes: Number(form.duration_increment_minutes),
      auto_confirm_within_hours: Number(form.auto_confirm_within_hours),
    },
  };
}

export function AdminSettingsPage() {
  const { businessId, businessName, businesses } = useAdminBusiness();
  const { user } = useAuth();
  const membershipRole =
    businesses.find((item) => item.id === businessId)?.role ??
    user?.businesses.find((item) => item.id === businessId)?.role ??
    null;
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = parseSettingsTab(searchParams.get("tab"));
  const [form, setForm] = useState<SettingsFormState | null>(null);
  const [baselineForm, setBaselineForm] = useState<SettingsFormState | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [servicesFieldErrors, setServicesFieldErrors] = useState<
    Partial<Record<keyof SettingsFormState, string>>
  >({});
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
    setSuccessMessage(null);
    setActionError(null);
    setServicesFieldErrors({});
  }

  const businessQuery = useQuery({
    queryKey: ["admin-business", businessId],
    queryFn: () => getBusiness(businessId!),
    enabled: Boolean(businessId),
  });

  useEffect(() => {
    if (businessQuery.data) {
      const nextForm = formFromBusiness(businessQuery.data);
      setForm(nextForm);
      setBaselineForm(nextForm);
      setMarketplaceCoverImage(normalizeServiceImageMedia(businessQuery.data.marketplace_cover_image));
    }
  }, [businessQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (payload: BusinessUpdatePayload) => updateBusiness(businessId!, payload),
    onSuccess: async (data) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-business", businessId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-services", businessId] });
      const nextForm = formFromBusiness(data);
      setForm(nextForm);
      setBaselineForm(nextForm);
    },
  });

  function updateForm<K extends keyof SettingsFormState>(key: K, value: SettingsFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
    setServicesFieldErrors((current) => {
      if (!(key in current)) {
        return current;
      }
      const next = { ...current };
      delete next[key];
      return next;
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!form) {
      return;
    }
    setSuccessMessage(null);
    setActionError(null);

    if (activeTab === "services") {
      const fieldErrors = collectServicesFieldErrors(form);
      setServicesFieldErrors(fieldErrors);
      if (Object.keys(fieldErrors).length > 0) {
        setActionError("Please fix the highlighted fields before saving.");
        return;
      }
    }

    const validationError = validateForm(form);
    if (validationError) {
      setActionError(validationError);
      return;
    }

    try {
      await saveMutation.mutateAsync(buildUpdatePayload(form));
      setSuccessMessage(
        activeTab === "services" ? "Service settings saved." : "Settings saved.",
      );
      setServicesFieldErrors({});
    } catch (error) {
      setActionError(getAdminSettingsErrorMessage(error, "Could not save settings."));
    }
  }

  function handleResetServicesDefaults() {
    if (!form) {
      return;
    }
    setForm({
      ...form,
      ...SERVICES_SETTINGS_DEFAULTS,
    });
    setSuccessMessage(null);
    setActionError(null);
    setServicesFieldErrors({});
  }

  async function handleStartCheckout(plan: CheckoutPlanId): Promise<CheckoutActionResult> {
    if (!businessId) {
      return {
        outcome: "error",
        message: "Could not start checkout. Please try again.",
      };
    }
    setCheckoutLoadingPlan(plan);
    try {
      const response = await createBillingCheckoutSession(businessId, plan);
      window.location.href = response.checkout_url;
      return { outcome: "redirect", message: "Upgrade checkout started." };
    } catch (error) {
      if (error instanceof ApiClientError && error.code === "STRIPE_DISABLED") {
        return {
          outcome: "manual_upgrade",
          message: "Stripe checkout is not enabled; creating a plan change request.",
        };
      }
      return {
        outcome: "error",
        message: getBillingCheckoutErrorMessage(error, "Could not start checkout. Please try again."),
      };
    } finally {
      setCheckoutLoadingPlan(null);
    }
  }

  const data = businessQuery.data;
  const saving = saveMutation.isPending;
  const servicesDirty =
    Boolean(form) &&
    Boolean(baselineForm) &&
    JSON.stringify({
      auto_confirm_bookings: form!.auto_confirm_bookings,
      max_advance_booking_days: form!.max_advance_booking_days,
      min_advance_booking_hours: form!.min_advance_booking_hours,
      slot_interval_minutes: form!.slot_interval_minutes,
      booking_buffer_minutes: form!.booking_buffer_minutes,
      service_currency: form!.service_currency,
      tax_mode: form!.tax_mode,
      tax_rate_percent: form!.tax_rate_percent,
      show_tax_note_to_customers: form!.show_tax_note_to_customers,
      service_visibility: form!.service_visibility,
      show_service_duration: form!.show_service_duration,
      show_service_description: form!.show_service_description,
      show_service_capacity: form!.show_service_capacity,
      show_service_images: form!.show_service_images,
      show_service_categories: form!.show_service_categories,
      require_service_category: form!.require_service_category,
      duration_unit: form!.duration_unit,
      default_duration_minutes: form!.default_duration_minutes,
      duration_increment_minutes: form!.duration_increment_minutes,
      auto_confirm_within_hours: form!.auto_confirm_within_hours,
    }) !==
      JSON.stringify({
        auto_confirm_bookings: baselineForm!.auto_confirm_bookings,
        max_advance_booking_days: baselineForm!.max_advance_booking_days,
        min_advance_booking_hours: baselineForm!.min_advance_booking_hours,
        slot_interval_minutes: baselineForm!.slot_interval_minutes,
        booking_buffer_minutes: baselineForm!.booking_buffer_minutes,
        service_currency: baselineForm!.service_currency,
        tax_mode: baselineForm!.tax_mode,
        tax_rate_percent: baselineForm!.tax_rate_percent,
        show_tax_note_to_customers: baselineForm!.show_tax_note_to_customers,
        service_visibility: baselineForm!.service_visibility,
        show_service_duration: baselineForm!.show_service_duration,
        show_service_description: baselineForm!.show_service_description,
        show_service_capacity: baselineForm!.show_service_capacity,
        show_service_images: baselineForm!.show_service_images,
        show_service_categories: baselineForm!.show_service_categories,
        require_service_category: baselineForm!.require_service_category,
        duration_unit: baselineForm!.duration_unit,
        default_duration_minutes: baselineForm!.default_duration_minutes,
        duration_increment_minutes: baselineForm!.duration_increment_minutes,
        auto_confirm_within_hours: baselineForm!.auto_confirm_within_hours,
      });

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
          ) : activeTab === "services" ? (
            "Manage how your services are displayed, booked, and delivered."
          ) : activeTab === "business" ? (
            "Manage your business profile, contact details, booking defaults, and security."
          ) : activeTab === "team" ? (
            "Manage team members, roles, and permissions."
          ) : (
            "Manage business profile, notifications, email delivery, and billing."
          )}
        </p>
      </div>

      <AdminSettingsTabs activeTab={activeTab} onChange={setActiveTab} />

      {activeTab !== "services" && successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {activeTab !== "services" && actionError ? (
        <ErrorState title="Could not save settings" message={actionError} />
      ) : null}

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
            <AdminBusinessSettingsPanel
              businessId={businessId!}
              business={data}
              form={form}
              saving={saving}
              marketplaceCoverImage={marketplaceCoverImage}
              onUpdateForm={(key, value) => {
                updateForm(key as keyof SettingsFormState, value as never);
              }}
              onSubmit={handleSubmit}
              onLogoUrlChange={(nextLogoUrl) => {
                updateForm("logo_url", nextLogoUrl);
                void queryClient.invalidateQueries({
                  queryKey: ["admin-business", businessId],
                });
              }}
              onMarketplaceCoverChange={(nextImage) => {
                setMarketplaceCoverImage(nextImage);
                void queryClient.invalidateQueries({
                  queryKey: ["admin-business", businessId],
                });
              }}
            />
          ) : null}

          {activeTab === "services" ? (
            <AdminServicesSettingsPanel
              form={form}
              saving={saving}
              dirty={servicesDirty}
              successMessage={successMessage}
              errorMessage={actionError}
              fieldErrors={servicesFieldErrors}
              onUpdateForm={(key, value) => {
                updateForm(key as keyof SettingsFormState, value as never);
              }}
              onSubmit={handleSubmit}
              onResetDefaults={handleResetServicesDefaults}
            />
          ) : null}

          {activeTab === "team" ? (
            <AdminTeamSettingsPanel
              user={user}
              membershipRole={membershipRole}
              businessName={businessName}
            />
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
              onStartCheckout={handleStartCheckout}
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
