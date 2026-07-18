import type { ClientLifecycleStatus } from "@/components/admin/clients/clientHelpers";

const STYLES: Record<ClientLifecycleStatus, string> = {
  active: "bg-emerald-100 text-emerald-800 ring-1 ring-inset ring-emerald-200/70",
  new: "bg-sky-100 text-sky-800 ring-1 ring-inset ring-sky-200/70",
  returning: "bg-amber-100 text-amber-800 ring-1 ring-inset ring-amber-200/70",
  inactive: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200/70",
};

const LABELS: Record<ClientLifecycleStatus, string> = {
  active: "Active",
  new: "New",
  returning: "Returning",
  inactive: "Inactive",
};

const DOT: Record<ClientLifecycleStatus, string> = {
  active: "bg-emerald-500",
  new: "bg-sky-500",
  returning: "bg-amber-500",
  inactive: "bg-gray-400",
};

export function ClientStatusBadge({ status }: { status: ClientLifecycleStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[status]}`}
    >
      {LABELS[status]}
    </span>
  );
}

export function ClientStatusDot({ status }: { status: ClientLifecycleStatus }) {
  return (
    <span
      className={`inline-block h-2 w-2 shrink-0 rounded-full ${DOT[status]}`}
      aria-hidden="true"
      title={LABELS[status]}
    />
  );
}
