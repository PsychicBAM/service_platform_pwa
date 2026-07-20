import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { FormField } from "@/components/FormField";
import { TextAreaField } from "@/components/TextAreaField";
import { AdminServiceImageSection } from "@/components/admin/AdminServiceImageSection";
import { AdminServiceSlotCapacitySection } from "@/components/admin/AdminServiceSlotCapacitySection";
import { AdminServiceWaitlistSection } from "@/components/admin/AdminServiceWaitlistSection";
import type { PendingSlotCapacityOverride } from "@/components/admin/AdminServiceSlotCapacitySection";
import {
  SERVICE_CATEGORY_OPTIONS,
  categoryLabel,
  suggestServiceCategory,
} from "@/components/admin/services/serviceCategories";
import { formatServiceMoney } from "@/components/admin/services/serviceHelpers";
import type { ServiceImageMedia } from "@/lib/serviceImage";
import type {
  AdminServiceRead,
  PriceType,
  ServiceCreatePayload,
  ServiceType,
  ServiceUpdatePayload,
} from "@/types/api";

type FormMode = "create" | "edit";

type FieldErrors = Record<string, string>;

type AdminServiceFormProps = {
  mode: FormMode;
  businessId?: string;
  /** Settings → Services currency used as create default / display source of truth. */
  defaultCurrency?: string;
  initial?: AdminServiceRead;
  submitting?: boolean;
  submitError?: string | null;
  pendingImageFile?: File | null;
  onPendingImageFileChange?: (file: File | null) => void;
  pendingSlotCapacityOverrides?: PendingSlotCapacityOverride[];
  onPendingSlotCapacityOverridesChange?: (overrides: PendingSlotCapacityOverride[]) => void;
  onSubmit: (
    payload: ServiceCreatePayload | ServiceUpdatePayload,
    options?: {
      pendingImageFile?: File | null;
      pendingSlotCapacityOverrides?: PendingSlotCapacityOverride[];
    },
  ) => void;
  onCancel: () => void;
  onServiceImageChange?: (image: ServiceImageMedia | null) => void;
  previewHref?: string | null;
  onToggleActive?: () => void;
  onDelete?: () => void;
};

type CategoryMode = "auto" | "manual";

type FormState = {
  name: string;
  description: string;
  category: string;
  categoryMode: CategoryMode;
  type: ServiceType;
  durationMinutes: string;
  capacity: string;
  bookingMinNoticeMinutes: string;
  bookingWindowDays: string;
  waitlistEnabled: boolean;
  priceType: PriceType;
  priceCents: string;
  currency: string;
  requirePayment: boolean;
  isActive: boolean;
  sortOrder: string;
};

type SectionId =
  | "avatar"
  | "basic"
  | "category"
  | "booking"
  | "pricing"
  | "marketplace"
  | "gallery";

function defaultFormState(initial?: AdminServiceRead, defaultCurrency = "USD"): FormState {
  const initialCategory = initial?.category ?? "";
  return {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    category: initialCategory,
    categoryMode: initialCategory ? "manual" : "auto",
    type: initial?.type ?? "booking",
    durationMinutes:
      initial?.duration_minutes != null ? String(initial.duration_minutes) : "30",
    capacity: initial?.capacity != null ? String(initial.capacity) : "1",
    bookingMinNoticeMinutes:
      initial?.booking_min_notice_minutes != null
        ? String(initial.booking_min_notice_minutes)
        : "0",
    bookingWindowDays:
      initial?.booking_window_days != null ? String(initial.booking_window_days) : "",
    waitlistEnabled: initial?.waitlist_enabled ?? false,
    priceType: initial?.price_type ?? "fixed",
    priceCents: initial?.price_cents != null ? String(initial.price_cents) : "",
    currency: (initial?.currency || defaultCurrency || "USD").toUpperCase(),
    requirePayment: initial?.require_payment ?? false,
    isActive: initial?.is_active ?? true,
    sortOrder: initial?.sort_order != null ? String(initial.sort_order) : "0",
  };
}

function normalizeCategory(value: string): string | null {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function validateForm(state: FormState, mode: FormMode, serviceType: ServiceType): FieldErrors {
  const errors: FieldErrors = {};
  const name = state.name.trim();
  if (!name) {
    errors.name = "Name is required.";
  }

  const currency = state.currency.trim().toUpperCase();
  if (currency.length !== 3) {
    errors.currency = "Currency must be exactly 3 letters.";
  }

  if (serviceType === "booking") {
    const duration = Number(state.durationMinutes);
    if (!state.durationMinutes.trim() || Number.isNaN(duration)) {
      errors.durationMinutes = "Duration is required for booking services.";
    } else if (duration < 15 || duration > 480) {
      errors.durationMinutes = "Duration must be between 15 and 480 minutes.";
    }

    const capacity = Number(state.capacity);
    if (!state.capacity.trim() || Number.isNaN(capacity)) {
      errors.capacity = "Capacity is required for booking services.";
    } else if (capacity < 1) {
      errors.capacity = "Capacity must be at least 1.";
    }

    const minNotice = Number(state.bookingMinNoticeMinutes);
    if (state.bookingMinNoticeMinutes.trim() && (Number.isNaN(minNotice) || minNotice < 0)) {
      errors.bookingMinNoticeMinutes = "Minimum notice must be 0 or greater.";
    }

    if (state.bookingWindowDays.trim()) {
      const windowDays = Number(state.bookingWindowDays);
      if (Number.isNaN(windowDays) || windowDays < 1) {
        errors.bookingWindowDays = "Booking window must be at least 1 day when set.";
      }
    }
  }

  if (state.priceType === "fixed") {
    const cents = Number(state.priceCents);
    if (!state.priceCents.trim() || Number.isNaN(cents)) {
      errors.priceCents = "Price is required for fixed pricing.";
    } else if (cents < 0) {
      errors.priceCents = "Price cannot be negative.";
    }
  } else if (state.priceCents.trim()) {
    const cents = Number(state.priceCents);
    if (Number.isNaN(cents) || cents < 0) {
      errors.priceCents = "Price cannot be negative.";
    }
  }

  void mode;
  return errors;
}

function buildCreatePayload(state: FormState): ServiceCreatePayload {
  const payload: ServiceCreatePayload = {
    name: state.name.trim(),
    description: state.description.trim() || null,
    category: normalizeCategory(state.category),
    type: state.type,
    currency: state.currency.trim().toUpperCase(),
    price_type: state.priceType,
    require_payment: state.requirePayment,
    is_active: state.isActive,
    sort_order: state.sortOrder.trim() ? Number(state.sortOrder) : 0,
  };

  if (state.type === "booking") {
    payload.duration_minutes = Number(state.durationMinutes);
    payload.capacity = Number(state.capacity);
    payload.booking_min_notice_minutes = state.bookingMinNoticeMinutes.trim()
      ? Number(state.bookingMinNoticeMinutes)
      : 0;
    payload.booking_window_days = state.bookingWindowDays.trim()
      ? Number(state.bookingWindowDays)
      : null;
    payload.waitlist_enabled = state.waitlistEnabled;
  }

  if (state.priceType === "fixed") {
    payload.price_cents = Number(state.priceCents);
  }

  return payload;
}

function buildUpdatePayload(state: FormState, serviceType: ServiceType): ServiceUpdatePayload {
  const payload: ServiceUpdatePayload = {
    name: state.name.trim(),
    description: state.description.trim() || null,
    category: normalizeCategory(state.category),
    currency: state.currency.trim().toUpperCase(),
    price_type: state.priceType,
    require_payment: state.requirePayment,
    is_active: state.isActive,
    sort_order: state.sortOrder.trim() ? Number(state.sortOrder) : 0,
  };

  if (serviceType === "booking") {
    payload.duration_minutes = Number(state.durationMinutes);
    payload.capacity = Number(state.capacity);
    payload.booking_min_notice_minutes = state.bookingMinNoticeMinutes.trim()
      ? Number(state.bookingMinNoticeMinutes)
      : 0;
    payload.booking_window_days = state.bookingWindowDays.trim()
      ? Number(state.bookingWindowDays)
      : null;
    payload.waitlist_enabled = state.waitlistEnabled;
  }

  if (state.priceType === "fixed") {
    payload.price_cents = Number(state.priceCents);
  } else {
    payload.price_cents = null;
  }

  return payload;
}

function AccordionSection({
  id,
  title,
  open,
  onToggle,
  summary,
  children,
}: {
  id: SectionId;
  title: string;
  open: boolean;
  onToggle: () => void;
  summary?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="border-b border-slate-100" data-testid={`admin-service-section-${id}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
        aria-expanded={open}
      >
        <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">{title}</span>
        {summary ? <span className="shrink-0">{summary}</span> : null}
        <span className="shrink-0 text-slate-400" aria-hidden="true">
          {open ? "⌃" : "›"}
        </span>
      </button>
      {/* Keep fields mounted when collapsed so existing form testids/behavior stay available. */}
      <div className={open ? "pb-3" : "hidden"}>{children}</div>
    </section>
  );
}

export function AdminServiceForm({
  mode,
  businessId,
  defaultCurrency = "USD",
  initial,
  submitting = false,
  submitError,
  pendingImageFile = null,
  onPendingImageFileChange,
  pendingSlotCapacityOverrides = [],
  onPendingSlotCapacityOverridesChange,
  onSubmit,
  onCancel,
  onServiceImageChange,
  previewHref = null,
  onToggleActive,
  onDelete,
}: AdminServiceFormProps) {
  const serviceType = initial?.type ?? undefined;
  const [form, setForm] = useState<FormState>(() => defaultFormState(initial, defaultCurrency));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  useEffect(() => {
    if (mode !== "create" || initial) {
      return;
    }
    setForm((prev) => ({
      ...prev,
      currency: (defaultCurrency || "USD").toUpperCase(),
    }));
  }, [defaultCurrency, initial, mode]);

  const [openSections, setOpenSections] = useState<Record<SectionId, boolean>>(() => ({
    avatar: true,
    basic: true,
    // Create with no category yet: keep Category open so the dropdown is easy to find.
    category: mode === "create" && !initial?.category,
    booking: false,
    pricing: false,
    marketplace: false,
    gallery: false,
  }));

  const effectiveType = mode === "edit" ? serviceType! : form.type;
  const isBooking = effectiveType === "booking";
  const suggestedCategory = useMemo(
    () => suggestServiceCategory(form.name),
    [form.name],
  );

  const title = useMemo(
    () => (mode === "create" ? "Add service" : form.name.trim() || initial?.name || "Service"),
    [mode, form.name, initial?.name],
  );

  const subtitle = useMemo(() => {
    if (mode === "create") {
      return "Create a new service";
    }
    const typeLabel = effectiveType === "booking" ? "Booking" : "Request";
    const cat = categoryLabel(form.category || null);
    return `${typeLabel} · ${cat}`;
  }, [mode, effectiveType, form.category]);

  const pricingSummary = useMemo(() => {
    if (form.priceType === "free") return "Free";
    if (form.priceType === "quote") return "Price on quote";
    if (!form.priceCents.trim()) return "—";
    const cents = Number(form.priceCents);
    if (Number.isNaN(cents)) return "—";
    return formatServiceMoney(cents, form.currency.trim().toUpperCase() || "USD");
  }, [form.currency, form.priceCents, form.priceType]);

  function toggleSection(id: SectionId) {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleNameChange(value: string) {
    setForm((prev) => {
      const nextSuggestion = suggestServiceCategory(value);
      if (prev.categoryMode === "auto") {
        return {
          ...prev,
          name: value,
          category: nextSuggestion ?? "",
        };
      }
      return { ...prev, name: value };
    });
  }

  function applySuggestedCategory() {
    if (!suggestedCategory) return;
    setForm((prev) => ({
      ...prev,
      category: suggestedCategory,
      categoryMode: "auto",
    }));
    setOpenSections((prev) => ({ ...prev, category: false }));
  }

  function chooseCategoryManually() {
    setForm((prev) => ({ ...prev, categoryMode: "manual" }));
    setOpenSections((prev) => ({ ...prev, category: true }));
  }

  function handleCategorySelect(value: string) {
    setForm((prev) => ({
      ...prev,
      category: value,
      categoryMode: "manual",
    }));
    if (value) {
      setOpenSections((prev) => ({ ...prev, category: false }));
    }
  }

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const errors = validateForm(form, mode, effectiveType);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setOpenSections((prev) => ({
        ...prev,
        basic: true,
        booking: Boolean(errors.durationMinutes || errors.capacity || errors.bookingMinNoticeMinutes || errors.bookingWindowDays) || prev.booking,
        pricing: Boolean(errors.priceCents || errors.currency) || prev.pricing,
      }));
      return;
    }

    if (mode === "create") {
      onSubmit(buildCreatePayload(form), {
        pendingImageFile,
        pendingSlotCapacityOverrides,
      });
    } else {
      onSubmit(buildUpdatePayload(form, effectiveType));
    }
  };

  const descriptionCount = form.description.length;

  return (
    <form
      onSubmit={handleSubmit}
      className="flex h-fit flex-col rounded-2xl border border-slate-200 bg-white shadow-sm"
      noValidate
      data-testid="admin-service-form"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3.5 sm:px-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="min-w-0 truncate text-lg font-bold text-slate-900">{title}</h3>
            {mode === "edit" ? (
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                  form.isActive
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-600"
                }`}
              >
                {form.isActive ? "Active" : "Hidden"}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-400 outline-none hover:bg-slate-50 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      <div className="space-y-0 px-4 sm:px-5">
        <AccordionSection
          id="avatar"
          title="Service avatar"
          open={openSections.avatar}
          onToggle={() => toggleSection("avatar")}
        >
          {businessId ? (
            <AdminServiceImageSection
              businessId={businessId}
              serviceId={mode === "edit" ? initial?.id : undefined}
              image={initial?.image ?? null}
              pendingFile={mode === "create" ? pendingImageFile : null}
              onPendingFileChange={mode === "create" ? onPendingImageFileChange : undefined}
              disabled={submitting}
              presentation="avatar"
              onImageChange={(nextImage) => onServiceImageChange?.(nextImage)}
            />
          ) : (
            <p className="text-xs text-slate-500">Select a business to manage the service avatar.</p>
          )}
        </AccordionSection>

        <AccordionSection
          id="basic"
          title="Basic info"
          open={openSections.basic}
          onToggle={() => toggleSection("basic")}
        >
          <div className="space-y-3">
            <FormField
              name="name"
              label="Service name"
              required
              value={form.name}
              onChange={(event) => handleNameChange(event.target.value)}
              error={fieldErrors.name}
              disabled={submitting}
            />

            <div className="relative">
              <TextAreaField
                name="description"
                label="Description"
                value={form.description}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, description: event.target.value }))
                }
                disabled={submitting}
              />
              <p className="mt-1 text-right text-[11px] text-slate-400">
                {descriptionCount} / 500
              </p>
            </div>

            {suggestedCategory ? (
              <div className="rounded-lg border border-violet-100 bg-violet-50/70 px-3 py-2">
                <p className="text-xs font-medium text-slate-600">Suggested category</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full bg-violet-100 px-2.5 py-0.5 text-xs font-semibold text-violet-800"
                    data-testid="admin-service-category-suggestion"
                  >
                    {categoryLabel(suggestedCategory)}
                  </span>
                  <button
                    type="button"
                    onClick={applySuggestedCategory}
                    disabled={submitting}
                    className="text-xs font-semibold text-emerald-700 outline-none hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60"
                    data-testid="admin-service-category-use-suggestion"
                  >
                    Use suggestion
                  </button>
                  <button
                    type="button"
                    onClick={chooseCategoryManually}
                    disabled={submitting}
                    className="text-xs font-semibold text-emerald-700 outline-none hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60"
                    data-testid="admin-service-category-choose-manual"
                  >
                    Choose manually
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </AccordionSection>

        <AccordionSection
          id="category"
          title="Category"
          open={openSections.category}
          onToggle={() => toggleSection("category")}
          summary={
            form.category ? (
              <span className="max-w-[9rem] truncate text-xs font-semibold text-slate-600">
                {categoryLabel(form.category)}
              </span>
            ) : (
              <span className="text-xs text-slate-400">Uncategorized</span>
            )
          }
        >
          <div className="space-y-2.5">
            <p className="text-xs text-slate-500">
              Used for marketplace filtering. Accept a suggestion or choose manually.
            </p>
            <div
              className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5"
              role="group"
              aria-label="Category selection mode"
            >
              <button
                type="button"
                onClick={() =>
                  setForm((prev) => ({
                    ...prev,
                    categoryMode: "auto",
                    category: suggestServiceCategory(prev.name) ?? prev.category,
                  }))
                }
                disabled={submitting}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                  form.categoryMode === "auto"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                data-testid="admin-service-category-mode-auto"
              >
                Auto suggest
              </button>
              <button
                type="button"
                onClick={() => setForm((prev) => ({ ...prev, categoryMode: "manual" }))}
                disabled={submitting}
                className={`rounded-md px-3 py-1.5 text-xs font-semibold transition outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                  form.categoryMode === "manual"
                    ? "bg-slate-800 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
                data-testid="admin-service-category-mode-manual"
              >
                Manual
              </button>
            </div>
            <div className="space-y-1">
              <label htmlFor="service-category" className="block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                id="service-category"
                value={form.category}
                onChange={(event) => handleCategorySelect(event.target.value)}
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                data-testid="admin-service-category"
              >
                <option value="">Select a category</option>
                {SERVICE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </AccordionSection>

        <AccordionSection
          id="booking"
          title="Booking settings"
          open={openSections.booking}
          onToggle={() => toggleSection("booking")}
          summary={
            <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-800">
              {effectiveType === "booking" ? "Booking" : "Request"}
            </span>
          }
        >
          <div className="space-y-3">
            {mode === "create" ? (
              <div className="space-y-1">
                <label htmlFor="service-type" className="block text-sm font-medium text-slate-700">
                  Type
                </label>
                <select
                  id="service-type"
                  value={form.type}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, type: event.target.value as ServiceType }))
                  }
                  disabled={submitting}
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                >
                  <option value="booking">Booking</option>
                  <option value="order">Request</option>
                </select>
              </div>
            ) : (
              <p className="text-sm text-slate-600">
                Type: <span className="font-medium capitalize">{effectiveType}</span> (cannot be
                changed)
              </p>
            )}

            {isBooking ? (
              <>
                <FormField
                  name="durationMinutes"
                  label="Duration (minutes)"
                  type="number"
                  min={15}
                  max={480}
                  required
                  value={form.durationMinutes}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, durationMinutes: event.target.value }))
                  }
                  error={fieldErrors.durationMinutes}
                  hint="15–480 minutes"
                  disabled={submitting}
                />
                <FormField
                  name="capacity"
                  label="Default capacity per time slot"
                  type="number"
                  min={1}
                  required
                  value={form.capacity}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, capacity: event.target.value }))
                  }
                  error={fieldErrors.capacity}
                  hint="Applies to every normal time slot. Use 1 for individual bookings. Add special group time slots below for one-off group sessions."
                  disabled={submitting}
                  data-testid="admin-service-capacity"
                />
                <section
                  className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-3"
                  data-testid="admin-service-booking-rules"
                >
                  <h4 className="text-sm font-semibold text-slate-900">Booking rules</h4>
                  <FormField
                    name="bookingMinNoticeMinutes"
                    label="Minimum notice (minutes)"
                    type="number"
                    min={0}
                    value={form.bookingMinNoticeMinutes}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        bookingMinNoticeMinutes: event.target.value,
                      }))
                    }
                    error={fieldErrors.bookingMinNoticeMinutes}
                    hint="Example: 120 means customers must book at least 2 hours before the slot starts. Use 0 for no extra service-level notice."
                    disabled={submitting}
                    data-testid="admin-service-min-notice"
                  />
                  <FormField
                    name="bookingWindowDays"
                    label="Booking window (days)"
                    type="number"
                    min={1}
                    value={form.bookingWindowDays}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, bookingWindowDays: event.target.value }))
                    }
                    error={fieldErrors.bookingWindowDays}
                    hint="Customers can only book this many days into the future. Leave empty for no service-level limit."
                    disabled={submitting}
                    data-testid="admin-service-booking-window"
                  />
                  <label className="flex items-start gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      name="waitlistEnabled"
                      checked={form.waitlistEnabled}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, waitlistEnabled: event.target.checked }))
                      }
                      disabled={submitting}
                      data-testid="admin-service-waitlist-enabled"
                      className="mt-0.5"
                    />
                    <span>
                      <span className="font-medium text-slate-900">Enable waitlist</span>
                      <span className="mt-0.5 block text-xs text-slate-600">
                        Allow customers to join a waitlist when a time slot is fully booked.
                      </span>
                    </span>
                  </label>
                </section>
                {mode === "edit" && initial?.id ? (
                  <AdminServiceWaitlistSection
                    serviceId={initial.id}
                    serviceType={effectiveType}
                    waitlistEnabled={form.waitlistEnabled}
                  />
                ) : null}
                {businessId ? (
                  <AdminServiceSlotCapacitySection
                    businessId={businessId}
                    serviceId={mode === "edit" ? initial?.id : undefined}
                    serviceType={effectiveType}
                    disabled={submitting}
                    pendingOverrides={mode === "create" ? pendingSlotCapacityOverrides : undefined}
                    onPendingOverridesChange={
                      mode === "create" ? onPendingSlotCapacityOverridesChange : undefined
                    }
                  />
                ) : null}
              </>
            ) : (
              <p className="text-xs text-slate-500">
                Request services do not use duration, capacity, or booking windows.
              </p>
            )}
          </div>
        </AccordionSection>

        <AccordionSection
          id="pricing"
          title="Pricing"
          open={openSections.pricing}
          onToggle={() => toggleSection("pricing")}
          summary={<span className="text-sm font-semibold text-slate-700">{pricingSummary}</span>}
        >
          <div className="space-y-3">
            <div className="space-y-1">
              <label htmlFor="price-type" className="block text-sm font-medium text-slate-700">
                Price type
              </label>
              <select
                id="price-type"
                value={form.priceType}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, priceType: event.target.value as PriceType }))
                }
                disabled={submitting}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              >
                <option value="fixed">Fixed</option>
                <option value="free">Free</option>
                <option value="quote">Quote</option>
              </select>
            </div>

            {form.priceType === "fixed" ? (
              <FormField
                name="priceCents"
                label="Price (cents)"
                type="number"
                min={0}
                required
                value={form.priceCents}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, priceCents: event.target.value }))
                }
                error={fieldErrors.priceCents}
                hint="e.g. 2500 = $25.00"
                disabled={submitting}
              />
            ) : null}

            <FormField
              name="currency"
              label="Currency"
              maxLength={3}
              value={form.currency}
              onChange={(event) => setForm((prev) => ({ ...prev, currency: event.target.value }))}
              error={fieldErrors.currency}
              disabled={submitting}
            />

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.requirePayment}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, requirePayment: event.target.checked }))
                }
                disabled={submitting}
              />
              Require payment
            </label>
          </div>
        </AccordionSection>

        <AccordionSection
          id="marketplace"
          title="Marketplace visibility"
          open={openSections.marketplace}
          onToggle={() => toggleSection("marketplace")}
          summary={
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                form.isActive
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {form.isActive ? "Visible" : "Hidden"}
            </span>
          }
        >
          <div className="space-y-3">
            <label className="flex items-start gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, isActive: event.target.checked }))
                }
                disabled={submitting}
                className="mt-0.5"
                data-testid="admin-service-marketplace-visible"
              />
              <span>
                <span className="font-medium text-slate-900">
                  Show this service in the public marketplace
                </span>
                <span className="mt-0.5 block text-xs text-slate-600">
                  Inactive services stay in your admin catalog but are hidden from customers.
                </span>
              </span>
            </label>
            <FormField
              name="sortOrder"
              label="Sort order"
              type="number"
              value={form.sortOrder}
              onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
              disabled={submitting}
            />
          </div>
        </AccordionSection>

        <AccordionSection
          id="gallery"
          title="Service gallery"
          open={openSections.gallery}
          onToggle={() => toggleSection("gallery")}
          summary={<span className="text-xs font-medium text-slate-500">0 photos</span>}
        >
          <div
            className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-4 text-center"
            data-testid="admin-service-gallery-empty"
          >
            <p className="text-sm font-medium text-slate-700">No gallery photos yet</p>
            <p className="mt-1 text-xs text-slate-500">
              Multi-photo service galleries are not available yet. Use Service avatar above for the
              main service image.
            </p>
          </div>
        </AccordionSection>
      </div>

      {submitError ? (
        <p
          className="mx-4 mb-2 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:mx-5"
          role="alert"
        >
          {submitError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 px-4 py-3 sm:px-5">
        {previewHref ? (
          <a
            href={previewHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            <span aria-hidden="true">👁</span>
            Preview
          </a>
        ) : null}
        {mode === "edit" && onToggleActive ? (
          <button
            type="button"
            onClick={onToggleActive}
            disabled={submitting}
            className="inline-flex h-9 items-center rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-60"
          >
            {form.isActive ? "Deactivate" : "Activate"}
          </button>
        ) : null}
        {mode === "edit" && onDelete ? (
          <button
            type="button"
            onClick={onDelete}
            disabled={submitting}
            className="inline-flex h-9 items-center gap-1 rounded-lg border border-red-200 bg-white px-3 text-sm font-semibold text-red-700 outline-none hover:bg-red-50 focus-visible:ring-2 focus-visible:ring-red-500/30 disabled:opacity-60"
          >
            <span aria-hidden="true">🗑</span>
            Delete
          </button>
        ) : null}
        <button
          type="submit"
          disabled={submitting}
          className="ml-auto inline-flex h-9 min-w-[8.5rem] items-center justify-center rounded-lg bg-emerald-700 px-4 text-sm font-semibold text-white outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-60"
        >
          {submitting ? "Saving…" : mode === "create" ? "Create service" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
