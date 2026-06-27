import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <section className="space-y-4 py-12 text-center">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="text-sm text-slate-600">The page you requested does not exist.</p>
      <Link
        to="/"
        className="inline-block rounded-xl bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
      >
        Go home
      </Link>
    </section>
  );
}
