import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createServiceSlotCapacityOverride,
  deleteServiceSlotCapacityOverride,
  getBusiness,
  listServiceSlotCapacityOverrides,
} from "@/api/adminApi";
import { FormField } from "@/components/FormField";
import type { ServiceSlotCapacityOverrideRead } from "@/types/api";
import type { ServiceType } from "@/types/api";
import {
  businessLocalDateTimeToIso,
  formatSlotOverrideListLabel,
} from "@/utils/format";
import { getAdminServiceErrorMessage } from "@/utils/errors";

export type PendingSlotCapacityOverride = {
  id: string;
  date: string;
  time: string;
  capacity: number;
  note: string | null;
};

type AdminServiceSlotCapacitySectionProps = {
  businessId: string;
  serviceId?: string;
  serviceType: ServiceType;
  disabled?: boolean;
  pendingOverrides?: PendingSlotCapacityOverride[];
  onPendingOverridesChange?: (overrides: PendingSlotCapacityOverride[]) => void;
};

type OverrideFormState = {
  date: string;
  time: string;
  capacity: string;
  note: string;
};

const EMPTY_FORM: OverrideFormState = {
  date: "",
  time: "",
  capacity: "2",
  note: "",
};

function createPendingId(): string {
  return `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AdminServiceSlotCapacitySection({
  businessId,
  serviceId,
  serviceType,
  disabled = false,
  pendingOverrides = [],
  onPendingOverridesChange,
}: AdminServiceSlotCapacitySectionProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OverrideFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isBooking = serviceType === "booking";
  const isEditMode = Boolean(serviceId);
  const isCreateMode = !isEditMode;

  const businessQuery = useQuery({
    queryKey: ["admin-business", businessId],
    queryFn: () => getBusiness(businessId),
    enabled: isBooking,
  });

  const businessTimezone = businessQuery.data?.timezone ?? "UTC";

  const overridesQuery = useQuery({
    queryKey: ["service-slot-capacity-overrides", businessId, serviceId],
    queryFn: () => listServiceSlotCapacityOverrides(businessId, serviceId!),
    enabled: isBooking && isEditMode,
  });

  const savedOverrides = overridesQuery.data?.data ?? [];

  const createMutation = useMutation({
    mutationFn: (payload: { starts_at: string; capacity: number; note?: string | null }) =>
      createServiceSlotCapacityOverride(businessId, serviceId!, payload),
    onSuccess: (created) => {
      setForm(EMPTY_FORM);
      setFormError(null);
      queryClient.setQueryData<{ data: ServiceSlotCapacityOverrideRead[] }>(
        ["service-slot-capacity-overrides", businessId, serviceId],
        (current) => ({
          data: [...(current?.data ?? []), created],
        }),
      );
    },
    onError: (error) => {
      setFormError(getAdminServiceErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (overrideId: string) =>
      deleteServiceSlotCapacityOverride(businessId, serviceId!, overrideId),
    onSuccess: (_result, overrideId) => {
      setDeleteError(null);
      queryClient.setQueryData<{ data: ServiceSlotCapacityOverrideRead[] }>(
        ["service-slot-capacity-overrides", businessId, serviceId],
        (current) => ({
          data: (current?.data ?? []).filter((item) => item.id !== overrideId),
        }),
      );
    },
    onError: (error) => {
      setDeleteError(getAdminServiceErrorMessage(error));
    },
  });

  const busy =
    disabled ||
    businessQuery.isLoading ||
    createMutation.isPending ||
    deleteMutation.isPending;

  const hasSavedOverrides = savedOverrides.length > 0;
  const hasPendingOverrides = pendingOverrides.length > 0;
  const showEmptyState =
    isEditMode &&
    overridesQuery.isSuccess &&
    !hasSavedOverrides &&
    !overridesQuery.isFetching &&
    !createMutation.isPending;

  const timezoneHint = useMemo(() => {
    if (!businessQuery.data?.timezone) {
      return null;
    }
    return `Times use your business timezone (${businessQuery.data.timezone}).`;
  }, [businessQuery.data?.timezone]);

  if (!isBooking) {
    return null;
  }

  function validateFormInput(): PendingSlotCapacityOverride | null {
    if (!form.date || !form.time) {
      setFormError("Date and time are required.");
      return null;
    }

    const capacity = Number(form.capacity);
    if (!Number.isFinite(capacity) || capacity < 1) {
      setFormError("Capacity must be at least 1.");
      return null;
    }

    if (businessQuery.isLoading || !businessQuery.data) {
      setFormError("Loading business timezone. Please try again.");
      return null;
    }

    return {
      id: createPendingId(),
      date: form.date,
      time: form.time,
      capacity,
      note: form.note.trim() ? form.note.trim() : null,
    };
  }

  function handleAdd() {
    if (busy) {
      return;
    }

    const pending = validateFormInput();
    if (!pending) {
      return;
    }

    setFormError(null);

    if (isCreateMode) {
      onPendingOverridesChange?.([...pendingOverrides, pending]);
      setForm(EMPTY_FORM);
      return;
    }

    if (!serviceId) {
      return;
    }

    createMutation.mutate({
      starts_at: businessLocalDateTimeToIso(pending.date, pending.time, businessTimezone),
      capacity: pending.capacity,
      note: pending.note,
    });
  }

  function handleRemovePending(pendingId: string) {
    onPendingOverridesChange?.(pendingOverrides.filter((item) => item.id !== pendingId));
  }

  return (
    <section
      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
      data-testid="admin-service-slot-capacity-section"
    >
      <div>
        <h3 className="text-sm font-semibold text-slate-900">Special group time slots</h3>
        <p className="mt-1 text-sm text-slate-600">
          Use this when one specific time slot should allow a group.
        </p>
        <p className="text-sm text-slate-600">
          Other time slots keep the default service capacity.
        </p>
        {isCreateMode ? (
          <p className="mt-1 text-sm text-slate-600" data-testid="admin-service-slot-capacity-create-note">
            Group slots added here are saved after you create the service.
          </p>
        ) : null}
        {timezoneHint ? <p className="mt-1 text-xs text-slate-500">{timezoneHint}</p> : null}
      </div>

      <div className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <FormField
            name="overrideDate"
            label="Date"
            type="date"
            value={form.date}
            onChange={(event) => setForm((current) => ({ ...current, date: event.target.value }))}
            disabled={busy}
            data-testid="admin-service-slot-capacity-date"
          />
          <FormField
            name="overrideTime"
            label="Time"
            type="time"
            value={form.time}
            onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))}
            disabled={busy}
            data-testid="admin-service-slot-capacity-time"
          />
        </div>
        <FormField
          name="overrideCapacity"
          label="Capacity"
          type="number"
          min={1}
          value={form.capacity}
          onChange={(event) => setForm((current) => ({ ...current, capacity: event.target.value }))}
          disabled={busy}
          data-testid="admin-service-slot-capacity-input"
        />
        <FormField
          name="overrideNote"
          label="Note (optional)"
          value={form.note}
          onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))}
          disabled={busy}
          placeholder="Group session"
        />
        {formError ? (
          <p
            className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
            data-testid="admin-service-slot-capacity-error"
          >
            {formError}
          </p>
        ) : null}
        {deleteError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {deleteError}
          </p>
        ) : null}
        {overridesQuery.isError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {getAdminServiceErrorMessage(overridesQuery.error)}
          </p>
        ) : null}
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
          className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
          data-testid="admin-service-slot-capacity-add"
        >
          {createMutation.isPending ? "Adding…" : "Add"}
        </button>
      </div>

      {isEditMode && overridesQuery.isLoading ? (
        <p className="text-sm text-slate-600">Loading overrides…</p>
      ) : null}

      {hasPendingOverrides ? (
        <ul className="space-y-2" data-testid="admin-service-slot-capacity-pending-list">
          {pendingOverrides.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-slate-300 bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {formatSlotOverrideListLabel(
                    businessLocalDateTimeToIso(item.date, item.time, businessTimezone),
                    businessTimezone,
                  )}{" "}
                  — Capacity {item.capacity}
                </p>
                {item.note ? <p className="text-slate-600">{item.note}</p> : null}
                <p className="text-xs text-slate-500">Pending until service is created</p>
              </div>
              <button
                type="button"
                onClick={() => handleRemovePending(item.id)}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                data-testid={`admin-service-slot-capacity-pending-remove-${item.id}`}
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {hasSavedOverrides ? (
        <ul className="space-y-2" data-testid="admin-service-slot-capacity-list">
          {savedOverrides.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <div>
                <p className="font-medium text-slate-900">
                  {formatSlotOverrideListLabel(item.starts_at, businessTimezone)} — Capacity{" "}
                  {item.capacity}
                </p>
                {item.note ? <p className="text-slate-600">{item.note}</p> : null}
              </div>
              <button
                type="button"
                onClick={() => deleteMutation.mutate(item.id)}
                disabled={busy}
                className="rounded-lg border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                data-testid={`admin-service-slot-capacity-delete-${item.id}`}
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {showEmptyState ? (
        <p className="text-sm text-slate-600" data-testid="admin-service-slot-capacity-empty">
          No special group time slots yet.
        </p>
      ) : null}
    </section>
  );
}
