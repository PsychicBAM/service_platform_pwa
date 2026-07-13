import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createPublicBooking,
  createPublicWaitlistEntry,
  getAvailability,
  getPublicService,
} from "@/api/publicApi";
import { ApiClientError } from "@/api/client";
import type { AvailabilitySlot } from "@/types/api";
import { FormPageShell } from "@/components/FormPageShell";
import {
  LEGAL_CONSENT_ERROR_MESSAGE,
  LegalConsentCheckbox,
} from "@/components/LegalConsentCheckbox";
import { DateSelector } from "@/components/DateSelector";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { FormField } from "@/components/FormField";
import { LoadingState } from "@/components/LoadingState";
import { PriceLabel } from "@/components/PriceLabel";
import { SuccessCard } from "@/components/SuccessCard";
import { TextAreaField } from "@/components/TextAreaField";
import { TimeSlotGrid } from "@/components/TimeSlotGrid";
import {
  formatBookingStatus,
  getApiErrorMessage,
  getBookingSubmitErrorMessage,
  isNotFoundError,
} from "@/utils/errors";
import { formatDateTimeLabel, formatDuration, generateBookingDates } from "@/utils/format";

const NOTE_MAX_LENGTH = 1000;

type FieldErrors = {
  fullName?: string;
  contact?: string;
  note?: string;
  legalConsent?: string;
};

type SuccessView = "waitlist" | "booking" | null;

function validateForm(
  fullName: string,
  email: string,
  phone: string,
  note: string,
): FieldErrors {
  const errors: FieldErrors = {};
  const trimmedName = fullName.trim();
  const trimmedEmail = email.trim();
  const trimmedPhone = phone.trim();
  const trimmedNote = note.trim();

  if (!trimmedName) {
    errors.fullName = "Full name is required.";
  }
  if (!trimmedEmail && !trimmedPhone) {
    errors.contact = "Enter an email or phone number so the business can reach you.";
  }
  if (trimmedNote.length > NOTE_MAX_LENGTH) {
    errors.note = `Note must be ${NOTE_MAX_LENGTH} characters or fewer.`;
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

function slotKey(slot: AvailabilitySlot): string {
  return `${slot.starts_at}-${slot.waitlist_available ? "waitlist" : "bookable"}`;
}

export function BookingPage() {
  const { slug = "", serviceId = "" } = useParams<{ slug: string; serviceId: string }>();
  const queryClient = useQueryClient();

  const defaultDate = useMemo(() => generateBookingDates(1)[0]?.date ?? null, []);
  const [selectedDate, setSelectedDate] = useState<string | null>(defaultDate);
  const [selectedSlot, setSelectedSlot] = useState<AvailabilitySlot | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [legalConsent, setLegalConsent] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [successView, setSuccessView] = useState<SuccessView>(null);

  const serviceQuery = useQuery({
    queryKey: ["public-service", slug, serviceId],
    queryFn: () => getPublicService(slug, serviceId),
    enabled: Boolean(slug && serviceId),
  });

  const availabilityQuery = useQuery({
    queryKey: ["availability", slug, serviceId, selectedDate],
    queryFn: () => getAvailability(slug, serviceId, selectedDate!),
    enabled: Boolean(slug && serviceId && selectedDate),
    placeholderData: (previousData) => previousData,
  });

  const bookingMutation = useMutation({
    mutationFn: () =>
      createPublicBooking(slug, {
        service_id: serviceId,
        starts_at: selectedSlot!.starts_at,
        client_notes: note.trim() || null,
        legal_consent_accepted: true,
        client: {
          full_name: fullName.trim(),
          email: email.trim() || null,
          phone: phone.trim() || null,
        },
      }),
    onSuccess: () => {
      setSuccessView("booking");
    },
  });

  const waitlistMutation = useMutation({
    mutationFn: () =>
      createPublicWaitlistEntry(slug, {
        service_id: serviceId,
        starts_at: selectedSlot!.starts_at,
        customer_name: fullName.trim(),
        customer_email: email.trim() || null,
        customer_phone: phone.trim() || null,
        note: note.trim() || null,
      }),
    onSuccess: async () => {
      setSuccessView("waitlist");
      await queryClient.invalidateQueries({
        queryKey: ["availability", slug, serviceId, selectedDate],
      });
    },
  });

  const isWaitlistSlot = Boolean(selectedSlot?.waitlist_available);
  const isSubmitting = bookingMutation.isPending || waitlistMutation.isPending;

  useEffect(() => {
    const slots = availabilityQuery.data?.slots;
    if (!slots || !selectedSlot) {
      return;
    }
    const stillExists = slots.some((slot) => slotKey(slot) === slotKey(selectedSlot));
    if (!stillExists) {
      setSelectedSlot(null);
    }
  }, [availabilityQuery.data, selectedSlot]);

  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
    setSelectedSlot(null);
    setSubmitError(null);
    setSuccessView(null);
  };

  const handleSlotSelect = (slot: AvailabilitySlot) => {
    setSelectedSlot(slot);
    setSubmitError(null);
    setSuccessView(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitError(null);

    if (!selectedSlot) {
      setSubmitError("Please choose a time before submitting.");
      return;
    }

    const errors = validateForm(fullName, email, phone, note);
    if (!isWaitlistSlot && !legalConsent) {
      errors.legalConsent = LEGAL_CONSENT_ERROR_MESSAGE;
    }
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      if (isWaitlistSlot) {
        await waitlistMutation.mutateAsync();
        return;
      }

      await bookingMutation.mutateAsync();
      await queryClient.invalidateQueries({
        queryKey: ["availability", slug, serviceId, selectedDate],
      });
    } catch (error) {
      setSubmitError(getBookingSubmitErrorMessage(error));
      if (error instanceof ApiClientError && error.code === "SLOT_UNAVAILABLE") {
        setSelectedSlot(null);
        await queryClient.invalidateQueries({
          queryKey: ["availability", slug, serviceId, selectedDate],
        });
      }
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

  if (service.type !== "booking") {
    return (
      <FormPageShell>
        <ErrorState
          title="Not a booking service"
          message="This service is handled as a request, not a date/time booking."
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

  if (successView === "waitlist") {
    return (
      <FormPageShell>
        <SuccessCard
          title="Waitlist joined"
          subtitle="Thank you!"
          items={[
            { label: "Service", value: service.name },
            {
              label: "Date & time",
              value: selectedSlot ? formatDateTimeLabel(selectedSlot.starts_at) : "",
            },
          ]}
          note="You have joined the waitlist for this time slot."
        />
        <Link
          to={`/b/${slug}/services`}
          className="block rounded-xl bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
        >
          Back to services
        </Link>
      </FormPageShell>
    );
  }

  if (successView === "booking" && bookingMutation.data) {
    const booking = bookingMutation.data;
    return (
      <FormPageShell>
        <SuccessCard
          title="Booking request submitted"
          subtitle="Thank you!"
          items={[
            { label: "Reference", value: booking.reference },
            { label: "Status", value: formatBookingStatus(booking.status) },
            { label: "Service", value: booking.service.name },
            { label: "Date & time", value: formatDateTimeLabel(booking.starts_at) },
          ]}
          note="The business will review and confirm your booking."
        />
        <Link
          to={`/b/${slug}/services`}
          className="block rounded-xl bg-brand-600 px-4 py-3 text-center font-medium text-white hover:bg-brand-700"
        >
          Back to services
        </Link>
      </FormPageShell>
    );
  }

  const duration = formatDuration(service.duration_minutes);
  const preview = descriptionPreview(service.description);
  const availabilitySlots = availabilityQuery.data?.slots ?? [];
  const showInitialAvailabilityLoading =
    availabilityQuery.isLoading && availabilitySlots.length === 0;

  return (
    <FormPageShell className="space-y-5">
      <Link
        to={`/b/${slug}/services/${serviceId}`}
        className="inline-block text-sm text-brand-700 hover:underline"
      >
        ← Back to service
      </Link>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-slate-500">Book appointment</p>
        <h1 className="mt-1 text-lg font-bold text-slate-900">{service.name}</h1>
        {preview ? <p className="mt-2 text-sm text-slate-600">{preview}</p> : null}
        <div className="mt-3 flex flex-wrap items-center gap-4">
          <PriceLabel service={service} />
          {duration ? <span className="text-sm text-slate-600">{duration}</span> : null}
        </div>
      </div>

      <DateSelector selectedDate={selectedDate} onSelect={handleDateSelect} />

      {selectedDate ? (
        <div className="space-y-3" data-testid="booking-time-section">
          <h2 className="text-sm font-medium text-slate-700">Choose a time</h2>

          <div className="min-h-[4.5rem]">
            {showInitialAvailabilityLoading ? (
              <LoadingState message="Loading available times…" />
            ) : null}

            {availabilityQuery.isError ? (
              <ErrorState
                title="Could not load times"
                message={getApiErrorMessage(availabilityQuery.error, "Unable to load availability")}
              />
            ) : null}

            {!showInitialAvailabilityLoading &&
            !availabilityQuery.isError &&
            availabilitySlots.length === 0 ? (
              <EmptyState title="No available times for this date." />
            ) : null}

            {!availabilityQuery.isError && availabilitySlots.length > 0 ? (
              <TimeSlotGrid
                slots={availabilitySlots}
                selectedStartsAt={selectedSlot?.starts_at ?? null}
                selectedWaitlist={selectedSlot?.waitlist_available ?? false}
                onSelect={handleSlotSelect}
              />
            ) : null}
          </div>
        </div>
      ) : null}

      <form
        key="booking-details-form"
        onSubmit={handleSubmit}
        className="space-y-4 border-t border-slate-200 pt-4"
        noValidate
        data-testid="booking-details-form"
      >
        <h2 className="text-sm font-medium text-slate-700">Your details</h2>

        <p className="text-sm text-slate-600">
          {selectedSlot ? (
            <>
              <span>Selected: </span>
              <span>{formatDateTimeLabel(selectedSlot.starts_at)}</span>
              {isWaitlistSlot ? (
                <span className="text-amber-700"> (full — waitlist)</span>
              ) : null}
            </>
          ) : (
            <span>Choose a time slot above to continue.</span>
          )}
        </p>

        <FormField
          name="fullName"
          label="Full name"
          required
          autoComplete="name"
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          error={fieldErrors.fullName}
          disabled={!selectedSlot || isSubmitting}
        />

        <FormField
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          hint="Email or phone is required."
          disabled={!selectedSlot || isSubmitting}
        />

        <FormField
          name="phone"
          type="tel"
          label="Phone"
          autoComplete="tel"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          error={fieldErrors.contact}
          disabled={!selectedSlot || isSubmitting}
        />

        <TextAreaField
          name="note"
          label="Note (optional)"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          error={fieldErrors.note}
          maxLength={NOTE_MAX_LENGTH}
          hint={`Up to ${NOTE_MAX_LENGTH} characters.`}
          disabled={!selectedSlot || isSubmitting}
        />

        <div className={isWaitlistSlot ? "hidden" : undefined} aria-hidden={isWaitlistSlot}>
          <LegalConsentCheckbox
            id="booking-legal-consent"
            checked={legalConsent}
            onChange={setLegalConsent}
            error={fieldErrors.legalConsent}
            disabled={!selectedSlot || isSubmitting}
          />
        </div>

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
          disabled={!selectedSlot || isSubmitting}
          className="w-full rounded-xl bg-brand-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid={isWaitlistSlot ? "join-waitlist-submit" : "booking-submit"}
        >
          <span>
            {isSubmitting
              ? "Submitting…"
              : isWaitlistSlot
                ? "Join waitlist"
                : "Submit booking request"}
          </span>
        </button>
      </form>
    </FormPageShell>
  );
}
