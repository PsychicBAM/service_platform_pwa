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
import { DashboardPublicQrCard } from "@/components/admin/DashboardPublicQrCard";
import {
  DashboardRecentList,
  type DashboardRecentItem,
} from "@/components/admin/DashboardRecentList";
import { DashboardUpgradeCard } from "@/components/admin/DashboardUpgradeCard";
import { AdminOnboardingChecklist } from "@/components/admin/AdminOnboardingChecklist";
import { CurrentPlanCard } from "@/components/admin/CurrentPlanCard";
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

function IconServices() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M8 9h8M8 13h5" strokeLinecap="round" />
    </svg>
  );
}

function IconBookings() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 4h10l1 16H6L7 4Z" strokeLinejoin="round" />
      <path d="M9 8h6M9 12h6M9 16h4" strokeLinecap="round" />
    </svg>
  );
}

function IconClients() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm9 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z" />
      <path d="M3.5 19a4.5 4.5 0 0 1 9 0M12.5 19a4.5 4.5 0 0 1 8 0" strokeLinecap="round" />
    </svg>
  );
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
      dateIso: booking.starts_at,
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
    dateIso: order.created_at,
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
  const plan = business.subscription?.plan;

  return (
    <section className="w-full space-y-6 sm:space-y-7" data-testid="admin-dashboard-page">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Dashboard</h2>
        <p className="mt-1 text-sm text-gray-500">Overview for {business.name}</p>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_300px] 2xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-5">
          <AdminOnboardingChecklist
            business={business}
            services={services}
            schedule={scheduleQuery.data}
          />

          <PublicBusinessLinkCard
            businessName={business.name}
            businessSlug={business.slug}
            showQr={false}
          />

          <CurrentPlanCard plan={plan} status={business.subscription?.status} />

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Business overview</h3>
                <p className="mt-0.5 text-sm text-gray-500">{business.name}</p>
                <dl className="mt-3 space-y-1 text-sm text-gray-600">
                  <div>
                    <dt className="inline text-gray-500">Operating mode: </dt>
                    <dd className="inline font-medium text-gray-800">
                      {formatOperatingMode(business.operating_mode)}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-gray-500">Timezone: </dt>
                    <dd className="inline font-medium text-gray-800">{business.timezone}</dd>
                  </div>
                  <div>
                    <dt className="inline text-gray-500">Status: </dt>
                    <dd className="inline font-medium text-gray-800">
                      {formatStatusLabel(business.status)}
                    </dd>
                  </div>
                </dl>
              </div>
              <Link
                to="/admin/settings"
                className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
              >
                Business settings
              </Link>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <DashboardStatCard
                title="Services"
                value={totalServices}
                subtitle={
                  servicesQuery.isLoading
                    ? "Loading…"
                    : `${activeServices} active${inactiveServices > 0 ? ` · ${inactiveServices} inactive` : ""}`
                }
                to="/admin/services"
                icon={<IconServices />}
                iconTone="bg-sky-100 text-sky-700"
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
                icon={<IconBookings />}
                iconTone="bg-emerald-100 text-emerald-700"
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
                icon={<IconOrders />}
                iconTone="bg-violet-100 text-violet-700"
              />
              <DashboardStatCard
                title="Clients"
                value={clientsQuery.isLoading ? "…" : (clientsQuery.data?.meta.total ?? 0)}
                subtitle="Total"
                to="/admin/clients"
                icon={<IconClients />}
                iconTone="bg-amber-100 text-amber-700"
              />
            </div>
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

          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h3 className="text-base font-semibold text-gray-900">Quick actions</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {QUICK_ACTIONS.map((action) => (
                <Link
                  key={action.to}
                  to={action.to}
                  className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                >
                  {action.label}
                </Link>
              ))}
              {publicPageTo ? (
                <Link
                  to={publicPageTo}
                  className="inline-flex h-10 items-center rounded-xl bg-emerald-50 px-3.5 text-sm font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-200 outline-none hover:bg-emerald-100 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
                >
                  Public page
                </Link>
              ) : null}
            </div>
          </div>
        </div>

        <aside className="space-y-5 xl:sticky xl:top-4">
          <DashboardUpgradeCard plan={plan} />
          <DashboardPublicQrCard businessSlug={business.slug} />
        </aside>
      </div>
    </section>
  );
}
