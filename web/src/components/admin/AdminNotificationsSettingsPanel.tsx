import { useMemo, useState, type FormEvent, type ReactNode } from "react";
import {
  DEFAULT_NOTIFICATION_TEMPLATES,
  DEFAULT_REVIEW_REQUEST_BODY,
  DEFAULT_REVIEW_REQUEST_SUBJECT,
  REVIEW_REQUEST_ALLOWED_VARIABLES,
  buildReviewRequestPreviewValues,
  findUnknownTemplateVariables,
  renderNotificationTemplate,
  type NotificationTemplatesMap,
} from "@/lib/notificationTemplates";

type AdminNotificationsSettingsPanelProps = {
  businessName: string;
  notificationEmailEnabled: boolean;
  autoReviewRequestEnabled: boolean;
  templates: NotificationTemplatesMap;
  saving: boolean;
  emailDeliveryActive: boolean | null;
  onNotificationEmailEnabledChange: (enabled: boolean) => void;
  onTemplatesChange: (templates: NotificationTemplatesMap) => void;
  onSaveNotifications: (event: FormEvent) => void;
  onSaveTemplates: () => void;
  notificationsSuccess: string | null;
  notificationsError: string | null;
  templateSuccess: string | null;
  templateError: string | null;
};

function ComingSoonBadge() {
  return (
    <span className="inline-flex rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700">
      Coming soon
    </span>
  );
}

function CardIcon({
  tone,
  children,
}: {
  tone: "emerald" | "blue" | "violet" | "amber";
  children: ReactNode;
}) {
  const tones = {
    emerald: "bg-emerald-50 text-emerald-600",
    blue: "bg-blue-50 text-blue-600",
    violet: "bg-violet-50 text-violet-600",
    amber: "bg-amber-50 text-amber-600",
  } as const;
  return (
    <span
      className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${tones[tone]}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
      Active
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
      Inactive
    </span>
  );
}

const COMING_SOON_EVENTS = [
  { id: "new_booking", title: "New booking", description: "When a customer books a service" },
  { id: "booking_reminder", title: "Booking reminder", description: "Reminder before the appointment" },
  {
    id: "new_order",
    title: "New order / request",
    description: "When a customer submits a request",
  },
  { id: "new_review", title: "New review", description: "When a customer leaves a review" },
  { id: "payment_received", title: "Payment received", description: "When a payment is confirmed" },
] as const;

export function AdminNotificationsSettingsPanel({
  businessName,
  notificationEmailEnabled,
  autoReviewRequestEnabled,
  templates,
  saving,
  emailDeliveryActive,
  onNotificationEmailEnabledChange,
  onTemplatesChange,
  onSaveNotifications,
  onSaveTemplates,
  notificationsSuccess,
  notificationsError,
  templateSuccess,
  templateError,
}: AdminNotificationsSettingsPanelProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<"review_request" | "booking_confirmation">(
    "review_request",
  );
  const reviewTemplate = templates.review_request;
  const previewValues = useMemo(
    () => buildReviewRequestPreviewValues(businessName),
    [businessName],
  );
  const previewSubject = renderNotificationTemplate(reviewTemplate.subject, previewValues);
  const previewBody = renderNotificationTemplate(reviewTemplate.body, previewValues);

  const unknownVariables = useMemo(() => {
    return [
      ...findUnknownTemplateVariables(reviewTemplate.subject),
      ...findUnknownTemplateVariables(reviewTemplate.body),
    ].filter((value, index, all) => all.indexOf(value) === index);
  }, [reviewTemplate.body, reviewTemplate.subject]);

  const emailChannelActive = notificationEmailEnabled;
  const activeNotificationLabel = notificationEmailEnabled
    ? autoReviewRequestEnabled
      ? "2"
      : "1"
    : "0";

  function updateReviewTemplate(patch: Partial<NotificationTemplatesMap["review_request"]>) {
    onTemplatesChange({
      ...templates,
      review_request: {
        ...templates.review_request,
        ...patch,
      },
    });
  }

  function resetReviewTemplate() {
    onTemplatesChange({
      ...templates,
      review_request: { ...DEFAULT_NOTIFICATION_TEMPLATES.review_request },
    });
  }

  return (
    <div className="space-y-5" data-testid="admin-notifications-settings-page">
      <section
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        data-testid="admin-notifications-overview-card"
      >
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Notifications overview</h3>
          <p className="mt-1 text-sm text-gray-500">
            Real email notification status for this business. Unsupported channels stay Coming soon.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div
            className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm"
            data-testid="admin-notifications-active-count"
          >
            <div className="flex items-start gap-3">
              <CardIcon tone="emerald">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M4 6h16v12H4z" />
                  <path d="m4 7 8 6 8-6" />
                </svg>
              </CardIcon>
              <div>
                <p className="text-lg font-semibold text-gray-900">{activeNotificationLabel}</p>
                <p className="text-sm font-medium text-gray-800">Active notifications</p>
                <p className="mt-0.5 text-xs text-gray-500">Email features currently enabled.</p>
              </div>
            </div>
          </div>
          <div
            className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm"
            data-testid="admin-notifications-email-status"
          >
            <div className="flex items-start gap-3">
              <CardIcon tone="blue">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="m3 8 9 6 9-6" />
                  <path d="M5 19h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2Z" />
                </svg>
              </CardIcon>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {emailChannelActive ? "On" : "Off"}
                </p>
                <p className="text-sm font-medium text-gray-800">Email notifications</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  {emailDeliveryActive === false
                    ? "Server email delivery is not fully active."
                    : "Business email notification switch."}
                </p>
              </div>
            </div>
          </div>
          <div
            className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm"
            data-testid="admin-notifications-customer-messages"
          >
            <div className="flex items-start gap-3">
              <CardIcon tone="violet">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M7 8h10M7 12h7" />
                  <path d="M5 5h14v11H9l-4 3V5Z" />
                </svg>
              </CardIcon>
              <div>
                <p className="text-lg font-semibold text-gray-900">1</p>
                <p className="text-sm font-medium text-gray-800">Customer messages</p>
                <p className="mt-0.5 text-xs text-gray-500">Review request template is customizable.</p>
              </div>
            </div>
          </div>
          <div
            className="rounded-xl border border-gray-100 bg-white p-3.5 shadow-sm"
            data-testid="admin-notifications-quiet-hours-status"
          >
            <div className="flex items-start gap-3">
              <CardIcon tone="amber">
                <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 6v6l3 2" />
                  <circle cx="12" cy="12" r="9" />
                </svg>
              </CardIcon>
              <div>
                <p className="text-lg font-semibold text-gray-900">Off</p>
                <p className="text-sm font-medium text-gray-800">Quiet hours</p>
                <p className="mt-0.5 text-xs text-gray-500">Not enforced yet.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-2">
        <section
          className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
          data-testid="admin-notification-channels-card"
        >
          <div className="mb-4">
            <h3 className="text-base font-semibold text-gray-900">Notification channels</h3>
            <p className="mt-1 text-sm text-gray-500">
              Only Email is available today. SMS, in-app, and push are not implemented.
            </p>
          </div>
          <ul className="divide-y divide-gray-100 rounded-xl border border-gray-200">
            <li
              className="flex items-center justify-between gap-3 px-4 py-3"
              data-testid="admin-notification-channel-email"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">Email</p>
                <p className="text-xs text-gray-500">Customer and ops emails via SMTP / Brevo.</p>
              </div>
              <StatusBadge active={emailChannelActive} />
            </li>
            <li
              className="flex items-center justify-between gap-3 px-4 py-3 opacity-80"
              data-testid="admin-notification-channel-sms"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">SMS</p>
                <p className="text-xs text-gray-500">Text messages are not available yet.</p>
              </div>
              <ComingSoonBadge />
            </li>
            <li
              className="flex items-center justify-between gap-3 px-4 py-3 opacity-80"
              data-testid="admin-notification-channel-in-app"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">In-app</p>
                <p className="text-xs text-gray-500">In-app inbox is not available yet.</p>
              </div>
              <ComingSoonBadge />
            </li>
            <li
              className="flex items-center justify-between gap-3 px-4 py-3 opacity-80"
              data-testid="admin-notification-channel-push"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900">Push notifications</p>
                <p className="text-xs text-gray-500">Browser push is not available yet.</p>
              </div>
              <ComingSoonBadge />
            </li>
          </ul>
        </section>

        <section
          className="rounded-2xl border border-dashed border-gray-200 bg-gray-50/80 p-5"
          data-testid="admin-notification-preferences-card"
          aria-disabled="true"
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="text-base font-semibold text-gray-900">Notification preferences</h3>
            <ComingSoonBadge />
          </div>
          <p className="mb-4 text-sm text-gray-500">
            Quiet hours, digest, and frequency controls are preview-only. Current email sending is
            not delayed by quiet hours yet.
          </p>
          <div className="space-y-3 opacity-60">
            <div data-testid="admin-notification-quiet-hours">
              <p className="text-sm font-medium text-gray-800">Quiet hours</p>
              <p className="mt-1 text-xs text-gray-500">Not enforced.</p>
            </div>
            <div data-testid="admin-notification-timezone">
              <p className="text-sm font-medium text-gray-800">Timezone</p>
              <p className="mt-1 text-xs text-gray-500">Uses your business timezone setting.</p>
            </div>
            <div data-testid="admin-notification-frequency">
              <p className="text-sm font-medium text-gray-800">Notification frequency</p>
              <p className="mt-1 text-xs text-gray-500">Instant only for now.</p>
            </div>
            <div data-testid="admin-notification-digest">
              <p className="text-sm font-medium text-gray-800">Email digest</p>
              <p className="mt-1 text-xs text-gray-500">Coming later.</p>
            </div>
          </div>
        </section>
      </div>

      <section
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        data-testid="admin-notification-events-card"
      >
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Notification types</h3>
            <p className="mt-1 text-sm text-gray-500">
              Email is the only real channel. SMS / In-app columns are Coming soon.
            </p>
          </div>
        </div>

        <form onSubmit={onSaveNotifications} className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
          <label className="flex items-start gap-3 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={notificationEmailEnabled}
              disabled={saving}
              onChange={(event) => onNotificationEmailEnabledChange(event.target.checked)}
              className="mt-0.5 rounded border-gray-300"
              data-testid="admin-notification-event-email-toggle"
            />
            <span>
              <span className="block font-semibold text-gray-900">
                Enable business email notifications
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                Controls booking/request operational emails for this business. Review request emails
                still follow consent and Email Delivery auto-send settings.
              </span>
            </span>
          </label>
          <button
            type="submit"
            disabled={saving}
            className="mt-3 inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
          >
            {saving ? "Saving…" : "Save notification switch"}
          </button>
          {notificationsSuccess ? (
            <p className="mt-2 text-sm text-emerald-700">{notificationsSuccess}</p>
          ) : null}
          {notificationsError ? (
            <p className="mt-2 text-sm text-red-600" role="alert">
              {notificationsError}
            </p>
          ) : null}
        </form>

        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
            <thead className="bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
              <tr>
                <th className="px-4 py-3">Event type</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">SMS</th>
                <th className="px-4 py-3">In-app</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              <tr data-testid="admin-notification-event-row">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-900">Review request email</p>
                  <p className="text-xs text-gray-500">
                    Real customer email. Template editable below.
                    {autoReviewRequestEnabled ? " Auto-send is enabled in Email Delivery." : ""}
                  </p>
                </td>
                <td className="px-4 py-3">
                  <StatusBadge active />
                </td>
                <td className="px-4 py-3" data-testid="admin-notification-event-sms-coming-soon">
                  <ComingSoonBadge />
                </td>
                <td className="px-4 py-3" data-testid="admin-notification-event-in-app-coming-soon">
                  <ComingSoonBadge />
                </td>
              </tr>
              {COMING_SOON_EVENTS.map((event) => (
                <tr key={event.id} data-testid="admin-notification-event-row" className="opacity-80">
                  <td className="px-4 py-3">
                    <p className="font-semibold text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">{event.description}</p>
                  </td>
                  <td className="px-4 py-3">
                    <ComingSoonBadge />
                  </td>
                  <td className="px-4 py-3">
                    <ComingSoonBadge />
                  </td>
                  <td className="px-4 py-3">
                    <ComingSoonBadge />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section
        className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm"
        data-testid="admin-notification-templates-card"
      >
        <div className="mb-4">
          <h3 className="text-base font-semibold text-gray-900">Message templates</h3>
          <p className="mt-1 text-sm text-gray-500">
            Customize the customer-facing email text sent by your business. Only Review request is
            wired to real sending today.
          </p>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-gray-800">Template</span>
            <select
              data-testid="admin-notification-template-selector"
              value={selectedTemplate}
              onChange={(event) =>
                setSelectedTemplate(event.target.value as "review_request" | "booking_confirmation")
              }
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm"
            >
              <option value="review_request">Review request email (Active)</option>
              <option value="booking_confirmation">Booking confirmation (Coming soon)</option>
            </select>
          </label>
        </div>

        {selectedTemplate !== "review_request" ? (
          <div
            className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-5"
            data-testid="admin-notification-template-coming-soon"
          >
            <div className="mb-2 flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">Template not customizable yet</p>
              <ComingSoonBadge />
            </div>
            <p className="text-sm text-gray-500">
              This email still uses the system default copy. Custom editing will be added when that
              send path is wired to templates.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-2">
            <div className="space-y-3">
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-gray-800">Subject</span>
                <input
                  type="text"
                  value={reviewTemplate.subject}
                  disabled={saving}
                  data-testid="admin-notification-template-subject"
                  onChange={(event) => updateReviewTemplate({ subject: event.target.value })}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1.5 block font-medium text-gray-800">Body</span>
                <textarea
                  rows={12}
                  value={reviewTemplate.body}
                  disabled={saving}
                  data-testid="admin-notification-template-body"
                  onChange={(event) => updateReviewTemplate({ body: event.target.value })}
                  className="w-full resize-y rounded-xl border border-gray-200 px-3 py-2.5 font-mono text-sm"
                />
              </label>
              <div
                className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-3"
                data-testid="admin-notification-template-variables"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Available variables
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {REVIEW_REQUEST_ALLOWED_VARIABLES.map((variable) => (
                    <code
                      key={variable}
                      className="rounded bg-white px-1.5 py-0.5 text-[11px] text-emerald-800 ring-1 ring-emerald-100"
                    >
                      {`{${variable}}`}
                    </code>
                  ))}
                </div>
              </div>
              {unknownVariables.length > 0 ? (
                <p
                  className="text-sm text-red-600"
                  role="alert"
                  data-testid="admin-notification-template-error"
                >
                  Unknown variables:{" "}
                  {unknownVariables.map((name) => `{${name}}`).join(", ")}
                </p>
              ) : templateError ? (
                <p
                  className="text-sm text-red-600"
                  role="alert"
                  data-testid="admin-notification-template-error"
                >
                  {templateError}
                </p>
              ) : null}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={saving || unknownVariables.length > 0}
                  data-testid="admin-notification-template-save"
                  onClick={onSaveTemplates}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-emerald-700 px-4 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-60"
                >
                  {saving ? "Saving…" : "Save template"}
                </button>
                <button
                  type="button"
                  disabled={saving}
                  data-testid="admin-notification-template-reset"
                  onClick={resetReviewTemplate}
                  className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                >
                  Reset to default
                </button>
              </div>
              {templateSuccess ? (
                <p
                  className="text-sm text-emerald-700"
                  data-testid="admin-notification-template-success"
                >
                  {templateSuccess}
                </p>
              ) : null}
              <p className="text-xs text-gray-500">
                Defaults: subject “{DEFAULT_REVIEW_REQUEST_SUBJECT.slice(0, 40)}…”. Body starts with
                “{DEFAULT_REVIEW_REQUEST_BODY.slice(0, 24)}…”.
              </p>
            </div>

            <div
              className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4"
              data-testid="admin-notification-template-preview"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-800">
                Live preview
              </p>
              <p className="mt-3 text-sm font-semibold text-gray-900">{previewSubject}</p>
              <pre className="mt-3 whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-700">
                {previewBody}
              </pre>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
