import type { AvailabilitySlot } from "@/types/api";
import { formatTimeLabel } from "@/utils/format";

type TimeSlotGridProps = {
  slots: AvailabilitySlot[];
  selectedStartsAt: string | null;
  onSelect: (slot: AvailabilitySlot) => void;
};

type SlotGroup = {
  label: string;
  slots: AvailabilitySlot[];
};

function groupSlots(slots: AvailabilitySlot[]): SlotGroup[] {
  const morning: AvailabilitySlot[] = [];
  const afternoon: AvailabilitySlot[] = [];
  const evening: AvailabilitySlot[] = [];

  for (const slot of slots) {
    const hour = new Date(slot.starts_at).getHours();
    if (hour < 12) {
      morning.push(slot);
    } else if (hour < 18) {
      afternoon.push(slot);
    } else {
      evening.push(slot);
    }
  }

  return [
    { label: "Morning", slots: morning },
    { label: "Afternoon", slots: afternoon },
    { label: "Evening", slots: evening },
  ].filter((group) => group.slots.length > 0);
}

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: AvailabilitySlot;
  selected: boolean;
  onSelect: (slot: AvailabilitySlot) => void;
}) {
  const isWaitlist = Boolean(slot.waitlist_available);

  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      className={`rounded-xl border px-3 py-2 text-sm font-medium ${
        selected
          ? isWaitlist
            ? "border-amber-600 bg-amber-600 text-white"
            : "border-brand-600 bg-brand-600 text-white"
          : isWaitlist
            ? "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100"
            : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
      }`}
      data-testid={isWaitlist ? "waitlist-slot" : "bookable-slot"}
    >
      <span className="block">{formatTimeLabel(slot.starts_at)}</span>
      {isWaitlist ? (
        <span
          className={`mt-0.5 block text-[10px] font-normal ${
            selected ? "text-white/90" : "text-amber-700"
          }`}
        >
          Full · Join waitlist
        </span>
      ) : slot.spots_remaining != null && slot.spots_remaining > 0 ? (
        <span
          className={`mt-0.5 block text-[10px] font-normal ${
            selected ? "text-white/90" : "text-slate-500"
          }`}
        >
          {slot.spots_remaining} {slot.spots_remaining === 1 ? "spot" : "spots"} left
        </span>
      ) : null}
    </button>
  );
}

export function TimeSlotGrid({ slots, selectedStartsAt, onSelect }: TimeSlotGridProps) {
  const groups = groupSlots(slots);

  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.label} className="space-y-2">
          <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500">
            {group.label}
          </h3>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {group.slots.map((slot) => (
              <SlotButton
                key={slot.starts_at}
                slot={slot}
                selected={selectedStartsAt === slot.starts_at}
                onSelect={onSelect}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
