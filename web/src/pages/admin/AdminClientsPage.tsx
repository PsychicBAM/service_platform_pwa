import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listAdminClients, listAdminReviews } from "@/api/adminApi";
import { AdminAnalyticsKpiCard } from "@/components/admin/analytics/AdminAnalyticsKpiCard";
import { AdminClientDetailPanel } from "@/components/admin/AdminClientDetailPanel";
import { AdminClientFilters } from "@/components/admin/clients/AdminClientFilters";
import { AdminClientPagination } from "@/components/admin/clients/AdminClientPagination";
import { AdminClientRowActions } from "@/components/admin/clients/AdminClientRowActions";
import {
  ClientStatusBadge,
  ClientStatusDot,
} from "@/components/admin/clients/ClientStatusBadge";
import {
  CLIENT_STATUS_SELECT_OPTIONS,
  DATE_RANGE_OPTIONS,
  averageReviewsPerClient,
  buildClientReviewStatsByName,
  clientLocationLabel,
  customerInitials,
  deriveClientStatus,
  downloadClientsCsv,
  formatClientDate,
  formatClientTime,
  formatDateRangeLabel,
  formatFileDate,
  formatSource,
  getCompareRange,
  getDateRange,
  isActiveClient,
  isInRange,
  isNewClient,
  isReturningClient,
  matchesClientStatusFilter,
  matchesClientTab,
  percentChange,
  type ClientSourceFilter,
  type ClientStatusFilter,
  type ClientTabFilter,
  type DateRangeOption,
} from "@/components/admin/clients/clientHelpers";
import { ReviewStarRating } from "@/components/admin/reviews/ReviewStarRating";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { getAdminClientErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

function IconUsers() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm-7.5 8a6.5 6.5 0 0 1 13 0v1h-13v-1Zm14.2-8.8a3.2 3.2 0 1 0-3.1-5.4 5.7 5.7 0 0 1 1.6 5.4Zm1.8 2.1a5.2 5.2 0 0 1 3 4.7v1h-3.1a7.8 7.8 0 0 0 .1-5.7Z" />
    </svg>
  );
}

function IconActive() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="m8.2 12.2 2.4 2.4 5.2-5.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconNew() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
    </svg>
  );
}

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
    </svg>
  );
}

function IconReturning() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path
        d="M4.5 12a7.5 7.5 0 0 1 12.7-5.4L19 4.5V10h-5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19.5 12a7.5 7.5 0 0 1-12.7 5.4L5 19.5V14h5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AdminClientsPage() {
  const { businessId } = useAdminBusiness();
  const enabled = Boolean(businessId);

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<ClientStatusFilter>("all");
  const [sourceFilter, setSourceFilter] = useState<ClientSourceFilter>("all");
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("all_time");
  const [activeTab, setActiveTab] = useState<ClientTabFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const currentRange = useMemo(() => getDateRange(dateRangeOption), [dateRangeOption]);
  const compareRange = useMemo(
    () => (currentRange ? getCompareRange("previous_period", currentRange) : null),
    [currentRange],
  );
  const dateRangeLabel = currentRange ? formatDateRangeLabel(currentRange) : "All time";
  const compareRangeLabel = compareRange ? formatDateRangeLabel(compareRange) : "";

  const clientsQuery = useQuery({
    queryKey: ["admin-clients", businessId, searchQuery],
    queryFn: () =>
      listAdminClients(businessId!, {
        page: 1,
        limit: 100,
        ...(searchQuery ? { search: searchQuery } : {}),
      }),
    enabled,
  });

  const reviewsQuery = useQuery({
    queryKey: ["admin-reviews", businessId],
    queryFn: () => listAdminReviews(businessId!),
    enabled,
  });

  const allClients = clientsQuery.data?.data ?? [];
  const allReviews = reviewsQuery.data ?? [];
  const reviewStatsByClientId = useMemo(
    () => buildClientReviewStatsByName(allClients, allReviews),
    [allClients, allReviews],
  );

  const dateScopedClients = useMemo(
    () =>
      currentRange
        ? allClients.filter(
            (client) =>
              isInRange(client.created_at, currentRange) ||
              (client.last_activity_at
                ? isInRange(client.last_activity_at, currentRange)
                : false),
          )
        : allClients,
    [allClients, currentRange],
  );

  const compareClients = useMemo(
    () =>
      compareRange
        ? allClients.filter(
            (client) =>
              isInRange(client.created_at, compareRange) ||
              (client.last_activity_at
                ? isInRange(client.last_activity_at, compareRange)
                : false),
          )
        : [],
    [allClients, compareRange],
  );

  const kpis = useMemo(() => {
    const total = dateScopedClients.length;
    const active = dateScopedClients.filter((c) => isActiveClient(c)).length;
    const newCount = dateScopedClients.filter((c) => isNewClient(c, currentRange)).length;
    const returning = dateScopedClients.filter((c) => isReturningClient(c)).length;
    const avgReviews = averageReviewsPerClient(dateScopedClients, reviewStatsByClientId);
    const prevAvgReviews = averageReviewsPerClient(compareClients, reviewStatsByClientId);

    const prevTotal = compareClients.length;
    const prevActive = compareClients.filter((c) => isActiveClient(c)).length;
    const prevNew = compareClients.filter((c) => isNewClient(c, compareRange)).length;
    const prevReturning = compareClients.filter((c) => isReturningClient(c)).length;
    const avgDelta = avgReviews - prevAvgReviews;

    return {
      total,
      active,
      newCount,
      avgReviews,
      returning,
      trends: {
        total: percentChange(total, prevTotal),
        active: percentChange(active, prevActive),
        newCount: percentChange(newCount, prevNew),
        avgReviews:
          compareClients.length === 0
            ? avgReviews > 0
              ? "↑ new"
              : "→ 0.0"
            : avgDelta > 0.04
              ? `↑ ${avgDelta.toFixed(1)}`
              : avgDelta < -0.04
                ? `↓ ${Math.abs(avgDelta).toFixed(1)}`
                : "→ 0.0",
        returning: percentChange(returning, prevReturning),
      },
    };
  }, [compareClients, compareRange, currentRange, dateScopedClients, reviewStatsByClientId]);

  const tabCounts = useMemo(() => {
    const base = dateScopedClients.filter((client) => {
      if (sourceFilter !== "all" && client.source !== sourceFilter) return false;
      return true;
    });
    return {
      all: base.length,
      active: base.filter((c) => isActiveClient(c)).length,
      new: base.filter((c) => isNewClient(c, currentRange)).length,
      returning: base.filter((c) => isReturningClient(c)).length,
      inactive: base.filter((c) => !isActiveClient(c)).length,
    };
  }, [currentRange, dateScopedClients, sourceFilter]);

  const filteredClients = useMemo(() => {
    return dateScopedClients.filter((client) => {
      if (!matchesClientTab(client, activeTab, currentRange)) return false;
      if (!matchesClientStatusFilter(client, statusFilter, currentRange)) return false;
      if (sourceFilter !== "all" && client.source !== sourceFilter) return false;
      return true;
    });
  }, [activeTab, currentRange, dateScopedClients, sourceFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedClients = filteredClients.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    if (panelDismissed) return;
    if (selectedClientId) {
      const stillExists = allClients.some((client) => client.id === selectedClientId);
      if (!stillExists) {
        setSelectedClientId(filteredClients[0]?.id ?? allClients[0]?.id ?? null);
      }
      return;
    }
    const firstId = filteredClients[0]?.id ?? allClients[0]?.id ?? null;
    if (firstId) {
      setSelectedClientId(firstId);
    }
  }, [allClients, filteredClients, panelDismissed, selectedClientId]);

  function clearFilters() {
    setSearchInput("");
    setSearchQuery("");
    setStatusFilter("all");
    setSourceFilter("all");
    setDateRangeOption("all_time");
    setActiveTab("all");
    setPage(1);
    setActionError(null);
    setSuccessMessage(null);
  }

  function handleExport() {
    const rows: Array<Array<string | number>> = [
      [
        "client_name",
        "email",
        "phone",
        "location",
        "status",
        "last_activity",
        "total_bookings",
        "total_orders",
        "reviews_count",
        "average_rating",
        "source",
      ],
      ...filteredClients.map((client) => {
        const stats = reviewStatsByClientId.get(client.id);
        return [
          client.full_name,
          client.email ?? "",
          client.phone ?? "",
          clientLocationLabel(client) ?? "",
          deriveClientStatus(client, currentRange),
          client.last_activity_at
            ? `${formatClientDate(client.last_activity_at)} ${formatClientTime(client.last_activity_at)}`
            : "",
          client.bookings_count,
          client.orders_count,
          stats?.count ?? 0,
          stats?.average != null ? stats.average.toFixed(1) : "",
          formatSource(client.source),
        ];
      }),
    ];
    downloadClientsCsv(`service-platform-clients-${formatFileDate()}.csv`, rows);
  }

  const tabs: Array<{ id: ClientTabFilter; label: string; count: number; testId: string }> = [
    { id: "all", label: "All Clients", count: tabCounts.all, testId: "admin-clients-tab-all" },
    { id: "active", label: "Active", count: tabCounts.active, testId: "admin-clients-tab-active" },
    { id: "new", label: "New", count: tabCounts.new, testId: "admin-clients-tab-new" },
    {
      id: "returning",
      label: "Returning",
      count: tabCounts.returning,
      testId: "admin-clients-tab-returning",
    },
    {
      id: "inactive",
      label: "Inactive",
      count: tabCounts.inactive,
      testId: "admin-clients-tab-inactive",
    },
  ];

  return (
    <section className="w-full space-y-6 sm:space-y-7" data-testid="admin-clients-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Clients</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your clients, their activity, and review history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative inline-flex w-full items-center sm:w-[200px]">
            <span className="sr-only">Date range</span>
            <span
              className="pointer-events-none absolute left-3 top-1/2 z-[1] -translate-y-1/2"
              aria-hidden="true"
            >
              📅
            </span>
            <select
              value={dateRangeOption}
              onChange={(event) => {
                setDateRangeOption(event.target.value as DateRangeOption);
                setPage(1);
              }}
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-0 pl-9 pr-8 text-sm font-medium text-gray-700 shadow-sm"
              aria-label={`Date range: ${dateRangeLabel}`}
              title={dateRangeLabel}
              data-testid="admin-clients-date-range"
            >
              {DATE_RANGE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-500"
              aria-hidden="true"
            >
              ▾
            </span>
          </label>

          <label className="relative inline-flex w-full sm:w-[160px]">
            <span className="sr-only">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => {
                setStatusFilter(event.target.value as ClientStatusFilter);
                setPage(1);
              }}
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-0 pl-3 pr-8 text-sm font-medium text-gray-700 shadow-sm"
              aria-label="Header status filter"
              data-testid="admin-clients-header-status"
            >
              {CLIENT_STATUS_SELECT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <span
              className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-gray-500"
              aria-hidden="true"
            >
              ▾
            </span>
          </label>

          <button
            type="button"
            onClick={handleExport}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 text-sm font-semibold text-emerald-700 shadow-sm hover:bg-emerald-50"
            data-testid="admin-clients-export"
          >
            <span aria-hidden="true">⬇</span>
            Export CSV
          </button>
        </div>
      </div>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}
      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminAnalyticsKpiCard
          testId="admin-clients-kpi-total"
          label="Total Clients"
          value={String(kpis.total)}
          trend={kpis.trends.total}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconUsers />}
          iconTone="bg-sky-50 text-sky-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-clients-kpi-active"
          label="Active Clients"
          value={String(kpis.active)}
          trend={kpis.trends.active}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconActive />}
          iconTone="bg-emerald-50 text-emerald-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-clients-kpi-new"
          label="New Clients"
          value={String(kpis.newCount)}
          trend={kpis.trends.newCount}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconNew />}
          iconTone="bg-violet-50 text-violet-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-clients-kpi-average-reviews"
          label="Avg. Reviews per Client"
          value={kpis.avgReviews.toFixed(1)}
          trend={kpis.trends.avgReviews}
          compareText={
            compareRangeLabel ? `vs ${compareRangeLabel}` : "Matched by customer name"
          }
          icon={<IconStar />}
          iconTone="bg-amber-50 text-amber-500"
        />
        <AdminAnalyticsKpiCard
          testId="admin-clients-kpi-returning"
          label="Returning Clients"
          value={String(kpis.returning)}
          trend={kpis.trends.returning}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconReturning />}
          iconTone="bg-rose-50 text-rose-600"
        />
      </div>

      <AdminClientFilters
        search={searchInput}
        onSearchChange={(value) => {
          setSearchInput(value);
          setPanelDismissed(false);
          setSuccessMessage(null);
          setActionError(null);
        }}
        sourceFilter={sourceFilter}
        onSourceChange={(value) => {
          setSourceFilter(value);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
        }}
        onClear={clearFilters}
      />

      <div
        className="flex gap-1 overflow-x-auto border-b border-gray-200"
        role="tablist"
        aria-label="Client status tabs"
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={activeTab === tab.id}
            data-testid={tab.testId}
            onClick={() => {
              setActiveTab(tab.id);
              setPage(1);
            }}
            className={`inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
          >
            {tab.label}
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === tab.id
                  ? "bg-emerald-50 text-emerald-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {clientsQuery.isLoading ? <LoadingState message="Loading clients…" /> : null}
      {clientsQuery.isError ? (
        <ErrorState
          title="Could not load clients"
          message={getAdminClientErrorMessage(clientsQuery.error, "Unable to load clients")}
        />
      ) : null}

      {!clientsQuery.isLoading && !clientsQuery.isError && allClients.length === 0 ? (
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
                className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View bookings
              </Link>
              <Link
                to="/admin/orders"
                className="min-h-10 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                View orders
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      {!clientsQuery.isLoading && !clientsQuery.isError && allClients.length > 0 ? (
        <div
          className={`grid items-start gap-5 ${
            selectedClientId && businessId
              ? "xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]"
              : "grid-cols-1"
          }`}
        >
          <div
            className="grid grid-cols-1 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
            data-testid="admin-clients-list"
          >
            {filteredClients.length === 0 ? (
              <div className="p-6">
                <EmptyState title="No clients match these filters." />
              </div>
            ) : (
              <>
                <div className="min-w-0" data-testid="admin-clients-table">
                  <table className="w-full table-fixed divide-y divide-gray-100 text-left text-sm">
                    <thead className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="w-[22%] px-3 py-3 xl:px-4">Client</th>
                        <th className="w-[20%] px-3 py-3 xl:px-4">Contact</th>
                        <th className="w-[12%] px-3 py-3 xl:px-4">Location</th>
                        <th className="w-[14%] px-3 py-3 xl:px-4">Last activity</th>
                        <th className="w-[12%] px-3 py-3 xl:px-4">Reviews</th>
                        <th className="w-[10%] px-3 py-3 xl:px-4">Status</th>
                        <th className="w-[10%] px-2 py-3 text-right xl:px-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedClients.map((client) => {
                        const status = deriveClientStatus(client, currentRange);
                        const selected = selectedClientId === client.id;
                        const location = clientLocationLabel(client);
                        const reviewStats = reviewStatsByClientId.get(client.id) ?? {
                          count: 0,
                          average: null,
                        };

                        return (
                          <tr
                            key={client.id}
                            className={`overflow-hidden ${
                              selected ? "bg-emerald-50/40" : "bg-white hover:bg-gray-50/70"
                            }`}
                            data-testid="admin-client-card"
                            data-client-row="true"
                          >
                            <td
                              className="overflow-hidden px-3 py-4 align-middle xl:px-4"
                              data-testid="admin-client-row"
                            >
                              <div className="flex items-center gap-2.5">
                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                                  {customerInitials(client.full_name) || "?"}
                                </span>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <p className="truncate font-semibold text-gray-900">
                                      {client.full_name}
                                    </p>
                                    <ClientStatusDot status={status} />
                                  </div>
                                  <p className="truncate text-xs text-gray-500">
                                    {formatSource(client.source)}
                                  </p>
                                  <p className="truncate text-xs text-gray-400">
                                    {client.bookings_count} booking
                                    {client.bookings_count === 1 ? "" : "s"} ·{" "}
                                    {client.orders_count} order
                                    {client.orders_count === 1 ? "" : "s"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="overflow-hidden px-3 py-4 align-middle xl:px-4">
                              {client.email ? (
                                <p className="truncate text-sm text-gray-700" title={client.email}>
                                  {client.email}
                                </p>
                              ) : null}
                              {client.phone ? (
                                <p
                                  className={`truncate ${
                                    client.email
                                      ? "text-xs text-gray-500"
                                      : "text-sm text-gray-700"
                                  }`}
                                  title={client.phone}
                                >
                                  {client.phone}
                                </p>
                              ) : null}
                              {!client.email && !client.phone ? (
                                <p className="text-sm text-gray-400">—</p>
                              ) : null}
                            </td>
                            <td className="overflow-hidden px-3 py-4 align-middle text-sm text-gray-500 xl:px-4">
                              <p className="truncate">{location ?? "—"}</p>
                            </td>
                            <td className="overflow-hidden px-3 py-4 align-middle xl:px-4">
                              {client.last_activity_at ? (
                                <>
                                  <p className="truncate font-medium text-gray-900">
                                    {formatClientDate(client.last_activity_at)}
                                  </p>
                                  <p className="truncate text-xs text-gray-500">
                                    {formatClientTime(client.last_activity_at)}
                                  </p>
                                </>
                              ) : (
                                <p className="truncate text-sm text-gray-500">
                                  Created {formatDateTimeLabel(client.created_at)}
                                </p>
                              )}
                            </td>
                            <td className="overflow-hidden px-3 py-4 align-middle xl:px-4">
                              <p className="font-semibold text-gray-900">{reviewStats.count}</p>
                              <div className="mt-0.5">
                                <ReviewStarRating
                                  rating={reviewStats.average ?? 0}
                                  size="sm"
                                />
                              </div>
                            </td>
                            <td className="overflow-hidden px-3 py-4 align-middle xl:px-4">
                              <ClientStatusBadge status={status} />
                            </td>
                            <td className="overflow-hidden px-2 py-4 align-middle xl:px-3">
                              <AdminClientRowActions
                                clientId={client.id}
                                onView={() => {
                                  setPanelDismissed(false);
                                  setSelectedClientId(client.id);
                                  setSuccessMessage(null);
                                  setActionError(null);
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <AdminClientPagination
                  page={safePage}
                  pageSize={pageSize}
                  total={filteredClients.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </>
            )}
          </div>

          {selectedClientId && businessId ? (
            <div className="w-full min-w-0 self-start xl:w-[360px] xl:max-w-[360px] 2xl:w-[380px] 2xl:max-w-[380px]">
              <AdminClientDetailPanel
                businessId={businessId}
                clientId={selectedClientId}
                dateRange={currentRange}
                reviews={allReviews}
                onClose={() => {
                  setPanelDismissed(true);
                  setSelectedClientId(null);
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
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
