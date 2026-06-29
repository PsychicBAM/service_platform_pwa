import { useState } from "react";
import { Link } from "react-router-dom";
import {
  MANUAL_BILLING_NOTE,
  PRICING_PLANS,
  type PricingPlanId,
} from "@/data/pricingPlans";

export function PricingSection() {
  const [expandedPlanId, setExpandedPlanId] = useState<PricingPlanId | null>(null);

  function toggleDetails(planId: PricingPlanId) {
    setExpandedPlanId((current) => (current === planId ? null : planId));
  }

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
        {PRICING_PLANS.map((plan) => {
          const isExpanded = expandedPlanId === plan.id;
          const detailsId = `pricing-details-${plan.id}`;

          return (
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
              <p className="mt-1 text-2xl font-bold text-slate-900">{plan.priceLabel}</p>
              <p className="mt-1 text-sm text-slate-600">{plan.bestFor}</p>
              <p className="mt-2 text-sm text-slate-700">{plan.description}</p>

              <ul className="mt-3 space-y-1.5 text-sm text-slate-700">
                {plan.features.slice(0, isExpanded ? plan.features.length : 2).map((feature) => (
                  <li key={feature} className="flex gap-2">
                    <span className="text-brand-600" aria-hidden>
                      ✓
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isExpanded ? (
                <div id={detailsId} className="mt-3 border-t border-slate-100 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Limits
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
                    {plan.limits.map((limit) => (
                      <li key={limit} className="flex gap-2">
                        <span aria-hidden>•</span>
                        <span>{limit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => toggleDetails(plan.id)}
                  aria-expanded={isExpanded}
                  aria-controls={detailsId}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  {isExpanded ? "Hide details" : "View details"}
                </button>
                <Link
                  to={`/register?plan=${plan.id}`}
                  className={`w-full rounded-lg px-3 py-2 text-center text-sm font-semibold ${
                    plan.recommended
                      ? "bg-brand-600 text-white hover:bg-brand-700"
                      : "border border-brand-600 text-brand-700 hover:bg-brand-50"
                  }`}
                >
                  Choose {plan.name}
                </Link>
              </div>
            </article>
          );
        })}
      </div>

      <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm text-slate-600">
        {MANUAL_BILLING_NOTE}
      </p>
    </section>
  );
}
