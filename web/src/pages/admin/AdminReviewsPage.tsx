import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listAdminReviews, updateAdminReviewStatus } from "@/api/adminApi";
import { AdminAnalyticsKpiCard } from "@/components/admin/analytics/AdminAnalyticsKpiCard";
import { AdminReviewDetailPanel } from "@/components/admin/reviews/AdminReviewDetailPanel";
import { AdminReviewFilters } from "@/components/admin/reviews/AdminReviewFilters";
import { AdminReviewPagination } from "@/components/admin/reviews/AdminReviewPagination";
import { AdminReviewRowActions } from "@/components/admin/reviews/AdminReviewRowActions";
import { ReviewStarRating } from "@/components/admin/reviews/ReviewStarRating";
import {
  DATE_RANGE_OPTIONS,
  REVIEW_STATUS_SELECT_OPTIONS,
  averageRating,
  averageRatingTrend,
  customerInitials,
  downloadReviewsCsv,
  formatAverageRating,
  formatDateRangeLabel,
  formatFileDate,
  formatReviewDate,
  formatReviewTime,
  getCompareRange,
  getDateRange,
  isInRange,
  matchesReviewSearch,
  matchesReviewTab,
  percentChange,
  reviewSource,
  reviewSourceLabel,
  snippetText,
  type DateRangeOption,
  type ReviewRatingFilter,
  type ReviewSourceFilter,
  type ReviewStatusFilter,
  type ReviewTabFilter,
} from "@/components/admin/reviews/reviewHelpers";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatusBadge } from "@/components/StatusBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type { ReviewRead, ReviewStatus } from "@/types/api";
import { getAdminServiceErrorMessage, getMeErrorMessage } from "@/utils/errors";

function IconStar() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8 6.8 19.6l1-5.8-4.3-4.1 5.9-.9L12 3.5Z" />
    </svg>
  );
}

function IconChat() {
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
        d="M5 6.5h14v9H10l-3.5 2.5V15.5H5v-9Z"
        strokeLinejoin="round"
      />
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

function IconHidden() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M3 12s3.5-6 9-6 9 6 9 6-3.5 6-9 6-9-6-9-6Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="m4 20 16-16" strokeLinecap="round" />
    </svg>
  );
}

function IconPending() {
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

export function AdminReviewsPage() {
  const { businessId } = useAdminBusiness();
  const queryClient = useQueryClient();
  const enabled = Boolean(businessId);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReviewStatusFilter>("all");
  const [ratingFilter, setRatingFilter] = useState<ReviewRatingFilter>("all");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState<ReviewSourceFilter>("all");
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("all_time");
  const [activeTab, setActiveTab] = useState<ReviewTabFilter>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const currentRange = useMemo(() => getDateRange(dateRangeOption), [dateRangeOption]);
  const compareRange = useMemo(
    () => (currentRange ? getCompareRange("previous_period", currentRange) : null),
    [currentRange],
  );
  const dateRangeLabel = currentRange ? formatDateRangeLabel(currentRange) : "All time";
  const compareRangeLabel = compareRange ? formatDateRangeLabel(compareRange) : "";

  const reviewsQuery = useQuery({
    queryKey: ["admin-reviews", businessId],
    queryFn: () => listAdminReviews(businessId!),
    enabled,
  });

  const updateMutation = useMutation({
    mutationFn: ({ reviewId, status }: { reviewId: string; status: ReviewStatus }) =>
      updateAdminReviewStatus(businessId!, reviewId, status),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-reviews", businessId] });
      setActionError(null);
    },
    onError: (err) => {
      setActionError(getAdminServiceErrorMessage(err, "Could not update review."));
    },
  });

  const allReviews = reviewsQuery.data ?? [];

  const dateScopedReviews = useMemo(
    () =>
      currentRange
        ? allReviews.filter((review) => isInRange(review.created_at, currentRange))
        : allReviews,
    [allReviews, currentRange],
  );

  const compareReviews = useMemo(
    () =>
      compareRange
        ? allReviews.filter((review) => isInRange(review.created_at, compareRange))
        : [],
    [allReviews, compareRange],
  );

  const serviceOptions = useMemo(() => {
    const names = new Set<string>();
    for (const review of allReviews) {
      if (review.service_name?.trim()) {
        names.add(review.service_name.trim());
      }
    }
    return Array.from(names).sort((a, b) => a.localeCompare(b));
  }, [allReviews]);

  const kpis = useMemo(() => {
    const published = dateScopedReviews.filter((r) => r.status === "published").length;
    const hidden = dateScopedReviews.filter((r) => r.status === "hidden").length;
    const total = dateScopedReviews.length;
    const avg = averageRating(dateScopedReviews);

    const prevPublished = compareReviews.filter((r) => r.status === "published").length;
    const prevHidden = compareReviews.filter((r) => r.status === "hidden").length;
    const prevTotal = compareReviews.length;
    const prevAvg = averageRating(compareReviews);

    return {
      average: avg,
      total,
      published,
      hidden,
      pending: 0,
      trends: {
        average: averageRatingTrend(avg, prevAvg),
        total: percentChange(total, prevTotal),
        published: percentChange(published, prevPublished),
        hidden: percentChange(hidden, prevHidden),
        pending: "→ 0%",
      },
    };
  }, [compareReviews, dateScopedReviews]);

  const tabCounts = useMemo(() => {
    const base = dateScopedReviews.filter((review) => {
      if (ratingFilter !== "all" && String(review.rating) !== ratingFilter) return false;
      if (serviceFilter !== "all" && review.service_name !== serviceFilter) return false;
      if (sourceFilter !== "all" && reviewSource(review) !== sourceFilter) return false;
      if (!matchesReviewSearch(review, search)) return false;
      return true;
    });
    return {
      all: base.length,
      published: base.filter((r) => r.status === "published").length,
      hidden: base.filter((r) => r.status === "hidden").length,
    };
  }, [dateScopedReviews, ratingFilter, search, serviceFilter, sourceFilter]);

  const filteredReviews = useMemo(() => {
    return dateScopedReviews.filter((review) => {
      if (!matchesReviewTab(review.status, activeTab)) return false;
      if (statusFilter !== "all" && review.status !== statusFilter) return false;
      if (ratingFilter !== "all" && String(review.rating) !== ratingFilter) return false;
      if (serviceFilter !== "all" && review.service_name !== serviceFilter) return false;
      if (sourceFilter !== "all" && reviewSource(review) !== sourceFilter) return false;
      if (!matchesReviewSearch(review, search)) return false;
      return true;
    });
  }, [
    activeTab,
    dateScopedReviews,
    ratingFilter,
    search,
    serviceFilter,
    sourceFilter,
    statusFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedReviews = filteredReviews.slice((safePage - 1) * pageSize, safePage * pageSize);

  const selectedReview: ReviewRead | undefined = allReviews.find(
    (review) => review.id === selectedReviewId,
  );

  useEffect(() => {
    if (panelDismissed) return;
    if (selectedReviewId) {
      const stillExists = allReviews.some((review) => review.id === selectedReviewId);
      if (!stillExists) {
        setSelectedReviewId(filteredReviews[0]?.id ?? allReviews[0]?.id ?? null);
      }
      return;
    }
    const firstId = filteredReviews[0]?.id ?? allReviews[0]?.id ?? null;
    if (firstId) {
      setSelectedReviewId(firstId);
    }
  }, [allReviews, filteredReviews, panelDismissed, selectedReviewId]);

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setRatingFilter("all");
    setServiceFilter("all");
    setSourceFilter("all");
    setDateRangeOption("all_time");
    setActiveTab("all");
    setPage(1);
    setActionError(null);
  }

  function handleExport() {
    const rows: Array<Array<string | number>> = [
      [
        "review_id",
        "customer_name",
        "email",
        "phone",
        "service",
        "rating",
        "status",
        "date",
        "source",
        "review_text",
      ],
      ...filteredReviews.map((review) => [
        review.id,
        review.customer_name,
        "",
        "",
        review.service_name ?? "",
        review.rating,
        review.status,
        `${formatReviewDate(review.created_at)} ${formatReviewTime(review.created_at)}`,
        reviewSourceLabel(review),
        review.comment ?? "",
      ]),
    ];
    downloadReviewsCsv(`service-platform-reviews-${formatFileDate()}.csv`, rows);
  }

  function requestStatusChange(review: ReviewRead, status: ReviewStatus) {
    updateMutation.mutate({ reviewId: review.id, status });
  }

  const tabs: Array<{ id: ReviewTabFilter; label: string; count: number; testId: string }> = [
    { id: "all", label: "All Reviews", count: tabCounts.all, testId: "admin-reviews-tab-all" },
    {
      id: "published",
      label: "Published",
      count: tabCounts.published,
      testId: "admin-reviews-tab-published",
    },
    {
      id: "hidden",
      label: "Hidden",
      count: tabCounts.hidden,
      testId: "admin-reviews-tab-hidden",
    },
  ];

  const acting = updateMutation.isPending;

  return (
    <section className="w-full space-y-6 sm:space-y-7" data-testid="admin-reviews-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Reviews</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage and moderate customer reviews and feedback.
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
              data-testid="admin-reviews-date-range"
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
                setStatusFilter(event.target.value as ReviewStatusFilter);
                setPage(1);
                setSelectedReviewId(null);
              }}
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-0 pl-3 pr-8 text-sm font-medium text-gray-700 shadow-sm"
              aria-label="Header status filter"
              data-testid="admin-reviews-header-status"
            >
              {REVIEW_STATUS_SELECT_OPTIONS.map((option) => (
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
            data-testid="admin-reviews-export"
          >
            <span aria-hidden="true">⬇</span>
            Export CSV
          </button>
        </div>
      </div>

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <AdminAnalyticsKpiCard
          testId="admin-reviews-kpi-average-rating"
          label="Average Rating"
          value={formatAverageRating(kpis.average)}
          trend={kpis.trends.average}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconStar />}
          iconTone="bg-amber-50 text-amber-500"
          footer={
            <div className="mt-1.5">
              <ReviewStarRating rating={kpis.average ?? 0} />
            </div>
          }
        />
        <AdminAnalyticsKpiCard
          testId="admin-reviews-kpi-total"
          label="Total Reviews"
          value={String(kpis.total)}
          trend={kpis.trends.total}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconChat />}
          iconTone="bg-sky-50 text-sky-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-reviews-kpi-published"
          label="Published"
          value={String(kpis.published)}
          trend={kpis.trends.published}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconDone />}
          iconTone="bg-emerald-50 text-emerald-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-reviews-kpi-hidden"
          label="Hidden"
          value={String(kpis.hidden)}
          trend={kpis.trends.hidden}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconHidden />}
          iconTone="bg-rose-50 text-rose-600"
        />
        <AdminAnalyticsKpiCard
          testId="admin-reviews-kpi-pending"
          label="Pending"
          value={String(kpis.pending)}
          trend={kpis.trends.pending}
          compareText="Not used in current workflow"
          icon={<IconPending />}
          iconTone="bg-violet-50 text-violet-600"
        />
      </div>

      <AdminReviewFilters
        search={search}
        onSearchChange={(value) => {
          setSearch(value);
          setPage(1);
        }}
        ratingFilter={ratingFilter}
        onRatingChange={(value) => {
          setRatingFilter(value);
          setPage(1);
        }}
        serviceFilter={serviceFilter}
        onServiceChange={(value) => {
          setServiceFilter(value);
          setPage(1);
        }}
        services={serviceOptions}
        sourceFilter={sourceFilter}
        onSourceChange={(value) => {
          setSourceFilter(value);
          setPage(1);
        }}
        statusFilter={statusFilter}
        onStatusChange={(value) => {
          setStatusFilter(value);
          setPage(1);
          setSelectedReviewId(null);
        }}
        onClear={clearFilters}
      />

      <div
        className="flex gap-1 overflow-x-auto border-b border-gray-200"
        role="tablist"
        aria-label="Review status tabs"
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
              setSelectedReviewId(null);
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

      {reviewsQuery.isLoading ? <LoadingState message="Loading reviews…" /> : null}
      {reviewsQuery.isError ? (
        <ErrorState
          title="Could not load reviews"
          message={getMeErrorMessage(reviewsQuery.error, "Unable to load reviews")}
        />
      ) : null}

      {!reviewsQuery.isLoading && !reviewsQuery.isError ? (
        <div
          className={`grid items-start gap-5 ${
            selectedReview
              ? "xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]"
              : "grid-cols-1"
          }`}
        >
          <div className="min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {filteredReviews.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  title={
                    allReviews.length === 0
                      ? "No reviews yet."
                      : "No reviews match these filters."
                  }
                />
              </div>
            ) : (
              <>
                <div className="overflow-x-auto" data-testid="admin-reviews-table">
                  <table className="min-w-full divide-y divide-gray-100 text-left text-sm">
                    <thead className="bg-gray-50/80 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      <tr>
                        <th className="px-4 py-3">Review</th>
                        <th className="px-4 py-3">Customer</th>
                        <th className="px-4 py-3">Service</th>
                        <th className="px-4 py-3">Rating</th>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-3 py-3 text-right xl:px-4">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {pagedReviews.map((review) => {
                        const selected = selectedReviewId === review.id;
                        return (
                          <tr
                            key={review.id}
                            className={
                              selected ? "bg-emerald-50/40" : "bg-white hover:bg-gray-50/70"
                            }
                            data-testid="admin-review-card"
                          >
                            <td className="px-4 py-4 align-middle" data-testid="admin-review-row">
                              <p className="line-clamp-2 max-w-[16rem] font-medium text-gray-900">
                                {snippetText(review.comment)}
                              </p>
                              <div className="mt-1.5">
                                <ReviewStarRating rating={review.rating} />
                              </div>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <div className="flex items-center gap-3">
                                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-700">
                                  {customerInitials(review.customer_name) || "?"}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate font-semibold text-gray-900">
                                    {review.customer_name}
                                  </p>
                                  {review.booking_reference ? (
                                    <p className="truncate text-xs text-gray-500">
                                      {review.booking_reference}
                                    </p>
                                  ) : review.order_reference ? (
                                    <p className="truncate text-xs text-gray-500">
                                      {review.order_reference}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <p className="truncate font-medium text-gray-900">
                                {review.service_name || "—"}
                              </p>
                              <p className="text-xs text-gray-500">{reviewSourceLabel(review)}</p>
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 align-middle font-semibold text-gray-900">
                              {review.rating.toFixed(1)}
                            </td>
                            <td className="whitespace-nowrap px-4 py-4 align-middle">
                              <p className="font-medium text-gray-900">
                                {formatReviewDate(review.created_at)}
                              </p>
                              <p className="text-xs text-gray-500">
                                {formatReviewTime(review.created_at)}
                              </p>
                            </td>
                            <td className="px-4 py-4 align-middle">
                              <StatusBadge status={review.status} kind="review" />
                            </td>
                            <td className="px-3 py-4 align-middle xl:px-4">
                              <AdminReviewRowActions
                                review={review}
                                acting={acting}
                                menuOpen={openMenuId === review.id}
                                onToggleMenu={() =>
                                  setOpenMenuId((current) =>
                                    current === review.id ? null : review.id,
                                  )
                                }
                                onCloseMenu={() => setOpenMenuId(null)}
                                onView={() => {
                                  setPanelDismissed(false);
                                  setSelectedReviewId(review.id);
                                  setOpenMenuId(null);
                                }}
                                onRequestStatusChange={(status) =>
                                  requestStatusChange(review, status)
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <AdminReviewPagination
                  page={safePage}
                  pageSize={pageSize}
                  total={filteredReviews.length}
                  onPageChange={setPage}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                />
              </>
            )}
          </div>

          {selectedReview ? (
            <div className="w-full min-w-0 self-start xl:w-[360px] xl:max-w-[360px] 2xl:w-[380px] 2xl:max-w-[380px]">
              <AdminReviewDetailPanel
                review={selectedReview}
                acting={acting}
                onClose={() => {
                  setPanelDismissed(true);
                  setSelectedReviewId(null);
                  setOpenMenuId(null);
                }}
                onRequestStatusChange={(status) => requestStatusChange(selectedReview, status)}
              />
            </div>
          ) : null}
        </div>
      ) : null}

    </section>
  );
}
