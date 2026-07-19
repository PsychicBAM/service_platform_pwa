import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listSuperadminBusinesses } from "@/api/superadminApi";
import { SuperadminBusinessDetailPanel } from "@/components/superadmin/SuperadminBusinessDetailPanel";
import { SuperadminPlanChangeRequestsSection } from "@/components/superadmin/SuperadminPlanChangeRequestsSection";
import { PlanRequestBadge } from "@/components/superadmin/PlanRequestBadge";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type { SubscriptionPlan, SuperadminBusinessStatus } from "@/types/api";
import { getSuperadminErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

type StatusFilter = "all" | SuperadminBusinessStatus;
type PlanFilter = "all" | SubscriptionPlan;

const STATUS_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "suspended", label: "Suspended" },
  { value: "pending_setup", label: "Pending setup" },
];

const PLAN_FILTERS: Array<{ value: PlanFilter; label: string }> = [
  { value: "all", label: "All plans" },
  { value: "free", label: "Free" },
  { value: "starter", label: "Starter" },
  { value: "business", label: "Business" },
  { value: "pro", label: "Pro" },
];

import { formatPlanLabel } from "@/utils/planManagement";

function FilterButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-3 py-1.5 text-sm font-medium ${
        active
          ? "bg-slate-800 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export function SuperadminBusinessesPage() {
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [planFilter, setPlanFilter] = useState<PlanFilter>("all");
  const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => setSearchQuery(searchInput.trim()), 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["superadmin-businesses", searchQuery, statusFilter, planFilter],
    queryFn: () =>
      listSuperadminBusinesses({
        search: searchQuery || undefined,
        status: statusFilter === "all" ? undefined : statusFilter,
        plan: planFilter === "all" ? undefined : planFilter,
        limit: 50,
      }),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Businesses</h2>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <SuperadminPlanChangeRequestsSection
        onOpenBusiness={(businessId) => {
          setSelectedBusinessId(businessId);
          setSuccessMessage(null);
          setActionError(null);
        }}
        onSuccess={(message) => {
          setSuccessMessage(message);
          setActionError(null);
        }}
        onError={(message) => {
          setActionError(message);
          setSuccessMessage(null);
        }}
      />

      <label htmlFor="businessSearch" className="block text-sm">
        <span className="font-medium text-slate-700">Search</span>
        <input
          id="businessSearch"
          type="search"
          value={searchInput}
          placeholder="Name, slug, or owner email"
          onChange={(event) => {
            setSearchInput(event.target.value);
            setSelectedBusinessId(null);
            setSuccessMessage(null);
            setActionError(null);
          }}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex flex-wrap gap-2">
        {STATUS_FILTERS.map((filter) => (
          <FilterButton
            key={filter.value}
            active={statusFilter === filter.value}
            label={filter.label}
            onClick={() => {
              setStatusFilter(filter.value);
              setSelectedBusinessId(null);
            }}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        {PLAN_FILTERS.map((filter) => (
          <FilterButton
            key={filter.value}
            active={planFilter === filter.value}
            label={filter.label}
            onClick={() => {
              setPlanFilter(filter.value);
              setSelectedBusinessId(null);
            }}
          />
        ))}
      </div>

      {selectedBusinessId ? (
        <SuperadminBusinessDetailPanel
          businessId={selectedBusinessId}
          onClose={() => setSelectedBusinessId(null)}
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

      {isLoading ? <LoadingState message="Loading businesses…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load businesses"
          message={getSuperadminErrorMessage(error, "Unable to load businesses")}
        />
      ) : null}

      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState title="No businesses match this filter" />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="space-y-3">
          {data.data.map((business) => (
            <article
              key={business.id}
              className={`rounded-2xl border bg-white p-4 shadow-sm ${
                selectedBusinessId === business.id
                  ? "border-slate-500 ring-1 ring-slate-300"
                  : "border-slate-200"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-slate-900">{business.name}</h3>
                  <p className="font-mono text-sm text-slate-600">{business.slug}</p>
                </div>
                <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
                  {formatPlanLabel(business.status)}
                </span>
                <PlanRequestBadge
                  activePlan={business.plan}
                  intent={business.selected_plan_intent}
                />
              </div>
              <dl className="mt-3 grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="inline text-slate-500">Active plan: </dt>
                  <dd className="inline font-medium text-slate-800">
                    {formatPlanLabel(business.plan)} · {formatPlanLabel(business.subscription_status)}
                  </dd>
                </div>
                {business.selected_plan_intent ? (
                  <div>
                    <dt className="inline text-slate-500">Signup intent: </dt>
                    <dd className="inline">{formatPlanLabel(business.selected_plan_intent)}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="inline text-slate-500">Mode: </dt>
                  <dd className="inline">{formatPlanLabel(business.operating_mode)}</dd>
                </div>
                {business.owner_email ? (
                  <div className="sm:col-span-2">
                    <dt className="inline text-slate-500">Owner: </dt>
                    <dd className="inline">{business.owner_email}</dd>
                  </div>
                ) : null}
                <div className="sm:col-span-2 text-xs text-slate-500">
                  Updated {formatDateTimeLabel(business.updated_at)}
                </div>
              </dl>
              <button
                type="button"
                onClick={() => {
                  setSelectedBusinessId(business.id);
                  setSuccessMessage(null);
                  setActionError(null);
                }}
                className="mt-4 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                View / edit
              </button>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
