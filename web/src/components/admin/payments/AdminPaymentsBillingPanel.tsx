import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAdminServices } from "@/api/adminApi";
import {
  formatLimit,
  getHeroUpgradeCopy,
  getPublicPlan,
  getPublicPlanRank,
  PUBLIC_PLANS,
  toPublicPlanId,
  type PublicPlanId,
} from "@/components/admin/payments/paymentsPlanCatalog";
import type { BusinessAdminRead, CheckoutPlanId } from "@/types/api";

type AdminPaymentsBillingPanelProps = {
  businessId: string;
  business: BusinessAdminRead;
  checkoutLoadingPlan: CheckoutPlanId | null;
  billingMessage: string | null;
  onStartCheckout: (plan: CheckoutPlanId) => void;
};

function PlanIcon({ id }: { id: PublicPlanId }) {
  const tone =
    id === "free"
      ? "bg-emerald-50 text-emerald-700"
      : id === "starter"
        ? "bg-amber-50 text-amber-700"
        : id === "business"
          ? "bg-sky-50 text-sky-700"
          : "bg-violet-50 text-violet-700";
  return (
    <span
      className={`inline-flex h-11 w-11 items-center justify-center rounded-xl ${tone}`}
      aria-hidden="true"
    >
      {id === "free" ? "🍃" : id === "starter" ? "💼" : id === "business" ? "🚀" : "🏢"}
    </span>
  );
}

export function AdminPaymentsBillingPanel({
  businessId,
  business,
  checkoutLoadingPlan,
  billingMessage,
  onStartCheckout,
}: AdminPaymentsBillingPanelProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");
  const currentPublicId = toPublicPlanId(business.subscription?.plan);
  const currentPlan = getPublicPlan(currentPublicId);
  const currentRank = getPublicPlanRank(currentPublicId);
  const hero = getHeroUpgradeCopy(business.subscription?.plan);
  const status = business.subscription?.status?.toLowerCase() || "";
  const isActive = status === "active" || status === "trialing";

  const servicesQuery = useQuery({
    queryKey: ["admin-payments-services", businessId],
    queryFn: () => listAdminServices(businessId, { limit: 100, include_inactive: true }),
  });

  const servicesUsed = servicesQuery.data?.meta.total ?? servicesQuery.data?.data.length ?? 0;
  // Team invites are not available yet — count the owner as the only staff seat.
  const staffUsed = 1;

  const usageRows = useMemo(
    () => [
      {
        id: "services",
        label: "Services",
        used: servicesUsed,
        limit: currentPlan.servicesLimit,
        barClass: "bg-sky-500",
      },
      {
        id: "staff",
        label: "Staff members",
        used: staffUsed,
        limit: currentPlan.staffLimit,
        barClass: "bg-violet-500",
      },
    ],
    [currentPlan.servicesLimit, currentPlan.staffLimit, servicesUsed, staffUsed],
  );

  function handleUpgradeTo(publicId: PublicPlanId) {
    const plan = getPublicPlan(publicId);
    if (!plan.checkoutPlan) return;
    onStartCheckout(plan.checkoutPlan);
  }

  function handleHeroCta() {
    if (hero.isHighest) {
      document
        .getElementById("admin-payments-current-subscription")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    if (hero.target?.checkoutPlan) {
      onStartCheckout(hero.target.checkoutPlan);
    }
  }

  return (
    <div data-testid="admin-settings-payments-tab">
    <div className="space-y-5" data-testid="admin-payments-billing-page">
      {/* Upgrade hero */}
      <section
        className="relative overflow-hidden rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-50 via-emerald-50/70 to-white p-5 sm:p-6"
        data-testid="admin-payments-upgrade-hero"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M5 16.5 8.2 8l3.3 5.5L15.2 8l3.8 8.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4.5 18.5h15" strokeLinecap="round" />
              </svg>
            </span>
            <div>
              <h3 className="text-xl font-bold text-gray-900">{hero.title}</h3>
              <p className="mt-1 text-sm text-gray-600">{hero.subtitle}</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <div className="hidden h-16 w-28 rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-100 to-white shadow-sm sm:block" aria-hidden="true">
              <div className="flex h-full items-center justify-center text-emerald-700">
                <svg viewBox="0 0 48 32" className="h-10 w-14" fill="none">
                  <rect x="2" y="4" width="44" height="24" rx="4" className="stroke-emerald-600" strokeWidth="2" />
                  <path d="M2 12h44" className="stroke-emerald-500" strokeWidth="2" />
                  <circle cx="36" cy="20" r="3" className="fill-emerald-600" />
                </svg>
              </div>
            </div>
            <button
              type="button"
              onClick={handleHeroCta}
              disabled={
                !hero.isHighest &&
                (!hero.target?.checkoutPlan || checkoutLoadingPlan !== null)
              }
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-semibold text-white shadow-sm outline-none hover:bg-emerald-800 focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-60"
              data-testid="admin-payments-plan-cta"
            >
              <span aria-hidden="true">♛</span>
              {checkoutLoadingPlan && hero.target?.checkoutPlan === checkoutLoadingPlan
                ? "Starting checkout…"
                : hero.cta}
            </button>
            {!hero.isHighest ? (
              <p className="text-xs text-gray-500">Stripe checkout when billing is enabled.</p>
            ) : null}
          </div>
        </div>
      </section>

      {/* Pricing plans */}
      <section
        id="admin-payments-plans-anchor"
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">
              Choose the perfect plan for your business
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              All plans include core features. Upgrade or downgrade at any time.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 p-1">
            <button
              type="button"
              onClick={() => setBillingCycle("monthly")}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold ${
                billingCycle === "monthly"
                  ? "bg-emerald-600 text-white"
                  : "text-gray-600 hover:text-gray-800"
              }`}
            >
              Monthly billing
            </button>
            <button
              type="button"
              disabled
              title="Yearly billing is coming soon"
              className="cursor-not-allowed rounded-full px-3 py-1.5 text-xs font-semibold text-gray-400"
            >
              Yearly billing
              <span className="ml-1 rounded-full bg-gray-200 px-1.5 py-0.5 text-[10px] font-bold text-gray-600">
                Soon
              </span>
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {PUBLIC_PLANS.map((plan) => {
            const isCurrent = plan.id === currentPublicId;
            const isUpgrade = getPublicPlanRank(plan.id) > currentRank;
            const isLower = getPublicPlanRank(plan.id) < currentRank;
            const loading = plan.checkoutPlan != null && checkoutLoadingPlan === plan.checkoutPlan;

            let ctaLabel = "Current plan";
            if (isUpgrade) {
              ctaLabel = plan.checkoutPlan
                ? `Upgrade to ${plan.name}`
                : `${plan.name} coming soon`;
            } else if (isLower) {
              ctaLabel = plan.name;
            }

            return (
              <article
                key={plan.id}
                className={`relative flex h-full flex-col rounded-2xl border bg-white p-5 shadow-sm ${
                  isCurrent
                    ? "border-emerald-500 ring-2 ring-emerald-500/30"
                    : plan.recommended
                      ? "border-amber-300"
                      : "border-gray-200"
                }`}
                data-testid={`admin-payments-plan-card-${plan.id}`}
                data-current={isCurrent ? "true" : "false"}
              >
                {plan.recommended ? (
                  <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-400 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-950">
                    Best value
                  </span>
                ) : null}
                <PlanIcon id={plan.id} />
                <h4 className="mt-3 text-lg font-bold text-gray-900">{plan.name}</h4>
                <p className="mt-0.5 text-sm text-gray-500">{plan.subtitle}</p>
                <p className="mt-4 flex items-end gap-1">
                  <span className="text-3xl font-bold tracking-tight text-gray-900">
                    {plan.priceLabel}
                  </span>
                  <span className="pb-1 text-sm text-gray-500">/month</span>
                </p>
                {isCurrent ? (
                  <span
                    className="mt-2 inline-flex w-fit rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-100"
                    data-testid="admin-payments-plan-current-badge"
                  >
                    Current plan
                  </span>
                ) : null}
                <ul className="mt-4 flex-1 space-y-2 text-sm text-gray-600">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2">
                      <span className="mt-0.5 text-emerald-600" aria-hidden="true">
                        ✓
                      </span>
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  disabled={
                    isCurrent ||
                    isLower ||
                    !plan.checkoutPlan ||
                    checkoutLoadingPlan !== null
                  }
                  onClick={() => handleUpgradeTo(plan.id)}
                  className={`mt-5 inline-flex h-11 w-full items-center justify-center rounded-xl text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 disabled:cursor-not-allowed disabled:opacity-70 ${
                    isCurrent
                      ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                      : isUpgrade && plan.checkoutPlan
                        ? plan.recommended
                          ? "bg-emerald-700 text-white hover:bg-emerald-800"
                          : "border border-emerald-600 bg-white text-emerald-800 hover:bg-emerald-50"
                        : "border border-gray-200 bg-gray-50 text-gray-500"
                  }`}
                  data-testid={`admin-payments-plan-cta-${plan.id}`}
                >
                  {loading ? "Starting checkout…" : ctaLabel}
                </button>
              </article>
            );
          })}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500">
          <p>Secure payments powered by Stripe when billing is enabled.</p>
          <p className="font-medium text-gray-500">Need help choosing? Reach out via your account support channel.</p>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-2">
        <div className="space-y-5">
          {/* Current subscription */}
          <section
            id="admin-payments-current-subscription"
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            data-testid="admin-payments-current-subscription"
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-semibold text-gray-900">Current subscription</h3>
              {isActive ? (
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-100">
                  Active
                </span>
              ) : business.subscription?.status ? (
                <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-700">
                  {business.subscription.status}
                </span>
              ) : null}
            </div>

            <div className="mt-4 rounded-xl border border-gray-100 bg-gray-50/80 p-4">
              <div className="flex items-start gap-3">
                <PlanIcon id={currentPublicId} />
                <div>
                  <p className="font-semibold text-gray-900">{currentPlan.name} Plan</p>
                  <p className="mt-0.5 text-sm text-gray-600">
                    {currentPlan.priceLabel} / month
                  </p>
                  <p className="mt-2 text-xs text-gray-500">Billing cycle: Monthly</p>
                  <p className="mt-1 text-xs text-gray-500">
                    Next billing date is shown when Stripe billing is enabled for your account.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  document
                    .getElementById("admin-payments-plans-anchor")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-3.5 text-sm font-semibold text-gray-800 hover:bg-gray-50"
              >
                View plan details
              </button>
            </div>
            <p className="mt-3 text-xs text-gray-500">
              Billing management and cancellation will be available when payments are enabled.
            </p>
          </section>

          {/* Billing history */}
          <section
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            data-testid="admin-payments-billing-history"
          >
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-base font-semibold text-gray-900">Billing history</h3>
            </div>
            <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-800">No invoices yet</p>
              <p className="mt-1 text-xs text-gray-500">
                Invoices will appear here after payments are processed.
              </p>
            </div>
          </section>
        </div>

        <div className="space-y-5">
          {/* Payment method */}
          <section
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            data-testid="admin-payments-payment-method"
          >
            <h3 className="text-base font-semibold text-gray-900">Payment method</h3>
            <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50/70 px-4 py-6 text-center">
              <p className="text-sm font-medium text-gray-800">No payment method on file</p>
              <p className="mt-1 text-xs text-gray-500">
                Payment methods will be managed through Stripe when billing is enabled.
              </p>
            </div>
          </section>

          {/* Usage */}
          <section
            className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
            data-testid="admin-payments-usage"
          >
            <h3 className="text-base font-semibold text-gray-900">Usage this cycle</h3>
            <ul className="mt-4 space-y-4">
              {usageRows.map((row) => {
                const limit = row.limit;
                const unlimited = limit == null;
                const pct = unlimited
                  ? 0
                  : Math.min(100, Math.round((row.used / Math.max(limit, 1)) * 100));
                return (
                  <li key={row.id}>
                    <div className="flex items-center justify-between gap-2 text-sm">
                      <span className="font-medium text-gray-800">{row.label}</span>
                      <span className="text-gray-500">
                        {row.used}/{formatLimit(row.limit)}
                      </span>
                    </div>
                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                      {unlimited ? (
                        <div className="h-full w-full rounded-full bg-emerald-200/80" />
                      ) : (
                        <div
                          className={`h-full rounded-full ${row.barClass}`}
                          style={{ width: `${pct}%` }}
                        />
                      )}
                    </div>
                    {unlimited ? (
                      <p className="mt-1 text-xs text-gray-500">Unlimited on your plan</p>
                    ) : null}
                  </li>
                );
              })}
            </ul>
            {currentRank < getPublicPlanRank("pro") ? (
              <p className="mt-4 text-xs text-gray-500">
                Need more? Upgrade your plan to increase limits.
              </p>
            ) : null}
          </section>
        </div>
      </div>

      {billingMessage ? (
        <p
          role="alert"
          className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900"
        >
          {billingMessage}
        </p>
      ) : null}

      {/* Security footer */}
      <section
        className="flex flex-col gap-4 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-5 sm:flex-row sm:items-center sm:justify-between"
        data-testid="admin-payments-security-note"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-800">
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6l-7-3Z" strokeLinejoin="round" />
              <path d="m9 12 2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
          <div>
            <p className="text-sm font-semibold text-gray-900">Your security is our priority</p>
            <p className="mt-0.5 text-sm text-gray-600">
              Payments are processed securely through Stripe where billing is enabled.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold text-emerald-800">
          <span className="rounded-full bg-white/80 px-2.5 py-1 ring-1 ring-emerald-100">
            Secure checkout
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-1 ring-1 ring-emerald-100">
            Encrypted payments
          </span>
          <span className="rounded-full bg-white/80 px-2.5 py-1 ring-1 ring-emerald-100">
            Stripe powered
          </span>
        </div>
      </section>
    </div>
    </div>
  );
}
