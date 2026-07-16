import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { claimGuestBooking, claimGuestOrder } from "@/api/meApi";
import { FormPageShell } from "@/components/FormPageShell";
import { AuthPrompt } from "@/components/AuthPrompt";
import { ErrorState } from "@/components/ErrorState";
import { FormField } from "@/components/FormField";
import { StatusBadge } from "@/components/StatusBadge";
import { useAuth } from "@/hooks/useAuth";
import type {
  ClaimGuestBookingResponse,
  ClaimGuestOrderResponse,
  MyBookingDetail,
  MyOrderDetail,
} from "@/types/api";
import { getClaimErrorMessage } from "@/utils/errors";

type ClaimType = "booking" | "order";

type FieldErrors = {
  reference?: string;
  contact?: string;
  email?: string;
};

type ClaimSuccess =
  | { type: "booking"; item: MyBookingDetail; alreadyLinked: boolean }
  | { type: "order"; item: MyOrderDetail; alreadyLinked: boolean };

function parseClaimType(value: string | null): ClaimType {
  if (value === "order" || value === "request") {
    return "order";
  }
  return "booking";
}

function validateClaimForm(reference: string, email: string, phone: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedReference = reference.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();

  if (!trimmedReference) {
    errors.reference = "Reference is required.";
  }
  if (!trimmedEmail && !trimmedPhone) {
    errors.contact = "Enter the email or phone you used as a guest.";
  }
  if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    errors.email = "Enter a valid email address.";
  }

  return errors;
}

function buildPayload(
  reference: string,
  email: string,
  phone: string,
  businessSlug: string,
) {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhone = phone.trim();
  const trimmedBusiness = businessSlug.trim();
  return {
    reference: reference.trim(),
    ...(trimmedEmail ? { email: trimmedEmail } : {}),
    ...(trimmedPhone ? { phone: trimmedPhone } : {}),
    ...(trimmedBusiness ? { business_slug: trimmedBusiness } : {}),
  };
}

export function ClaimGuestPage() {
  const { isAuthenticated, user } = useAuth();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const locationMessage =
    typeof (location.state as { message?: unknown } | null)?.message === "string"
      ? ((location.state as { message: string }).message)
      : null;
  const autoClaimFailed = searchParams.get("autoClaimFailed") === "1";

  const [claimType, setClaimType] = useState<ClaimType>(
    parseClaimType(searchParams.get("type")),
  );
  const [reference, setReference] = useState(searchParams.get("reference")?.trim() ?? "");
  const [businessSlug] = useState(searchParams.get("business")?.trim() ?? "");
  const [email, setEmail] = useState(() => user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ClaimSuccess | null>(null);
  const [emailTouched, setEmailTouched] = useState(Boolean(user?.email));

  useEffect(() => {
    if (!emailTouched && user?.email) {
      setEmail(user.email);
    }
  }, [emailTouched, user?.email]);

  const claimMutation = useMutation({
    mutationFn: async (): Promise<ClaimSuccess> => {
      const payload = buildPayload(reference, email, phone, businessSlug);
      if (claimType === "booking") {
        const response: ClaimGuestBookingResponse = await claimGuestBooking(payload);
        return {
          type: "booking",
          item: response.booking,
          alreadyLinked: Boolean(response.already_linked),
        };
      }
      const response: ClaimGuestOrderResponse = await claimGuestOrder(payload);
      return {
        type: "order",
        item: response.order,
        alreadyLinked: Boolean(response.already_linked),
      };
    },
    onSuccess: (result) => {
      setSuccess(result);
      setSubmitError(null);
    },
    onError: (error) => {
      setSubmitError(getClaimErrorMessage(error));
    },
  });

  if (!isAuthenticated) {
    const registerParams = new URLSearchParams();
    registerParams.set("type", claimType === "order" ? "request" : "booking");
    if (reference.trim()) {
      registerParams.set("reference", reference.trim());
    }
    if (businessSlug) {
      registerParams.set("business", businessSlug);
    }
    const clientRegisterPath = `/client/register?${registerParams.toString()}`;

    return (
      <FormPageShell>
        <h1 className="text-xl font-bold md:text-2xl">Claim a booking or request</h1>
        <p className="text-sm text-slate-600">
          Create or log in first, then claim your booking or request with the reference.
        </p>
        <AuthPrompt description="Log in to link a guest booking or request to your account." />
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" data-testid="claim-signed-out-actions">
          <Link
            to={clientRegisterPath}
            className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
            data-testid="claim-create-client-account"
          >
            Create client account
          </Link>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            data-testid="claim-go-login"
          >
            Log in
          </Link>
        </div>
      </FormPageShell>
    );
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitError(null);
    const errors = validateClaimForm(reference, email, phone);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }
    claimMutation.mutate();
  }

  if (success) {
    const listPath = success.type === "booking" ? "/me/bookings" : "/me/orders";
    const listLabel =
      success.type === "booking" ? "Go to my bookings" : "Go to my requests";

    return (
      <FormPageShell>
        <h1 className="text-xl font-bold md:text-2xl">Claim a booking or request</h1>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-800">
            {success.alreadyLinked ? "Already linked to your account" : "Claimed successfully"}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold text-slate-900">
              {success.item.reference}
            </p>
            <StatusBadge
              status={success.item.status}
              kind={success.type === "booking" ? "booking" : "order"}
            />
          </div>
          <p className="mt-2 text-sm text-slate-600">{success.item.service.name}</p>
          <p className="mt-2 text-xs text-slate-500">
            Linked this guest profile to your account. Other requests or bookings made with the same
            guest contact at this business may also appear.
          </p>
          <Link
            to={listPath}
            className="mt-4 inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700"
          >
            {listLabel}
          </Link>
        </article>
      </FormPageShell>
    );
  }

  return (
    <FormPageShell>
      <h1 className="text-xl font-bold md:text-2xl">Claim a booking or request</h1>
      <p className="text-sm text-slate-600">
        This links a guest booking or request to your signed-in account.
      </p>
      <p className="text-sm text-slate-600">
        Use the same email or phone you entered when booking as a guest.
      </p>

      {autoClaimFailed || locationMessage ? (
        <div
          className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"
          data-testid="claim-auto-failed-note"
        >
          {locationMessage ||
            "Your account was created. We could not link this item automatically. Please confirm the guest email or phone used when booking."}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setClaimType("booking")}
          className={`min-h-10 rounded-full px-3 py-1.5 text-sm font-medium ${
            claimType === "booking"
              ? "bg-brand-600 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Booking
        </button>
        <button
          type="button"
          onClick={() => setClaimType("order")}
          className={`min-h-10 rounded-full px-3 py-1.5 text-sm font-medium ${
            claimType === "order"
              ? "bg-brand-600 text-white"
              : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          Request
        </button>
      </div>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
        noValidate
        data-testid="claim-guest-form"
      >
        <FormField
          label="Reference"
          name="reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="e.g. BKG-26-0001"
          autoComplete="off"
          error={fieldErrors.reference}
          required
        />

        <FormField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => {
            setEmailTouched(true);
            setEmail(event.target.value);
          }}
          placeholder="guest@example.com"
          autoComplete="email"
          error={fieldErrors.email ?? fieldErrors.contact}
        />

        <FormField
          label="Phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="+15550101"
          autoComplete="tel"
          hint="Optional if you provide email. Use the same contact you entered as a guest."
        />

        {submitError ? (
          <ErrorState title="Could not claim" message={submitError} />
        ) : null}

        <button
          type="submit"
          disabled={claimMutation.isPending}
          className="min-h-11 w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {claimMutation.isPending
            ? "Claiming…"
            : claimType === "booking"
              ? "Claim booking"
              : "Claim request"}
        </button>
      </form>
    </FormPageShell>
  );
}
