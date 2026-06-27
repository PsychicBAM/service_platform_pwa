import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";

export function ServicesPage() {
  const { slug = "" } = useParams<{ slug: string }>();

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Services</h1>
        <Link to={`/b/${slug}`} className="text-sm text-brand-700 hover:underline">
          Back
        </Link>
      </div>
      <EmptyState
        title="Browse services"
        description="Full service listing and booking/order flows will be added in the next slice."
      />
    </section>
  );
}
