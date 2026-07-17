import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AdminEmailDeliverySection } from "@/components/admin/AdminEmailDeliverySection";

const BREAKOUT_ID = "admin-layout-shell-breakout";

function StatusPill({
  tone,
  children,
}: {
  tone: "green" | "amber" | "orange";
  children: string;
}) {
  const tones = {
    green: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
    amber: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-200",
    orange: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  };
  return (
    <span
      className={`inline-flex shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function ExampleThumb({ tone }: { tone: string }) {
  return (
    <div
      className={`mt-0.5 h-11 w-11 shrink-0 overflow-hidden rounded-lg ${tone}`}
      aria-hidden="true"
    >
      <div className="flex h-full w-full items-end justify-center bg-gradient-to-t from-black/25 to-transparent pb-1">
        <span className="h-3.5 w-3.5 rounded-full bg-white/85" />
      </div>
    </div>
  );
}

function ReviewAction({ action }: { action: "sent" | "send" | "disabled" }) {
  if (action === "sent") {
    return (
      <div className="rounded-md bg-emerald-50 px-2.5 py-1.5 text-left text-xs font-medium text-emerald-800 ring-1 ring-inset ring-emerald-100">
        Review request sent
        <span className="mt-0.5 block text-[11px] font-normal text-emerald-700/80">
          Jul 17, 2026 · 2:15 PM
        </span>
      </div>
    );
  }

  if (action === "send") {
    return (
      <button
        type="button"
        disabled
        className="inline-flex rounded-md border border-blue-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-blue-700"
      >
        Send review request
      </button>
    );
  }

  return (
    <div className="max-w-[11rem] space-y-1 text-right">
      <button
        type="button"
        disabled
        className="inline-flex rounded-md border border-gray-200 bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-400"
      >
        Send review request
      </button>
      <p className="text-[11px] leading-snug text-gray-500">
        Client did not agree to follow-up emails.
      </p>
    </div>
  );
}

function ExampleRow({
  title,
  service,
  when,
  detail,
  email,
  status,
  statusTone,
  consent,
  action,
  thumbTone,
}: {
  title: string;
  service: string;
  when: string;
  detail?: string;
  email: string;
  status: string;
  statusTone: "green" | "amber" | "orange";
  consent: boolean;
  action: "sent" | "send" | "disabled";
  thumbTone: string;
}) {
  return (
    <article className="border-b border-gray-100 py-3 last:border-b-0 last:pb-0 first:pt-0">
      <div className="flex items-start gap-3">
        <ExampleThumb tone={thumbTone} />

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
              <p className="truncate text-xs text-gray-500">{service}</p>
              <p className="truncate text-xs text-gray-400">
                {when}
                {detail ? ` · ${detail}` : ""}
              </p>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              <StatusPill tone={statusTone}>{status}</StatusPill>
              <ReviewAction action={action} />
            </div>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500">
            <span className="inline-flex min-w-0 items-center gap-1">
              <span aria-hidden="true" className="text-gray-400">
                ✉
              </span>
              <span className="truncate">{email}</span>
            </span>
            <span className="hidden h-3 w-px bg-gray-200 sm:inline-block" aria-hidden="true" />
            <span
              className={`inline-flex items-center gap-1 font-medium ${
                consent ? "text-emerald-700" : "text-rose-600"
              }`}
            >
              <span aria-hidden="true">{consent ? "✓" : "✕"}</span>
              {consent ? "Follow-up consent" : "No follow-up consent"}
            </span>
          </div>
        </div>
      </div>
    </article>
  );
}

function SectionEyebrow({ children }: { children: string }) {
  return (
    <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.1em] text-blue-600">
      {children}
    </p>
  );
}

function ExamplePanel({
  eyebrow,
  heading,
  viewAllTo,
  children,
}: {
  eyebrow: string;
  heading: string;
  viewAllTo: string;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 min-w-0 flex-col">
      <SectionEyebrow>{eyebrow}</SectionEyebrow>
      <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-2 flex items-center justify-between gap-3 border-b border-gray-100 pb-3">
          <p className="text-base font-semibold tracking-tight text-gray-900">{heading}</p>
          <Link
            to={viewAllTo}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
          >
            View all
          </Link>
        </div>
        <div className="flex flex-col">{children}</div>
      </div>
    </div>
  );
}

function ProcessIcon({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white shadow-sm ${tone}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function ProcessStep({
  tone,
  icon,
  title,
  body,
  showArrow,
}: {
  tone: string;
  icon: ReactNode;
  title: string;
  body: string;
  showArrow?: boolean;
}) {
  return (
    <li className="flex flex-col items-start">
      <div className="flex w-full gap-3">
        <ProcessIcon tone={tone}>{icon}</ProcessIcon>
        <div className="min-w-0 pt-0.5">
          <p className="text-sm font-semibold text-gray-900">{title}</p>
          <p className="mt-0.5 text-xs leading-snug text-gray-500">{body}</p>
        </div>
      </div>
      {showArrow ? (
        <div className="my-2 flex w-10 justify-center" aria-hidden="true">
          <svg viewBox="0 0 24 24" className="h-4 w-4 text-gray-300" fill="currentColor">
            <path d="M12 4v12.17l4.59-4.58L18 13l-6 6-6-6 1.41-1.41L11 16.17V4z" />
          </svg>
        </div>
      ) : null}
    </li>
  );
}

function ShowcaseContent() {
  return (
    <section
      className="w-full border-t border-gray-200 bg-white"
      data-testid="admin-email-delivery-showcase"
      aria-label="Review request email examples"
    >
      <div className="mx-auto w-full max-w-[1600px] px-4 py-8 md:px-6 md:py-10 xl:px-8 2xl:px-10">
        <div className="grid w-full gap-5 md:grid-cols-2 lg:grid-cols-3 lg:gap-6">
          <ExamplePanel
            eyebrow="Admin bookings (example)"
            heading="Bookings"
            viewAllTo="/admin/bookings"
          >
            <ExampleRow
              title="Anna Smith"
              service="House Cleaning"
              when="May 15, 2024 · 10:00 AM"
              email="anna@example.com"
              status="Completed"
              statusTone="green"
              consent
              action="sent"
              thumbTone="bg-sky-300"
            />
            <ExampleRow
              title="John Doe"
              service="Office Clean"
              when="May 18, 2024 · 2:00 PM"
              email="john@example.com"
              status="Confirmed"
              statusTone="amber"
              consent
              action="send"
              thumbTone="bg-indigo-300"
            />
            <ExampleRow
              title="Maria Garcia"
              service="Move-out Clean"
              when="May 12, 2024 · 9:00 AM"
              email="maria@example.com"
              status="Completed"
              statusTone="green"
              consent={false}
              action="disabled"
              thumbTone="bg-slate-300"
            />
          </ExamplePanel>

          <ExamplePanel
            eyebrow="Admin orders / requests (example)"
            heading="Requests"
            viewAllTo="/admin/orders"
          >
            <ExampleRow
              title="Leak Fix in Kitchen"
              service="Plumbing"
              when="May 14, 2024 · 3:30 PM"
              detail="Est. $180"
              email="chris@example.com"
              status="Completed"
              statusTone="green"
              consent
              action="sent"
              thumbTone="bg-teal-300"
            />
            <ExampleRow
              title="AC Installation"
              service="HVAC"
              when="May 17, 2024 · 11:00 AM"
              detail="Est. $450"
              email="sam@example.com"
              status="In Progress"
              statusTone="orange"
              consent
              action="send"
              thumbTone="bg-violet-300"
            />
            <ExampleRow
              title="Water Heater Quote"
              service="Plumbing"
              when="May 12, 2024 · 4:00 PM"
              detail="Est. $320"
              email="taylor@example.com"
              status="Completed"
              statusTone="green"
              consent={false}
              action="disabled"
              thumbTone="bg-stone-300"
            />
          </ExamplePanel>

          <div className="flex min-w-0 flex-col md:col-span-2 lg:col-span-1">
            <SectionEyebrow>Process overview</SectionEyebrow>
            <div className="flex flex-1 flex-col rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
              <ol className="flex flex-1 flex-col justify-center">
                <ProcessStep
                  tone="bg-blue-600"
                  showArrow
                  icon={
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                      <path d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
                    </svg>
                  }
                  title="Client books and consents"
                  body="Client books or submits a request and optionally checks the follow-up email consent box."
                />
                <ProcessStep
                  tone="bg-emerald-600"
                  showArrow
                  icon={
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                      <path d="M9.5 16.5 5 12l1.4-1.4 3.1 3.1 7.1-7.1L18 8.1z" />
                    </svg>
                  }
                  title="Marked completed"
                  body="Admin marks the booking or request as Completed."
                />
                <ProcessStep
                  tone="bg-violet-600"
                  showArrow
                  icon={
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                      <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm1 10.6 3.5 2.1-.9 1.5L11 13V7h2z" />
                    </svg>
                  }
                  title="Email scheduled"
                  body="System schedules the review request email based on the configured delay."
                />
                <ProcessStep
                  tone="bg-amber-500"
                  icon={
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden="true">
                      <path d="M20 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2Zm0 4-8 5L4 8V6l8 5 8-5z" />
                    </svg>
                  }
                  title="Review email sent"
                  body="Client receives the review request email with a secure review link."
                />
              </ol>
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-start gap-3 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-600 sm:items-center sm:px-5">
          <span
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-700 text-[10px] font-bold text-white"
            aria-hidden="true"
          >
            ✓
          </span>
          <p className="leading-snug">
            Automatic review request emails are only sent to clients who have given explicit
            consent. You can still send review requests manually at any time from the booking or
            request details.
          </p>
        </div>

        <div className="mt-8 border-t border-gray-100 pt-8">
          <AdminEmailDeliverySection />
        </div>
      </div>
    </section>
  );
}

function getBreakoutTarget(): HTMLElement | null {
  if (typeof document === "undefined") {
    return null;
  }
  return document.getElementById(BREAKOUT_ID);
}

/**
 * Renders into `#admin-layout-shell-breakout` (below sidebar + Settings main) when present.
 * Falls back to inline render when the layout slot is missing (e.g. unit tests that mount
 * AdminSettingsPage without AdminLayout), so Server email delivery stays in the tree.
 */
export function AdminEmailDeliveryShowcase() {
  const [target, setTarget] = useState<HTMLElement | null>(() => getBreakoutTarget());

  useEffect(() => {
    setTarget(getBreakoutTarget());
  }, []);

  if (target) {
    return createPortal(<ShowcaseContent />, target);
  }

  return <ShowcaseContent />;
}
