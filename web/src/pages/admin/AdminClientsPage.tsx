import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
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
    <section className="space-y-4" data-testid="admin-clients-page">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Clients</h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Find customers, review activity, and update contact details.
        </p>
      </div>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <div data-testid="admin-clients-search">
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
            className="mt-1 min-h-11 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm sm:min-h-0 sm:py-2"
          />
        </label>
      </div>

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
        <div className="space-y-3" data-testid="admin-clients-empty">
          <EmptyState
            title={searchQuery ? "No clients match your search" : "No clients yet"}
            description={
              searchQuery
                ? "Try another name, email, or phone."
                : "Clients will appear here after bookings or service requests."
            }
          />
          {!searchQuery ? (
            <div className="flex flex-wrap justify-center gap-2">
              <Link
                to="/admin/bookings"
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View bookings
              </Link>
              <Link
                to="/admin/orders"
                className="min-h-10 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View orders
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {!isLoading && !isError && data && data.data.length > 0 ? (
        <div
          className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2"
          data-testid="admin-clients-list"
        >
          {data.data.map((client) => {
            const contact = [client.email, client.phone].filter(Boolean).join(" · ");

            return (
              <article
                key={client.id}
                className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${
                  selectedClientId === client.id
                    ? "border-brand-400 ring-1 ring-brand-200"
                    : "border-slate-200"
                }`}
                data-testid="admin-client-card"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-2 p-3 sm:p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <h3 className="min-w-0 break-words text-base font-semibold text-slate-900">
                      {client.full_name}
                    </h3>
                    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-xs font-medium text-slate-600">
                      {formatSource(client.source)}
                    </span>
                  </div>
                  {contact ? (
                    <p className="truncate text-sm text-slate-600" title={contact}>
                      {contact}
                    </p>
                  ) : null}
                  <p className="text-xs text-slate-500">
                    {client.bookings_count} booking{client.bookings_count === 1 ? "" : "s"} ·{" "}
                    {client.orders_count} order{client.orders_count === 1 ? "" : "s"}
                  </p>
                  {client.last_activity_at ? (
                    <p className="mt-auto text-xs text-slate-500">
                      Last activity {formatDateTimeLabel(client.last_activity_at)}
                    </p>
                  ) : (
                    <p className="mt-auto text-xs text-slate-500">
                      Created {formatDateTimeLabel(client.created_at)}
                    </p>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-3 sm:px-4 sm:py-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedClientId(client.id);
                      setSuccessMessage(null);
                      setActionError(null);
                    }}
                    className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-0 sm:flex-none sm:py-1.5"
                    data-testid={`admin-client-view-${client.id}`}
                  >
                    View details
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
