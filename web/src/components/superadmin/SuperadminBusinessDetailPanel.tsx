import { useEffect, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSuperadminBusiness, updateSuperadminBusiness } from "@/api/superadminApi";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type {
  SubscriptionPlan,
  SuperadminBusinessDetail,
  SuperadminBusinessStatus,
} from "@/types/api";
import { getSuperadminErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const STATUS_OPTIONS: SuperadminBusinessStatus[] = ["active", "suspended", "pending_setup"];

const PLAN_OPTIONS: SubscriptionPlan[] = ["free", "starter", "business", "pro"];

type SuperadminBusinessDetailPanelProps = {
  businessId: string;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

type BusinessFormState = {
  status: SuperadminBusinessStatus;
  plan: SubscriptionPlan;
};

function formFromBusiness(business: SuperadminBusinessDetail): BusinessFormState {
  return {
    status: business.status,
    plan: business.subscription?.plan ?? "free",
  };
}

function formatLabel(value: string): string {
  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function SuperadminBusinessDetailPanel({
  businessId,
  onClose,
  onSuccess,
  onError,
}: SuperadminBusinessDetailPanelProps) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BusinessFormState | null>(null);

  const detailQuery = useQuery({
    queryKey: ["superadmin-business", businessId],
    queryFn: () => getSuperadminBusiness(businessId),
  });

  useEffect(() => {
    if (detailQuery.data) {
      setForm(formFromBusiness(detailQuery.data));
    }
  }, [detailQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (payload: Parameters<typeof updateSuperadminBusiness>[1]) =>
      updateSuperadminBusiness(businessId, payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["superadmin-businesses"] });
      await queryClient.invalidateQueries({ queryKey: ["superadmin-business", businessId] });
      await queryClient.invalidateQueries({ queryKey: ["superadmin-audit-logs"] });
    },
  });

  async function handleSave(event: FormEvent) {
    event.preventDefault();
    if (!form) {
      return;
    }
    try {
      await updateMutation.mutateAsync({
        status: form.status,
        plan: form.plan,
      });
      onSuccess("Business updated.");
    } catch (error) {
      onError(getSuperadminErrorMessage(error, "Could not update business."));
    }
  }

  if (detailQuery.isLoading) {
    return <LoadingState message="Loading business…" />;
  }

  if (detailQuery.isError) {
    return (
      <ErrorState
        title="Could not load business"
        message={getSuperadminErrorMessage(detailQuery.error, "Unable to load business")}
      />
    );
  }

  const business = detailQuery.data;
  if (!business || !form) {
    return null;
  }

  const saving = updateMutation.isPending;

  return (
    <div className="rounded-2xl border border-slate-300 bg-slate-50/80 p-4 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold text-slate-900">{business.name}</h3>
          <p className="font-mono text-sm text-slate-600">{business.slug}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-slate-600 hover:text-brand-700"
        >
          Close
        </button>
      </div>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Operating mode</dt>
          <dd className="text-slate-900">{formatLabel(business.operating_mode)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Timezone</dt>
          <dd className="text-slate-900">{business.timezone}</dd>
        </div>
        {business.owner ? (
          <div className="sm:col-span-2">
            <dt className="text-slate-500">Owner</dt>
            <dd className="text-slate-900">
              {business.owner.full_name ?? business.owner.email} ({business.owner.email})
            </dd>
          </div>
        ) : null}
        {business.subscription ? (
          <>
            <div>
              <dt className="text-slate-500">Subscription status</dt>
              <dd className="text-slate-900">{formatLabel(business.subscription.status)}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Usage</dt>
              <dd className="text-slate-900">
                {business.subscription.usage_bookings_count} bookings ·{" "}
                {business.subscription.usage_orders_count} orders
              </dd>
            </div>
          </>
        ) : null}
        <div>
          <dt className="text-slate-500">Created</dt>
          <dd className="text-slate-800">{formatDateTimeLabel(business.created_at)}</dd>
        </div>
        <div>
          <dt className="text-slate-500">Updated</dt>
          <dd className="text-slate-800">{formatDateTimeLabel(business.updated_at)}</dd>
        </div>
      </dl>

      <form onSubmit={handleSave} className="space-y-3 border-t border-slate-200 pt-4">
        <p className="text-sm font-medium text-slate-700">Manage business</p>
        <label htmlFor="businessStatus" className="block text-sm">
          <span className="font-medium text-slate-700">Status</span>
          <select
            id="businessStatus"
            value={form.status}
            disabled={saving}
            onChange={(event) =>
              setForm((current) =>
                current
                  ? { ...current, status: event.target.value as SuperadminBusinessStatus }
                  : current,
              )
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
          >
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {formatLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="businessPlan" className="block text-sm">
          <span className="font-medium text-slate-700">Plan</span>
          <select
            id="businessPlan"
            value={form.plan}
            disabled={saving}
            onChange={(event) =>
              setForm((current) =>
                current ? { ...current, plan: event.target.value as SubscriptionPlan } : current,
              )
            }
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-60"
          >
            {PLAN_OPTIONS.map((plan) => (
              <option key={plan} value={plan}>
                {formatLabel(plan)}
              </option>
            ))}
          </select>
        </label>
        <p className="text-xs text-slate-500">
          Plan changes are manual — no Stripe billing in this slice.
        </p>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save changes"}
        </button>
      </form>
    </div>
  );
}
