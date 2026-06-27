import { useQuery } from "@tanstack/react-query";
import { getBusiness } from "@/api/adminApi";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { getMeErrorMessage } from "@/utils/errors";

export function AdminSettingsPage() {
  const { businessId } = useAdminBusiness();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-business", businessId],
    queryFn: () => getBusiness(businessId!),
    enabled: Boolean(businessId),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Settings</h2>

      {isLoading ? <LoadingState message="Loading settings…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load settings"
          message={getMeErrorMessage(error, "Unable to load business settings")}
        />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-slate-500">Business name</dt>
              <dd className="font-medium text-slate-900">{data.name}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Operating mode</dt>
              <dd className="font-medium text-slate-900">{data.operating_mode}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Timezone</dt>
              <dd className="font-medium text-slate-900">{data.timezone}</dd>
            </div>
            <div>
              <dt className="text-slate-500">Status</dt>
              <dd className="font-medium text-slate-900">{data.status}</dd>
            </div>
          </dl>
        </div>
      ) : null}
    </section>
  );
}
