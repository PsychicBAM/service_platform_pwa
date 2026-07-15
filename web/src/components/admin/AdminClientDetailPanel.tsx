import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminClient, updateAdminClient } from "@/api/adminApi";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { TextAreaField } from "@/components/TextAreaField";
import type { ClientDetail, ClientSource } from "@/types/api";
import { getAdminClientErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const NOTES_MAX_LENGTH = 5000;

type AdminClientDetailPanelProps = {
  businessId: string;
  clientId: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

type ClientFormState = {
  full_name: string;
  email: string;
  phone: string;
  notes: string;
};

function formatSource(source: ClientSource): string {
  if (source === "admin_created") {
    return "Admin created";
  }
  if (source === "registered") {
    return "Registered";
  }
  return "Guest";
}

function formFromClient(client: ClientDetail): ClientFormState {
  return {
    full_name: client.full_name,
    email: client.email ?? "",
    phone: client.phone ?? "",
    notes: client.notes ?? "",
  };
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validateForm(form: ClientFormState): string | null {
  if (!form.full_name.trim()) {
    return "Full name is required.";
  }
  const email = form.email.trim();
  if (email && !isValidEmail(email)) {
    return "Please enter a valid email.";
  }
  if (form.notes.length > NOTES_MAX_LENGTH) {
    return `Notes must not exceed ${NOTES_MAX_LENGTH} characters.`;
  }
  return null;
}

export function AdminClientDetailPanel({
  businessId,
  clientId,
  onClose,
  onSuccess,
  onError,
}: AdminClientDetailPanelProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClientFormState | null>(null);

  const detailQuery = useQuery({
    queryKey: ["admin-client", businessId, clientId],
    queryFn: () => getAdminClient(businessId, clientId),
  });

  useEffect(() => {
    if (detailQuery.data) {
      setForm(formFromClient(detailQuery.data));
    }
  }, [detailQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateAdminClient>[2]) =>
      updateAdminClient(businessId, clientId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-clients", businessId] });
      await queryClient.invalidateQueries({ queryKey: ["admin-client", businessId, clientId] });
    },
  });

  const saving = updateMutation.isPending;

  function updateField<K extends keyof ClientFormState>(key: K, value: ClientFormState[K]) {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!form) {
      return;
    }
    const validationError = validateForm(form);
    if (validationError) {
      onError(validationError);
      return;
    }
    try {
      await updateMutation.mutateAsync({
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        notes: form.notes.trim() || null,
      });
      onSuccess("Client updated.");
    } catch (error) {
      onError(getAdminClientErrorMessage(error, "Could not save client."));
    }
  }

  if (detailQuery.isLoading) {
    return <LoadingState message="Loading client…" />;
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        title="Could not load client"
        message={getAdminClientErrorMessage(detailQuery.error, "Unable to load client")}
      />
    );
  }

  const client = detailQuery.data;
  if (!client || !form) {
    return null;
  }

  return (
    <div
      className="space-y-4 overflow-hidden rounded-2xl border border-brand-200 bg-brand-50/40 p-3 sm:p-4"
      data-testid="admin-client-detail-panel"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="break-words text-lg font-semibold text-slate-900">{client.full_name}</h3>
          <p className="mt-1 text-sm text-slate-600">{formatSource(client.source)}</p>
          {client.email ? (
            <p className="mt-1 break-all text-sm text-slate-600">{client.email}</p>
          ) : null}
          {client.phone ? (
            <p className="break-words text-sm text-slate-600">{client.phone}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="min-h-10 shrink-0 rounded-lg px-2 py-1.5 text-sm font-medium text-slate-600 hover:bg-white/70 hover:text-brand-700 sm:min-h-0"
        >
          Close
        </button>
      </div>

      <dl className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Bookings</dt>
          <dd className="font-medium text-slate-900">{client.bookings_count}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Orders</dt>
          <dd className="font-medium text-slate-900">{client.orders_count}</dd>
        </div>
        {client.last_activity_at ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Last activity</dt>
            <dd className="break-words text-slate-800">
              {formatDateTimeLabel(client.last_activity_at)}
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="text-slate-500">Created</dt>
          <dd className="break-words text-slate-800">{formatDateTimeLabel(client.created_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Updated</dt>
          <dd className="break-words text-slate-800">{formatDateTimeLabel(client.updated_at)}</dd>
        </div>
      </dl>

      <form onSubmit={handleSave} className="space-y-3 border-t border-slate-200 pt-4">
        <div>
          <label htmlFor="clientFullName" className="block text-sm font-medium text-slate-700">
            Full name <span className="text-red-600">*</span>
          </label>
          <input
            id="clientFullName"
            type="text"
            required
            value={form.full_name}
            disabled={saving}
            onChange={(event) => updateField("full_name", event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm disabled:opacity-60 sm:min-h-0 sm:py-2"
          />
        </div>
        <div>
          <label htmlFor="clientEmail" className="block text-sm font-medium text-slate-700">
            Email
          </label>
          <input
            id="clientEmail"
            type="email"
            value={form.email}
            disabled={saving}
            onChange={(event) => updateField("email", event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm disabled:opacity-60 sm:min-h-0 sm:py-2"
          />
        </div>
        <div>
          <label htmlFor="clientPhone" className="block text-sm font-medium text-slate-700">
            Phone
          </label>
          <input
            id="clientPhone"
            type="tel"
            value={form.phone}
            disabled={saving}
            onChange={(event) => updateField("phone", event.target.value)}
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm disabled:opacity-60 sm:min-h-0 sm:py-2"
          />
        </div>
        <TextAreaField
          name="clientNotes"
          label="Notes"
          value={form.notes}
          maxLength={NOTES_MAX_LENGTH}
          disabled={saving}
          onChange={(event) => updateField("notes", event.target.value)}
        />
        <button
          type="submit"
          disabled={saving}
          className="min-h-11 w-full rounded-lg bg-brand-600 px-3 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60 sm:min-h-0 sm:w-auto sm:py-1.5"
        >
          {saving ? "Saving…" : "Save client"}
        </button>
      </form>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h4 className="text-sm font-medium text-slate-700">Recent bookings</h4>
        {client.bookings.length === 0 ? (
          <p className="text-sm text-slate-500">No bookings yet.</p>
        ) : (
          <ul className="space-y-2">
            {client.bookings.map((booking) => (
              <li
                key={booking.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="truncate font-mono text-xs font-semibold text-slate-900">
                    {booking.reference}
                  </p>
                  <StatusBadge status={booking.status} kind="booking" />
                </div>
                <p className="mt-1 break-words text-slate-800">{booking.service_name}</p>
                <p className="mt-1 break-words text-xs text-slate-500">
                  {formatDateTimeLabel(booking.starts_at)} – {formatDateTimeLabel(booking.ends_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t border-slate-200 pt-4">
        <h4 className="text-sm font-medium text-slate-700">Recent orders</h4>
        {client.orders.length === 0 ? (
          <p className="text-sm text-slate-500">No orders yet.</p>
        ) : (
          <ul className="space-y-2">
            {client.orders.map((order) => (
              <li
                key={order.id}
                className="overflow-hidden rounded-xl border border-slate-200 bg-white p-3 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="truncate font-mono text-xs font-semibold text-slate-900">
                    {order.reference}
                  </p>
                  <StatusBadge status={order.status} kind="order" />
                </div>
                <p className="mt-1 break-words text-slate-800">{order.service_name}</p>
                <p className="mt-1 break-words text-xs text-slate-500">
                  Created {formatDateTimeLabel(order.created_at)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
