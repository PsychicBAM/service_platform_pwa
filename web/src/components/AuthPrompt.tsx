import { Link } from "react-router-dom";

type AuthPromptProps = {
  title?: string;
  description?: string;
};

export function AuthPrompt({
  title = "Sign in required",
  description = "Log in to view items linked to your account.",
}: AuthPromptProps) {
  return (
    <section className="space-y-4">
      <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-8 text-center">
        <h2 className="text-base font-medium text-slate-800">{title}</h2>
        <p className="mt-2 text-sm text-slate-600">{description}</p>
      </div>
      <Link
        to="/login"
        className="block rounded-xl bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
      >
        Go to login
      </Link>
    </section>
  );
}
