import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getSuperadminLegalConsents } from "@/api/superadminApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type { LegalConsentEntityType, LegalConsentSource } from "@/types/api";
import { getSuperadminErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const PAGE_LIMIT = 25;

type SourceFilter = "" | LegalConsentSource;
type EntityTypeFilter = "" | LegalConsentEntityType;

const SOURCE_OPTIONS: Array<{ value: SourceFilter; label: string }> = [
  { value: "", label: "All sources" },
  { value: "registration", label: "Registration" },
  { value: "public_booking", label: "Public booking" },
  { value: "public_order", label: "Public order" },
];

const ENTITY_TYPE_OPTIONS: Array<{ value: EntityTypeFilter; label: string }> = [
  { value: "", label: "All types" },
  { value: "business", label: "Business" },
  { value: "booking", label: "Booking" },
  { value: "order", label: "Order" },
];

function formatSourceLabel(source: LegalConsentSource): string {
  if (source === "registration") {
    return "Registration";
  }
  if (source === "public_booking") {
    return "Public booking";
  }
  return "Public order";
}

function formatEntityTypeLabel(entityType: LegalConsentEntityType): string {
  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

export function SuperadminLegalConsentsPage() {
  const [businessIdInput, setBusinessIdInput] = useState("");
  const [businessIdQuery, setBusinessIdQuery] = useState("");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypeFilter>("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => setBusinessIdQuery(businessIdInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [businessIdInput]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: [
      "superadmin-legal-consents",
      businessIdQuery,
      sourceFilter,
      entityTypeFilter,
      page,
    ],
    queryFn: () =>
      getSuperadminLegalConsents({
        business_id: businessIdQuery || undefined,
        source: sourceFilter || undefined,
        entity_type: entityTypeFilter || undefined,
        page,
        limit: PAGE_LIMIT,
      }),
  });

  const totalPages = data ? Math.max(1, Math.ceil(data.meta.total / data.meta.limit)) : 1;
  const canGoPrevious = page > 1;
  const canGoNext = data ? page < totalPages : false;

  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-bold">Platform legal consent records</h2>
        <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Audit summary only. Legal text is still pending final review.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label htmlFor="superadminConsentBusinessId" className="block text-sm">
          <span className="font-medium text-slate-700">Business ID</span>
          <input
            id="superadminConsentBusinessId"
            type="text"
            value={businessIdInput}
            placeholder="Optional UUID"
            onChange={(event) => {
              setBusinessIdInput(event.target.value);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
        </label>
        <label htmlFor="superadminConsentSourceFilter" className="block text-sm">
          <span className="font-medium text-slate-700">Source</span>
          <select
            id="superadminConsentSourceFilter"
            value={sourceFilter}
            onChange={(event) => {
              setSourceFilter(event.target.value as SourceFilter);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="superadminConsentEntityTypeFilter" className="block text-sm">
          <span className="font-medium text-slate-700">Entity type</span>
          <select
            id="superadminConsentEntityTypeFilter"
            value={entityTypeFilter}
            onChange={(event) => {
              setEntityTypeFilter(event.target.value as EntityTypeFilter);
              setPage(1);
            }}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          >
            {ENTITY_TYPE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {isLoading ? <LoadingState message="Loading consent records…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load consent records"
          message={getSuperadminErrorMessage(error, "Unable to load consent records")}
        />
      ) : null}

      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState title="No consent records match this filter" />
      ) : null}

      {!isLoading && !isError && data && data.data.length > 0 ? (
        <div className="space-y-3">
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
            <table className="min-w-full divide-y divide-slate-200 text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Accepted
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Business
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Source
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Entity type
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Entity ID
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Version
                  </th>
                  <th scope="col" className="px-4 py-3 font-medium">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {data.data.map((record) => (
                  <tr key={record.id}>
                    <td className="whitespace-nowrap px-4 py-3">
                      <time dateTime={record.accepted_at}>
                        {formatDateTimeLabel(record.accepted_at)}
                      </time>
                    </td>
                    <td className="px-4 py-3">
                      {record.business_name ? (
                        <div>
                          <p className="font-medium text-slate-900">{record.business_name}</p>
                          {record.business_id ? (
                            <p className="font-mono text-xs text-slate-500">{record.business_id}</p>
                          ) : null}
                        </div>
                      ) : (
                        <span className="font-mono text-xs">{record.business_id ?? "—"}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatSourceLabel(record.source)}</td>
                    <td className="px-4 py-3">{formatEntityTypeLabel(record.entity_type)}</td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {record.entity_id ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {record.legal_consent_version}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <time dateTime={record.created_at}>
                        {formatDateTimeLabel(record.created_at)}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
            <p>
              Page {data.meta.page} of {totalPages} · {data.meta.total} record
              {data.meta.total === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canGoPrevious}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={() => setPage((current) => current + 1)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
