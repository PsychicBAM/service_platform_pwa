import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createServiceSlotCapacityOverride,
  deleteServiceSlotCapacityOverride,
  listServiceSlotCapacityOverrides,
} from "@/api/adminApi";
import { FormField } from "@/components/FormField";
import type { ServiceType } from "@/types/api";
import { datetimeLocalToIso, formatDateTimeLabel } from "@/utils/format";
import { getAdminServiceErrorMessage } from "@/utils/errors";

type AdminServiceSlotCapacitySectionProps = {
  businessId: string;
  serviceId?: string;
  serviceType: ServiceType;
  disabled?: boolean;
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

export function AdminServiceSlotCapacitySection({
  businessId,
  serviceId,
  serviceType,
  disabled = false,
}: AdminServiceSlotCapacitySectionProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<OverrideFormState>(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const isBooking = serviceType === "booking";
  const isEditMode = Boolean(serviceId);

  const overridesQuery = useQuery({
    queryKey: ["service-slot-capacity-overrides", businessId, serviceId],
    queryFn: () => listServiceSlotCapacityOverrides(businessId, serviceId!),
    enabled: isBooking && isEditMode,
  });

  const createMutation = useMutation({
    mutationFn: (payload: { starts_at: string; capacity: number; note?: string | null }) =>
      createServiceSlotCapacityOverride(businessId, serviceId!, payload),
    onSuccess: () => {
      setForm(EMPTY_FORM);
      setFormError(null);
      void queryClient.invalidateQueries({
        queryKey: ["service-slot-capacity-overrides", businessId, serviceId],
      });
    },
    onError: (error) => {
      setFormError(getAdminServiceErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (overrideId: string) =>
      deleteServiceSlotCapacityOverride(businessId, serviceId!, overrideId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["service-slot-capacity-overrides", businessId, serviceId],
      });
    },
  });

  if (!isBooking) {
    return null;
  }

  const busy = disabled || createMutation.isPending || deleteMutation.isPending;

  function handleAdd(event: React.FormEvent) {
    event.preventDefault();
    if (!serviceId || busy) {
      return;
    }

    if (!form.date || !form.time) {
      setFormError("Date and time are required.");
      return;
    }

    const capacity = Number(form.capacity);
    if (!Number.isFinite(capacity) || capacity < 1) {
      setFormError("Capacity must be at least 1.");
      return;
    }

    setFormError(null);
    createMutation.mutate({
      starts_at: datetimeLocalToIso(`${form.date}T${form.time}`),
      capacity,
      note: form.note.trim() ? form.note.trim() : null,
    });
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
      </div>

      {!isEditMode ? (
        <p
          className="text-sm text-slate-600"
          data-testid="admin-service-slot-capacity-save-first"
        >
          Save the service first, then add special group time slots.
        </p>
      ) : (
        <>
          <form className="space-y-3" onSubmit={handleAdd}>
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField
                name="overrideDate"
                label="Date"
                type="date"
                value={form.date}
                onChange={(event) =>
                  setForm((current) => ({ ...current, date: event.target.value }))
                }
                disabled={busy}
                data-testid="admin-service-slot-capacity-date"
              />
              <FormField
                name="overrideTime"
                label="Time"
                type="time"
                value={form.time}
                onChange={(event) =>
                  setForm((current) => ({ ...current, time: event.target.value }))
                }
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
              onChange={(event) =>
                setForm((current) => ({ ...current, capacity: event.target.value }))
              }
              disabled={busy}
              data-testid="admin-service-slot-capacity-input"
            />
            <FormField
              name="overrideNote"
              label="Note (optional)"
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({ ...current, note: event.target.value }))
              }
              disabled={busy}
              placeholder="Group session"
            />
            {formError ? (
              <p className="text-sm text-red-700" role="alert">
                {formError}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={busy}
              className="rounded-lg bg-brand-600 px-3 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
              data-testid="admin-service-slot-capacity-add"
            >
              {createMutation.isPending ? "Adding…" : "Add"}
            </button>
          </form>

          {overridesQuery.isLoading ? (
            <p className="text-sm text-slate-600">Loading overrides…</p>
          ) : null}

          {overridesQuery.data?.data.length ? (
            <ul className="space-y-2" data-testid="admin-service-slot-capacity-list">
              {overridesQuery.data.data.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium text-slate-900">
                      {formatDateTimeLabel(item.starts_at)} · capacity {item.capacity}
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
          ) : overridesQuery.isSuccess ? (
            <p className="text-sm text-slate-600">No special group time slots yet.</p>
          ) : null}
        </>
      )}
    </section>
  );
}
