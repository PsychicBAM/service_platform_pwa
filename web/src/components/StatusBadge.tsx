type StatusBadgeProps = {
  status: string;
  kind?: "booking" | "order" | "waitlist" | "review";
};

function statusClasses(status: string, kind: StatusBadgeProps["kind"]): string {
  if (kind === "review") {
    if (status === "published") {
      return "bg-emerald-100 text-emerald-800";
    }
    if (status === "hidden") {
      return "bg-slate-100 text-slate-700";
    }
  }
  if (status === "cancelled" || status === "declined") {
    return "bg-red-100 text-red-800";
  }
  if (status === "completed" || status === "confirmed" || status === "resolved") {
    return "bg-emerald-100 text-emerald-800";
  }
  if (status === "pending" || status === "submitted" || status === "pending_payment" || status === "waiting") {
    return "bg-amber-100 text-amber-800";
  }
  if (status === "contacted") {
    return "bg-brand-100 text-brand-800";
  }
  if (status === "in_progress" || status === "accepted") {
    return kind === "order" ? "bg-sky-100 text-sky-800" : "bg-brand-100 text-brand-800";
  }
  return "bg-slate-100 text-slate-700";
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function StatusBadge({ status, kind }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusClasses(status, kind)}`}
    >
      {formatStatus(status)}
    </span>
  );
}
