import type { ReactNode } from "react";

type StatusBadgeProps = {
  status: string;
  kind?: "booking" | "order" | "waitlist" | "review";
};

function statusClasses(status: string, kind: StatusBadgeProps["kind"]): string {
  if (kind === "review") {
    if (status === "published") {
      return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200/70";
    }
    if (status === "hidden") {
      return "bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200/70";
    }
  }

  if (kind === "booking") {
    if (status === "pending" || status === "pending_payment") {
      return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200/80";
    }
    if (status === "confirmed") {
      return "bg-teal-100 text-teal-800 ring-1 ring-inset ring-teal-200/80";
    }
    if (status === "completed") {
      return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200/80";
    }
    if (status === "cancelled") {
      return "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200/80";
    }
    if (status === "rescheduled") {
      return "bg-indigo-100 text-indigo-800 ring-1 ring-inset ring-indigo-200/80";
    }
    if (status === "no_show") {
      return "bg-stone-100 text-stone-600 ring-1 ring-inset ring-stone-200/80";
    }
  }

  if (kind === "order") {
    if (status === "submitted" || status === "pending_payment") {
      return "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200/80";
    }
    if (status === "accepted") {
      return "bg-teal-100 text-teal-800 ring-1 ring-inset ring-teal-200/80";
    }
    if (status === "in_progress") {
      return "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200/80";
    }
    if (status === "completed") {
      return "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200/80";
    }
    if (status === "cancelled" || status === "declined") {
      return "bg-red-100 text-red-800 ring-1 ring-inset ring-red-200/80";
    }
  }

  if (status === "cancelled" || status === "declined") {
    return "bg-red-100 text-red-800";
  }
  if (status === "confirmed" || status === "accepted") {
    return "bg-teal-100 text-teal-800";
  }
  if (status === "completed" || status === "resolved") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "submitted") {
    return "bg-sky-100 text-sky-800";
  }
  if (status === "pending" || status === "pending_payment" || status === "waiting") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "contacted") {
    return "bg-brand-100 text-brand-800";
  }
  if (status === "rescheduled") {
    return "bg-indigo-100 text-indigo-800";
  }
  if (status === "no_show") {
    return "bg-stone-100 text-stone-600";
  }
  if (status === "in_progress") {
    return "bg-amber-100 text-amber-800";
  }
  return "bg-slate-100 text-slate-700";
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function BadgeIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-3 w-3 shrink-0 items-center justify-center" aria-hidden="true">
      {children}
    </span>
  );
}

function bookingStatusIcon(status: string): ReactNode {
  if (status === "pending" || status === "pending_payment") {
    return (
      <BadgeIcon>
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="8" />
          <path d="M12 7v5l3 2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </BadgeIcon>
    );
  }
  if (status === "confirmed") {
    return (
      <BadgeIcon>
        <svg viewBox="0 0 24 24" className="h-3 w-3 fill-current">
          <path d="M9.5 16.2 5.3 12l1.4-1.4 2.8 2.8 7.8-7.8L18.7 7l-9.2 9.2Z" />
        </svg>
      </BadgeIcon>
    );
  }
  if (status === "completed") {
    return (
      <BadgeIcon>
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <path d="m8.5 12.2 2.2 2.2 4.8-4.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </BadgeIcon>
    );
  }
  if (status === "cancelled") {
    return (
      <BadgeIcon>
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <path d="m15 9-6 6M9 9l6 6" strokeLinecap="round" />
        </svg>
      </BadgeIcon>
    );
  }
  if (status === "rescheduled") {
    return (
      <BadgeIcon>
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4M16 3v4M4 10h16" strokeLinecap="round" />
          <path d="M14.5 14.5a2.5 2.5 0 1 0-.4 1.5" strokeLinecap="round" />
          <path d="m15.8 13.2.9 1.8 1.8.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </BadgeIcon>
    );
  }
  if (status === "no_show") {
    return (
      <BadgeIcon>
        <svg viewBox="0 0 24 24" className="h-3 w-3" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="8" />
          <path d="M8 12h8" strokeLinecap="round" />
        </svg>
      </BadgeIcon>
    );
  }
  return null;
}

export function StatusBadge({ status, kind }: StatusBadgeProps) {
  const icon = kind === "booking" ? bookingStatusIcon(status) : null;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses(status, kind)}`}
    >
      {icon}
      {formatStatus(status)}
    </span>
  );
}
