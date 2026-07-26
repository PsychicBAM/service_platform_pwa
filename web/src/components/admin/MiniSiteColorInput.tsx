import { hexColorForPicker } from "@/lib/miniSiteTemplatePresentation";

const INPUT =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-800 shadow-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100";

export type MiniSiteColorInputProps = {
  label: string;
  value: string;
  fallback: string;
  onChange: (value: string) => void;
  testId?: string;
  placeholder?: string;
  disabled?: boolean;
};

/** Compact swatch + hex field used by mini-site template editors. */
export function MiniSiteColorInput({
  label,
  value,
  fallback,
  onChange,
  testId,
  placeholder = "Theme default",
  disabled = false,
}: MiniSiteColorInputProps) {
  const pickerValue = hexColorForPicker(value || fallback, fallback);
  return (
    <div className="space-y-1">
      <span className="text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={pickerValue}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded border border-slate-300 bg-white p-1 disabled:cursor-not-allowed disabled:opacity-60"
          data-testid={testId ? `${testId}-picker` : undefined}
          aria-label={`${label} color picker`}
        />
        <input
          className={INPUT}
          value={value}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          data-testid={testId}
        />
      </div>
    </div>
  );
}
