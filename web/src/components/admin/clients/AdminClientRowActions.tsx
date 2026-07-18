type AdminClientRowActionsProps = {
  clientId: string;
  onView: () => void;
};

const actionBtn =
  "inline-flex h-9 items-center justify-center rounded-lg px-3 text-sm font-semibold whitespace-nowrap outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40";

export function AdminClientRowActions({ clientId, onView }: AdminClientRowActionsProps) {
  return (
    <div className="relative ml-auto flex items-center justify-end gap-1.5">
      <button
        type="button"
        className={`${actionBtn} border border-emerald-600 bg-white text-emerald-700 hover:bg-emerald-50`}
        data-testid={`admin-client-view-${clientId}`}
        onClick={onView}
      >
        <span data-testid="admin-client-view">View</span>
      </button>
    </div>
  );
}
