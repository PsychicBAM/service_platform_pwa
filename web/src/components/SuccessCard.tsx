type SuccessItem = {
  label: string;
  value: string;
};

type SuccessCardProps = {
  title: string;
  subtitle?: string;
  items: SuccessItem[];
  note?: string;
};

export function SuccessCard({ title, subtitle, items, note }: SuccessCardProps) {
  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
      <p className="text-xs uppercase tracking-wide text-emerald-700">{title}</p>
      {subtitle ? <h1 className="mt-1 text-xl font-bold text-emerald-900">{subtitle}</h1> : null}
      <dl className="mt-4 space-y-3 text-sm">
        {items.map((item) => (
          <div key={item.label}>
            <dt className="text-emerald-700">{item.label}</dt>
            <dd className="font-medium text-emerald-900">{item.value}</dd>
          </div>
        ))}
      </dl>
      {note ? <p className="mt-4 text-sm text-emerald-800">{note}</p> : null}
    </div>
  );
}
