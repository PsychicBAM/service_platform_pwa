import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { listAdminBookings } from "@/api/adminApi";
import { AdminBookingDetailPanel } from "@/components/admin/AdminBookingDetailPanel";
import { AdminReviewLinkAction } from "@/components/admin/AdminReviewLinkAction";
import { AdminReviewRequestEmailAction } from "@/components/admin/AdminReviewRequestEmailAction";
import { AdminWaitlistView } from "@/components/admin/AdminWaitlistView";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type { BookingStatus } from "@/types/api";
import { getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

type MainTab = "bookings" | "waitlist";
type StatusFilter = "all" | BookingStatus;

const BOOKING_FILTERS: Array<{ value: StatusFilter; label: string }> = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "completed", label: "Completed" },
  { value: "cancelled", label: "Cancelled" },
  { value: "no_show", label: "No-show" },
];

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
      className={`shrink-0 rounded-full px-3 py-1.5 text-sm font-medium ${
        active
          ? "bg-brand-600 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function MainTabButton({
  active,
  label,
  onClick,
  testId,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`min-h-11 flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold sm:min-h-0 sm:flex-none sm:py-2 ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export function AdminBookingsPage() {
  const { businessId } = useAdminBusiness();
  const [searchParams, setSearchParams] = useSearchParams();
  const mainTab: MainTab = searchParams.get("tab") === "waitlist" ? "waitlist" : "bookings";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-bookings", businessId, statusFilter],
    queryFn: () =>
      listAdminBookings(
        businessId!,
        statusFilter === "all" ? undefined : { status: statusFilter },
      ),
    enabled: Boolean(businessId) && mainTab === "bookings",
  });

  function setMainTab(tab: MainTab) {
    if (tab === "waitlist") {
      setSearchParams({ tab: "waitlist" });
    } else {
      setSearchParams({});
    }
    setSelectedBookingId(null);
    setSuccessMessage(null);
    setActionError(null);
  }

  return (
    <section className="space-y-4" data-testid="admin-bookings-page">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Bookings</h2>
        <p className="mt-0.5 text-sm text-slate-600">
          Review appointments, update status, and manage the waitlist.
        </p>
      </div>

      <div
        className="flex gap-2"
        data-testid="admin-bookings-main-tabs"
        role="tablist"
        aria-label="Bookings sections"
      >
        <MainTabButton
          active={mainTab === "bookings"}
          label="Bookings"
          testId="admin-bookings-tab-bookings"
          onClick={() => setMainTab("bookings")}
        />
        <MainTabButton
          active={mainTab === "waitlist"}
          label="Waitlist"
          testId="admin-bookings-tab-waitlist"
          onClick={() => setMainTab("waitlist")}
        />
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
            {BOOKING_FILTERS.map((filter) => (
              <FilterButton
                key={filter.value}
                active={statusFilter === filter.value}
                label={filter.label}
                onClick={() => {
                  setStatusFilter(filter.value);
                  setSelectedBookingId(null);
                  setSuccessMessage(null);
                  setActionError(null);
                }}
              />
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

          {isLoading ? <LoadingState message="Loading bookings…" /> : null}
          {isError ? (
            <ErrorState
              title="Could not load bookings"
              message={getMeErrorMessage(error, "Unable to load bookings")}
            />
          ) : null}

          {!isLoading && !isError && data?.data.length === 0 ? (
            <EmptyState title="No bookings match this filter" />
          ) : null}

          {!isLoading && !isError && data ? (
            <div
              className="grid grid-cols-1 items-stretch gap-3 lg:grid-cols-2"
              data-testid="admin-bookings-list"
            >
              {data.data.map((booking) => {
                const contact = [booking.client_email, booking.client_phone]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <article
                    key={booking.id}
                    className={`flex h-full flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${
                      selectedBookingId === booking.id
                        ? "border-brand-400 ring-1 ring-brand-200"
                        : "border-slate-200"
                    }`}
                    data-testid="admin-booking-card"
                  >
                    <div className="flex flex-1 flex-col gap-2 p-3 sm:p-4">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="truncate font-mono text-sm font-semibold text-slate-900">
                          {booking.reference}
                        </p>
                        <StatusBadge status={booking.status} kind="booking" />
                      </div>
                      <p className="truncate text-sm font-medium text-slate-800">
                        {booking.service_name}
                      </p>
                      <p className="truncate text-sm text-slate-600">{booking.client_name}</p>
                      {contact ? (
                        <p className="truncate text-xs text-slate-500">{contact}</p>
                      ) : null}
                      <p className="mt-auto text-sm text-slate-500">
                        {formatDateTimeLabel(booking.starts_at)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-3 sm:px-4 sm:py-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedBookingId(booking.id);
                          setSuccessMessage(null);
                          setActionError(null);
                        }}
                        className="min-h-10 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:min-h-0 sm:flex-none sm:py-1.5"
                        data-testid={`admin-booking-view-${booking.id}`}
                      >
                        View details
                      </button>
                      {businessId ? (
                        <>
                          <AdminReviewLinkAction
                            businessId={businessId}
                            bookingId={booking.id}
                            canReview={booking.can_review}
                            hasReview={booking.has_review}
                            onCopied={setSuccessMessage}
                            onError={setActionError}
                          />
                          <AdminReviewRequestEmailAction
                            businessId={businessId}
                            bookingId={booking.id}
                            canReview={booking.can_review}
                            hasReview={booking.has_review}
                            followUpEmailConsent={booking.follow_up_email_consent}
                            clientEmail={booking.client_email}
                            onSent={setSuccessMessage}
                            onError={setActionError}
                          />
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
