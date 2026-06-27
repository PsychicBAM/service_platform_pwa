import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { claimGuestBooking, claimGuestOrder } from "@/api/meApi";
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
  | { type: "booking"; item: MyBookingDetail }
  | { type: "order"; item: MyOrderDetail };

function parseClaimType(value: string | null): ClaimType {
  return value === "order" ? "order" : "booking";
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

function buildPayload(reference: string, email: string, phone: string) {
  const trimmedEmail = email.trim().toLowerCase();
  const trimmedPhone = phone.trim();
  return {
    reference: reference.trim(),
    ...(trimmedEmail ? { email: trimmedEmail } : {}),
    ...(trimmedPhone ? { phone: trimmedPhone } : {}),
  };
}

export function ClaimGuestPage() {
  const { isAuthenticated } = useAuth();
  const [searchParams] = useSearchParams();
  const [claimType, setClaimType] = useState<ClaimType>(
    parseClaimType(searchParams.get("type")),
  );
  const [reference, setReference] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState<ClaimSuccess | null>(null);

  const claimMutation = useMutation({
    mutationFn: async (): Promise<ClaimSuccess> => {
      const payload = buildPayload(reference, email, phone);
      if (claimType === "booking") {
        const response: ClaimGuestBookingResponse = await claimGuestBooking(payload);
        return { type: "booking", item: response.booking };
      }
      const response: ClaimGuestOrderResponse = await claimGuestOrder(payload);
      return { type: "order", item: response.order };
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
    return (
      <section className="space-y-4">
        <h1 className="text-xl font-bold">Claim a booking or request</h1>
        <AuthPrompt description="Log in to link a guest booking or request to your account." />
      </section>
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
      success.type === "booking" ? "Go to my bookings" : "Go to my orders";

    return (
      <section className="space-y-4">
        <h1 className="text-xl font-bold">Claim a booking or request</h1>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-sm font-semibold text-emerald-800">Claimed successfully</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <p className="font-mono text-sm font-semibold text-slate-900">
              {success.item.reference}
            </p>
            <StatusBadge
              status={success.item.status}
              kind={success.type === "booking" ? "booking" : "order"}
            />
          </div>
          <p className="mt-2 text-sm text-slate-600">
            {success.type === "booking"
              ? success.item.service.name
              : success.item.service.name}
          </p>
          <Link
            to={listPath}
            className="mt-4 inline-flex rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {listLabel}
          </Link>
        </article>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <h1 className="text-xl font-bold">Claim a booking or request</h1>
      <p className="text-sm text-slate-600">
        Use the reference and the same email or phone you used when submitting as a guest.
      </p>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setClaimType("booking")}
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
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
          className={`rounded-full px-3 py-1.5 text-sm font-medium ${
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
        className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
        noValidate
      >
        <FormField
          label="Reference"
          name="reference"
          value={reference}
          onChange={(event) => setReference(event.target.value)}
          placeholder="e.g. BKG-2026-0001"
          autoComplete="off"
          error={fieldErrors.reference}
          required
        />

        <FormField
          label="Email"
          name="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
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
          hint="Provide at least one of email or phone."
        />

        {submitError ? (
          <ErrorState title="Could not claim" message={submitError} />
        ) : null}

        <button
          type="submit"
          disabled={claimMutation.isPending}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
        >
          {claimMutation.isPending
            ? "Claiming…"
            : claimType === "booking"
              ? "Claim booking"
              : "Claim request"}
        </button>
      </form>
    </section>
  );
}
