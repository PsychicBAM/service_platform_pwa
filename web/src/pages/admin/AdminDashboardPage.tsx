import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  getBusiness,
  getSchedule,
  listAdminBookings,
  listAdminClients,
  listAdminOrders,
  listAdminServices,
} from "@/api/adminApi";
import {
  DashboardAttentionList,
  type DashboardAttentionItem,
} from "@/components/admin/DashboardAttentionList";
import {
  DashboardRecentList,
  type DashboardRecentItem,
} from "@/components/admin/DashboardRecentList";
import { DashboardStatCard } from "@/components/admin/DashboardStatCard";
import { PublicBusinessLinkCard } from "@/components/admin/PublicBusinessLinkCard";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import type { OperatingMode, ScheduleRead } from "@/types/api";
import { getAdminSettingsErrorMessage, getMeErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

const QUICK_ACTIONS = [
  { to: "/admin/services", label: "Add service" },
  { to: "/admin/schedule", label: "Manage schedule" },
  { to: "/admin/bookings", label: "View bookings" },
  { to: "/admin/orders", label: "View orders" },
  { to: "/admin/clients", label: "View clients" },
] as const;

function formatOperatingMode(mode: OperatingMode): string {
  if (mode === "booking_only") {
    return "Appointments only";
  }
  if (mode === "orders_only") {
    return "Requests only";
  }
  return "Appointments and requests";
}

function formatStatusLabel(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function hasWorkingHoursConfigured(schedule: ScheduleRead | undefined): boolean {
  if (!schedule) {
    return true;
  }
  return schedule.working_hours.some(
    (hour) => hour.is_open && hour.opens_at != null && hour.closes_at != null,
  );
}

function buildAttentionItems(input: {
  pendingBookings: number;
  submittedOrders: number;
  inProgressOrders: number;
  inactiveServices: number;
  businessStatus: string | undefined;
  scheduleConfigured: boolean;
}): DashboardAttentionItem[] {
  const items: DashboardAttentionItem[] = [];

  if (input.pendingBookings > 0) {
    items.push({
      id: "pending-bookings",
      label: `${input.pendingBookings} pending booking${input.pendingBookings === 1 ? "" : "s"} need confirmation`,
      to: "/admin/bookings",
    });
  }
  if (input.submittedOrders > 0) {
    items.push({
      id: "submitted-orders",
      label: `${input.submittedOrders} submitted order${input.submittedOrders === 1 ? "" : "s"} awaiting review`,
      to: "/admin/orders",
    });
  }
  if (input.inProgressOrders > 0) {
    items.push({
      id: "in-progress-orders",
      label: `${input.inProgressOrders} order${input.inProgressOrders === 1 ? "" : "s"} in progress`,
      to: "/admin/orders",
    });
  }
  if (input.inactiveServices > 0) {
    items.push({
      id: "inactive-services",
      label: `${input.inactiveServices} inactive service${input.inactiveServices === 1 ? "" : "s"}`,
      to: "/admin/services",
    });
  }
  if (input.businessStatus && input.businessStatus !== "active") {
    items.push({
      id: "business-status",
      label: `Business status is ${formatStatusLabel(input.businessStatus)}`,
      to: "/admin/settings",
    });
  }
  if (!input.scheduleConfigured) {
    items.push({
      id: "working-hours",
      label: "No working hours configured",
      to: "/admin/schedule",
    });
  }

  return items;
}

export function AdminDashboardPage() {
  const { businessId, businessSlug } = useAdminBusiness();
  const enabled = Boolean(businessId);

  const businessQuery = useQuery({
    queryKey: ["admin-business", businessId],
    queryFn: () => getBusiness(businessId!),
    enabled,
  });

  const servicesQuery = useQuery({
    queryKey: ["admin-dashboard-services", businessId],
    queryFn: () => listAdminServices(businessId!, { limit: 100, include_inactive: true }),
    enabled,
  });

  const bookingsQuery = useQuery({
    queryKey: ["admin-dashboard-bookings", businessId],
    queryFn: () => listAdminBookings(businessId!, { limit: 5 }),
    enabled,
  });

  const pendingBookingsQuery = useQuery({
    queryKey: ["admin-dashboard-bookings-pending", businessId],
    queryFn: () => listAdminBookings(businessId!, { status: "pending", limit: 1 }),
    enabled,
  });

  const ordersQuery = useQuery({
    queryKey: ["admin-dashboard-orders", businessId],
    queryFn: () => listAdminOrders(businessId!, { limit: 5 }),
    enabled,
  });

  const submittedOrdersQuery = useQuery({
    queryKey: ["admin-dashboard-orders-submitted", businessId],
    queryFn: () => listAdminOrders(businessId!, { status: "submitted", limit: 1 }),
    enabled,
  });

  const inProgressOrdersQuery = useQuery({
    queryKey: ["admin-dashboard-orders-in-progress", businessId],
    queryFn: () => listAdminOrders(businessId!, { status: "in_progress", limit: 1 }),
    enabled,
  });

  const clientsQuery = useQuery({
    queryKey: ["admin-dashboard-clients", businessId],
    queryFn: () => listAdminClients(businessId!, { limit: 1 }),
    enabled,
  });

  const scheduleQuery = useQuery({
    queryKey: ["admin-schedule", businessId],
    queryFn: () => getSchedule(businessId!),
    enabled,
  });

  if (businessQuery.isLoading) {
    return <LoadingState message="Loading dashboard…" />;
  }

  if (businessQuery.isError) {
    return (
      <ErrorState
        title="Could not load dashboard"
        message={getAdminSettingsErrorMessage(businessQuery.error, "Unable to load business")}
      />
    );
  }

  const business = businessQuery.data;
  if (!business) {
    return null;
  }

  const services = servicesQuery.data?.data ?? [];
  const activeServices = services.filter((service) => service.is_active).length;
  const inactiveServices = services.filter((service) => !service.is_active).length;
  const totalServices = servicesQuery.data?.meta.total ?? services.length;

  const recentBookings: DashboardRecentItem[] = (bookingsQuery.data?.data ?? []).map(
    (booking) => ({
      id: booking.id,
      reference: booking.reference,
      status: booking.status,
      statusKind: "booking",
      serviceName: booking.service_name,
      clientName: booking.client_name,
      dateLabel: formatDateTimeLabel(booking.starts_at),
    }),
  );

  const recentOrders: DashboardRecentItem[] = (ordersQuery.data?.data ?? []).map((order) => ({
    id: order.id,
    reference: order.reference,
    status: order.status,
    statusKind: "order",
    serviceName: order.service_name,
    clientName: order.client_name,
    dateLabel: formatDateTimeLabel(order.created_at),
  }));

  const attentionItems = buildAttentionItems({
    pendingBookings: pendingBookingsQuery.data?.meta.total ?? 0,
    submittedOrders: submittedOrdersQuery.data?.meta.total ?? 0,
    inProgressOrders: inProgressOrdersQuery.data?.meta.total ?? 0,
    inactiveServices,
    businessStatus: business.status,
    scheduleConfigured: hasWorkingHoursConfigured(scheduleQuery.data),
  });

  const publicPageTo = businessSlug ? `/b/${businessSlug}` : null;

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">Overview for {business.name}</p>
      </div>

      <PublicBusinessLinkCard businessName={business.name} businessSlug={business.slug} />

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-slate-900">{business.name}</h3>
            <dl className="mt-2 space-y-1 text-sm text-slate-600">
              <div>
                <dt className="inline text-slate-500">Operating mode: </dt>
                <dd className="inline">{formatOperatingMode(business.operating_mode)}</dd>
              </div>
              <div>
                <dt className="inline text-slate-500">Timezone: </dt>
                <dd className="inline">{business.timezone}</dd>
              </div>
              <div>
                <dt className="inline text-slate-500">Status: </dt>
                <dd className="inline">{formatStatusLabel(business.status)}</dd>
              </div>
              {business.subscription ? (
                <div>
                  <dt className="inline text-slate-500">Subscription: </dt>
                  <dd className="inline">
                    {business.subscription.plan} · {business.subscription.status}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          <Link
            to="/admin/settings"
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Business settings
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <DashboardStatCard
          title="Services"
          value={totalServices}
          subtitle={
            servicesQuery.isLoading
              ? "Loading…"
              : `${activeServices} active${inactiveServices > 0 ? ` · ${inactiveServices} inactive` : ""}`
          }
          to="/admin/services"
        />
        <DashboardStatCard
          title="Bookings"
          value={bookingsQuery.isLoading ? "…" : (bookingsQuery.data?.meta.total ?? 0)}
          subtitle={
            pendingBookingsQuery.isLoading
              ? undefined
              : `${pendingBookingsQuery.data?.meta.total ?? 0} pending`
          }
          to="/admin/bookings"
        />
        <DashboardStatCard
          title="Orders"
          value={ordersQuery.isLoading ? "…" : (ordersQuery.data?.meta.total ?? 0)}
          subtitle={
            submittedOrdersQuery.isLoading
              ? undefined
              : `${submittedOrdersQuery.data?.meta.total ?? 0} submitted`
          }
          to="/admin/orders"
        />
        <DashboardStatCard
          title="Clients"
          value={clientsQuery.isLoading ? "…" : (clientsQuery.data?.meta.total ?? 0)}
          to="/admin/clients"
        />
      </div>

      <DashboardAttentionList items={attentionItems} />

      <div className="grid gap-4 lg:grid-cols-2">
        <DashboardRecentList
          title="Recent bookings"
          emptyMessage="No bookings yet."
          viewAllTo="/admin/bookings"
          items={recentBookings}
          isLoading={bookingsQuery.isLoading}
          isError={bookingsQuery.isError}
          errorMessage={getMeErrorMessage(bookingsQuery.error, "Unable to load bookings")}
        />
        <DashboardRecentList
          title="Recent orders"
          emptyMessage="No orders yet."
          viewAllTo="/admin/orders"
          items={recentOrders}
          isLoading={ordersQuery.isLoading}
          isError={ordersQuery.isError}
          errorMessage={getMeErrorMessage(ordersQuery.error, "Unable to load orders")}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <h3 className="text-sm font-medium text-slate-700">Quick actions</h3>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_ACTIONS.map((action) => (
            <Link
              key={action.to}
              to={action.to}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              {action.label}
            </Link>
          ))}
          {publicPageTo ? (
            <Link
              to={publicPageTo}
              className="rounded-lg border border-brand-300 px-3 py-1.5 text-sm font-medium text-brand-700 hover:bg-brand-50"
            >
              Public page
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
