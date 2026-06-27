export function ErrorState({
  title = "Something went wrong",
  message,
}: {
  title?: string;
  message?: string;
}) {
  return (
    <div
      className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center"
      role="alert"
    >
      <h2 className="text-base font-semibold text-red-800">{title}</h2>
      {message ? (
        <p className="mt-2 text-sm text-red-700">{message}</p>
      ) : null}
    </div>
  );
}
