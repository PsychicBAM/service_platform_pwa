import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";

export function ServiceDetailPage() {
  const { slug = "", serviceId = "" } = useParams<{
    slug: string;
    serviceId: string;
  }>();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Service detail</h1>
        <Link
          to={`/b/${slug}/services`}
          className="text-sm text-brand-700 hover:underline"
        >
          Back
        </Link>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Placeholder</p>
        <p className="mt-2 font-mono text-sm text-slate-700">{serviceId}</p>
      </div>
      <EmptyState
        title="Booking & order UI not implemented"
        description="Availability picker and checkout will be added in a future slice."
      />
    </section>
  );
}
