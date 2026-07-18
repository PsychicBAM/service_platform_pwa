import type {
  LegalConsentEntityType,
  LegalConsentRecordItem,
  LegalConsentSource,
} from "@/types/api";

/** Matches API `LEGAL_CONSENT_VERSION` — the only tracked platform consent version. */
export const SYSTEM_CONSENT_VERSION = "draft-placeholder-v1";
export const SYSTEM_CONSENT_FORM_NAME = "Personal Data Consent";
export const SYSTEM_CONSENT_PREVIEW_PATH = "/legal/consent";

export type LegalConsentPageTab = "forms" | "records";
export type ConsentDetailTab = "overview" | "content" | "history" | "settings";

export type SourceFilter = "" | LegalConsentSource;
export type EntityTypeFilter = "" | LegalConsentEntityType;

export type DerivedConsentForm = {
  id: string;
  name: string;
  helper: string;
  version: string;
  status: "draft" | "published";
  required: boolean;
  displayTo: string;
  description: string;
  contentSections: Array<{ title: string; body: string }>;
  previewPath: string;
  consentCount: number;
  lastAcceptedAt: string | null;
  firstAcceptedAt: string | null;
};

export const SOURCE_OPTIONS: Array<{ value: SourceFilter; label: string }> = [
  { value: "", label: "All sources" },
  { value: "registration", label: "Registration" },
  { value: "public_booking", label: "Public booking" },
  { value: "public_order", label: "Public order" },
];

export const ENTITY_TYPE_OPTIONS: Array<{ value: EntityTypeFilter; label: string }> = [
  { value: "", label: "All types" },
  { value: "business", label: "Business" },
  { value: "booking", label: "Booking" },
  { value: "order", label: "Order" },
];

export function formatSourceLabel(source: LegalConsentSource): string {
  if (source === "registration") return "Registration";
  if (source === "public_booking") return "Public booking";
  return "Public order";
}

export function formatEntityTypeLabel(entityType: LegalConsentEntityType): string {
  return entityType.charAt(0).toUpperCase() + entityType.slice(1);
}

export function formatConsentDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatConsentDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatFileDate(date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function recordClientLabel(record: LegalConsentRecordItem): string {
  if (record.client_id) return `Client ${record.client_id.slice(0, 8)}…`;
  if (record.user_id) return `User ${record.user_id.slice(0, 8)}…`;
  return "Anonymous / unknown";
}

export function recordStatusLabel(_record: LegalConsentRecordItem): string {
  return "Accepted";
}

const SYSTEM_CONTENT: Array<{ title: string; body: string }> = [
  {
    title: "Consent placeholder",
    body: "This document describes consent to personal data processing where required by applicable law. Final wording, checkboxes, and lawful bases are pending legal review.",
  },
  {
    title: "Your rights",
    body: "Users may request access, correction, or deletion of personal data subject to applicable law. A formal request process will be published before public launch.",
  },
  {
    title: "Contact the operator",
    body: "Contact details for consent and data-subject requests will be added after legal review.",
  },
];

function sortByAcceptedDesc(a: LegalConsentRecordItem, b: LegalConsentRecordItem): number {
  return new Date(b.accepted_at).getTime() - new Date(a.accepted_at).getTime();
}

/** Derive consent “forms” from recorded versions (plus the known system default). */
export function deriveConsentForms(records: LegalConsentRecordItem[]): DerivedConsentForm[] {
  const byVersion = new Map<string, LegalConsentRecordItem[]>();
  for (const record of records) {
    const list = byVersion.get(record.legal_consent_version) ?? [];
    list.push(record);
    byVersion.set(record.legal_consent_version, list);
  }

  if (!byVersion.has(SYSTEM_CONSENT_VERSION)) {
    byVersion.set(SYSTEM_CONSENT_VERSION, []);
  }

  const forms: DerivedConsentForm[] = [];
  for (const [version, versionRecords] of byVersion) {
    const sorted = [...versionRecords].sort(sortByAcceptedDesc);
    const isSystem = version === SYSTEM_CONSENT_VERSION;
    forms.push({
      id: `form-${version}`,
      name: isSystem ? SYSTEM_CONSENT_FORM_NAME : `Consent ${version}`,
      helper: isSystem ? "System default" : "Recorded version",
      version,
      status: "draft",
      required: true,
      displayTo: "All clients & booking/order flows",
      description:
        "Platform legal consent acknowledgment used for registration, public booking, and public order flows. Draft text — not legal advice.",
      contentSections: isSystem
        ? SYSTEM_CONTENT
        : [
            {
              title: "Version note",
              body: `Acceptance records exist for version “${version}”. Full document text for this version is not stored in admin yet.`,
            },
          ],
      previewPath: SYSTEM_CONSENT_PREVIEW_PATH,
      consentCount: versionRecords.length,
      lastAcceptedAt: sorted[0]?.accepted_at ?? null,
      firstAcceptedAt: sorted[sorted.length - 1]?.accepted_at ?? null,
    });
  }

  return forms.sort((a, b) => {
    if (a.version === SYSTEM_CONSENT_VERSION) return -1;
    if (b.version === SYSTEM_CONSENT_VERSION) return 1;
    return a.name.localeCompare(b.name);
  });
}

export function computeLegalConsentKpis(
  records: LegalConsentRecordItem[],
  totalFromMeta: number,
  now = new Date(),
) {
  const uniqueKeys = new Set<string>();
  for (const record of records) {
    if (record.client_id) uniqueKeys.add(`c:${record.client_id}`);
    else if (record.user_id) uniqueKeys.add(`u:${record.user_id}`);
    else uniqueKeys.add(`r:${record.id}`);
  }

  const dayMs = 24 * 60 * 60 * 1000;
  const last7Start = new Date(now.getTime() - 7 * dayMs);
  const prev7Start = new Date(now.getTime() - 14 * dayMs);
  let last7 = 0;
  let prev7 = 0;
  for (const record of records) {
    const t = new Date(record.accepted_at).getTime();
    if (t >= last7Start.getTime()) last7 += 1;
    else if (t >= prev7Start.getTime()) prev7 += 1;
  }
  const delta = last7 - prev7;
  const totalTrend =
    records.length === 0
      ? null
      : delta === 0
        ? "→ 0 vs prior 7 days"
        : `${delta > 0 ? "+" : ""}${delta} vs prior 7 days`;

  const uniqueDeltaHint =
    uniqueKeys.size > 0 ? `${uniqueKeys.size} from loaded records` : "No unique parties yet";

  const completedRate =
    totalFromMeta > 0 ? "100% of recorded acceptances" : "No acceptances recorded yet";

  return {
    totalConsents: totalFromMeta,
    totalTrend,
    uniqueClients: uniqueKeys.size,
    uniqueTrend: uniqueDeltaHint,
    completed: totalFromMeta,
    completedTrend: completedRate,
    expiringSoon: 0,
    expiringTrend: "Not tracked",
  };
}

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function downloadLegalConsentCsv(
  filename: string,
  rows: Array<Array<string | number>>,
): void {
  const csv = rows.map((row) => row.map((cell) => escapeCsv(String(cell))).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function buildFormsExportRows(
  forms: DerivedConsentForm[],
  totalConsents: number,
): Array<Array<string | number>> {
  return [
    [
      "form_name",
      "version",
      "status",
      "required",
      "last_updated",
      "consents_count",
      "consent_rate",
    ],
    ...forms.map((form) => {
      const rate =
        totalConsents > 0
          ? `${((form.consentCount / totalConsents) * 100).toFixed(1)}%`
          : "0%";
      return [
        form.name,
        form.version,
        form.status,
        form.required ? "required" : "optional",
        formatConsentDate(form.lastAcceptedAt),
        form.consentCount,
        rate,
      ];
    }),
  ];
}

export function buildRecordsExportRows(
  records: LegalConsentRecordItem[],
): Array<Array<string | number>> {
  return [
    ["client", "form", "version", "accepted_at", "status", "source", "entity_type", "entity_id"],
    ...records.map((record) => [
      record.client_id ?? record.user_id ?? "",
      SYSTEM_CONSENT_FORM_NAME,
      record.legal_consent_version,
      record.accepted_at,
      recordStatusLabel(record),
      formatSourceLabel(record.source),
      formatEntityTypeLabel(record.entity_type),
      record.entity_id ?? "",
    ]),
  ];
}

export function consentRateLabel(count: number, total: number): string {
  if (total <= 0) return `${count} (—)`;
  const pct = ((count / total) * 100).toFixed(1);
  return `${count.toLocaleString()} (${pct}%)`;
}

export function matchesFormSearch(form: DerivedConsentForm, search: string): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return (
    form.name.toLowerCase().includes(q) ||
    form.version.toLowerCase().includes(q) ||
    form.helper.toLowerCase().includes(q)
  );
}
