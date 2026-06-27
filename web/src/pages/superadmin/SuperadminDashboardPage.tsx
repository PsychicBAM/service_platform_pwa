import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { listSuperadminBusinesses } from "@/api/superadminApi";
import { DashboardStatCard } from "@/components/admin/DashboardStatCard";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import type { SuperadminBusinessStatus } from "@/types/api";
import { getSuperadminErrorMessage } from "@/utils/errors";

function countByStatus(
  businesses: Array<{ status: SuperadminBusinessStatus }>,
  status: SuperadminBusinessStatus,
): number {
  return businesses.filter((business) => business.status === status).length;
}

export function SuperadminDashboardPage() {
  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["superadmin-businesses", "dashboard"],
    queryFn: () => listSuperadminBusinesses({ limit: 100 }),
  });

  if (isLoading) {
    return <LoadingState message="Loading overview…" />;
  }

  if (isError) {
    return (
      <ErrorState
        title="Could not load overview"
        message={getSuperadminErrorMessage(error, "Unable to load businesses")}
      />
    );
  }

  const businesses = data?.data ?? [];
  const total = data?.meta.total ?? businesses.length;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Overview</h2>
        <p className="mt-1 text-sm text-slate-600">Platform-wide business summary</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard title="Total businesses" value={total} to="/superadmin/businesses" />
        <DashboardStatCard
          title="Active"
          value={countByStatus(businesses, "active")}
          to="/superadmin/businesses"
        />
        <DashboardStatCard
          title="Suspended"
          value={countByStatus(businesses, "suspended")}
          to="/superadmin/businesses"
        />
        <DashboardStatCard
          title="Pending setup"
          value={countByStatus(businesses, "pending_setup")}
          to="/superadmin/businesses"
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700">Quick links</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            to="/superadmin/businesses"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Manage businesses
          </Link>
          <Link
            to="/superadmin/audit-logs"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            View audit logs
          </Link>
        </div>
      </div>
    </section>
  );
}
