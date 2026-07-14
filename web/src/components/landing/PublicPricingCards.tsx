import { Link } from "react-router-dom";
import { MANUAL_BILLING_NOTE, PRICING_PLANS, type PricingPlanId } from "@/data/pricingPlans";

const PLAN_CTA_LABELS: Record<PricingPlanId, string> = {
  free: "Get Free",
  starter: "Get Starter",
  business: "Get Business",
  pro: "Get Pro",
};

export function PublicPricingCards() {
  return (
    <section aria-labelledby="pricing-plans-heading" className="space-y-8">
      <div className="text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Pricing</p>
        <h1 id="pricing-plans-heading" className="mt-2 text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">
          Plans for every stage of growth
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
          Start free, then upgrade when you need more services, team workflows, and a polished public
          presence.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4" data-testid="pricing-plan-grid">
        {PRICING_PLANS.map((plan) => (
          <article
            key={plan.id}
            className={`relative flex flex-col rounded-2xl border bg-white p-5 shadow-sm ${
              plan.recommended
                ? "border-brand-300 shadow-md ring-1 ring-brand-200"
                : "border-slate-200"
            }`}
            data-testid={`pricing-plan-${plan.id}`}
          >
            {plan.recommended ? (
              <span className="absolute -top-3 left-5 rounded-full bg-brand-700 px-3 py-1 text-xs font-semibold text-white">
                Recommended
              </span>
            ) : null}
            <h2 className="text-xl font-bold text-slate-900">{plan.name}</h2>
            <p className="mt-2 text-3xl font-bold text-slate-900">{plan.priceLabel}</p>
            <p className="mt-2 text-sm font-medium text-slate-700">{plan.bestFor}</p>
            <p className="mt-2 text-sm text-slate-600">{plan.description}</p>

            <ul className="mt-5 flex-1 space-y-2 text-sm text-slate-700">
              {plan.features.map((feature) => (
                <li key={feature} className="flex gap-2">
                  <span className="text-brand-600" aria-hidden="true">
                    ✓
                  </span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>

            <Link
              to={`/register?plan=${plan.id}`}
              className={`mt-6 block rounded-xl px-4 py-3 text-center text-sm font-semibold ${
                plan.recommended
                  ? "bg-brand-700 text-white hover:bg-brand-800"
                  : "border-2 border-brand-700 text-brand-700 hover:bg-brand-50"
              }`}
              data-testid={`pricing-plan-cta-${plan.id}`}
            >
              {PLAN_CTA_LABELS[plan.id]}
            </Link>
          </article>
        ))}
      </div>

      <p className="rounded-2xl border border-slate-200 bg-white px-5 py-4 text-center text-sm text-slate-600">
        {MANUAL_BILLING_NOTE}
      </p>
    </section>
  );
}
