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
  return (
    <button
      type="button"
      onClick={() => onSelect(slot)}
      className={`rounded-xl border px-3 py-2 text-sm font-medium ${
        selected
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
      }`}
    >
      {formatTimeLabel(slot.starts_at)}
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
