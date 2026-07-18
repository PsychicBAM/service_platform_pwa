import type { ReactNode } from "react";
import type { LegalConsentRecordItem } from "@/types/api";
import {
  consentRateLabel,
  formatConsentDate,
  formatConsentDateTime,
  formatSourceLabel,
  recordClientLabel,
  type ConsentDetailTab,
  type DerivedConsentForm,
} from "@/components/admin/legalConsent/legalConsentHelpers";

type AdminConsentDetailPanelProps = {
  form: DerivedConsentForm;
  totalConsents: number;
  historyRecords: LegalConsentRecordItem[];
  activeTab: ConsentDetailTab;
  onTabChange: (tab: ConsentDetailTab) => void;
  onClose: () => void;
  onPreview: () => void;
};

const TABS: Array<{ id: ConsentDetailTab; label: string; testId: string }> = [
  { id: "overview", label: "Overview", testId: "admin-consent-detail-tab-overview" },
  { id: "content", label: "Content", testId: "admin-consent-detail-tab-content" },
  { id: "history", label: "History", testId: "admin-consent-detail-tab-history" },
  { id: "settings", label: "Settings", testId: "admin-consent-detail-tab-settings" },
];

export function AdminConsentDetailPanel({
  form,
  totalConsents,
  historyRecords,
  activeTab,
  onTabChange,
  onClose,
  onPreview,
}: AdminConsentDetailPanelProps) {
  return (
    <aside
      className="h-fit rounded-2xl border border-gray-200 bg-white shadow-sm"
      data-testid="admin-consent-detail-panel"
    >
      <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-4 py-4 sm:px-5">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-bold text-gray-900">{form.name}</h3>
            <span
              className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${
                form.status === "published"
                  ? "bg-emerald-50 text-emerald-800 ring-emerald-100"
                  : "bg-slate-100 text-slate-700 ring-slate-200"
              }`}
            >
              {form.status === "published" ? "Published" : "Draft"}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Version {form.version}
            {form.lastAcceptedAt
              ? ` · Updated ${formatConsentDate(form.lastAcceptedAt)}`
              : " · No acceptances yet"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg px-2 py-1 text-lg leading-none text-gray-400 outline-none hover:bg-gray-50 hover:text-gray-700 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          aria-label="Close detail panel"
        >
          ×
        </button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-100 px-2">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id)}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
              activeTab === tab.id
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-gray-500 hover:text-gray-800"
            }`}
            data-testid={tab.testId}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 px-4 py-4 sm:px-5">
        {activeTab === "overview" ? (
          <>
            <p className="text-sm leading-relaxed text-gray-600">{form.description}</p>
            <dl className="space-y-3 text-sm">
              <DetailRow label="Status">
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                  Draft
                </span>
              </DetailRow>
              <DetailRow label="Required">{form.required ? "Yes" : "No"}</DetailRow>
              <DetailRow label="Display to">{form.displayTo}</DetailRow>
              <DetailRow label="Consents">
                {consentRateLabel(form.consentCount, totalConsents)}
              </DetailRow>
              <DetailRow label="Last updated">
                {formatConsentDate(form.lastAcceptedAt)}
              </DetailRow>
              <DetailRow label="First recorded">
                {formatConsentDate(form.firstAcceptedAt)}
              </DetailRow>
            </dl>
          </>
        ) : null}

        {activeTab === "content" ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Draft placeholder — not legal advice. Must be reviewed before public launch.
            </div>
            {form.contentSections.map((section) => (
              <section key={section.title} className="space-y-1.5">
                <h4 className="text-sm font-semibold text-gray-900">{section.title}</h4>
                <p className="text-sm leading-relaxed text-gray-600">{section.body}</p>
              </section>
            ))}
          </div>
        ) : null}

        {activeTab === "history" ? (
          historyRecords.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
              <p className="text-sm font-medium text-gray-800">No acceptance history yet</p>
              <p className="mt-1 text-xs text-gray-500">
                When clients accept this consent version, records appear here.
              </p>
            </div>
          ) : (
            <ul className="space-y-2">
              {historyRecords.slice(0, 20).map((record) => (
                <li
                  key={record.id}
                  className="rounded-xl border border-gray-100 bg-gray-50/70 px-3 py-2.5 text-sm"
                >
                  <p className="font-medium text-gray-900">{recordClientLabel(record)}</p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatSourceLabel(record.source)} ·{" "}
                    <time dateTime={record.accepted_at}>
                      {formatConsentDateTime(record.accepted_at)}
                    </time>
                  </p>
                </li>
              ))}
              {historyRecords.length > 20 ? (
                <p className="text-xs text-gray-500">
                  Showing latest 20 of {historyRecords.length} loaded records.
                </p>
              ) : null}
            </ul>
          )
        ) : null}

        {activeTab === "settings" ? (
          <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
            <p className="text-sm font-medium text-gray-800">Settings not configurable yet</p>
            <p className="mt-1 text-xs leading-relaxed text-gray-500">
              Required/optional and publish state are managed by the platform consent flow. Custom
              business consent forms are not available in admin yet.
            </p>
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-gray-100 px-4 py-3.5 sm:px-5">
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex h-10 items-center rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
          data-testid="admin-consent-form-preview"
        >
          Preview
        </button>
      </div>
    </aside>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] items-start gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="min-w-0 font-medium text-gray-900">{children}</dd>
    </div>
  );
}
