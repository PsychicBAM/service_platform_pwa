import { useQuery } from "@tanstack/react-query";
import { getSchedule } from "@/api/adminApi";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { useAdminBusiness } from "@/hooks/useAdminBusiness";
import { getMeErrorMessage } from "@/utils/errors";
import type { WorkingHourRead } from "@/types/api";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTime(value: string | null): string {
  if (!value) {
    return "";
  }
  return value.slice(0, 5);
}

function summarizeHours(hour: WorkingHourRead): string {
  if (!hour.is_open) {
    return "Closed";
  }
  return `${formatTime(hour.opens_at)} – ${formatTime(hour.closes_at)}`;
}

export function AdminSchedulePage() {
  const { businessId } = useAdminBusiness();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["admin-schedule", businessId],
    queryFn: () => getSchedule(businessId!),
    enabled: Boolean(businessId),
  });

  const sortedHours = [...(data?.working_hours ?? [])].sort(
    (a, b) => a.day_of_week - b.day_of_week,
  );

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold">Schedule</h2>

      {isLoading ? <LoadingState message="Loading schedule…" /> : null}
      {isError ? (
        <ErrorState
          title="Could not load schedule"
          message={getMeErrorMessage(error, "Unable to load schedule")}
        />
      ) : null}

      {!isLoading && !isError && data ? (
        <>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h3 className="text-sm font-medium text-slate-700">Working hours</h3>
            <ul className="mt-3 space-y-2">
              {sortedHours.map((hour) => (
                <li
                  key={hour.id}
                  className="flex items-center justify-between text-sm text-slate-700"
                >
                  <span>{DAY_NAMES[hour.day_of_week]}</span>
                  <span>{summarizeHours(hour)}</span>
                </li>
              ))}
            </ul>
          </div>
          {data.breaks.length > 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-medium text-slate-700">Breaks</h3>
              <ul className="mt-3 space-y-2 text-sm text-slate-600">
                {data.breaks.map((item) => (
                  <li key={item.id}>
                    {item.label ?? "Break"} · {formatTime(item.starts_at)} –{" "}
                    {formatTime(item.ends_at)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <p className="text-sm text-slate-500">
            Slot interval: {data.settings.slot_interval_minutes} min · Buffer:{" "}
            {data.settings.booking_buffer_minutes} min
          </p>
        </>
      ) : null}
    </section>
  );
}
