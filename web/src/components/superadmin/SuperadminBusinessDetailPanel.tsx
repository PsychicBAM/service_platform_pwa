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
import { formatPlanLabel, planIntentDiffers } from "@/utils/planManagement";

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
      onSuccess("Manual plan change saved.");
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
  const activePlan = business.subscription?.plan ?? "free";
  const intentDiffers = planIntentDiffers(activePlan, business.selected_plan_intent);

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

      {intentDiffers && business.selected_plan_intent ? (
        <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Customer requested {formatPlanLabel(business.selected_plan_intent)} during signup.
          Current active plan is {formatPlanLabel(activePlan)}.
        </p>
      ) : null}

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h4 className="text-sm font-semibold text-slate-900">Subscription</h4>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Active plan</dt>
            <dd className="font-medium text-slate-900">{formatPlanLabel(activePlan)}</dd>
          </div>
          <div>
            <dt className="text-slate-500">Status</dt>
            <dd className="text-slate-900">
              {business.subscription
                ? formatPlanLabel(business.subscription.status)
                : "None"}
            </dd>
          </div>
          {business.subscription ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Usage</dt>
              <dd className="text-slate-900">
                {business.subscription.usage_bookings_count} bookings ·{" "}
                {business.subscription.usage_orders_count} orders
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-3">
        <h4 className="text-sm font-semibold text-slate-900">Signup plan intent</h4>
        <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-slate-500">Requested plan</dt>
            <dd className="text-slate-900">
              {business.selected_plan_intent
                ? formatPlanLabel(business.selected_plan_intent)
                : "None"}
            </dd>
          </div>
          {business.selected_plan_intent_source ? (
            <div>
              <dt className="text-slate-500">Source</dt>
              <dd className="text-slate-900">
                {formatPlanLabel(business.selected_plan_intent_source)}
              </dd>
            </div>
          ) : null}
          {business.selected_plan_intent_recorded_at ? (
            <div className="sm:col-span-2">
              <dt className="text-slate-500">Recorded at</dt>
              <dd className="text-slate-900">
                {formatDateTimeLabel(business.selected_plan_intent_recorded_at)}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <dl className="grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-slate-500">Operating mode</dt>
          <dd className="text-slate-900">{formatPlanLabel(business.operating_mode)}</dd>
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
        <p className="text-sm font-medium text-slate-700">Manual plan management</p>
        <p className="text-xs text-slate-500">
          Plan changes are manual. Stripe checkout is not connected yet.
        </p>
        <label htmlFor="businessStatus" className="block text-sm">
          <span className="font-medium text-slate-700">Business status</span>
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
                {formatPlanLabel(status)}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="businessPlan" className="block text-sm">
          <span className="font-medium text-slate-700">Set active plan manually</span>
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
                {formatPlanLabel(plan)}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-900 disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save manual plan change"}
        </button>
      </form>
    </div>
  );
}
