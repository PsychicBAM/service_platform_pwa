import { Link } from "react-router-dom";
import type { ServiceType } from "@/types/api";

type AdminServiceWaitlistSectionProps = {
  serviceType: ServiceType;
  waitlistEnabled: boolean;
  serviceId?: string;
};

export function AdminServiceWaitlistSection({
  serviceType,
  waitlistEnabled,
  serviceId,
}: AdminServiceWaitlistSectionProps) {
  const isBooking = serviceType === "booking";

  if (!isBooking || !waitlistEnabled || !serviceId) {
    return null;
  }

  return (
    <section
      className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/60 p-4"
      data-testid="admin-service-waitlist"
    >
      <p className="text-sm text-slate-600">
        Manage waitlist entries from Admin &gt; Bookings → Waitlist.
      </p>
      <Link
        to="/admin/bookings?tab=waitlist"
        className="inline-flex rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-900 hover:bg-amber-100"
        data-testid="admin-service-open-waitlist"
      >
        Open waitlist
      </Link>
    </section>
  );
}
