import { Link } from "react-router-dom";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";

const CARDS = [
  { to: "/admin/services", label: "Services", description: "Manage bookable and request services" },
  { to: "/admin/bookings", label: "Bookings", description: "View appointment bookings" },
  { to: "/admin/orders", label: "Orders", description: "View service requests" },
  { to: "/admin/clients", label: "Clients", description: "Browse client records" },
];

export function AdminDashboardPage() {
  const { businessName } = useAdminBusiness();

  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
        <p className="mt-1 text-sm text-slate-600">
          {businessName ? `Managing ${businessName}` : "Business overview"}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <Link
            key={card.to}
            to={card.to}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-brand-300"
          >
            <h3 className="font-semibold text-slate-900">{card.label}</h3>
            <p className="mt-1 text-sm text-slate-600">{card.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
