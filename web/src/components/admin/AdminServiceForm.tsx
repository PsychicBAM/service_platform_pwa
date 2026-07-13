import { useMemo, useState, type FormEvent } from "react";
import { FormField } from "@/components/FormField";
import { TextAreaField } from "@/components/TextAreaField";
import { AdminServiceImageSection } from "@/components/admin/AdminServiceImageSection";
import { AdminServiceSlotCapacitySection } from "@/components/admin/AdminServiceSlotCapacitySection";
import { AdminServiceWaitlistSection } from "@/components/admin/AdminServiceWaitlistSection";
import type { PendingSlotCapacityOverride } from "@/components/admin/AdminServiceSlotCapacitySection";
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
};

type FormState = {
  name: string;
  description: string;
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

function defaultFormState(initial?: AdminServiceRead): FormState {
  return {
    name: initial?.name ?? "",
    description: initial?.description ?? "",
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
    currency: initial?.currency ?? "USD",
    requirePayment: initial?.require_payment ?? false,
    isActive: initial?.is_active ?? true,
    sortOrder: initial?.sort_order != null ? String(initial.sort_order) : "0",
  };
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

  if (mode === "create" && state.type === "order" && state.durationMinutes.trim()) {
    // order must not send duration - validated at build time
  }

  return errors;
}

function buildCreatePayload(state: FormState): ServiceCreatePayload {
  const payload: ServiceCreatePayload = {
    name: state.name.trim(),
    description: state.description.trim() || null,
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

export function AdminServiceForm({
  mode,
  businessId,
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
}: AdminServiceFormProps) {
  const serviceType = initial?.type ?? undefined;
  const [form, setForm] = useState<FormState>(() => defaultFormState(initial));
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const effectiveType = mode === "edit" ? serviceType! : form.type;
  const isBooking = effectiveType === "booking";

  const title = useMemo(
    () => (mode === "create" ? "Add service" : `Edit ${initial?.name ?? "service"}`),
    [mode, initial?.name],
  );

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    const errors = validateForm(form, mode, effectiveType);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
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

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm space-y-4"
      noValidate
      data-testid="admin-service-form"
    >
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-semibold text-slate-900">{title}</h3>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-slate-600 hover:text-brand-700"
        >
          Cancel
        </button>
      </div>

      <FormField
        name="name"
        label="Name"
        required
        value={form.name}
        onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
        error={fieldErrors.name}
        disabled={submitting}
      />

      <TextAreaField
        name="description"
        label="Description"
        value={form.description}
        onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
        disabled={submitting}
      />

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
            className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
          >
            <option value="booking">Booking</option>
            <option value="order">Request</option>
          </select>
        </div>
      ) : (
        <p className="text-sm text-slate-600">
          Type: <span className="font-medium capitalize">{effectiveType}</span> (cannot be changed)
        </p>
      )}

      {isBooking ? (
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
      ) : null}

      {isBooking ? (
        <FormField
          name="capacity"
          label="Default capacity per time slot"
          type="number"
          min={1}
          required
          value={form.capacity}
          onChange={(event) => setForm((prev) => ({ ...prev, capacity: event.target.value }))}
          error={fieldErrors.capacity}
          hint="Applies to every normal time slot. Use 1 for individual bookings. Add special group time slots below for one-off group sessions."
          disabled={submitting}
          data-testid="admin-service-capacity"
        />
      ) : null}

      {isBooking ? (
        <section
          className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
          data-testid="admin-service-booking-rules"
        >
          <h3 className="text-sm font-semibold text-slate-900">Booking rules</h3>
          <FormField
            name="bookingMinNoticeMinutes"
            label="Minimum notice (minutes)"
            type="number"
            min={0}
            value={form.bookingMinNoticeMinutes}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, bookingMinNoticeMinutes: event.target.value }))
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
      ) : null}

      {isBooking && businessId && mode === "edit" && initial?.id ? (
        <AdminServiceWaitlistSection
          businessId={businessId}
          serviceId={initial.id}
          serviceType={effectiveType}
          waitlistEnabled={form.waitlistEnabled}
        />
      ) : null}

      {isBooking && businessId ? (
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
          className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
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
          onChange={(event) => setForm((prev) => ({ ...prev, priceCents: event.target.value }))}
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

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          checked={form.isActive}
          onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
          disabled={submitting}
        />
        Active
      </label>

      <FormField
        name="sortOrder"
        label="Sort order"
        type="number"
        value={form.sortOrder}
        onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
        disabled={submitting}
      />

      {businessId ? (
        <AdminServiceImageSection
          businessId={businessId}
          serviceId={mode === "edit" ? initial?.id : undefined}
          image={initial?.image ?? null}
          pendingFile={mode === "create" ? pendingImageFile : null}
          onPendingFileChange={mode === "create" ? onPendingImageFileChange : undefined}
          disabled={submitting}
          onImageChange={(nextImage) => onServiceImageChange?.(nextImage)}
        />
      ) : null}

      {submitError ? (
        <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-brand-600 px-4 py-3 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {submitting ? "Saving…" : mode === "create" ? "Create service" : "Save changes"}
      </button>
    </form>
  );
}
