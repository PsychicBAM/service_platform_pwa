import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getAdminClient, updateAdminClient } from "@/api/adminApi";
import {
  ClientStatusBadge,
} from "@/components/admin/clients/ClientStatusBadge";
import {
  clientLocationLabel,
  customerInitials,
  deriveClientStatus,
  formatClientDate,
  formatClientTime,
  formatSource,
  getDetailReviewStats,
  type DateRange,
} from "@/components/admin/clients/clientHelpers";
import { ReviewStarRating } from "@/components/admin/reviews/ReviewStarRating";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { TextAreaField } from "@/components/TextAreaField";
import type { ClientDetail, ClientSource, ReviewRead } from "@/types/api";
import { getAdminClientErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const NOTES_MAX_LENGTH = 5000;

type AdminClientDetailPanelProps = {
  businessId: string;
  clientId: string;
  dateRange: DateRange | null;
  reviews?: ReviewRead[];
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
  dateRange,
  reviews = [],
  onClose,
  onSuccess,
  onError,
}: AdminClientDetailPanelProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ClientFormState | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const detailQuery = useQuery({
    queryKey: ["admin-client", businessId, clientId],
    queryFn: () => getAdminClient(businessId, clientId),
  });

  useEffect(() => {
    if (detailQuery.data) {
      setForm(formFromClient(detailQuery.data));
      setShowEditor(false);
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
      setShowEditor(false);
    } catch (error) {
      onError(getAdminClientErrorMessage(error, "Could not save client."));
    }
  }

  if (detailQuery.isLoading) {
    return (
      <div
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        data-testid="admin-client-detail-panel"
      >
        <LoadingState message="Loading client…" />
      </div>
    );
  }

  if (detailQuery.isError) {
    return (
      <div
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        data-testid="admin-client-detail-panel"
      >
        <ErrorState
          title="Could not load client"
          message={getAdminClientErrorMessage(detailQuery.error, "Unable to load client")}
        />
      </div>
    );
  }

  const client = detailQuery.data;
  if (!client || !form) {
    return null;
  }

  const status = deriveClientStatus(
    {
      id: client.id,
      full_name: client.full_name,
      email: client.email,
      phone: client.phone,
      source: client.source,
      bookings_count: client.bookings_count,
      orders_count: client.orders_count,
      last_activity_at: client.last_activity_at,
      created_at: client.created_at,
      updated_at: client.updated_at,
    },
    dateRange,
  );
  const initials = customerInitials(client.full_name) || "?";
  const firstBooking = client.bookings.length
    ? [...client.bookings].sort(
        (a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
      )[0]
    : null;
  const lastBooking = client.bookings.length
    ? [...client.bookings].sort(
        (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
      )[0]
    : null;
  const location = clientLocationLabel(client);
  const reviewStats = getDetailReviewStats(client, reviews);

  return (
    <div
      className="h-fit space-y-5 overflow-hidden rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
      data-testid="admin-client-detail-panel"
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="min-w-0 space-y-2">
          <h3 className="break-words text-lg font-semibold text-gray-900">{client.full_name}</h3>
          <ClientStatusBadge status={status} />
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1.5 text-lg leading-none text-gray-400 outline-none hover:bg-gray-50 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-emerald-500/40"
          aria-label="Close detail panel"
        >
          ×
        </button>
      </div>

      <div className="flex items-start gap-3 border-b border-gray-100 pb-4">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
          {initials}
        </span>
        <div className="min-w-0 flex-1">
          {client.email ? (
            <p className="break-all text-sm text-gray-600">{client.email}</p>
          ) : (
            <p className="text-sm text-gray-400">No email</p>
          )}
          {client.phone ? (
            <p className="break-words text-sm text-gray-600">{client.phone}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {client.email ? (
            <a
              href={`mailto:${client.email}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Email client"
            >
              <EnvelopeIcon />
            </a>
          ) : null}
          {client.phone ? (
            <a
              href={`tel:${client.phone}`}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-50 hover:text-gray-700"
              aria-label="Call client"
            >
              <PhoneIcon />
            </a>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-1 gap-3.5 border-b border-gray-100 pb-4 text-sm sm:grid-cols-2">
        <DetailItem label="Location">{location ?? "—"}</DetailItem>
        <DetailItem label="Source">{formatSource(client.source as ClientSource)}</DetailItem>
        {firstBooking ? (
          <DetailItem label="First booking">
            {formatClientDate(firstBooking.starts_at)}
          </DetailItem>
        ) : (
          <DetailItem label="Created">{formatClientDate(client.created_at)}</DetailItem>
        )}
        {lastBooking ? (
          <DetailItem label="Last booking">
            {formatClientDate(lastBooking.starts_at)} at {formatClientTime(lastBooking.starts_at)}
          </DetailItem>
        ) : client.last_activity_at ? (
          <DetailItem label="Last activity">
            {formatDateTimeLabel(client.last_activity_at)}
          </DetailItem>
        ) : (
          <DetailItem label="Last activity">—</DetailItem>
        )}
        <DetailItem label="Total bookings">{client.bookings_count}</DetailItem>
        <DetailItem label="Total orders">{client.orders_count}</DetailItem>
        <DetailItem label="Reviews">
          {reviewStats.count > 0 ? (
            <span className="inline-flex flex-wrap items-center gap-2">
              <span>{reviewStats.count}</span>
              <ReviewStarRating rating={reviewStats.average ?? 0} />
              <span className="text-gray-500">
                ({(reviewStats.average ?? 0).toFixed(1)} avg)
              </span>
            </span>
          ) : (
            <span className="text-gray-500">0 reviews</span>
          )}
        </DetailItem>
      </dl>

      <div className="space-y-3 border-b border-gray-100 pb-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900">Recent bookings</h4>
          <Link
            to="/admin/bookings"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            View all
          </Link>
        </div>
        {client.bookings.length === 0 ? (
          <p className="text-sm text-gray-500">No bookings yet.</p>
        ) : (
          <ul className="space-y-2">
            {client.bookings.slice(0, 4).map((booking) => (
              <li
                key={booking.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{booking.service_name}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
                      {booking.reference}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      {formatDateTimeLabel(booking.starts_at)}
                    </p>
                  </div>
                  <StatusBadge status={booking.status} kind="booking" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-b border-gray-100 pb-4">
        <div className="flex items-center justify-between gap-2">
          <h4 className="text-sm font-semibold text-gray-900">Recent orders</h4>
          <Link
            to="/admin/orders"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
          >
            View all
          </Link>
        </div>
        {client.orders.length === 0 ? (
          <p className="text-sm text-gray-500">No orders yet.</p>
        ) : (
          <ul className="space-y-2">
            {client.orders.slice(0, 4).map((order) => (
              <li
                key={order.id}
                className="overflow-hidden rounded-xl border border-gray-200 bg-gray-50/60 px-3 py-2.5 text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-gray-900">{order.service_name}</p>
                    <p className="mt-0.5 truncate font-mono text-xs text-gray-500">
                      {order.reference}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">
                      Created {formatDateTimeLabel(order.created_at)}
                    </p>
                  </div>
                  <StatusBadge status={order.status} kind="order" />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold text-gray-900">Actions</p>
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {client.email ? (
            <a
              href={`mailto:${client.email}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 px-3 text-sm font-semibold text-orange-700 outline-none hover:bg-orange-100 focus-visible:ring-2 focus-visible:ring-orange-400/40"
            >
              <EnvelopeIcon />
              Email client
            </a>
          ) : null}
          {client.phone ? (
            <a
              href={`tel:${client.phone}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-3 text-sm font-semibold text-sky-700 outline-none hover:bg-sky-100 focus-visible:ring-2 focus-visible:ring-sky-400/40"
            >
              <PhoneIcon />
              Call client
            </a>
          ) : null}
          <button
            type="button"
            onClick={() => setShowEditor((open) => !open)}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
              client.email || client.phone ? "sm:col-span-2" : ""
            } ${
              showEditor
                ? "border border-transparent bg-gray-100 text-gray-600 hover:bg-gray-200"
                : "border border-teal-700 bg-teal-700 text-white hover:bg-teal-800"
            }`}
            aria-expanded={showEditor}
          >
            {showEditor ? "Hide editor" : "Edit contact & notes"}
          </button>
        </div>

        {showEditor ? (
          <form
            onSubmit={handleSave}
            className="space-y-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4"
          >
            <div>
              <label htmlFor="clientFullName" className="block text-sm font-medium text-gray-600">
                Full name <span className="text-red-500">*</span>
              </label>
              <input
                id="clientFullName"
                type="text"
                required
                value={form.full_name}
                disabled={saving}
                onChange={(event) => updateField("full_name", event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-600">
                Email
              </label>
              <input
                id="clientEmail"
                type="email"
                value={form.email}
                disabled={saving}
                onChange={(event) => updateField("email", event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 disabled:opacity-60"
              />
            </div>
            <div>
              <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-600">
                Phone
              </label>
              <input
                id="clientPhone"
                type="tel"
                value={form.phone}
                disabled={saving}
                onChange={(event) => updateField("phone", event.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm text-gray-900 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/35 disabled:opacity-60"
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
              className="inline-flex h-10 w-full items-center justify-center rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white outline-none hover:bg-emerald-700 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save client"}
            </button>
          </form>
        ) : null}
      </div>
    </div>
  );
}

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium text-gray-900">{children}</dd>
    </div>
  );
}

function EnvelopeIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M3 5.5h14v9H3v-9Zm0 0 7 5 7-5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
      <path
        d="M4.5 4.5c0-.8.7-1.5 1.5-1.5h1.2c.6 0 1.1.4 1.2 1l.3 1.8c.1.5-.1 1-.5 1.3L7.3 8.4a9.5 9.5 0 0 0 4.3 4.3l1.3-.9c.3-.4.8-.6 1.3-.5l1.8.3c.6.1 1 .6 1 1.2V15c0 .8-.7 1.5-1.5 1.5C8.8 16.5 3.5 11.2 3.5 4.5Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
