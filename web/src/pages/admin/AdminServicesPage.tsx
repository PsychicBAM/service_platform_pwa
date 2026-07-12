import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createAdminService,
  deleteAdminService,
  listAdminServices,
  updateAdminService,
} from "@/api/adminApi";
import { uploadServiceImage } from "@/api/serviceImageApi";
import { AdminServiceForm } from "@/components/admin/AdminServiceForm";
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
import { formatDuration } from "@/utils/format";

type TypeFilter = "all" | ServiceType;
type StatusFilter = "all" | "active" | "inactive";

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
          ? "bg-brand-600 text-white"
          : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {label}
    </button>
  );
}

export function AdminServicesPage() {
  const { businessId } = useAdminBusiness();
  const queryClient = useQueryClient();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [formMode, setFormMode] = useState<"create" | "edit" | null>(null);
  const [editingService, setEditingService] = useState<AdminServiceRead | null>(null);
  const [pendingCreateImageFile, setPendingCreateImageFile] = useState<File | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-services", businessId],
    queryFn: () => listAdminServices(businessId!),
    enabled: Boolean(businessId),
  });

  const createMutation = useMutation({
    mutationFn: async ({
      payload,
      pendingImageFile,
    }: {
      payload: ServiceCreatePayload;
      pendingImageFile: File | null;
    }) => {
      const created = await createAdminService(businessId!, payload);
      if (!pendingImageFile) {
        return { created, uploadFailed: false as const };
      }
      try {
        await uploadServiceImage(businessId!, created.id, pendingImageFile);
        return { created, uploadFailed: false as const };
      } catch {
        return { created, uploadFailed: true as const };
      }
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: ["admin-services", businessId] });
      setFormMode(null);
      setPendingCreateImageFile(null);
      if (result.uploadFailed) {
        setSuccessMessage("Service created.");
        setActionError(
          "Service created, but image upload failed. Edit the service and try uploading again.",
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

  const filteredServices = useMemo(() => {
    let items = data?.data ?? [];
    if (typeFilter !== "all") {
      items = items.filter((service) => service.type === typeFilter);
    }
    if (statusFilter === "active") {
      items = items.filter((service) => service.is_active);
    } else if (statusFilter === "inactive") {
      items = items.filter((service) => !service.is_active);
    }
    return items;
  }, [data, typeFilter, statusFilter]);

  const submitting =
    createMutation.isPending ||
    updateMutation.isPending ||
    toggleActiveMutation.isPending ||
    deleteMutation.isPending;

  const formSubmitError =
    createMutation.error ?? updateMutation.error
      ? getAdminServiceErrorMessage(createMutation.error ?? updateMutation.error)
      : null;

  async function handleToggleActive(service: AdminServiceRead) {
    setActionError(null);
    const nextActive = !service.is_active;
    const confirmed = window.confirm(
      nextActive
        ? `Activate ${service.name}?`
        : `Deactivate ${service.name}? It will be hidden from the public catalog.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await toggleActiveMutation.mutateAsync({ serviceId: service.id, isActive: nextActive });
    } catch (err) {
      setActionError(getAdminServiceErrorMessage(err, "Could not update service status."));
    }
  }

  async function handleDelete(service: AdminServiceRead) {
    setActionError(null);
    const confirmed = window.confirm(
      `Delete ${service.name}? This soft-deletes the service and hides it from public listings.`,
    );
    if (!confirmed) {
      return;
    }
    try {
      await deleteMutation.mutateAsync(service.id);
    } catch (err) {
      setActionError(getAdminServiceErrorMessage(err, "Could not delete service."));
    }
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-bold">Services</h2>
        <button
          type="button"
          onClick={() => {
            setFormMode("create");
            setEditingService(null);
            setPendingCreateImageFile(null);
            setSuccessMessage(null);
            setActionError(null);
          }}
          disabled={formMode === "create" || submitting}
          className="rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          Add service
        </button>
      </div>

      {successMessage ? (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {successMessage}
        </p>
      ) : null}

      {actionError ? <ErrorState title="Action failed" message={actionError} /> : null}

      <div className="flex flex-wrap gap-2">
        <FilterButton active={typeFilter === "all"} label="All" onClick={() => setTypeFilter("all")} />
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
          label="Inactive"
          onClick={() => setStatusFilter("inactive")}
        />
      </div>

      {formMode === "create" ? (
        <AdminServiceForm
          mode="create"
          businessId={businessId ?? undefined}
          pendingImageFile={pendingCreateImageFile}
          onPendingImageFileChange={setPendingCreateImageFile}
          submitting={createMutation.isPending}
          submitError={formSubmitError}
          onCancel={() => {
            setFormMode(null);
            setPendingCreateImageFile(null);
          }}
          onSubmit={(payload, options) => {
            createMutation.mutate(
              {
                payload: payload as ServiceCreatePayload,
                pendingImageFile: options?.pendingImageFile ?? null,
              },
              {
                onError: () => undefined,
              },
            );
          }}
        />
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

      {!isLoading && !isError && filteredServices.length === 0 ? (
        <EmptyState title="No services match these filters" />
      ) : null}

      {!isLoading && !isError ? (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {filteredServices.map((service) => {
            const duration =
              service.type === "booking" ? formatDuration(service.duration_minutes) : null;
            return (
              <article
                key={service.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="font-semibold text-slate-900">{service.name}</h3>
                  <TypeBadge type={service.type} />
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      service.is_active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {service.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                {service.description ? (
                  <p className="mt-2 text-sm text-slate-600">{service.description}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <PriceLabel service={service} />
                  {duration ? <span className="text-sm text-slate-500">{duration}</span> : null}
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFormMode("edit");
                      setEditingService(service);
                      setSuccessMessage(null);
                      setActionError(null);
                    }}
                    disabled={submitting}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleActive(service)}
                    disabled={submitting}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                  >
                    {service.is_active ? "Deactivate" : "Activate"}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(service)}
                    disabled={submitting}
                    className="rounded-lg border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-60"
                  >
                    Delete
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
