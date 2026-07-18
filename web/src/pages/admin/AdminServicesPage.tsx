import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminService,
  createServiceSlotCapacityOverride,
  deleteAdminService,
  getBusiness,
  listAdminBookings,
  listAdminServices,
  updateAdminService,
} from "@/api/adminApi";
import { uploadServiceImage } from "@/api/serviceImageApi";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";
import type { PendingSlotCapacityOverride } from "@/components/admin/AdminServiceSlotCapacitySection";
import { AdminAnalyticsKpiCard } from "@/components/admin/analytics/AdminAnalyticsKpiCard";
import { AdminServiceRowActions } from "@/components/admin/services/AdminServiceRowActions";
import {
  SERVICE_CATEGORY_OPTIONS,
  categoryLabel,
} from "@/components/admin/services/serviceCategories";
import {
  DATE_RANGE_OPTIONS,
  STATUS_SELECT_OPTIONS,
  TYPE_SELECT_OPTIONS,
  averageServicePriceCents,
  downloadServicesCsv,
  formatDateRangeLabel,
  formatFileDate,
  formatServiceMoney,
  getCompareRange,
  getDateRange,
  isInRange,
  matchesServiceSearch,
  matchesServiceTab,
  percentChange,
  serviceDurationLabel,
  type DateRangeOption,
  type ServiceCategoryFilter,
  type ServiceStatusFilter,
  type ServiceTabFilter,
  type ServiceTypeFilter,
} from "@/components/admin/services/serviceHelpers";
import { ServiceImageDisplay } from "@/components/ServiceImageDisplay";
import {
  ADMIN_FOCUS_HIGHLIGHT_CLASS,
  ADMIN_FOCUS_HIGHLIGHT_MS,
  ADMIN_ONBOARDING_FOCUS,
} from "@/lib/adminFocus";
import { normalizeServiceImageMedia, serviceImageStatusText } from "@/lib/serviceImage";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PriceLabel } from "@/components/PriceLabel";
import { TypeBadge } from "@/components/TypeBadge";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type {
  AdminServiceRead,
  ServiceCreatePayload,
  ServiceUpdatePayload,
} from "@/types/api";
import { getAdminServiceErrorMessage, getMeErrorMessage } from "@/utils/errors";
import { businessLocalDateTimeToIso, serviceTypeIcon } from "@/utils/format";

type PendingServiceConfirm =
  | {
      kind: "activate" | "deactivate";
      service: AdminServiceRead;
    }
  | {
      kind: "delete";
      service: AdminServiceRead;
    };

function IconGrid() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
      <path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" />
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

function IconTag() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      aria-hidden="true"
    >
      <path d="M20 13.5 10.5 4H4v6.5L13.5 20 20 13.5Z" strokeLinejoin="round" />
      <circle cx="7.5" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );
}

function IconBookable() {
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

function AdminServiceThumbnail({
  service,
  testIdPrefix = "list",
}: {
  service: AdminServiceRead;
  testIdPrefix?: "list" | "detail";
}) {
  const hasImage = Boolean(normalizeServiceImageMedia(service.image));
  const thumbTestId = `admin-service-${testIdPrefix}-thumb-${service.id}`;
  const placeholderTestId = `admin-service-${testIdPrefix}-thumb-placeholder-${service.id}`;

  if (hasImage) {
    return (
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-50">
        <ServiceImageDisplay
          image={service.image}
          variant="thumb"
          testId={thumbTestId}
          className="!h-full !w-full !rounded-full"
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-lg text-slate-400"
      data-testid={placeholderTestId}
      aria-hidden
    >
      {serviceTypeIcon(service.type)}
    </div>
  );
}

const PAGE_SIZE_OPTIONS = [8, 10, 25, 50];

function ServicesPagination({
  page,
  pageSize,
  total,
  onPageChange,
  onPageSizeChange,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = total === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(safePage * pageSize, total);

  return (
    <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
        <p>
          Showing{" "}
          <span className="font-medium text-gray-700">
            {from} to {to}
          </span>{" "}
          of <span className="font-medium text-gray-700">{total}</span> results
        </p>
        <label className="inline-flex items-center gap-2">
          <span>Rows per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm font-medium text-gray-700 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-1">
        <button
          type="button"
          aria-label="Previous page"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
          className="min-h-9 min-w-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-40"
        >
          ‹
        </button>
        {Array.from({ length: totalPages }, (_, index) => index + 1)
          .slice(0, 7)
          .map((item) => (
            <button
              key={item}
              type="button"
              aria-label={`Page ${item}`}
              onClick={() => onPageChange(item)}
              className={`min-h-9 min-w-9 rounded-full px-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                item === safePage
                  ? "bg-emerald-700 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item}
            </button>
          ))}
        <button
          type="button"
          aria-label="Next page"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
          className="min-h-9 min-w-9 rounded-lg border border-gray-200 bg-white px-2.5 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:opacity-40"
        >
          ›
        </button>
      </div>
    </div>
  );
}

export function AdminServicesPage() {
  const { businessId, businessSlug } = useAdminBusiness();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ServiceTypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<ServiceStatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<ServiceCategoryFilter>("all");
  const [dateRangeOption, setDateRangeOption] = useState<DateRangeOption>("all_time");
  const [activeTab, setActiveTab] = useState<ServiceTabFilter>("all");
  const [selectedServiceId, setSelectedServiceId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingService, setEditingService] = useState<AdminServiceRead | null>(null);
  const [pendingCreateImageFile, setPendingCreateImageFile] = useState<File | null>(null);
  const [pendingCreateOverrides, setPendingCreateOverrides] = useState<PendingSlotCapacityOverride[]>(
    [],
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [addServiceFocused, setAddServiceFocused] = useState(false);
  const [pendingConfirm, setPendingConfirm] = useState<PendingServiceConfirm | null>(null);
  const addServiceHeaderRef = useRef<HTMLDivElement | null>(null);
  const createFormRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (searchParams.get("focus") !== ADMIN_ONBOARDING_FOCUS.addService) {
      return;
    }
    setFormMode("create");
    setEditingService(null);
    setPendingCreateImageFile(null);
    setPendingCreateOverrides([]);
    setAddServiceFocused(true);
    const next = new URLSearchParams(searchParams);
    next.delete("focus");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (!addServiceFocused) {
      return;
    }
    const scrollTimeout = window.setTimeout(() => {
      (createFormRef.current ?? addServiceHeaderRef.current)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 0);
    const timeout = window.setTimeout(() => setAddServiceFocused(false), ADMIN_FOCUS_HIGHLIGHT_MS);
    return () => {
      window.clearTimeout(scrollTimeout);
      window.clearTimeout(timeout);
    };
  }, [addServiceFocused]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setSearchQuery(searchInput), 250);
    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-services", businessId],
    queryFn: () => listAdminServices(businessId!),
    enabled: Boolean(businessId),
  });

  const bookingsQuery = useQuery({
    queryKey: ["admin-bookings", businessId, "service-counts"],
    queryFn: () => listAdminBookings(businessId!),
    enabled: Boolean(businessId),
  });

  const createMutation = useMutation({
    mutationFn: async ({
      payload,
      pendingImageFile,
      pendingSlotCapacityOverrides,
    }: {
      payload: ServiceCreatePayload;
      pendingImageFile: File | null;
      pendingSlotCapacityOverrides: PendingSlotCapacityOverride[];
    }) => {
      const created = await createAdminService(businessId!, payload);
      let uploadFailed = false;
      let overrideUploadFailed = false;

      if (pendingImageFile) {
        try {
          await uploadServiceImage(businessId!, created.id, pendingImageFile);
        } catch {
          uploadFailed = true;
        }
      }

      if (pendingSlotCapacityOverrides.length > 0) {
        const business = await getBusiness(businessId!);
        for (const pending of pendingSlotCapacityOverrides) {
          try {
            await createServiceSlotCapacityOverride(businessId!, created.id, {
              starts_at: businessLocalDateTimeToIso(
                pending.date,
                pending.time,
                business.timezone,
              ),
              capacity: pending.capacity,
              note: pending.note,
            });
          } catch {
            overrideUploadFailed = true;
          }
        }
      }

      return { created, uploadFailed, overrideUploadFailed };
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-services", businessId] });
      setFormMode(null);
      setPendingCreateImageFile(null);
      setPendingCreateOverrides([]);
      setSelectedServiceId(result.created.id);
      if (result.uploadFailed && result.overrideUploadFailed) {
        setSuccessMessage("Service created.");
        setActionError(
          "Service created, but image upload and one or more group time slots could not be saved. Edit the service and try again.",
        );
      } else if (result.uploadFailed) {
        setSuccessMessage("Service created.");
        setActionError(
          "Service created, but image upload failed. Edit the service and try uploading again.",
        );
      } else if (result.overrideUploadFailed) {
        setSuccessMessage("Service created.");
        setActionError(
          "Service created, but one or more group time slots could not be saved. Edit the service and try again.",
        );
      } else {
        setSuccessMessage("Service created.");
        setActionError(null);
      }
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      serviceId,
      payload,
    }: {
      serviceId: string;
      payload: ServiceUpdatePayload;
    }) => updateAdminService(businessId!, serviceId, payload),
    onSuccess: async (_updated, variables) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-services", businessId] });
      setFormMode(null);
      setEditingService(null);
      setSelectedServiceId(variables.serviceId);
      setSuccessMessage("Service updated.");
      setActionError(null);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ serviceId, isActive }: { serviceId: string; isActive: boolean }) =>
      updateAdminService(businessId!, serviceId, { is_active: isActive }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-services", businessId] });
      setSuccessMessage("Service status updated.");
      setActionError(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (serviceId: string) => deleteAdminService(businessId!, serviceId),
    onSuccess: async (_result, serviceId) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-services", businessId] });
      if (selectedServiceId === serviceId) {
        setSelectedServiceId(null);
      }
      if (editingService?.id === serviceId) {
        setFormMode(null);
        setEditingService(null);
      }
      setSuccessMessage("Service deleted (marked inactive and hidden from public listing).");
      setActionError(null);
    },
  });

  const allServices = data?.data ?? [];
  const currentRange = useMemo(() => getDateRange(dateRangeOption), [dateRangeOption]);
  const compareRange = useMemo(
    () => (currentRange ? getCompareRange("previous_period", currentRange) : null),
    [currentRange],
  );
  const dateRangeLabel = currentRange ? formatDateRangeLabel(currentRange) : "All time";
  const compareRangeLabel = compareRange ? formatDateRangeLabel(compareRange) : "";

  const bookingCountByServiceName = useMemo(() => {
    const counts = new Map<string, number>();
    for (const booking of bookingsQuery.data?.data ?? []) {
      const key = booking.service_name?.trim();
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [bookingsQuery.data?.data]);

  const dateScopedServices = useMemo(
    () =>
      currentRange
        ? allServices.filter((service) => isInRange(service.created_at, currentRange))
        : allServices,
    [allServices, currentRange],
  );

  const compareServices = useMemo(
    () =>
      compareRange
        ? allServices.filter((service) => isInRange(service.created_at, compareRange))
        : [],
    [allServices, compareRange],
  );

  const kpis = useMemo(() => {
    const total = dateScopedServices.length;
    const active = dateScopedServices.filter((s) => s.is_active).length;
    const hidden = dateScopedServices.filter((s) => !s.is_active).length;
    const bookable = dateScopedServices.filter((s) => s.type === "booking" && s.is_active).length;
    const categories = new Set(
      dateScopedServices.map((s) => s.category).filter((value): value is string => Boolean(value)),
    ).size;
    const avgPrice = averageServicePriceCents(dateScopedServices);
    const currency =
      dateScopedServices.find((s) => s.price_type === "fixed" && s.currency)?.currency ?? "USD";

    const prevTotal = compareServices.length;
    const prevActive = compareServices.filter((s) => s.is_active).length;
    const prevHidden = compareServices.filter((s) => !s.is_active).length;
    const prevBookable = compareServices.filter((s) => s.type === "booking" && s.is_active).length;
    const prevCategories = new Set(
      compareServices.map((s) => s.category).filter((value): value is string => Boolean(value)),
    ).size;

    return {
      total,
      active,
      categories,
      bookable,
      hidden,
      avgPriceLabel: avgPrice != null ? formatServiceMoney(avgPrice, currency) : "—",
      trends: {
        total: percentChange(total, prevTotal),
        active: percentChange(active, prevActive),
        categories: percentChange(categories, prevCategories),
        bookable: percentChange(bookable, prevBookable),
        hidden: percentChange(hidden, prevHidden),
      },
    };
  }, [compareServices, dateScopedServices]);

  const tabCounts = useMemo(() => {
    const base = dateScopedServices.filter((service) => {
      if (!matchesServiceSearch(service, searchQuery)) return false;
      if (categoryFilter === "uncategorized" && service.category) return false;
      if (
        categoryFilter !== "all" &&
        categoryFilter !== "uncategorized" &&
        service.category !== categoryFilter
      ) {
        return false;
      }
      if (typeFilter !== "all" && service.type !== typeFilter) return false;
      if (statusFilter === "active" && !service.is_active) return false;
      if (statusFilter === "inactive" && service.is_active) return false;
      return true;
    });
    return {
      all: base.length,
      active: base.filter((s) => s.is_active).length,
      inactive: base.filter((s) => !s.is_active).length,
      booking: base.filter((s) => s.type === "booking").length,
      order: base.filter((s) => s.type === "order").length,
    };
  }, [categoryFilter, dateScopedServices, searchQuery, statusFilter, typeFilter]);

  const filteredServices = useMemo(() => {
    return dateScopedServices.filter((service) => {
      if (!matchesServiceSearch(service, searchQuery)) return false;
      if (!matchesServiceTab(service, activeTab)) return false;
      if (categoryFilter === "uncategorized" && service.category) return false;
      if (
        categoryFilter !== "all" &&
        categoryFilter !== "uncategorized" &&
        service.category !== categoryFilter
      ) {
        return false;
      }
      if (typeFilter !== "all" && service.type !== typeFilter) return false;
      if (statusFilter === "active" && !service.is_active) return false;
      if (statusFilter === "inactive" && service.is_active) return false;
      return true;
    });
  }, [
    activeTab,
    categoryFilter,
    dateScopedServices,
    searchQuery,
    statusFilter,
    typeFilter,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredServices.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pagedServices = filteredServices.slice((safePage - 1) * pageSize, safePage * pageSize);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, typeFilter, statusFilter, categoryFilter, activeTab, dateRangeOption]);

  const submitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    toggleActiveMutation.isPending ||
    deleteMutation.isPending;

  const formSubmitError =
    createMutation.error ?? updateMutation.error
      ? getAdminServiceErrorMessage(createMutation.error ?? updateMutation.error)
      : null;

  function openCreateForm() {
    setFormMode("create");
    setEditingService(null);
    setPendingCreateImageFile(null);
    setPendingCreateOverrides([]);
    setOpenMenuId(null);
    setSuccessMessage(null);
    setActionError(null);
  }

  function openEditForm(service: AdminServiceRead) {
    setFormMode("edit");
    setEditingService(service);
    setSelectedServiceId(service.id);
    setOpenMenuId(null);
    setSuccessMessage(null);
    setActionError(null);
  }

  function clearFilters() {
    setSearchInput("");
    setSearchQuery("");
    setTypeFilter("all");
    setStatusFilter("all");
    setCategoryFilter("all");
    setDateRangeOption("all_time");
    setActiveTab("all");
    setPage(1);
    setActionError(null);
    setSuccessMessage(null);
  }

  function handleExport() {
    const rows: Array<Array<string | number>> = [
      [
        "name",
        "description",
        "category",
        "type",
        "status",
        "duration_minutes",
        "price_cents",
        "currency",
        "price_type",
        "bookings",
        "waitlist_enabled",
        "created_at",
        "updated_at",
      ],
      ...filteredServices.map((service) => [
        service.name,
        service.description ?? "",
        service.category ?? "",
        service.type,
        service.is_active ? "active" : "hidden",
        service.duration_minutes ?? "",
        service.price_cents ?? "",
        service.currency,
        service.price_type,
        bookingCountByServiceName.get(service.name) ?? 0,
        service.waitlist_enabled ? "yes" : "no",
        service.created_at,
        service.updated_at,
      ]),
    ];
    downloadServicesCsv(`service-platform-services-${formatFileDate()}.csv`, rows);
  }

  function requestToggleActive(service: AdminServiceRead) {
    setActionError(null);
    setPendingConfirm({
      kind: service.is_active ? "deactivate" : "activate",
      service,
    });
  }

  function requestDelete(service: AdminServiceRead) {
    setActionError(null);
    setPendingConfirm({ kind: "delete", service });
  }

  function closePendingConfirm() {
    if (toggleActiveMutation.isPending || deleteMutation.isPending) {
      return;
    }
    setPendingConfirm(null);
  }

  async function confirmPendingAction() {
    if (!pendingConfirm) {
      return;
    }

    const { kind, service } = pendingConfirm;
    try {
      if (kind === "activate" || kind === "deactivate") {
        await toggleActiveMutation.mutateAsync({
          serviceId: service.id,
          isActive: kind === "activate",
        });
      } else {
        await deleteMutation.mutateAsync(service.id);
      }
      setPendingConfirm(null);
    } catch (err) {
      setPendingConfirm(null);
      if (kind === "delete") {
        setActionError(getAdminServiceErrorMessage(err, "Could not delete service."));
      } else {
        setActionError(getAdminServiceErrorMessage(err, "Could not update service status."));
      }
    }
  }

  const confirmDialogProps = pendingConfirm
    ? pendingConfirm.kind === "activate"
      ? {
          title: "Activate service?",
          description: "Customers will be able to see this service in your public catalog.",
          confirmLabel: "Activate",
          variant: "success" as const,
        }
      : pendingConfirm.kind === "deactivate"
        ? {
            title: "Deactivate service?",
            description: "This service will be hidden from your public catalog.",
            confirmLabel: "Deactivate",
            variant: "default" as const,
          }
        : {
            title: "Delete service?",
            description: "This action cannot be undone.",
            confirmLabel: "Delete",
            variant: "danger" as const,
          }
    : null;

  const tabs: Array<{ id: ServiceTabFilter; label: string; count: number }> = [
    { id: "all", label: "All Services", count: tabCounts.all },
    { id: "active", label: "Active", count: tabCounts.active },
    { id: "inactive", label: "Hidden", count: tabCounts.inactive },
    { id: "booking", label: "Booking", count: tabCounts.booking },
    { id: "order", label: "Requests", count: tabCounts.order },
  ];

  const showSidePanel = formMode != null;
  const filtersActive =
    Boolean(searchQuery.trim()) ||
    typeFilter !== "all" ||
    statusFilter !== "all" ||
    categoryFilter !== "all" ||
    dateRangeOption !== "all_time" ||
    activeTab !== "all";

  const previewHref = businessSlug ? `/b/${businessSlug}` : null;

  return (
    <section className="w-full space-y-6 sm:space-y-7" data-testid="admin-services-page">
      <div
        ref={addServiceHeaderRef}
        className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
        data-testid="admin-services-header"
      >
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Services</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage your services, categories, pricing, and marketplace visibility.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative inline-flex w-full items-center sm:w-[180px]">
            <span className="sr-only">Date range</span>
            <select
              value={dateRangeOption}
              onChange={(event) => setDateRangeOption(event.target.value as DateRangeOption)}
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-0 pl-3 pr-8 text-sm font-medium text-gray-700 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              aria-label={`Date range: ${dateRangeLabel}`}
              data-testid="admin-services-date-range"
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

          <label className="relative inline-flex w-full sm:w-[150px]">
            <span className="sr-only">Status</span>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as ServiceStatusFilter)}
              className="h-11 w-full appearance-none rounded-xl border border-gray-200 bg-white py-0 pl-3 pr-8 text-sm font-medium text-gray-700 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              aria-label="Header status filter"
              data-testid="admin-services-header-status"
            >
              {STATUS_SELECT_OPTIONS.map((option) => (
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
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-600 bg-white px-4 text-sm font-semibold text-emerald-700 shadow-sm outline-none hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            data-testid="admin-services-export"
          >
            <span aria-hidden="true">⬇</span>
            Export CSV
          </button>

          <button
            type="button"
            onClick={openCreateForm}
            disabled={formMode === "create" || submitting}
            className={`inline-flex h-11 w-full items-center justify-center rounded-xl bg-brand-600 px-4 text-sm font-semibold text-white shadow-sm outline-none hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-60 sm:w-auto ${
              addServiceFocused ? ADMIN_FOCUS_HIGHLIGHT_CLASS : ""
            }`}
            data-testid="admin-services-add"
            data-admin-focused={addServiceFocused ? "true" : undefined}
          >
            + Add service
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
          testId="admin-services-kpi-total"
          label="Total Services"
          value={String(kpis.total)}
          trend={kpis.trends.total}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconGrid />}
          iconTone="bg-sky-100 text-sky-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-services-kpi-active"
          label="Active Services"
          value={String(kpis.active)}
          trend={kpis.trends.active}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconActive />}
          iconTone="bg-emerald-100 text-emerald-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-services-kpi-categories"
          label="Categories"
          value={String(kpis.categories)}
          trend={kpis.trends.categories}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconTag />}
          iconTone="bg-violet-100 text-violet-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-services-kpi-bookable"
          label="Online Bookable"
          value={String(kpis.bookable)}
          trend={kpis.trends.bookable}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconBookable />}
          iconTone="bg-amber-100 text-amber-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-services-kpi-hidden"
          label="Hidden Services"
          value={String(kpis.hidden)}
          trend={kpis.trends.hidden}
          compareText={compareRangeLabel ? `vs ${compareRangeLabel}` : null}
          icon={<IconHidden />}
          iconTone="bg-rose-100 text-rose-700"
          footer={<p className="mt-1 text-xs text-gray-400">Avg price {kpis.avgPriceLabel}</p>}
        />
      </div>

      {(allServices.length > 0 || formMode || filtersActive) && !isLoading && !isError ? (
        <div
          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
          data-testid="admin-services-filters"
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <label className="relative min-w-0 flex-1">
              <span className="sr-only">Search services</span>
              <span
                className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                aria-hidden="true"
              >
                ⌕
              </span>
              <input
                type="search"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                placeholder="Search by service name or description..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white py-0 pl-9 pr-3 text-sm text-slate-800 shadow-sm outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                data-testid="admin-services-search"
              />
            </label>

            <label className="relative w-full lg:w-[180px]">
              <span className="sr-only">Category</span>
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                data-testid="admin-services-filter-category"
              >
                <option value="all">All Categories</option>
                <option value="uncategorized">Uncategorized</option>
                {SERVICE_CATEGORY_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>
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

            <label className="relative w-full lg:w-[150px]">
              <span className="sr-only">Type</span>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as ServiceTypeFilter)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                data-testid="admin-services-filter-type"
              >
                {TYPE_SELECT_OPTIONS.map((option) => (
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

            <label className="relative w-full lg:w-[150px]">
              <span className="sr-only">Status</span>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as ServiceStatusFilter)}
                className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white py-0 pl-3 pr-8 text-sm font-medium text-slate-700 shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                data-testid="admin-services-filter-status"
              >
                {STATUS_SELECT_OPTIONS.map((option) => (
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
              onClick={clearFilters}
              className="h-11 px-2 text-sm font-semibold text-emerald-700 outline-none hover:text-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              data-testid="admin-services-clear-filters"
            >
              Clear
            </button>
          </div>

          <div className="mt-4 flex gap-1 overflow-x-auto border-b border-slate-100 pb-px">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
                    active
                      ? "border-emerald-600 text-emerald-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                  data-testid={`admin-services-tab-${tab.id}`}
                >
                  {tab.label} ({tab.count})
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      <div
        className={`grid items-start gap-5 ${
          showSidePanel
            ? "xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]"
            : "grid-cols-1"
        }`}
      >
        <div className="min-w-0 space-y-4">
          {isLoading ? <LoadingState message="Loading services…" /> : null}
          {isError ? (
            <ErrorState
              title="Could not load services"
              message={getMeErrorMessage(error, "Unable to load services")}
            />
          ) : null}

          {!isLoading && !isError && allServices.length === 0 && formMode !== "create" ? (
            <div
              className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center sm:py-10"
              data-testid="admin-services-empty"
            >
              <h3 className="text-base font-medium text-slate-800">No services yet</h3>
              <p className="mt-2 text-sm text-slate-600">
                Add your first service so customers can book or send requests.
              </p>
              <button
                type="button"
                onClick={openCreateForm}
                disabled={submitting}
                className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white outline-none hover:bg-brand-700 focus-visible:ring-2 focus-visible:ring-brand-500/40 disabled:opacity-60 sm:w-auto"
                data-testid="admin-services-empty-add"
              >
                Add service
              </button>
            </div>
          ) : null}

          {!isLoading && !isError && allServices.length > 0 && filteredServices.length === 0 ? (
            <EmptyState
              title="No services match these filters"
              description="Try another search, category, type, or status filter."
            />
          ) : null}

          {!isLoading && !isError && filteredServices.length > 0 ? (
            <div
              className="grid grid-cols-1 min-w-0 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
              data-testid="admin-services-list"
            >
              <div className="min-w-0">
                <table className="w-full table-fixed divide-y divide-gray-100 text-left text-sm">
                  <thead className="bg-gray-50/80 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                    <tr>
                      <th className="w-[34%] whitespace-nowrap px-3 py-2.5">Service</th>
                      <th className="w-[12%] whitespace-nowrap px-2 py-2.5">Category</th>
                      <th className="w-[9%] whitespace-nowrap px-2 py-2.5">Duration</th>
                      <th className="w-[9%] whitespace-nowrap px-2 py-2.5">Price</th>
                      <th className="w-[8%] whitespace-nowrap px-2 py-2.5">Bookings</th>
                      <th className="w-[10%] whitespace-nowrap px-2 py-2.5">Status</th>
                      <th className="w-[18%] whitespace-nowrap px-2 py-2.5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pagedServices.map((service) => {
                      const selected =
                        selectedServiceId === service.id || editingService?.id === service.id;
                      const statusLabel = service.is_active ? "Active" : "Hidden";
                      const bookingCount = bookingCountByServiceName.get(service.name) ?? 0;
                      const imageStatus = serviceImageStatusText(service.image ?? null);

                      return (
                        <tr
                          key={service.id}
                          className={`outline-none ${
                            selected
                              ? "bg-emerald-50/50 shadow-[inset_3px_0_0_0_#34d399]"
                              : "bg-white hover:bg-gray-50/70"
                          }`}
                          data-testid="admin-service-card"
                        >
                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex min-w-0 items-center gap-2.5">
                              <AdminServiceThumbnail service={service} />
                              <div className="min-w-0">
                                <h3 className="truncate text-sm font-semibold text-gray-900">
                                  {service.name}
                                </h3>
                                <p className="mt-0.5 line-clamp-2 text-xs text-gray-500">
                                  {service.description?.trim() || "No description provided."}
                                </p>
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  <TypeBadge type={service.type} />
                                  {service.type === "booking" && service.waitlist_enabled ? (
                                    <span
                                      className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800"
                                      data-testid={`admin-service-waitlist-badge-${service.id}`}
                                    >
                                      Waitlist enabled
                                    </span>
                                  ) : null}
                                </div>
                                {service.type === "booking" && service.waitlist_enabled ? (
                                  <p
                                    className="sr-only"
                                    data-testid={`admin-service-waitlist-hint-${service.id}`}
                                  >
                                    Manage entries in Bookings → Waitlist.
                                  </p>
                                ) : null}
                                <p
                                  className="sr-only"
                                  data-testid={`admin-service-list-image-status-${service.id}`}
                                >
                                  {imageStatus}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="overflow-hidden px-2 py-2.5 align-middle text-sm text-gray-700">
                            <p className="truncate" title={categoryLabel(service.category)}>
                              {categoryLabel(service.category)}
                            </p>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 align-middle text-sm text-gray-700">
                            {serviceDurationLabel(service)}
                          </td>
                          <td className="overflow-hidden px-2 py-2.5 align-middle text-sm font-semibold text-gray-900">
                            <div className="truncate">
                              <PriceLabel service={service} />
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-2 py-2.5 align-middle text-sm text-gray-700">
                            {bookingCount}
                          </td>
                          <td className="px-2 py-2.5 align-middle">
                            <span
                              className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                                service.is_active
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                              data-testid={`admin-service-status-${service.id}`}
                            >
                              {statusLabel}
                            </span>
                          </td>
                          <td className="px-2 py-2.5 align-middle">
                            <AdminServiceRowActions
                              service={service}
                              submitting={submitting}
                              menuOpen={openMenuId === service.id}
                              onToggleMenu={() =>
                                setOpenMenuId((current) =>
                                  current === service.id ? null : service.id,
                                )
                              }
                              onCloseMenu={() => setOpenMenuId(null)}
                              onView={() => openEditForm(service)}
                              onEdit={() => openEditForm(service)}
                              onViewWaitlist={() => navigate("/admin/bookings?tab=waitlist")}
                              onToggleActive={() => requestToggleActive(service)}
                              onDelete={() => requestDelete(service)}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <ServicesPagination
                page={safePage}
                pageSize={pageSize}
                total={filteredServices.length}
                onPageChange={setPage}
                onPageSizeChange={(size) => {
                  setPageSize(size);
                  setPage(1);
                }}
              />
            </div>
          ) : null}
        </div>

        {showSidePanel ? (
          <div
            className={`h-fit w-full min-w-0 ${
              formMode === "create" ? "order-first xl:order-none" : ""
            } xl:sticky xl:top-4`}
          >
            {formMode === "create" ? (
              <div
                ref={createFormRef}
                className={addServiceFocused ? ADMIN_FOCUS_HIGHLIGHT_CLASS : undefined}
                data-testid="admin-services-create-area"
              >
                <AdminServiceForm
                  mode="create"
                  businessId={businessId ?? undefined}
                  pendingImageFile={pendingCreateImageFile}
                  onPendingImageFileChange={setPendingCreateImageFile}
                  pendingSlotCapacityOverrides={pendingCreateOverrides}
                  onPendingSlotCapacityOverridesChange={setPendingCreateOverrides}
                  submitting={createMutation.isPending}
                  submitError={formSubmitError}
                  previewHref={previewHref}
                  onCancel={() => {
                    setFormMode(null);
                    setPendingCreateImageFile(null);
                    setPendingCreateOverrides([]);
                  }}
                  onSubmit={(payload, options) => {
                    createMutation.mutate(
                      {
                        payload: payload as ServiceCreatePayload,
                        pendingImageFile: options?.pendingImageFile ?? null,
                        pendingSlotCapacityOverrides:
                          options?.pendingSlotCapacityOverrides ?? [],
                      },
                      {
                        onError: () => undefined,
                      },
                    );
                  }}
                />
              </div>
            ) : null}

            {formMode === "edit" && editingService ? (
              <AdminServiceForm
                mode="edit"
                businessId={businessId ?? undefined}
                initial={editingService}
                submitting={updateMutation.isPending}
                submitError={formSubmitError}
                previewHref={previewHref}
                onToggleActive={() => requestToggleActive(editingService)}
                onDelete={() => requestDelete(editingService)}
                onCancel={() => {
                  setFormMode(null);
                  setEditingService(null);
                }}
                onServiceImageChange={(image) => {
                  setEditingService((current) => (current ? { ...current, image } : current));
                  void queryClient.invalidateQueries({ queryKey: ["admin-services", businessId] });
                }}
                onSubmit={(payload) => {
                  updateMutation.mutate(
                    { serviceId: editingService.id, payload: payload as ServiceUpdatePayload },
                    { onError: () => undefined },
                  );
                }}
              />
            ) : null}
          </div>
        ) : null}
      </div>

      <AdminConfirmDialog
        open={Boolean(pendingConfirm && confirmDialogProps)}
        title={confirmDialogProps?.title ?? ""}
        description={confirmDialogProps?.description ?? ""}
        confirmLabel={confirmDialogProps?.confirmLabel ?? "Confirm"}
        variant={confirmDialogProps?.variant ?? "default"}
        isLoading={toggleActiveMutation.isPending || deleteMutation.isPending}
        onCancel={closePendingConfirm}
        onConfirm={() => void confirmPendingAction()}
      />
    </section>
  );
}
