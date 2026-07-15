import { useState } from "react";
import { Link } from "react-router-dom";
import {
  buildAdminOnboardingItems,
  type AdminOnboardingItem,
} from "@/lib/adminOnboarding";
import type { AdminServiceRead, BusinessAdminRead, ScheduleRead } from "@/types/api";

type AdminOnboardingChecklistProps = {
  business: BusinessAdminRead;
  services: AdminServiceRead[];
  schedule: ScheduleRead | null | undefined;
};

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!navigator.clipboard?.writeText) {
    return false;
  }
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ChecklistAction({
  item,
  publicUrl,
}: {
  item: AdminOnboardingItem;
  publicUrl: string | null;
}) {
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "failed">("idle");

  if (item.action === "copy-public-link" && publicUrl) {
    return (
      <button
        type="button"
        className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
        data-testid={`admin-onboarding-action-${item.id}`}
        onClick={async () => {
          const copied = await copyTextToClipboard(publicUrl);
          setCopyStatus(copied ? "copied" : "failed");
        }}
      >
        {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Copy failed" : "Copy link"}
      </button>
    );
  }

  if (!item.href) {
    return null;
  }

  return (
    <Link
      to={item.href}
      className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-50"
      data-testid={`admin-onboarding-action-${item.id}`}
    >
      {item.complete ? "Open" : "Start"}
    </Link>
  );
}

export function AdminOnboardingChecklist({
  business,
  services,
  schedule,
}: AdminOnboardingChecklistProps) {
  const items = buildAdminOnboardingItems({ business, services, schedule });
  const completedCount = items.filter((item) => item.complete).length;
  const publicUrl =
    business.slug?.trim() && typeof window !== "undefined"
      ? `${window.location.origin}/b/${business.slug.trim()}`
      : null;

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      data-testid="admin-onboarding-checklist"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-slate-900">
            Complete your business profile
          </h3>
          <p className="mt-1 text-sm text-slate-600">
            Finish these steps so customers can find you and book with confidence.
          </p>
        </div>
        <p
          className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700"
          data-testid="admin-onboarding-progress"
        >
          {completedCount} of {items.length} completed
        </p>
      </div>

      <ul className="mt-4 space-y-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5"
            data-testid={`admin-onboarding-item-${item.id}`}
            data-complete={item.complete ? "true" : "false"}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                item.complete
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-white text-slate-400 ring-1 ring-slate-200"
              }`}
              aria-hidden="true"
            >
              {item.complete ? "✓" : "○"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-slate-900">{item.label}</p>
              <p className="mt-0.5 text-xs text-slate-500">{item.description}</p>
            </div>
            <ChecklistAction item={item} publicUrl={publicUrl} />
          </li>
        ))}
      </ul>
    </section>
  );
}
