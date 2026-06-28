type NewMessageNotificationProps = {
  label: string;
  onDismiss: () => void;
};

export function NewMessageNotification({ label, onDismiss }: NewMessageNotificationProps) {
  return (
    <div
      role="status"
      className="flex items-center justify-between gap-2 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-sm text-brand-800"
    >
      <span>{label}</span>
      <button
        type="button"
        onClick={onDismiss}
        className="shrink-0 text-xs font-medium text-brand-700 hover:underline"
      >
        Dismiss
      </button>
    </div>
  );
}
