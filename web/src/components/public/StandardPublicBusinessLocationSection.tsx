import { EmptyState } from "@/components/EmptyState";
import { getStandardPublicLocationDetails } from "@/lib/publicLocation";
import type { PublicBusiness } from "@/types/api";

type StandardPublicBusinessLocationSectionProps = {
  business: Pick<PublicBusiness, "location" | "address">;
};

export function StandardPublicBusinessLocationSection({
  business,
}: StandardPublicBusinessLocationSectionProps) {
  const { lines, directionsNote, hasDetails } = getStandardPublicLocationDetails(business);

  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:p-6"
      data-testid="standard-public-location-section"
    >
      <h2 className="text-lg font-semibold text-slate-900 md:text-xl">Location</h2>

      {hasDetails ? (
        <div className="mt-4 space-y-3" data-testid="standard-public-location-details">
          {lines.map((line) => (
            <p key={line} className="text-sm leading-relaxed text-slate-700">
              {line}
            </p>
          ))}
          {directionsNote ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Directions
              </p>
              <p
                className="mt-1 text-sm leading-relaxed text-slate-700"
                data-testid="standard-public-location-directions"
              >
                {directionsNote}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div className="mt-4" data-testid="standard-public-location-empty">
          <EmptyState
            title="Location details have not been added yet."
            description="Contact the business for directions once location information is published."
          />
        </div>
      )}
    </section>
  );
}
