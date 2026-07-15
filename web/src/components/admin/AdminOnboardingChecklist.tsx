import { useState } from "react";
import { Link } from "react-router-dom";
import {
  buildAdminOnboardingItems,
  readAdminOnboardingDismissed,
  writeAdminOnboardingDismissed,
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
      <span className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          className="text-xs font-semibold text-brand-700 hover:text-brand-800"
          data-testid={`admin-onboarding-action-${item.id}`}
          onClick={async () => {
            const copied = await copyTextToClipboard(publicUrl);
            setCopyStatus(copied ? "copied" : "failed");
          }}
        >
          {copyStatus === "copied" ? "Copied" : copyStatus === "failed" ? "Retry" : "Copy"}
        </button>
        {copyStatus === "failed" && item.href ? (
          <Link
            to={item.href}
            className="text-xs font-semibold text-slate-600 underline hover:text-brand-700"
            data-testid="admin-onboarding-action-share-fallback"
          >
            Open
          </Link>
        ) : null}
      </span>
    );
  }

  if (!item.href) {
    return null;
  }

  return (
    <Link
      to={item.href}
      className="shrink-0 text-xs font-semibold text-brand-700 hover:text-brand-800"
      data-testid={`admin-onboarding-action-${item.id}`}
    >
      {item.complete ? "Open" : "Start"}
    </Link>
  );
}

function DismissButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-slate-600"
      aria-label="Hide onboarding checklist"
      data-testid="admin-onboarding-hide"
      onClick={onClick}
    >
      <span aria-hidden="true" className="text-base leading-none">
        ×
      </span>
    </button>
  );
}

export function AdminOnboardingChecklist({
  business,
  services,
  schedule,
}: AdminOnboardingChecklistProps) {
  const [dismissed, setDismissed] = useState(() => readAdminOnboardingDismissed(business));
  const items = buildAdminOnboardingItems({ business, services, schedule });
  const completedCount = items.filter((item) => item.complete).length;
  const isComplete = completedCount === items.length && items.length > 0;
  const publicUrl =
    business.slug?.trim() && typeof window !== "undefined"
      ? `${window.location.origin}/b/${business.slug.trim()}`
      : null;

  function handleDismiss() {
    writeAdminOnboardingDismissed(business);
    setDismissed(true);
  }

  if (dismissed) {
    return null;
  }

  if (isComplete) {
    return (
      <div
        className="flex items-center justify-between gap-2 rounded-xl border border-emerald-100/80 bg-emerald-50/50 px-3 py-2"
        data-testid="admin-onboarding-complete"
      >
        <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-emerald-800">
          <span
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700"
            aria-hidden="true"
          >
            ✓
          </span>
          <span data-testid="admin-onboarding-complete-label">Business profile complete</span>
        </p>
        <DismissButton onClick={handleDismiss} />
      </div>
    );
  }

  return (
    <section
      className="rounded-xl border border-slate-200/70 bg-slate-50/40 p-3"
      data-testid="admin-onboarding-checklist"
    >
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-800">
              Complete your business profile
            </h3>
            <p
              className="rounded-full bg-white/80 px-2 py-0.5 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200/80"
              data-testid="admin-onboarding-progress"
            >
              {completedCount} of {items.length} completed
            </p>
          </div>
          <p className="mt-0.5 truncate text-xs text-slate-500">
            Finish setup so customers can find you and book with confidence.
          </p>
        </div>
        <DismissButton onClick={handleDismiss} />
      </div>

      <ul className="mt-2 divide-y divide-slate-200/60">
        {items.map((item) => (
          <li
            key={item.id}
            className="flex items-center gap-2 py-1.5"
            data-testid={`admin-onboarding-item-${item.id}`}
            data-complete={item.complete ? "true" : "false"}
          >
            <span
              className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                item.complete
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-white text-slate-400 ring-1 ring-slate-200"
              }`}
              aria-hidden="true"
            >
              {item.complete ? "✓" : "○"}
            </span>
            <p className="min-w-0 flex-1 truncate text-sm text-slate-700">{item.label}</p>
            <ChecklistAction item={item} publicUrl={publicUrl} />
          </li>
        ))}
      </ul>
    </section>
  );
}
