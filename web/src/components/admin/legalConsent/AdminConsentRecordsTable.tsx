import type { LegalConsentRecordItem } from "@/types/api";
import {
  SYSTEM_CONSENT_FORM_NAME,
  formatConsentDateTime,
  formatEntityTypeLabel,
  formatSourceLabel,
  recordClientLabel,
  recordStatusLabel,
  type EntityTypeFilter,
  type SourceFilter,
  ENTITY_TYPE_OPTIONS,
  SOURCE_OPTIONS,
} from "@/components/admin/legalConsent/legalConsentHelpers";

type AdminConsentRecordsTableProps = {
  records: LegalConsentRecordItem[];
  sourceFilter: SourceFilter;
  entityTypeFilter: EntityTypeFilter;
  onSourceChange: (value: SourceFilter) => void;
  onEntityTypeChange: (value: EntityTypeFilter) => void;
  page: number;
  totalPages: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  canGoPrevious: boolean;
  canGoNext: boolean;
};

export function AdminConsentRecordsTable({
  records,
  sourceFilter,
  entityTypeFilter,
  onSourceChange,
  onEntityTypeChange,
  page,
  totalPages,
  total,
  onPrev,
  onNext,
  canGoPrevious,
  canGoNext,
}: AdminConsentRecordsTableProps) {
  return (
    <div
      className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm"
      data-testid="admin-consent-records-table"
    >
      <div className="grid gap-3 border-b border-gray-100 px-4 py-3 sm:grid-cols-2">
        <label htmlFor="consentSourceFilter" className="block text-sm">
          <span className="font-medium text-gray-700">Source</span>
          <select
            id="consentSourceFilter"
            value={sourceFilter}
            onChange={(event) => onSourceChange(event.target.value as SourceFilter)}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            {SOURCE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label htmlFor="consentEntityTypeFilter" className="block text-sm">
          <span className="font-medium text-gray-700">Entity type</span>
          <select
            id="consentEntityTypeFilter"
            value={entityTypeFilter}
            onChange={(event) => onEntityTypeChange(event.target.value as EntityTypeFilter)}
            className="mt-1 h-10 w-full rounded-xl border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          >
            {ENTITY_TYPE_OPTIONS.map((option) => (
              <option key={option.label} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {records.length === 0 ? (
        <div className="px-4 py-10 text-center">
          <p className="text-sm font-medium text-gray-800">No consent records match this filter</p>
          <p className="mt-1 text-xs text-gray-500">
            Acceptances from registration, booking, and order flows appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Form
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Version
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Accepted at
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Source
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Entity
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {records.map((record) => (
                  <tr
                    key={record.id}
                    className="bg-white hover:bg-gray-50/80"
                    data-testid="admin-consent-record-row"
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {recordClientLabel(record)}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{SYSTEM_CONSENT_FORM_NAME}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-gray-700">
                      {record.legal_consent_version}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-gray-600">
                      <time dateTime={record.accepted_at}>
                        {formatConsentDateTime(record.accepted_at)}
                      </time>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-100">
                        {recordStatusLabel(record)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {formatSourceLabel(record.source)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      <p>{formatEntityTypeLabel(record.entity_type)}</p>
                      <p className="font-mono text-xs text-gray-400">
                        {record.entity_id ?? "—"}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-4 py-3 text-sm text-gray-600">
            <p>
              Page {page} of {totalPages} · {total} record{total === 1 ? "" : "s"}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!canGoPrevious}
                onClick={onPrev}
                className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={!canGoNext}
                onClick={onNext}
                className="rounded-lg border border-gray-200 px-3 py-1.5 font-medium text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
