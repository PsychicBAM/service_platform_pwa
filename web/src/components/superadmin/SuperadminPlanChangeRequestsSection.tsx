import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveSuperadminPlanChangeRequest,
  listSuperadminPlanChangeRequests,
  rejectSuperadminPlanChangeRequest,
} from "@/api/superadminApi";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type { SuperadminPlanChangeRequestRead } from "@/types/api";
import { getSuperadminErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";
import { formatPlanLabel } from "@/utils/planManagement";

type SuperadminPlanChangeRequestsSectionProps = {
  onOpenBusiness: (businessId: string) => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
};

export function SuperadminPlanChangeRequestsSection({
  onOpenBusiness,
  onSuccess,
  onError,
}: SuperadminPlanChangeRequestsSectionProps) {
  const queryClient = useQueryClient();

  const listQuery = useQuery({
    queryKey: ["superadmin-plan-change-requests", "pending"],
    queryFn: () => listSuperadminPlanChangeRequests({ status: "pending", limit: 50 }),
  });

  const approveMutation = useMutation({
    mutationFn: (requestId: string) => approveSuperadminPlanChangeRequest(requestId),
  });

  const rejectMutation = useMutation({
    mutationFn: (requestId: string) => rejectSuperadminPlanChangeRequest(requestId),
  });

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["superadmin-plan-change-requests"] });
    await queryClient.invalidateQueries({ queryKey: ["superadmin-businesses"] });
    await queryClient.invalidateQueries({ queryKey: ["superadmin-business"] });
    await queryClient.invalidateQueries({ queryKey: ["superadmin-audit-logs"] });
  }

  async function handleApprove(request: SuperadminPlanChangeRequestRead) {
    try {
      await approveMutation.mutateAsync(request.id);
      await refresh();
      onSuccess(
        `Approved plan change for ${request.business_name}: now ${formatPlanLabel(request.requested_plan)}.`,
      );
    } catch (error) {
      onError(getSuperadminErrorMessage(error, "Could not approve plan change request."));
    }
  }

  async function handleReject(request: SuperadminPlanChangeRequestRead) {
    try {
      await rejectMutation.mutateAsync(request.id);
      await refresh();
      onSuccess(`Rejected plan change request for ${request.business_name}.`);
    } catch (error) {
      onError(getSuperadminErrorMessage(error, "Could not reject plan change request."));
    }
  }

  const rows = listQuery.data?.data ?? [];
  const busyId =
    approveMutation.isPending || rejectMutation.isPending
      ? (approveMutation.variables ?? rejectMutation.variables ?? null)
      : null;

  return (
    <section
      className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4"
      data-testid="superadmin-plan-change-requests"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Plan change requests</h3>
          <p className="mt-0.5 text-sm text-slate-600">
            Pending upgrade/downgrade requests from business admins.
          </p>
        </div>
        <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
          {listQuery.data?.meta.total ?? 0} pending
        </span>
      </div>

      {listQuery.isLoading ? <LoadingState message="Loading plan requests…" /> : null}
      {listQuery.isError ? (
        <div className="mt-3">
          <ErrorState
            title="Could not load plan requests"
            message={getSuperadminErrorMessage(listQuery.error, "Unable to load requests")}
          />
        </div>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && rows.length === 0 ? (
        <p className="mt-3 text-sm text-slate-600">No pending plan change requests.</p>
      ) : null}

      {!listQuery.isLoading && !listQuery.isError && rows.length > 0 ? (
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-2 py-2 font-semibold">Business</th>
                <th className="px-2 py-2 font-semibold">Current</th>
                <th className="px-2 py-2 font-semibold">Requested</th>
                <th className="px-2 py-2 font-semibold">Direction</th>
                <th className="px-2 py-2 font-semibold">Requested at</th>
                <th className="px-2 py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-100 bg-white/70">
              {rows.map((request) => (
                <tr key={request.id} data-testid={`superadmin-plan-change-row-${request.id}`}>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => onOpenBusiness(request.business_id)}
                      className="font-medium text-slate-900 underline-offset-2 hover:underline"
                    >
                      {request.business_name}
                    </button>
                    <p className="font-mono text-xs text-slate-500">{request.business_slug}</p>
                  </td>
                  <td className="px-2 py-2">{formatPlanLabel(request.current_plan)}</td>
                  <td className="px-2 py-2 font-medium text-slate-900">
                    {formatPlanLabel(request.requested_plan)}
                  </td>
                  <td className="px-2 py-2 capitalize">{request.direction}</td>
                  <td className="px-2 py-2 text-slate-600">
                    {formatDateTimeLabel(request.created_at)}
                  </td>
                  <td className="px-2 py-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => {
                          void handleApprove(request);
                        }}
                        className="rounded-lg bg-emerald-700 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                        data-testid={`superadmin-plan-change-approve-${request.id}`}
                      >
                        {busyId === request.id && approveMutation.isPending
                          ? "Approving…"
                          : "Approve"}
                      </button>
                      <button
                        type="button"
                        disabled={busyId !== null}
                        onClick={() => {
                          void handleReject(request);
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                        data-testid={`superadmin-plan-change-reject-${request.id}`}
                      >
                        {busyId === request.id && rejectMutation.isPending
                          ? "Rejecting…"
                          : "Reject"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </section>
  );
}
