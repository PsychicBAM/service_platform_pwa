import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAdminOrders, listAdminServices } from "@/api/adminApi";
import { AdminAnalyticsKpiCard } from "@/components/admin/analytics/AdminAnalyticsKpiCard";
import { AdminOrderDetailPanel } from "@/components/admin/AdminOrderDetailPanel";
import { AdminOrderFilters } from "@/components/admin/orders/AdminOrderFilters";
import { AdminOrderPagination } from "@/components/admin/orders/AdminOrderPagination";
import { AdminOrderRowActions } from "@/components/admin/orders/AdminOrderRowActions";
import {
  DATE_RANGE_OPTIONS,
  ORDER_STATUS_CHIP_FILTERS,
  ORDER_STATUS_SELECT_OPTIONS,
  consentLabel,
  customerInitials,
  downloadOrdersCsv,
  findServiceByName,
  formatDateRangeLabel,
  formatFileDate,
  formatMoney,
  formatOrderDate,
  formatOrderTime,
  getCompareRange,
  getDateRange,
  isCancelledGroupStatus,
  isInProgressGroupStatus,
  isInRange,
  isNewRequestStatus,
  matchesOrderSearch,
  matchesOrderTab,
  percentChange,
  type DateRangeOption,
  type OrderStatusFilter,
  type OrderTabFilter,
} from "@/components/admin/orders/orderHelpers";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type { AdminOrderListItem } from "@/types/api";
import { getMeErrorMessage } from "@/utils/errors";

function IconFolder() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2Z" />
    </svg>
  );
}

function IconClock() {
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
      <path d="M12 7.5V12l3 2" strokeLinecap="round" />
    </svg>
  );
}

function IconDone() {
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

function IconCancel() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="M15 9 9 15M9 9l6 6" />
    </svg>
  );
}

function IconCash() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M3 6h18v12H3V6Zm9 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
    </svg>
  );
}

export function AdminOrdersPage() {
  const { businessId } = useAdminBusiness();
  const enabled = Boolean(businessId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<OrderStatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("all_time");
  const [activeTab, setActiveTab] = useState<OrderTabFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentRange = useMemo(() => getDateRange(dateRangeOption), [dateRangeOption]);
  const compareRange = useMemo(
    () => (currentRange ? getCompareRange("previous_period", currentRange) : null),
    [currentRange],
  );
  const dateRangeLabel = currentRange ? formatDateRangeLabel(currentRange) : "All time";
  const compareRangeLabel = compareRange ? formatDateRangeLabel(compareRange) : "";

  const ordersQuery = useQuery({
    queryKey: ["admin-orders", businessId],
    queryFn: () => listAdminOrders(businessId!, { page: 1, limit: 100 }),
    enabled,
  });

  const servicesQuery = useQuery({
    queryKey: ["admin-orders-services", businessId],
    queryFn: () => listAdminServices(businessId!, { page: 1, limit: 100 }),
    enabled,
    retry: false,
  });

  const allOrders = ordersQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];
  const orderServices = services.filter((service) => service.type === "order");
  const currency = orderServices[0]?.currency || services[0]?.currency || "USD";

  const dateScopedOrders = useMemo(
    () =>
      currentRange
        ? allOrders.filter((order) => isInRange(order.created_at, currentRange))
        : allOrders,
    [allOrders, currentRange],
  );

  const compareOrders = useMemo(
    () =>
      compareRange
        ? allOrders.filter((order) => isInRange(order.created_at, compareRange))
        : [],
    [allOrders, compareRange],
  );

  const kpis = useMemo(() => {
    const newCount = dateScopedOrders.filter((o) => isNewRequestStatus(o.status)).length;
    const inProgressCount = dateScopedOrders.filter((o) =>
      isInProgressGroupStatus(o.status),
    ).length;
    const completedCount = dateScopedOrders.filter((o) => o.status === "completed").length;
    const cancelledDeclined = dateScopedOrders.filter((o) =>
      isCancelledGroupStatus(o.status),
    ).length;

    let estimatedCents = 0;
    for (const order of dateScopedOrders) {
      const service = findServiceByName(services, order.service_name);
      if (service?.price_cents != null) {
        estimatedCents += service.price_cents;
      }
    }

    let prevEstimated = 0;
    for (const order of compareOrders) {
      const service = findServiceByName(services, order.service_name);
      if (service?.price_cents != null) {
        prevEstimated += service.price_cents;
      }
    }

    return {
      newCount,
      inProgressCount,
      completedCount,
      cancelledDeclined,
      estimatedCents,
      trends: {
        new: percentChange(
          newCount,
          compareOrders.filter((o) => isNewRequestStatus(o.status)).length,
        ),
        inProgress: percentChange(
          inProgressCount,
          compareOrders.filter((o) => isInProgressGroupStatus(o.status)).length,
        ),
        completed: percentChange(
          completedCount,
          compareOrders.filter((o) => o.status === "completed").length,
        ),
        cancelled: percentChange(
          cancelledDeclined,
          compareOrders.filter((o) => isCancelledGroupStatus(o.status)).length,
        ),
        revenue: percentChange(estimatedCents, prevEstimated),
      },
    };
  }, [dateScopedOrders, compareOrders, services]);

  const tabCounts = useMemo(() => {
    const base = dateScopedOrders.filter((order) => {
      if (statusFilter !== "all" && order.status !== statusFilter) return false;
      if (serviceFilter !== "all" && order.service_name !== serviceFilter) return false;
      return matchesOrderSearch(order, search);
    });
    return {
      all: base.length,
      new: base.filter((o) => isNewRequestStatus(o.status)).length,
      in_progress: base.filter((o) => isInProgressGroupStatus(o.status)).length,
      completed: base.filter((o) => o.status === "completed").length,
      cancelled: base.filter((o) => isCancelledGroupStatus(o.status)).length,
    };
  }, [dateScopedOrders, statusFilter, serviceFilter, search]);

  const filteredOrders = useMemo(() => {
    return dateScopedOrders
      .filter((order) => {
        if (statusFilter !== "all" && order.status !== statusFilter) return false;
        if (serviceFilter !== "all" && order.service_name !== serviceFilter) return false;
        if (!matchesOrderTab(order.status, activeTab)) return false;
        return matchesOrderSearch(order, search);
      })
      .sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
  }, [dateScopedOrders, statusFilter, serviceFilter, activeTab, search]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedOrders = filteredOrders.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  const selectedOrder: AdminOrderListItem | undefined = allOrders.find(
    (order) => order.id === selectedOrderId,
  );

  function resetMessages() {
    setSuccessMessage(null);
    setActionError(null);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setServiceFilter("all");
    setDateRangeOption("all_time");
    setActiveTab("all");
    setPage(1);
    resetMessages();
  }

  function handleExport() {
    const rows: Array<Array<string | number>> = [
      [
        "reference",
        "customer_name",
        "email",
        "phone",
        "service",
        "requested_date",
        "status",
        "estimated_amount",
        "message_snippet",
        "review_request_state",
      ],
      ...filteredOrders.map((order) => {
        const service = findServiceByName(services, order.service_name);
        return [
          order.reference,
          order.client_name,
          order.client_email ?? "",
          order.client_phone ?? "",
          order.service_name,
          `${formatOrderDate(order.created_at)} ${formatOrderTime(order.created_at)}`,
          order.status,
          service?.price_cents != null
            ? formatMoney(service.price_cents, service.currency || currency)
            : "",
          "",
          consentLabel(order),
        ];
      }),
    ];
    downloadOrdersCsv(`service-platform-requests-${formatFileDate()}.csv`, rows);
  }

  const tabs: Array<{ id: OrderTabFilter; label: string; count: number; testId: string }> = [
    { id: "all", label: "All Requests", count: tabCounts.all, testId: "admin-orders-tab-all" },
    { id: "new", label: "New Requests", count: tabCounts.new, testId: "admin-orders-tab-new" },
    {
      id: "in_progress",
      label: "In Progress",
      count: tabCounts.in_progress,
      testId: "admin-orders-tab-in-progress",
    },
    {
      id: "completed",
      label: "Completed",
      count: tabCounts.completed,
      testId: "admin-orders-tab-completed",
    },
    {
      id: "cancelled",
      label: "Cancelled",
      count: tabCounts.cancelled,
      testId: "admin-orders-tab-cancelled",
    },
  ];

  return (
    <section className="w-full space-y-6 sm:space-y-7" data-testid="admin-orders-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Orders / Requests</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage all customer requests and orders in one place.
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
                setStatusFilter(event.target.value as OrderStatusFilter);
                setPage(1);
                setSelectedOrderId(null);
              }}
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-0 pl-3 pr-8 text-sm font-medium text-gray-700 shadow-sm"
              aria-label="Header status filter"
            >
              {ORDER_STATUS_SELECT_OPTIONS.map((option) => (
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
            data-testid="admin-orders-export"
          >
            <span aria-hidden="true">⬇</span>
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminAnalyticsKpiCard
          testId="admin-orders-kpi-new"
          label="New Requests"
          value={String(kpis.newCount)}
          trend={kpis.trends.new}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconFolder />}
          iconTone="bg-sky-50 text-sky-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-orders-kpi-in-progress"
          label="In Progress"
          value={String(kpis.inProgressCount)}
          trend={kpis.trends.inProgress}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconClock />}
          iconTone="bg-amber-50 text-amber-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-orders-kpi-completed"
          label="Completed"
          value={String(kpis.completedCount)}
          trend={kpis.trends.completed}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconDone />}
          iconTone="bg-emerald-50 text-emerald-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-orders-kpi-cancelled-declined"
          label="Cancelled / Declined"
          value={String(kpis.cancelledDeclined)}
          trend={kpis.trends.cancelled}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconCancel />}
          iconTone="bg-rose-50 text-rose-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-orders-kpi-estimated-revenue"
          label="Estimated Revenue"
          value={formatMoney(kpis.estimatedCents, currency)}
          trend={kpis.trends.revenue}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconCash />}
          iconTone="bg-violet-50 text-violet-600"
        />
      </div>

      <AdminOrderFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
          setSelectedOrderId(null);
        }}
        serviceFilter={serviceFilter}
        onServiceChange={(value) => {
          setServiceFilter(value);
          setPage(1);
        }}
        services={orderServices.map((service) => ({
          id: service.id,
          name: service.name,
        }))}
        dateRangeOption={dateRangeOption}
        onDateRangeChange={(value) => {
          setDateRangeOption(value);
          setPage(1);
        }}
        dateRange={currentRange}
        onClear={clearFilters}
      />

      <div
        className="flex gap-1 overflow-x-auto border-b border-gray-200"
        role="tablist"
        aria-label="Request status tabs"
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
              setSelectedOrderId(null);
            }}
            className={`relative inline-flex shrink-0 items-center gap-2 px-4 py-3 text-sm font-semibold ${
              activeTab === tab.id
                ? "text-emerald-700"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
            <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-700">
              {tab.count}
            </span>
            {activeTab === tab.id ? (
              <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-emerald-600" />
            ) : null}
          </button>
        ))}
      </div>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <div
        className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        data-testid="admin-orders-status-filters"
      >
        {ORDER_STATUS_CHIP_FILTERS.map((filter) => (
          <button
            key={filter.value}
            type="button"
            onClick={() => {
              setStatusFilter(filter.value);
              setPage(1);
              setSelectedOrderId(null);
              resetMessages();
            }}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
              statusFilter === filter.value
                ? "bg-emerald-600 text-white"
                : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {ordersQuery.isLoading ? <LoadingState message="Loading orders…" /> : null}
      {ordersQuery.isError ? (
        <ErrorState
          title="Could not load orders"
          message={getMeErrorMessage(ordersQuery.error, "Unable to load orders")}
        />
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError && filteredOrders.length === 0 ? (
        <EmptyState title="No orders match this filter" />
      ) : null}

      {!ordersQuery.isLoading && !ordersQuery.isError && filteredOrders.length > 0 ? (
        <div
          className={`grid grid-cols-1 items-start gap-5 ${
            selectedOrderId ? "xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]" : ""
          }`}
        >
          <div
            className="grid h-fit w-full min-w-0 grid-cols-1 self-start overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm"
            data-testid="admin-orders-list"
          >
            <div
              className="max-xl:overflow-x-auto xl:overflow-visible"
              data-testid="admin-orders-table"
            >
              <table className="w-full min-w-[920px] table-fixed divide-y divide-gray-100 text-left text-sm xl:min-w-0">
                <thead className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <tr>
                    <th className="w-[12%] px-4 py-3.5 font-semibold">Reference</th>
                    <th className="w-[22%] px-4 py-3.5 font-semibold">Customer</th>
                    <th className="w-[16%] px-4 py-3.5 font-semibold">Service</th>
                    <th className="w-[14%] px-4 py-3.5 font-semibold">Requested</th>
                    <th className="w-[12%] px-4 py-3.5 font-semibold">Status</th>
                    <th className="w-[12%] px-4 py-3.5 font-semibold">Est. Revenue</th>
                    <th className="w-[12%] px-4 py-3.5 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pagedOrders.map((order) => {
                    const service = findServiceByName(services, order.service_name);
                    const amount = formatMoney(
                      service?.price_cents,
                      service?.currency || currency,
                    );
                    const selected = selectedOrderId === order.id;

                    return (
                      <tr
                        key={order.id}
                        className={
                          selected ? "bg-emerald-50/40" : "bg-white hover:bg-gray-50/70"
                        }
                        data-testid="admin-order-card"
                      >
                        <td
                          className="px-4 py-4 align-middle"
                          data-testid="admin-order-row"
                        >
                          <p className="truncate font-mono text-sm font-semibold text-gray-900">
                            {order.reference}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <div className="flex items-center gap-3">
                            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                              {customerInitials(order.client_name) || "?"}
                            </span>
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-gray-900">
                                {order.client_name}
                              </p>
                              {order.client_email ? (
                                <p className="truncate text-xs text-gray-500">
                                  {order.client_email}
                                </p>
                              ) : null}
                              {order.client_phone ? (
                                <p className="truncate text-xs text-gray-500">
                                  {order.client_phone}
                                </p>
                              ) : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <p className="truncate font-medium text-gray-900">
                            {order.service_name}
                          </p>
                          {service?.type ? (
                            <p className="text-xs capitalize text-gray-500">{service.type}</p>
                          ) : null}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 align-middle">
                          <p className="font-medium text-gray-900">
                            {formatOrderDate(order.created_at)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {formatOrderTime(order.created_at)}
                          </p>
                        </td>
                        <td className="px-4 py-4 align-middle">
                          <StatusBadge status={order.status} kind="order" />
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 align-middle font-semibold text-gray-900">
                          {amount}
                        </td>
                        <td className="px-3 py-4 align-middle xl:px-4">
                          <AdminOrderRowActions
                            order={order}
                            businessId={businessId}
                            menuOpen={openMenuId === order.id}
                            onToggleMenu={() =>
                              setOpenMenuId((current) =>
                                current === order.id ? null : order.id,
                              )
                            }
                            onCloseMenu={() => setOpenMenuId(null)}
                            onView={() => {
                              setSelectedOrderId(order.id);
                              resetMessages();
                              setOpenMenuId(null);
                            }}
                            onReviewSent={setSuccessMessage}
                            onReviewError={setActionError}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <AdminOrderPagination
              page={safePage}
              pageSize={pageSize}
              total={filteredOrders.length}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          </div>

          {selectedOrderId && businessId ? (
            <div className="w-full min-w-0 self-start xl:w-[360px] xl:max-w-[360px] 2xl:w-[380px] 2xl:max-w-[380px]">
              <AdminOrderDetailPanel
                businessId={businessId}
                orderId={selectedOrderId}
                canReview={selectedOrder?.can_review ?? false}
                hasReview={selectedOrder?.has_review ?? false}
                onClose={() => setSelectedOrderId(null)}
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
