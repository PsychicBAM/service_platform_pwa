import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBusinessLegalConsents } from "@/api/adminApi";
import { AdminAnalyticsKpiCard } from "@/components/admin/analytics/AdminAnalyticsKpiCard";
import { AdminConsentDetailPanel } from "@/components/admin/legalConsent/AdminConsentDetailPanel";
import { AdminConsentFormsTable } from "@/components/admin/legalConsent/AdminConsentFormsTable";
import { AdminConsentRecordsTable } from "@/components/admin/legalConsent/AdminConsentRecordsTable";
import {
  buildFormsExportRows,
  buildRecordsExportRows,
  computeLegalConsentKpis,
  deriveConsentForms,
  downloadLegalConsentCsv,
  formatFileDate,
  matchesFormSearch,
  type ConsentDetailTab,
  type EntityTypeFilter,
  type LegalConsentPageTab,
  type SourceFilter,
} from "@/components/admin/legalConsent/legalConsentHelpers";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { getMeErrorMessage } from "@/utils/errors";

const PAGE_LIMIT = 25;
const SUMMARY_LIMIT = 100;

function IconTotal() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M8 7h11M8 12h11M8 17h7" strokeLinecap="round" />
      <path d="M5 7h.01M5 12h.01M5 17h.01" strokeLinecap="round" />
    </svg>
  );
}

function IconClients() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M9 11a3 3 0 1 0-3-3 3 3 0 0 0 3 3Zm9 0a3 3 0 1 0-3-3 3 3 0 0 0 3 3Z" />
      <path d="M3.5 19a4.5 4.5 0 0 1 9 0M12.5 19a4.5 4.5 0 0 1 8 0" strokeLinecap="round" />
    </svg>
  );
}

function IconCompleted() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <circle cx="12" cy="12" r="8.25" />
      <path d="m8.2 12.2 2.4 2.4 5.2-5.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconExpiring() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M12 8v4l2.5 2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="8.25" />
    </svg>
  );
}

export function AdminLegalConsentsPage() {
  const { businessId } = useAdminBusiness();
  const [activeTab, setActiveTab] = useState<LegalConsentPageTab>("forms");
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>("");
  const [entityTypeFilter, setEntityTypeFilter] = useState<EntityTypeFilter>("");
  const [page, setPage] = useState(1);
  const [formSearch, setFormSearch] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
  const [panelDismissed, setPanelDismissed] = useState(false);
  const [detailTab, setDetailTab] = useState<ConsentDetailTab>("overview");

  const summaryQuery = useQuery({
    queryKey: ["admin-legal-consents-summary", businessId],
    queryFn: () =>
      getBusinessLegalConsents(businessId!, {
        page: 1,
        limit: SUMMARY_LIMIT,
      }),
    enabled: Boolean(businessId),
  });

  const recordsQuery = useQuery({
    queryKey: ["admin-legal-consents", businessId, sourceFilter, entityTypeFilter, page],
    queryFn: () =>
      getBusinessLegalConsents(businessId!, {
        source: sourceFilter || undefined,
        entity_type: entityTypeFilter || undefined,
        page,
        limit: PAGE_LIMIT,
      }),
    enabled: Boolean(businessId),
  });

  const summaryRecords = summaryQuery.data?.data ?? [];
  const totalConsents = summaryQuery.data?.meta.total ?? 0;

  const forms = useMemo(() => deriveConsentForms(summaryRecords), [summaryRecords]);
  const filteredForms = useMemo(
    () => forms.filter((form) => matchesFormSearch(form, formSearch)),
    [formSearch, forms],
  );

  const kpis = useMemo(
    () => computeLegalConsentKpis(summaryRecords, totalConsents),
    [summaryRecords, totalConsents],
  );

  useEffect(() => {
    if (panelDismissed) return;
    if (selectedFormId && filteredForms.some((form) => form.id === selectedFormId)) return;
    setSelectedFormId(filteredForms[0]?.id ?? forms[0]?.id ?? null);
  }, [filteredForms, forms, panelDismissed, selectedFormId]);

  const selectedForm = forms.find((form) => form.id === selectedFormId) ?? null;
  const historyRecords = useMemo(() => {
    if (!selectedForm) return [];
    return summaryRecords
      .filter((record) => record.legal_consent_version === selectedForm.version)
      .sort(
        (a, b) => new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime(),
      );
  }, [selectedForm, summaryRecords]);

  const records = recordsQuery.data?.data ?? [];
  const totalPages = recordsQuery.data
    ? Math.max(1, Math.ceil(recordsQuery.data.meta.total / recordsQuery.data.meta.limit))
    : 1;
  const canGoPrevious = page > 1;
  const canGoNext = recordsQuery.data ? page < totalPages : false;

  const loading =
    (activeTab === "forms" && summaryQuery.isLoading) ||
    (activeTab === "records" && recordsQuery.isLoading);
  const loadError =
    activeTab === "forms"
      ? summaryQuery.isError
        ? getMeErrorMessage(summaryQuery.error, "Unable to load consent data")
        : null
      : recordsQuery.isError
        ? getMeErrorMessage(recordsQuery.error, "Unable to load consent records")
        : null;

  function openPreview(path: string) {
    window.open(path, "_blank", "noopener,noreferrer");
  }

  function handleExport() {
    if (activeTab === "forms") {
      downloadLegalConsentCsv(
        `service-platform-legal-consent-${formatFileDate()}.csv`,
        buildFormsExportRows(filteredForms, totalConsents),
      );
      return;
    }
    downloadLegalConsentCsv(
      `service-platform-legal-consent-${formatFileDate()}.csv`,
      buildRecordsExportRows(records),
    );
  }

  const showDetail = activeTab === "forms" && selectedForm && !panelDismissed;

  return (
    <section className="w-full space-y-6 sm:space-y-7" data-testid="admin-legal-consent-page">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">Legal consent</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage consent forms, track user agreements, and ensure legal compliance.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex h-11 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-gray-700 shadow-sm outline-none hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-emerald-500/30"
            data-testid="admin-legal-consent-export"
          >
            <span aria-hidden="true">⇪</span>
            Export
          </button>
        </div>
      </div>

      <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
        Audit summary only. Legal text is still pending final review. This is not legal advice —
        review requirements with your legal advisor before public launch.
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <AdminAnalyticsKpiCard
          testId="admin-legal-consent-kpi-total"
          label="Total Consents"
          value={kpis.totalConsents.toLocaleString()}
          trend={kpis.totalTrend}
          icon={<IconTotal />}
          iconTone="bg-emerald-100 text-emerald-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-legal-consent-kpi-unique-clients"
          label="Unique Clients"
          value={kpis.uniqueClients.toLocaleString()}
          trend={kpis.uniqueTrend}
          icon={<IconClients />}
          iconTone="bg-sky-100 text-sky-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-legal-consent-kpi-completed"
          label="Completed"
          value={kpis.completed.toLocaleString()}
          trend={kpis.completedTrend}
          icon={<IconCompleted />}
          iconTone="bg-violet-100 text-violet-700"
        />
        <AdminAnalyticsKpiCard
          testId="admin-legal-consent-kpi-expiring-soon"
          label="Expiring Soon"
          value={String(kpis.expiringSoon)}
          trend={kpis.expiringTrend}
          icon={<IconExpiring />}
          iconTone="bg-rose-100 text-rose-700"
        />
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-gray-100">
        <button
          type="button"
          onClick={() => setActiveTab("forms")}
          className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
            activeTab === "forms"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
          data-testid="admin-legal-consent-tab-forms"
        >
          Consent forms
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("records")}
          className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/30 ${
            activeTab === "records"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-gray-500 hover:text-gray-800"
          }`}
          data-testid="admin-legal-consent-tab-records"
        >
          Consent records
        </button>
      </div>

      {loading ? <LoadingState message="Loading consent records…" /> : null}
      {loadError ? (
        <ErrorState title="Could not load consent records" message={loadError} />
      ) : null}

      {!loading && !loadError ? (
        activeTab === "forms" ? (
          <div
            className={`grid items-start gap-5 ${
              showDetail
                ? "xl:grid-cols-[minmax(0,1fr)_360px] 2xl:grid-cols-[minmax(0,1fr)_380px]"
                : "grid-cols-1"
            }`}
          >
            <AdminConsentFormsTable
              forms={filteredForms}
              totalConsents={totalConsents}
              selectedFormId={panelDismissed ? null : selectedFormId}
              search={formSearch}
              onSearchChange={setFormSearch}
              onSelect={(formId) => {
                setSelectedFormId(formId);
                setPanelDismissed(false);
                setDetailTab("overview");
              }}
              onPreview={(form) => openPreview(form.previewPath)}
            />
            {showDetail && selectedForm ? (
              <AdminConsentDetailPanel
                form={selectedForm}
                totalConsents={totalConsents}
                historyRecords={historyRecords}
                activeTab={detailTab}
                onTabChange={setDetailTab}
                onClose={() => setPanelDismissed(true)}
                onPreview={() => openPreview(selectedForm.previewPath)}
              />
            ) : null}
          </div>
        ) : (
          <AdminConsentRecordsTable
            records={records}
            sourceFilter={sourceFilter}
            entityTypeFilter={entityTypeFilter}
            onSourceChange={(value) => {
              setSourceFilter(value);
              setPage(1);
            }}
            onEntityTypeChange={(value) => {
              setEntityTypeFilter(value);
              setPage(1);
            }}
            page={recordsQuery.data?.meta.page ?? page}
            totalPages={totalPages}
            total={recordsQuery.data?.meta.total ?? 0}
            onPrev={() => setPage((current) => Math.max(1, current - 1))}
            onNext={() => setPage((current) => current + 1)}
            canGoPrevious={canGoPrevious}
            canGoNext={canGoNext}
          />
        )
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <InfoCard
          title="About legal consent"
          body="Helps organize consent forms and acceptance records for your business flows."
          linkLabel="Learn more"
          href="/legal/consent"
        />
        <InfoCard
          title="Stay compliant"
          body="Review requirements with your legal advisor. This screen does not guarantee compliance."
        />
        <InfoCard
          title="Track consents"
          body="Monitor acceptance records from registration, booking, and order flows."
        />
        <InfoCard
          title="Version control"
          body="Keep version history when supported. Current platform version is tracked on each acceptance."
        />
      </div>
    </section>
  );
}

function InfoCard({
  title,
  body,
  linkLabel,
  href,
}: {
  title: string;
  body: string;
  linkLabel?: string;
  href?: string;
}) {
  return (
    <article className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8">
          <path d="M8 7h8M8 12h8M8 17h5" strokeLinecap="round" />
          <rect x="4" y="4" width="16" height="16" rx="2" />
        </svg>
      </div>
      <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-gray-500">{body}</p>
      {linkLabel && href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex text-sm font-semibold text-emerald-700 hover:text-emerald-800"
        >
          {linkLabel}
        </a>
      ) : null}
    </article>
  );
}
