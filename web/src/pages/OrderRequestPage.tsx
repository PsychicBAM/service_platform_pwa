import { useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { createPublicOrder, getPublicService } from "@/api/publicApi";
import { FormPageShell } from "@/components/FormPageShell";
import { ErrorState } from "@/components/ErrorState";
import { FormField } from "@/components/FormField";
import { LoadingState } from "@/components/LoadingState";
import { PriceLabel } from "@/components/PriceLabel";
import { TextAreaField } from "@/components/TextAreaField";
import {
  formatOrderStatus,
  getApiErrorMessage,
  getOrderSubmitErrorMessage,
  isNotFoundError,
} from "@/utils/errors";

const DETAILS_MAX_LENGTH = 2000;

type FieldErrors = {
  fullName?: string;
  contact?: string;
  details?: string;
};

function validateForm(fullName: string, email: string, phone: string, details: string): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();
  const trimmedDetails = details.trim();

  if (!trimmedName) {
    errors.fullName = "Full name is required.";
  }
  if (!trimmedEmail && !trimmedPhone) {
    errors.contact = "Enter an email or phone number so the business can reach you.";
  }
  if (!trimmedDetails) {
    errors.details = "Project details are required.";
  } else if (trimmedDetails.length > DETAILS_MAX_LENGTH) {
    errors.details = `Details must be ${DETAILS_MAX_LENGTH} characters or fewer.`;
  }

  return errors;
}

function descriptionPreview(description: string | null): string | null {
  if (!description) {
    return null;
  }
  if (description.length <= 160) {
    return description;
  }
  return `${description.slice(0, 160).trim()}…`;
}

export function OrderRequestPage() {
  const { slug = "", serviceId = "" } = useParams<{ slug: string; serviceId: string }>();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [details, setDetails] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const serviceQuery = useQuery({
    queryKey: ["public-service", slug, serviceId],
    queryFn: () => getPublicService(slug, serviceId),
    enabled: Boolean(slug && serviceId),
  });

  const orderMutation = useMutation({
    mutationFn: () =>
      createPublicOrder(slug, {
        service_id: serviceId,
        form_data: { details: details.trim() },
        client: {
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        },
      }),
  });

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    const errors = validateForm(fullName, email, phone, details);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      await orderMutation.mutateAsync();
    } catch (error) {
      setSubmitError(getOrderSubmitErrorMessage(error));
    }
  };

  if (serviceQuery.isLoading) {
    return <LoadingState message="Loading service…" />;
  }

  if (serviceQuery.isError) {
    return (
      <ErrorState
        title={isNotFoundError(serviceQuery.error) ? "Service not found" : "Could not load service"}
        message={getApiErrorMessage(serviceQuery.error, "Unable to load service")}
      />
    );
  }

  const service = serviceQuery.data;
  if (!service) {
    return <ErrorState title="Could not load service" message="No data returned." />;
  }

  if (service.type !== "order") {
    return (
      <FormPageShell>
        <ErrorState
          title="Not a request service"
          message="This service uses booking by date and time."
        />
        <Link
          to={`/b/${slug}/services/${serviceId}`}
          className="block text-center text-sm text-brand-700 hover:underline"
        >
          Back to service
        </Link>
      </FormPageShell>
    );
  }

  if (orderMutation.isSuccess && orderMutation.data) {
    const order = orderMutation.data;
    return (
      <FormPageShell>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
          <p className="text-xs uppercase tracking-wide text-emerald-700">Request submitted</p>
          <h1 className="mt-1 text-xl font-bold text-emerald-900">Thank you!</h1>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-emerald-700">Reference</dt>
              <dd className="font-mono font-semibold text-emerald-900">{order.reference}</dd>
            </div>
            <div>
              <dt className="text-emerald-700">Status</dt>
              <dd className="font-medium text-emerald-900">{formatOrderStatus(order.status)}</dd>
            </div>
            <div>
              <dt className="text-emerald-700">Service</dt>
              <dd className="font-medium text-emerald-900">{order.service.name}</dd>
            </div>
          </dl>
          <p className="mt-4 text-sm text-emerald-800">
            The business will review your request and contact you.
          </p>
        </div>
        <Link
          to={`/b/${slug}/services`}
          className="block rounded-xl bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
        >
          Back to services
        </Link>
      </FormPageShell>
    );
  }

  const preview = descriptionPreview(service.description);

  return (
    <FormPageShell>
      <Link
        to={`/b/${slug}/services/${serviceId}`}
        className="inline-block text-sm text-brand-700 hover:underline"
      >
        ← Back to service
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Request</p>
        <h1 className="mt-1 text-lg font-bold text-slate-900">{service.name}</h1>
        {preview ? <p className="mt-2 text-sm text-slate-600">{preview}</p> : null}
        <div className="mt-3">
          <PriceLabel service={service} />
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <FormField
          name="fullName"
          label="Full name"
          required
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={fieldErrors.fullName}
          disabled={orderMutation.isPending}
        />

        <FormField
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          hint="Email or phone is required."
          disabled={orderMutation.isPending}
        />

        <FormField
          name="phone"
          type="tel"
          label="Phone"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={fieldErrors.contact}
          disabled={orderMutation.isPending}
        />

        <TextAreaField
          name="details"
          label="Project / request details"
          required
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          error={fieldErrors.details}
          maxLength={DETAILS_MAX_LENGTH}
          hint={`Up to ${DETAILS_MAX_LENGTH} characters.`}
          disabled={orderMutation.isPending}
        />

        {submitError ? (
          <div
            className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            role="alert"
          >
            {submitError}
          </div>
        ) : null}

        <button
          type="submit"
          disabled={orderMutation.isPending}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {orderMutation.isPending ? "Submitting…" : "Submit request"}
        </button>
      </form>
    </FormPageShell>
  );
}
