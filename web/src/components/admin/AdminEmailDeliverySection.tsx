import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getAdminEmailStatus, sendAdminTestEmail } from "@/api/adminEmailApi";
import { AdminSettingsSectionCard } from "@/components/admin/AdminSettingsSectionCard";
import { getApiErrorMessage } from "@/utils/errors";

function statusPillClass(status: string): string {
  switch (status) {
    case "ready":
      return "bg-emerald-100 text-emerald-800";
    case "dry_run":
      return "bg-amber-100 text-amber-900";
    case "configuration_needed":
      return "bg-orange-100 text-orange-900";
    default:
      return "bg-slate-100 text-slate-700";
  }
}

function statusLabel(status: string): string {
  switch (status) {
    case "ready":
      return "Ready";
    case "dry_run":
      return "Dry-run";
    case "configuration_needed":
      return "Configuration needed";
    default:
      return "Disabled";
  }
}

export function AdminEmailDeliverySection() {
  const [toEmail, setToEmail] = useState("");
  const [feedback, setFeedback] = useState<{ kind: "ok" | "error"; text: string } | null>(
    null,
  );

  const statusQuery = useQuery({
    queryKey: ["admin-email-status"],
    queryFn: getAdminEmailStatus,
  });

  const testMutation = useMutation({
    mutationFn: (email: string) => sendAdminTestEmail(email),
    onSuccess: (result) => {
      setFeedback({
        kind: "ok",
        text: result.dry_run
          ? "Dry-run: no email was sent"
          : result.message || "Test email sent",
      });
    },
    onError: (error) => {
      setFeedback({
        kind: "error",
        text: getApiErrorMessage(error, "Could not send test email."),
      });
    },
  });

  const handleSubmit = () => {
    setFeedback(null);
    const trimmed = toEmail.trim();
    if (!trimmed) {
      setFeedback({ kind: "error", text: "Enter a recipient email." });
      return;
    }
    testMutation.mutate(trimmed);
  };

  const status = statusQuery.data;

  return (
    <div data-testid="admin-email-delivery-section">
      <AdminSettingsSectionCard
        title="Server email delivery"
        subtitle="SMTP / Brevo sending is controlled by server environment variables. Use this section to check status and send a test email."
        headerRight={
          status ? (
            <span
              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${statusPillClass(status.status)}`}
              data-testid="admin-email-status-pill"
            >
              {statusLabel(status.status)}
            </span>
          ) : null
        }
      >
        {statusQuery.isLoading ? (
          <p className="text-sm text-gray-500">Loading email status…</p>
        ) : null}

        {statusQuery.isError ? (
          <p className="text-sm text-red-700" role="alert">
            {getApiErrorMessage(statusQuery.error, "Could not load email status.")}
          </p>
        ) : null}

        {status ? (
          <dl
            className="mb-4 grid gap-3 rounded-xl border border-gray-200 bg-gray-50/70 p-4 text-sm sm:grid-cols-2"
            data-testid="admin-email-status-details"
          >
            <div>
              <dt className="text-gray-500">Provider</dt>
              <dd className="font-medium text-gray-900">
                {status.provider === "brevo" ? "Brevo SMTP" : status.provider}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Configured</dt>
              <dd className="font-medium text-gray-900">{status.configured ? "Yes" : "No"}</dd>
            </div>
            {status.host ? (
              <div>
                <dt className="text-gray-500">Host</dt>
                <dd className="break-all font-medium text-gray-900">{status.host}</dd>
              </div>
            ) : null}
            {status.from_email ? (
              <div>
                <dt className="text-gray-500">From email</dt>
                <dd className="break-all font-medium text-gray-900">{status.from_email}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}

        <div className="space-y-3 border-t border-gray-100 pt-4">
          <label htmlFor="admin-email-test-to" className="block text-sm">
            <span className="font-semibold text-gray-800">Send test email</span>
            <input
              id="admin-email-test-to"
              type="text"
              inputMode="email"
              autoComplete="email"
              value={toEmail}
              disabled={testMutation.isPending}
              onChange={(event) => setToEmail(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  event.stopPropagation();
                  handleSubmit();
                }
              }}
              placeholder="you@example.com"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm disabled:opacity-60"
              data-testid="admin-email-test-input"
            />
          </label>
          <button
            type="button"
            disabled={testMutation.isPending}
            onClick={handleSubmit}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60 sm:w-auto"
            data-testid="admin-email-test-submit"
          >
            {testMutation.isPending ? "Sending…" : "Send test email"}
          </button>
          {feedback ? (
            <p
              className={`text-sm ${feedback.kind === "ok" ? "text-emerald-700" : "text-red-700"}`}
              role="status"
              data-testid="admin-email-test-feedback"
            >
              {feedback.text}
            </p>
          ) : null}
        </div>
      </AdminSettingsSectionCard>
    </div>
  );
}
