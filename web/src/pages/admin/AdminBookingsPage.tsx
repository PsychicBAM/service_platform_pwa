import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  cancelAdminBooking,
  listAdminBookings,
  listAdminServices,
  listWaitlistEntries,
  updateAdminBooking,
} from "@/api/adminApi";
import { AdminAnalyticsKpiCard } from "@/components/admin/analytics/AdminAnalyticsKpiCard";
import { AdminBookingDetailPanel } from "@/components/admin/AdminBookingDetailPanel";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminWaitlistView } from "@/components/admin/AdminWaitlistView";
import { AdminBookingFilters } from "@/components/admin/bookings/AdminBookingFilters";
import { AdminBookingPagination } from "@/components/admin/bookings/AdminBookingPagination";
import { AdminBookingRowActions } from "@/components/admin/bookings/AdminBookingRowActions";
import {
  BOOKING_STATUS_CHIP_FILTERS,
  BOOKING_STATUS_SELECT_OPTIONS,
  DATE_RANGE_OPTIONS,
  countByStatus,
  customerInitials,
  downloadBookingsCsv,
  findServiceByName,
  formatBookingDate,
  formatBookingTime,
  formatDateRangeLabel,
  formatDurationMinutes,
  formatFileDate,
  formatMoney,
  getCompareRange,
  getDateRange,
  isInRange,
  matchesBookingSearch,
  percentChange,
  serviceThumbUrl,
  type BookingStatusFilter,
  type DateRangeOption,
} from "@/components/admin/bookings/bookingHelpers";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type { AdminBookingListItem } from "@/types/api";
import { getAdminBookingErrorMessage, getMeErrorMessage } from "@/utils/errors";

type MainTab = "bookings" | "waitlist";

type PendingRowAction =
  | {
      kind: "confirm" | "complete";
      booking: AdminBookingListItem;
      title: string;
      description: string;
      confirmLabel: string;
      successMessage: string;
      status: "confirmed" | "completed";
      variant: "success";
    }
  | {
      kind: "cancel";
      booking: AdminBookingListItem;
      title: string;
      description: string;
      confirmLabel: string;
      successMessage: string;
      variant: "danger";
    };

function IconCalendar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M7 2h2v2h6V2h2v2h3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h3V2Zm13 8H4v10h16V10Z" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M9.5 16.2 5.3 12l1.4-1.4 2.8 2.8 7.8-7.8L18.7 7l-9.2 9.2Z" />
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
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.25" />
      <path d="m8.2 12.2 2.4 2.4 5.2-5.2" />
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

function IconReschedule() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
      <path d="M8 3.5v3.5M16 3.5v3.5M3.5 10h17" />
      <path d="M14.2 14.2a2.6 2.6 0 1 0-.35 1.55" />
      <path d="m15.5 12.8 1 2 2 .15" />
    </svg>
  );
}

function consentLabel(booking: AdminBookingListItem): string {
  if (booking.has_review) {
    return "reviewed";
  }
  if (booking.review_request_email_sent_at) {
    return "review_request_sent";
  }
  if (!booking.follow_up_email_consent) {
    return "no_consent";
  }
  if (!booking.client_email) {
    return "no_email";
  }
  if (booking.can_review) {
    return "eligible";
  }
  return "not_eligible";
}

export function AdminBookingsPage() {
  const { businessId } = useAdminBusiness();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const mainTab: MainTab = searchParams.get("tab") === "waitlist" ? "waitlist" : "bookings";

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<BookingStatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("all_time");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(8);
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingRowAction | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const enabled = Boolean(businessId);
  const currentRange = useMemo(() => getDateRange(dateRangeOption), [dateRangeOption]);
  const compareRange = useMemo(
    () => (currentRange ? getCompareRange("previous_period", currentRange) : null),
    [currentRange],
  );
  const dateRangeLabel = currentRange ? formatDateRangeLabel(currentRange) : "All time";
  const compareRangeLabel = compareRange ? formatDateRangeLabel(compareRange) : "";

  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings", businessId],
    queryFn: () => listAdminBookings(businessId!, { page: 1, limit: 100 }),
    enabled,
  });

  const servicesQuery = useQuery({
    queryKey: ["admin-bookings-services", businessId],
    queryFn: () => listAdminServices(businessId!, { page: 1, limit: 100 }),
    enabled,
    retry: false,
  });

  const waitlistQuery = useQuery({
    queryKey: ["admin-waitlist", businessId, "all"],
    queryFn: () => listWaitlistEntries(businessId!),
    enabled,
    retry: false,
  });

  const updateMutation = useMutation({
    mutationFn: ({
      bookingId,
      status,
    }: {
      bookingId: string;
      status: "confirmed" | "completed";
    }) => updateAdminBooking(businessId!, bookingId, { status }),
    onSuccess: async (_data, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings", businessId] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-booking", businessId, variables.bookingId],
      });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => cancelAdminBooking(businessId!, bookingId, {}),
    onSuccess: async (_data, bookingId) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-bookings", businessId] });
      await queryClient.invalidateQueries({
        queryKey: ["admin-booking", businessId, bookingId],
      });
    },
  });

  const allBookings = bookingsQuery.data?.data ?? [];
  const services = servicesQuery.data?.data ?? [];
  const waitlistCount = waitlistQuery.data?.data?.length ?? 0;
  const currency = services[0]?.currency || "AED";

  const dateScopedBookings = useMemo(
    () =>
      currentRange
        ? allBookings.filter((booking) => isInRange(booking.starts_at, currentRange))
        : allBookings,
    [allBookings, currentRange],
  );

  const compareBookings = useMemo(
    () =>
      compareRange
        ? allBookings.filter((booking) => isInRange(booking.starts_at, compareRange))
        : [],
    [allBookings, compareRange],
  );

  const kpis = useMemo(() => {
    const all = dateScopedBookings.length;
    const confirmed = countByStatus(dateScopedBookings, "confirmed");
    const completed = countByStatus(dateScopedBookings, "completed");
    const cancelled = countByStatus(dateScopedBookings, "cancelled");
    const rescheduled = 0;

    const prevAll = compareBookings.length;
    const prevConfirmed = countByStatus(compareBookings, "confirmed");
    const prevCompleted = countByStatus(compareBookings, "completed");
    const prevCancelled = countByStatus(compareBookings, "cancelled");

    return {
      all,
      confirmed,
      completed,
      cancelled,
      rescheduled,
      trends: {
        all: percentChange(all, prevAll),
        confirmed: percentChange(confirmed, prevConfirmed),
        completed: percentChange(completed, prevCompleted),
        cancelled: percentChange(cancelled, prevCancelled),
        rescheduled: null as string | null,
      },
    };
  }, [dateScopedBookings, compareBookings]);

  const filteredBookings = useMemo(() => {
    return dateScopedBookings
      .filter((booking) => {
        if (statusFilter !== "all" && booking.status !== statusFilter) {
          return false;
        }
        if (serviceFilter !== "all" && booking.service_name !== serviceFilter) {
          return false;
        }
        return matchesBookingSearch(booking, search);
      })
      .sort(
        (a, b) => new Date(b.starts_at).getTime() - new Date(a.starts_at).getTime(),
      );
  }, [dateScopedBookings, statusFilter, serviceFilter, search]);

  const totalPages = Math.max(1, Math.ceil(filteredBookings.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedBookings = filteredBookings.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize,
  );

  function setMainTab(tab: MainTab) {
    if (tab === "waitlist") {
      setSearchParams({ tab: "waitlist" });
    } else {
      setSearchParams({});
    }
    setSelectedBookingId(null);
    setSuccessMessage(null);
    setActionError(null);
    setOpenMenuId(null);
  }

  function resetMessages() {
    setSuccessMessage(null);
    setActionError(null);
  }

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setServiceFilter("all");
    setDateRangeOption("all_time");
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
        "date",
        "time",
        "status",
        "amount",
        "consent_review_state",
      ],
      ...filteredBookings.map((booking) => {
        const service = findServiceByName(services, booking.service_name);
        return [
          booking.reference,
          booking.client_name,
          booking.client_email ?? "",
          booking.client_phone ?? "",
          booking.service_name,
          formatBookingDate(booking.starts_at),
          formatBookingTime(booking.starts_at),
          booking.status,
          service?.price_cents != null
            ? formatMoney(service.price_cents, service.currency || currency)
            : "",
          consentLabel(booking),
        ];
      }),
    ];
    downloadBookingsCsv(`service-platform-bookings-${formatFileDate()}.csv`, rows);
  }

  async function confirmPendingAction() {
    if (!pendingAction || !businessId) {
      return;
    }
    try {
      if (pendingAction.kind === "cancel") {
        await cancelMutation.mutateAsync(pendingAction.booking.id);
      } else {
        await updateMutation.mutateAsync({
          bookingId: pendingAction.booking.id,
          status: pendingAction.status,
        });
      }
      setSuccessMessage(pendingAction.successMessage);
      setActionError(null);
      setPendingAction(null);
    } catch (error) {
      setActionError(
        getAdminBookingErrorMessage(error, "Could not update booking."),
      );
      setSuccessMessage(null);
      setPendingAction(null);
    }
  }

  const acting = updateMutation.isPending || cancelMutation.isPending;
  const bookingServices = services.filter((service) => service.type === "booking");

  return (
    <section className="w-full space-y-6" data-testid="admin-bookings-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Bookings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and track all your bookings in one place.
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
                setStatusFilter(event.target.value as BookingStatusFilter);
                setPage(1);
                setSelectedBookingId(null);
              }}
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-0 pl-3 pr-8 text-sm font-medium text-gray-700 shadow-sm"
              aria-label="Header status filter"
            >
              {BOOKING_STATUS_SELECT_OPTIONS.map((option) => (
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
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-brand-600 bg-white px-4 text-sm font-semibold text-brand-700 shadow-sm hover:bg-brand-50"
            data-testid="admin-bookings-export"
          >
            <span aria-hidden="true">⤴</span>
            Export
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminAnalyticsKpiCard
          testId="admin-bookings-kpi-all"
          label="All Bookings"
          value={String(kpis.all)}
          trend={kpis.trends.all}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconCalendar />}
          iconTone="bg-blue-50 text-blue-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-bookings-kpi-confirmed"
          label="Confirmed"
          value={String(kpis.confirmed)}
          trend={kpis.trends.confirmed}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconCheck />}
          iconTone="bg-teal-50 text-teal-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-bookings-kpi-completed"
          label="Completed"
          value={String(kpis.completed)}
          trend={kpis.trends.completed}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconDone />}
          iconTone="bg-emerald-50 text-emerald-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-bookings-kpi-cancelled"
          label="Cancelled"
          value={String(kpis.cancelled)}
          trend={kpis.trends.cancelled}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconCancel />}
          iconTone="bg-rose-50 text-rose-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-bookings-kpi-rescheduled"
          label="Rescheduled"
          value={String(kpis.rescheduled)}
          trend={kpis.trends.rescheduled}
          compareText="Not tracked yet"
          icon={<IconReschedule />}
          iconTone="bg-indigo-50 text-indigo-600"
        />
      </div>

      <AdminBookingFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
          setSelectedBookingId(null);
        }}
        serviceFilter={serviceFilter}
        onServiceChange={(value) => {
          setServiceFilter(value);
          setPage(1);
        }}
        services={bookingServices.map((service) => ({
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
        className="flex gap-1 border-b border-gray-200"
        data-testid="admin-bookings-main-tabs"
        role="tablist"
        aria-label="Bookings sections"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "bookings"}
          onClick={() => setMainTab("bookings")}
          data-testid="admin-bookings-tab-bookings"
          className={`relative px-4 py-3 text-sm font-semibold ${
            mainTab === "bookings"
              ? "text-brand-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Bookings
          {mainTab === "bookings" ? (
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-600" />
          ) : null}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mainTab === "waitlist"}
          onClick={() => setMainTab("waitlist")}
          data-testid="admin-bookings-tab-waitlist"
          className={`relative inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold ${
            mainTab === "waitlist"
              ? "text-brand-700"
              : "text-gray-500 hover:text-gray-700"
          }`}
        >
          Waitlist
          <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-gray-200 px-1.5 py-0.5 text-xs font-semibold text-gray-700">
            {waitlistCount}
          </span>
          {mainTab === "waitlist" ? (
            <span className="absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-brand-600" />
          ) : null}
        </button>
      </div>

      {mainTab === "waitlist" && businessId ? (
        <AdminWaitlistView businessId={businessId} />
      ) : null}

      {mainTab === "bookings" ? (
        <>
          {successMessage ? (
            <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {successMessage}
            </p>
          ) : null}

          {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

          <div
            className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            data-testid="admin-bookings-status-filters"
          >
            {BOOKING_STATUS_CHIP_FILTERS.map((filter) => (
              <button
                key={filter.value}
                type="button"
                onClick={() => {
                  setStatusFilter(filter.value);
                  setPage(1);
                  setSelectedBookingId(null);
                  resetMessages();
                }}
                className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
                  statusFilter === filter.value
                    ? "bg-brand-600 text-white"
                    : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          {selectedBookingId && businessId ? (
            <AdminBookingDetailPanel
              businessId={businessId}
              bookingId={selectedBookingId}
              onClose={() => setSelectedBookingId(null)}
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

          {bookingsQuery.isLoading ? <LoadingState message="Loading bookings…" /> : null}
          {bookingsQuery.isError ? (
            <ErrorState
              title="Could not load bookings"
              message={getMeErrorMessage(bookingsQuery.error, "Unable to load bookings")}
            />
          ) : null}

          {!bookingsQuery.isLoading && !bookingsQuery.isError && filteredBookings.length === 0 ? (
            <EmptyState title="No bookings match this filter" />
          ) : null}

          {!bookingsQuery.isLoading && !bookingsQuery.isError && filteredBookings.length > 0 ? (
            <div
              className="grid grid-cols-1 overflow-visible rounded-xl border border-gray-200 bg-white shadow-sm"
              data-testid="admin-bookings-list"
            >
              <div
                className="max-lg:overflow-x-auto lg:overflow-visible"
                data-testid="admin-bookings-table"
              >
                <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                  <thead className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Reference</th>
                      <th className="px-4 py-3 font-semibold">Customer</th>
                      <th className="px-4 py-3 font-semibold">Service</th>
                      <th className="whitespace-nowrap px-4 py-3 font-semibold">Date &amp; Time</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="w-[120px] px-4 py-3 font-semibold">Amount</th>
                      <th className="min-w-[240px] px-4 py-3 text-right font-semibold">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedBookings.map((booking) => {
                      const service = findServiceByName(services, booking.service_name);
                      const thumb = serviceThumbUrl(service);
                      const duration = formatDurationMinutes(
                        service?.duration_minutes ??
                          Math.round(
                            (new Date(booking.ends_at).getTime() -
                              new Date(booking.starts_at).getTime()) /
                              60000,
                          ),
                      );
                      const amount = formatMoney(
                        service?.price_cents,
                        service?.currency || currency,
                      );
                      const selected = selectedBookingId === booking.id;

                      return (
                        <tr
                          key={booking.id}
                          className={selected ? "bg-brand-50/40" : "bg-white hover:bg-gray-50/70"}
                          data-testid="admin-booking-card"
                        >
                          <td
                            className="px-4 py-4 align-middle"
                            data-testid="admin-booking-row"
                          >
                            <p className="font-mono text-sm font-semibold text-gray-900">
                              {booking.reference}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-semibold text-brand-700">
                                {customerInitials(booking.client_name) || "?"}
                              </span>
                              <div className="min-w-0">
                                <p className="truncate font-semibold text-gray-900">
                                  {booking.client_name}
                                </p>
                                {booking.client_email ? (
                                  <p className="truncate text-xs text-gray-500">
                                    {booking.client_email}
                                  </p>
                                ) : null}
                                {booking.client_phone ? (
                                  <p className="truncate text-xs text-gray-500">
                                    {booking.client_phone}
                                  </p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <div className="flex items-center gap-3">
                              {thumb ? (
                                <img
                                  src={thumb}
                                  alt=""
                                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                                />
                              ) : (
                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-400">
                                  <IconCalendar />
                                </span>
                              )}
                              <div className="min-w-0">
                                <p className="truncate font-medium text-gray-900">
                                  {booking.service_name}
                                </p>
                                {duration ? (
                                  <p className="text-xs text-gray-500">{duration}</p>
                                ) : null}
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 align-middle">
                            <p className="font-medium text-gray-900">
                              {formatBookingDate(booking.starts_at)}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatBookingTime(booking.starts_at)}
                            </p>
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <StatusBadge status={booking.status} kind="booking" />
                          </td>
                          <td className="w-[120px] whitespace-nowrap px-4 py-4 align-middle font-semibold text-gray-900">
                            {amount}
                          </td>
                          <td className="px-4 py-4 align-middle">
                            <AdminBookingRowActions
                              booking={booking}
                              businessId={businessId}
                              menuOpen={openMenuId === booking.id}
                              onToggleMenu={() =>
                                setOpenMenuId((current) =>
                                  current === booking.id ? null : booking.id,
                                )
                              }
                              onCloseMenu={() => setOpenMenuId(null)}
                              onView={() => {
                                setSelectedBookingId(booking.id);
                                resetMessages();
                                setOpenMenuId(null);
                              }}
                              onRequestAction={(kind) => {
                                if (kind === "confirm") {
                                  setPendingAction({
                                    kind: "confirm",
                                    booking,
                                    status: "confirmed",
                                    title: "Confirm booking?",
                                    description: "This booking will be marked as confirmed.",
                                    confirmLabel: "Confirm booking",
                                    successMessage: "Booking confirmed.",
                                    variant: "success",
                                  });
                                  return;
                                }
                                if (kind === "complete") {
                                  setPendingAction({
                                    kind: "complete",
                                    booking,
                                    status: "completed",
                                    title: "Mark booking as completed?",
                                    description: "This will mark the booking as completed.",
                                    confirmLabel: "Mark completed",
                                    successMessage: "Booking completed.",
                                    variant: "success",
                                  });
                                  return;
                                }
                                setPendingAction({
                                  kind: "cancel",
                                  booking,
                                  title: "Cancel booking?",
                                  description:
                                    "This booking will be marked as cancelled. The time slot may become available again.",
                                  confirmLabel: "Cancel booking",
                                  successMessage: "Booking cancelled.",
                                  variant: "danger",
                                });
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

              <AdminBookingPagination
                page={safePage}
                pageSize={pageSize}
                total={filteredBookings.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          ) : null}
        </>
      ) : null}

      <AdminConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction?.title ?? ""}
        description={pendingAction?.description ?? ""}
        confirmLabel={pendingAction?.confirmLabel ?? "Confirm"}
        variant={pendingAction?.variant ?? "default"}
        isLoading={acting}
        onCancel={() => {
          if (!acting) {
            setPendingAction(null);
          }
        }}
        onConfirm={() => void confirmPendingAction()}
      />
    </section>
  );
}
