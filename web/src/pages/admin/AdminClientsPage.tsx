import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAdminClients } from "@/api/adminApi";
import { AdminClientDetailPanel } from "@/components/admin/AdminClientDetailPanel";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type { ClientSource } from "@/types/api";
import { getAdminClientErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

function formatSource(source: ClientSource): string {
  if (source === "admin_created") {
    return "Admin created";
  }
  if (source === "registered") {
    return "Registered";
  }
  return "Guest";
}

export function AdminClientsPage() {
  const { businessId } = useAdminBusiness();
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-clients", businessId, searchQuery],
    queryFn: () =>
      listAdminClients(businessId!, searchQuery ? { search: searchQuery } : undefined),
    enabled: Boolean(businessId),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Clients</h2>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <label htmlFor="clientSearch" className="block text-sm">
        <span className="font-medium text-slate-700">Search clients</span>
        <input
          id="clientSearch"
          type="search"
          value={searchInput}
          placeholder="Name, email, or phone"
          onChange={(event) => {
            setSearchInput(event.target.value);
            setSelectedClientId(null);
            setSuccessMessage(null);
            setActionError(null);
          }}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      {selectedClientId && businessId ? (
        <AdminClientDetailPanel
          businessId={businessId}
          clientId={selectedClientId}
          onClose={() => setSelectedClientId(null)}
          onSuccess={(message) => {
            setSuccessMessage(message);
            setActionError(null);
          }}
          onError={(message) => {
            setActionError(message);
            setSuccessMessage(null);
          }}
        />
      ) : null}

      {isLoading ? <LoadingState message="Loading clients…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load clients"
          message={getAdminClientErrorMessage(error, "Unable to load clients")}
        />
      ) : null}

      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState
          title={searchQuery ? "No clients match your search" : "No clients yet"}
        />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="grid gap-3 lg:grid-cols-2">
          {data.data.map((client) => (
            <article
              key={client.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                selectedClientId === client.id
                  ? "border-brand-400 ring-1 ring-brand-200"
                  : "border-slate-200"
              }`}
            >
              <h3 className="font-semibold text-slate-900">{client.full_name}</h3>
              {client.email ? (
                <p className="mt-1 text-sm text-slate-600">{client.email}</p>
              ) : null}
              {client.phone ? <p className="text-sm text-slate-600">{client.phone}</p> : null}
              <p className="mt-2 text-xs text-slate-500">{formatSource(client.source)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {client.bookings_count} booking{client.bookings_count === 1 ? "" : "s"} ·{" "}
                {client.orders_count} order{client.orders_count === 1 ? "" : "s"}
              </p>
              {client.last_activity_at ? (
                <p className="mt-1 text-xs text-slate-500">
                  Last activity {formatDateTimeLabel(client.last_activity_at)}
                </p>
              ) : null}
              <button
                type="button"
                onClick={() => {
                  setSelectedClientId(client.id);
                  setSuccessMessage(null);
                  setActionError(null);
                }}
                className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View details
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
