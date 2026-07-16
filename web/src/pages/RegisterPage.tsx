import { FormEvent, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { register } from "@/api/authApi";
import { AuthPageShell } from "@/components/AuthPageShell";
import { ErrorState } from "@/components/ErrorState";
import {
  LEGAL_CONSENT_ERROR_MESSAGE,
  LegalConsentCheckbox,
} from "@/components/LegalConsentCheckbox";
import {
  getPricingPlan,
  parsePricingPlanId,
  PRICING_PLANS,
  REGISTER_PLAN_INTENT_NOTE,
  type PricingPlanId,
} from "@/data/pricingPlans";
import { getRegisterErrorMessage } from "@/utils/errors";

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const MIN_PASSWORD_LENGTH = 8;

function normalizeSlug(value: string): string {
  return value.trim().toLowerCase();
}

function validateForm(values: {
  fullName: string;
  email: string;
  password: string;
  businessName: string;
  slug: string;
}): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.fullName.trim()) {
    errors.fullName = "Full name is required.";
  }
  if (!values.email.trim()) {
    errors.email = "Email is required.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email.trim())) {
    errors.email = "Enter a valid email address.";
  }
  if (!values.password) {
    errors.password = "Password is required.";
  } else if (values.password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (!values.businessName.trim()) {
    errors.businessName = "Business name is required.";
  }
  const slug = normalizeSlug(values.slug);
  if (!slug) {
    errors.slug = "Business slug is required.";
  } else if (!SLUG_PATTERN.test(slug)) {
    errors.slug = "Slug must use lowercase letters, numbers, and hyphens only.";
  }
  return errors;
}

export function RegisterPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedPlanId = parsePricingPlanId(searchParams.get("plan"));
  const selectedPlan = getPricingPlan(selectedPlanId);

  const [businessName, setBusinessName] = useState("");
  const [slug, setSlug] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [legalConsent, setLegalConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function handlePlanChange(planId: PricingPlanId) {
    setSearchParams({ plan: planId }, { replace: true });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitError(null);

    const errors = validateForm({
      fullName,
      email,
      password,
      businessName,
      slug,
    });
    if (!legalConsent) {
      errors.legalConsent = LEGAL_CONSENT_ERROR_MESSAGE;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        selected_plan_intent: selectedPlanId,
        legal_consent_accepted: true,
        business: {
          name: businessName.trim(),
          slug: normalizeSlug(slug),
        },
      });
      await queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      navigate("/check-email");
    } catch (err) {
      setSubmitError(getRegisterErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthPageShell className="space-y-6 max-w-lg">
      <div>
        <h1 className="text-2xl font-bold">Register your business</h1>
        <p className="mt-1 text-sm text-slate-600">
          Create a business owner account to manage services, bookings, and requests. After signup,
          check your email to verify your account.
        </p>
      </div>

      <div
        className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
        data-testid="register-customer-note"
      >
        <p className="font-medium">Looking to track a booking or request?</p>
        <p className="mt-1">
          This page creates a business account. Customers should{" "}
          <Link to="/client/register" className="font-medium text-brand-800 underline">
            create a client account
          </Link>
          , then{" "}
          <Link to="/me/claim" className="font-medium text-brand-800 underline">
            claim guest activity
          </Link>{" "}
          with their reference and the same email or phone used as a guest.
        </p>
      </div>

      <section
        aria-labelledby="register-plan-heading"
        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
      >
        <h2 id="register-plan-heading" className="text-sm font-semibold text-slate-900">
          Platform plan (signup intent)
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Selected: <span className="font-medium text-slate-900">{selectedPlan.name}</span>{" "}
          <span className="text-slate-700">({selectedPlan.priceLabel})</span>
        </p>
        <fieldset className="mt-3 space-y-2">
          <legend className="sr-only">Choose a platform plan</legend>
          {PRICING_PLANS.map((plan) => (
            <label
              key={plan.id}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-3 ${
                selectedPlanId === plan.id
                  ? "border-brand-400 ring-1 ring-brand-200"
                  : "border-slate-200"
              }`}
            >
              <input
                type="radio"
                name="platform-plan"
                value={plan.id}
                checked={selectedPlanId === plan.id}
                onChange={() => handlePlanChange(plan.id)}
                className="mt-1"
              />
              <span className="flex-1">
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-slate-900">{plan.name}</span>
                  <span className="text-sm text-slate-600">{plan.priceLabel}</span>
                  {plan.recommended ? (
                    <span className="rounded-full bg-brand-100 px-2 py-0.5 text-xs font-medium text-brand-800">
                      Recommended
                    </span>
                  ) : null}
                </span>
                <span className="mt-0.5 block text-xs text-slate-600">{plan.bestFor}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <p className="mt-3 text-xs text-slate-600">{REGISTER_PLAN_INTENT_NOTE}</p>
      </section>

      {submitError ? <ErrorState title="Registration failed" message={submitError} /> : null}
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Full name</span>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {fieldErrors.fullName ? (
            <p className="text-xs text-red-600">{fieldErrors.fullName}</p>
          ) : null}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {fieldErrors.email ? (
            <p className="text-xs text-red-600">{fieldErrors.email}</p>
          ) : null}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <p className="text-xs text-slate-500">At least {MIN_PASSWORD_LENGTH} characters.</p>
          {fieldErrors.password ? (
            <p className="text-xs text-red-600">{fieldErrors.password}</p>
          ) : null}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Business name</span>
          <input
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          {fieldErrors.businessName ? (
            <p className="text-xs text-red-600">{fieldErrors.businessName}</p>
          ) : null}
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium text-slate-700">Business slug</span>
          <input
            type="text"
            value={slug}
            onChange={(e) => setSlug(e.target.value)}
            placeholder="my-business"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <p className="text-xs text-slate-500">
            Used in your public URL: /b/your-slug
          </p>
          {fieldErrors.slug ? (
            <p className="text-xs text-red-600">{fieldErrors.slug}</p>
          ) : null}
        </label>
        <LegalConsentCheckbox
          id="register-legal-consent"
          checked={legalConsent}
          onChange={setLegalConsent}
          error={fieldErrors.legalConsent}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 font-medium text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? "Creating business account…" : "Create business account"}
        </button>
      </form>
      <p className="text-center text-sm text-slate-600">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-700 hover:underline">
          Sign in
        </Link>
      </p>
    </AuthPageShell>
  );
}
