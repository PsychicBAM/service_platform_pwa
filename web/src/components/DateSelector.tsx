import { useMemo } from "react";
import { generateBookingDates } from "@/utils/format";

type DateSelectorProps = {
  selectedDate: string | null;
  onSelect: (date: string) => void;
};

export function DateSelector({ selectedDate, onSelect }: DateSelectorProps) {
  const dates = useMemo(() => generateBookingDates(14), []);

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-slate-700">Choose a date</h2>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {dates.map((item) => {
          const selected = selectedDate === item.date;
          return (
            <button
              key={item.date}
              type="button"
              onClick={() => onSelect(item.date)}
              className={`shrink-0 rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                selected
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span className="block font-medium">{item.label}</span>
              {item.dayOffset > 1 ? (
                <span className={`block text-xs ${selected ? "text-brand-100" : "text-slate-500"}`}>
                  {new Intl.DateTimeFormat(undefined, {
                    month: "short",
                    day: "numeric",
                  }).format(new Date(`${item.date}T12:00:00`))}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
