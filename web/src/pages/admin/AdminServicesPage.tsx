import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminService,
  createServiceSlotCapacityOverride,
  deleteAdminService,
  getBusiness,
  listAdminServices,
  updateAdminService,
} from "@/api/adminApi";
import { uploadServiceImage } from "@/api/serviceImageApi";
import { AdminConfirmDialog } from "@/components/admin/AdminConfirmDialog";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";
import type { PendingSlotCapacityOverride } from "@/components/admin/AdminServiceSlotCapacitySection";
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
  ServiceType,
  ServiceUpdatePayload,
} from "@/types/api";
import { getAdminServiceErrorMessage, getMeErrorMessage } from "@/utils/errors";
import { formatDuration, serviceTypeIcon, businessLocalDateTimeToIso } from "@/utils/format";

type TypeFilter = "all" | ServiceType;
type StatusFilter = "all" | "active" | "inactive";

type PendingServiceConfirm =
  | {
      kind: "activate" | "deactivate";
      service: AdminServiceRead;
    }
  | {
      kind: "delete";
      service: AdminServiceRead;
    };

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
      className={`rounded-full px-3 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-brand-600 text-white shadow-sm"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

function AdminServiceThumbnail({
  service,
}: {
  service: AdminServiceRead;
}) {
  const hasImage = Boolean(normalizeServiceImageMedia(service.image));

  if (hasImage) {
    return (
      <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
        <ServiceImageDisplay
          image={service.image}
          variant="thumb"
          testId={`admin-service-list-thumb-${service.id}`}
          className="!h-16 !w-16 !rounded-lg"
        />
      </div>
    );
  }

  return (
    <div
      className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 text-2xl text-slate-400"
      data-testid={`admin-service-list-thumb-placeholder-${service.id}`}
      aria-hidden
    >
      {serviceTypeIcon(service.type)}
    </div>
  );
}

const actionButtonClass =
  "min-h-10 flex-1 rounded-lg border bg-white px-3 py-2 text-sm font-medium disabled:opacity-60 sm:min-h-0 sm:flex-none sm:px-3 sm:py-1.5 sm:text-xs";

function AdminServiceListCard({
  service,
  submitting,
  onEdit,
  onViewWaitlist,
  onToggleActive,
  onDelete,
}: {
  service: AdminServiceRead;
  submitting: boolean;
  onEdit: () => void;
  onViewWaitlist: () => void;
  onToggleActive: () => void;
  onDelete: () => void;
}) {
  const duration = service.type === "booking" ? formatDuration(service.duration_minutes) : null;
  const imageStatus = serviceImageStatusText(service.image ?? null);
  const hasImage = Boolean(normalizeServiceImageMedia(service.image));
  const statusLabel = service.is_active ? "Active" : "Hidden";

  return (
    <article
      className="flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
      data-testid="admin-service-card"
    >
      <div className="flex flex-1 gap-3 p-3 sm:p-4">
        <AdminServiceThumbnail service={service} />

        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold text-slate-900 sm:text-[15px]">
            {service.name}
          </h3>

          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <TypeBadge type={service.type} />
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                service.is_active
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-slate-100 text-slate-600"
              }`}
              data-testid={`admin-service-status-${service.id}`}
            >
              {statusLabel}
            </span>
            {service.type === "booking" && service.waitlist_enabled ? (
              <span
                className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                data-testid={`admin-service-waitlist-badge-${service.id}`}
              >
                Waitlist enabled
              </span>
            ) : null}
          </div>

          {service.type === "booking" && service.waitlist_enabled ? (
            <p
              className="mt-1.5 text-xs text-amber-800"
              data-testid={`admin-service-waitlist-hint-${service.id}`}
            >
              Manage entries in Bookings → Waitlist.
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-700">
            <PriceLabel service={service} />
            {duration ? <span className="text-slate-500">{duration}</span> : null}
          </div>

          <p
            className={`mt-1.5 truncate text-xs ${hasImage ? "text-slate-600" : "text-slate-500"}`}
            data-testid={`admin-service-list-image-status-${service.id}`}
          >
            {imageStatus}
          </p>

          {service.description ? (
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
              {service.description}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-slate-100 bg-slate-50/70 px-3 py-3 sm:px-4 sm:py-2.5">
        <button
          type="button"
          onClick={onEdit}
          disabled={submitting}
          className={`${actionButtonClass} border-slate-300 text-slate-700 hover:bg-slate-50`}
          data-testid={`admin-service-edit-${service.id}`}
        >
          Edit
        </button>
        {service.type === "booking" && service.waitlist_enabled ? (
          <button
            type="button"
            onClick={onViewWaitlist}
            disabled={submitting}
            className={`${actionButtonClass} border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100`}
            data-testid={`admin-service-view-waitlist-${service.id}`}
          >
            View waitlist
          </button>
        ) : null}
        <button
          type="button"
          onClick={onToggleActive}
          disabled={submitting}
          className={`${actionButtonClass} border-slate-300 text-slate-700 hover:bg-slate-50`}
          data-testid={`admin-service-toggle-${service.id}`}
        >
          {service.is_active ? "Deactivate" : "Activate"}
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={submitting}
          className={`${actionButtonClass} border-red-200 text-red-700 hover:bg-red-50`}
          data-testid={`admin-service-delete-${service.id}`}
        >
          Delete
        </button>
      </div>
    </article>
  );
}

export function AdminServicesPage() {
  const { businessId } = useAdminBusiness();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
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

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-services", businessId],
    queryFn: () => listAdminServices(businessId!),
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-services", businessId] });
      setFormMode(null);
      setEditingService(null);
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
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["admin-services", businessId] });
      setSuccessMessage("Service deleted (marked inactive and hidden from public listing).");
      setActionError(null);
    },
  });

  const allServices = data?.data ?? [];

  const filteredServices = useMemo(() => {
    let items = allServices;
    if (typeFilter !== "all") {
      items = items.filter((service) => service.type === typeFilter);
    }
    if (statusFilter === "active") {
      items = items.filter((service) => service.is_active);
    } else if (statusFilter === "inactive") {
      items = items.filter((service) => !service.is_active);
    }
    return items;
  }, [allServices, typeFilter, statusFilter]);

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
    setSuccessMessage(null);
    setActionError(null);
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

  return (
    <section className="space-y-4 sm:space-y-5" data-testid="admin-services-page">
      <div
        ref={addServiceHeaderRef}
        className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between"
        data-testid="admin-services-header"
      >
        <div className="min-w-0">
          <h2 className="text-xl font-bold text-slate-900">Services</h2>
          <p className="mt-0.5 text-sm text-slate-600">
            Add offerings customers can book or request on your public page.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateForm}
          disabled={formMode === "create" || submitting}
          className={`w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-60 sm:w-auto sm:shrink-0 sm:py-2 sm:font-medium ${
            addServiceFocused ? ADMIN_FOCUS_HIGHLIGHT_CLASS : ""
          }`}
          data-testid="admin-services-add"
          data-admin-focused={addServiceFocused ? "true" : undefined}
        >
          Add service
        </button>
      </div>

      {successMessage ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      {allServices.length > 0 || formMode ? (
        <div
          className="space-y-2 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/60 p-3"
          data-testid="admin-services-filters"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Type
            </span>
            <FilterButton
              active={typeFilter === "all"}
              label="All"
              onClick={() => setTypeFilter("all")}
            />
            <FilterButton
              active={typeFilter === "booking"}
              label="Booking"
              onClick={() => setTypeFilter("booking")}
            />
            <FilterButton
              active={typeFilter === "order"}
              label="Requests"
              onClick={() => setTypeFilter("order")}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Status
            </span>
            <FilterButton
              active={statusFilter === "all"}
              label="All status"
              onClick={() => setStatusFilter("all")}
            />
            <FilterButton
              active={statusFilter === "active"}
              label="Active"
              onClick={() => setStatusFilter("active")}
            />
            <FilterButton
              active={statusFilter === "inactive"}
              label="Hidden"
              onClick={() => setStatusFilter("inactive")}
            />
          </div>
        </div>
      ) : null}

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
                  pendingSlotCapacityOverrides: options?.pendingSlotCapacityOverrides ?? [],
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
            className="mt-4 w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60 sm:w-auto"
            data-testid="admin-services-empty-add"
          >
            Add service
          </button>
        </div>
      ) : null}

      {!isLoading && !isError && allServices.length > 0 && filteredServices.length === 0 ? (
        <EmptyState
          title="No services match these filters"
          description="Try another type or status filter."
        />
      ) : null}

      {!isLoading && !isError && filteredServices.length > 0 ? (
        <div
          className="grid grid-cols-1 items-stretch gap-3 md:grid-cols-2 xl:grid-cols-3"
          data-testid="admin-services-list"
        >
          {filteredServices.map((service) => (
            <AdminServiceListCard
              key={service.id}
              service={service}
              submitting={submitting}
              onEdit={() => {
                setFormMode("edit");
                setEditingService(service);
                setSuccessMessage(null);
                setActionError(null);
              }}
              onViewWaitlist={() => navigate("/admin/bookings?tab=waitlist")}
              onToggleActive={() => requestToggleActive(service)}
              onDelete={() => requestDelete(service)}
            />
          ))}
        </div>
      ) : null}

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
