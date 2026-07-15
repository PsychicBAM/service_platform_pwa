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
      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-6"
      data-testid="standard-public-location-section"
    >
      <h2 className="text-base font-semibold text-slate-900 md:text-xl">Location</h2>

      {hasDetails ? (
        <div className="mt-3 space-y-2 md:mt-4 md:space-y-3" data-testid="standard-public-location-details">
          {lines.map((line) => (
            <p key={line} className="break-words text-sm leading-relaxed text-slate-700">
              {line}
            </p>
          ))}
          {directionsNote ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Directions
              </p>
              <p
                className="mt-1 break-words text-sm leading-relaxed text-slate-700"
                data-testid="standard-public-location-directions"
              >
                {directionsNote}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        <div
          className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-5 text-center md:mt-4"
          data-testid="standard-public-location-empty"
        >
          <p className="text-sm font-medium text-slate-800">
            Location details have not been added yet.
          </p>
          <p className="mt-1 text-xs text-slate-600 md:text-sm">
            Contact the business for directions once location information is published.
          </p>
        </div>
      )}
    </section>
  );
}
