type Plan = {
  id: string;
  name: string;
  tagline: string;
  features: string[];
  recommended?: boolean;
};

const PLATFORM_PLANS: Plan[] = [
  {
    id: "free",
    name: "Free",
    tagline: "For testing and very small businesses",
    features: [
      "Up to 3 services",
      "Basic booking or request page",
      "Manual admin work",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For solo professionals",
    features: [
      "More services",
      "Booking + request flows",
      "Client management",
      "Email notifications when SMTP is configured",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For growing businesses",
    recommended: true,
    features: [
      "More capacity",
      "Team and admin workflows",
      "Operations dashboard",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For serious operations",
    features: [
      "Higher limits",
      "Priority setup and support (placeholder)",
      "Advanced features (placeholder)",
    ],
  },
];

export function PricingSection() {
  return (
    <section aria-labelledby="platform-pricing-heading" className="space-y-4">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-wide text-brand-700">
          Platform plans
        </p>
        <h2 id="platform-pricing-heading" className="mt-1 text-xl font-bold text-slate-900">
          Choose the right plan for your business
        </h2>
        <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-600">
          SaaS subscription tiers for using Service Platform — not prices for individual
          services your business offers to clients.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {PLATFORM_PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border bg-white p-4 shadow-sm ${
              plan.recommended
                ? "border-brand-300 ring-1 ring-brand-200"
                : "border-slate-200"
            }`}
          >
            {plan.recommended ? (
              <span className="absolute -top-2.5 left-4 rounded-full bg-brand-600 px-2.5 py-0.5 text-xs font-medium text-white">
                Recommended
              </span>
            ) : null}
            <h3 className="text-lg font-semibold text-slate-900">{plan.name}</h3>
            <p className="mt-1 text-sm text-slate-600">{plan.tagline}</p>
            <ul className="mt-4 flex-1 space-y-2 text-sm text-slate-700">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-brand-600" aria-hidden>
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
        Payments and plan upgrades are coming later. Current demo uses manual plan management.
      </p>
    </section>
  );
}
