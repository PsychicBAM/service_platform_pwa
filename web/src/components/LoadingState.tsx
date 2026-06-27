export function LoadingState({ message = "Loading…" }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-slate-600">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent"
        aria-hidden
      />
      <p className="text-sm">{message}</p>
    </div>
  );
}
