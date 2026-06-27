import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { listAuditLogs } from "@/api/superadminApi";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { getSuperadminErrorMessage } from "@/utils/errors";
import { formatDateTimeLabel } from "@/utils/format";

function formatMetadata(metadata: Record<string, unknown>): string | null {
  const keys = Object.keys(metadata);
  if (keys.length === 0) {
    return null;
  }
  return JSON.stringify(metadata, null, 2);
}

export function SuperadminAuditLogsPage() {
  const [businessIdInput, setBusinessIdInput] = useState("");
  const [actionInput, setActionInput] = useState("");
  const [businessIdQuery, setBusinessIdQuery] = useState("");
  const [actionQuery, setActionQuery] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setBusinessIdQuery(businessIdInput.trim());
      setActionQuery(actionInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [businessIdInput, actionInput]);

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["superadmin-audit-logs", businessIdQuery, actionQuery],
    queryFn: () =>
      listAuditLogs({
        business_id: businessIdQuery || undefined,
        action: actionQuery || undefined,
        limit: 50,
      }),
  });

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Audit logs</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <label htmlFor="auditBusinessId" className="block text-sm">
          <span className="font-medium text-slate-700">Business ID</span>
          <input
            id="auditBusinessId"
            type="text"
            value={businessIdInput}
            placeholder="Optional UUID"
            onChange={(event) => setBusinessIdInput(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-mono"
          />
        </label>
        <label htmlFor="auditAction" className="block text-sm">
          <span className="font-medium text-slate-700">Action</span>
          <input
            id="auditAction"
            type="text"
            value={actionInput}
            placeholder="e.g. business.status_updated"
            onChange={(event) => setActionInput(event.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      {isLoading ? <LoadingState message="Loading audit logs…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load audit logs"
          message={getSuperadminErrorMessage(error, "Unable to load audit logs")}
        />
      ) : null}

      {!isLoading && !isError && data?.data.length === 0 ? (
        <EmptyState title="No audit logs match this filter" />
      ) : null}

      {!isLoading && !isError && data ? (
        <div className="space-y-3">
          {data.data.map((log) => {
            const metadataText = formatMetadata(log.metadata);
            return (
              <article
                key={log.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm text-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-mono text-xs font-semibold text-slate-900">{log.action}</p>
                  <time dateTime={log.created_at} className="text-xs text-slate-500">
                    {formatDateTimeLabel(log.created_at)}
                  </time>
                </div>
                <dl className="mt-2 space-y-1 text-slate-600">
                  {log.business_id ? (
                    <div>
                      <dt className="inline text-slate-500">Business: </dt>
                      <dd className="inline font-mono text-xs">{log.business_id}</dd>
                    </div>
                  ) : null}
                  {log.actor_user_id ? (
                    <div>
                      <dt className="inline text-slate-500">Actor: </dt>
                      <dd className="inline font-mono text-xs">{log.actor_user_id}</dd>
                    </div>
                  ) : null}
                  {log.target_type ? (
                    <div>
                      <dt className="inline text-slate-500">Target: </dt>
                      <dd className="inline">
                        {log.target_type}
                        {log.target_id ? ` · ${log.target_id}` : ""}
                      </dd>
                    </div>
                  ) : null}
                </dl>
                {metadataText ? (
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-2 text-xs text-slate-700">
                    {metadataText}
                  </pre>
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
