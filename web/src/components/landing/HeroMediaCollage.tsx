import type { PublicBusinessDirectoryItem } from "@/types/api";
import { gradientForBusinessSlug } from "@/lib/businessCardMedia";

type HeroMediaCollageProps = {
  businesses: PublicBusinessDirectoryItem[];
};

type CollageTile = {
  key: string;
  imageUrl: string | null;
  slug: string;
  label: string;
  className: string;
  icon?: string;
};

const TILE_LAYOUTS = [
  "left-0 top-10 z-10 h-40 w-32 rotate-[-4deg] sm:h-48 sm:w-36",
  "left-28 top-0 z-20 h-44 w-36 rotate-[3deg] sm:left-36 sm:h-52 sm:w-44",
  "right-16 top-6 z-30 h-48 w-40 rotate-[-2deg] sm:right-20 sm:h-56 sm:w-48",
  "right-0 top-28 z-20 h-36 w-32 rotate-[5deg] sm:top-32 sm:h-44 sm:w-40",
] as const;

const FALLBACK_TILES: Omit<CollageTile, "className">[] = [
  { key: "fallback-coach", imageUrl: null, slug: "collage-coach", label: "Coaching", icon: "◎" },
  { key: "fallback-tutor", imageUrl: null, slug: "collage-tutor", label: "Tutoring", icon: "✎" },
  { key: "fallback-home", imageUrl: null, slug: "collage-home", label: "Home services", icon: "⌂" },
  { key: "fallback-wellness", imageUrl: null, slug: "collage-wellness", label: "Wellness", icon: "♡" },
];

function collectImageCandidates(
  businesses: PublicBusinessDirectoryItem[],
): Array<{ imageUrl: string; slug: string; label: string; key: string }> {
  const candidates: Array<{ imageUrl: string; slug: string; label: string; key: string }> = [];
  const seenUrls = new Set<string>();

  for (const business of businesses) {
    if (business.cover_image_url && !seenUrls.has(business.cover_image_url)) {
      candidates.push({
        key: `${business.slug}-cover`,
        imageUrl: business.cover_image_url,
        slug: business.slug,
        label: business.name,
      });
      seenUrls.add(business.cover_image_url);
    }
  }

  for (const business of businesses) {
    for (const service of business.services_preview) {
      if (service.image_url && !seenUrls.has(service.image_url)) {
        candidates.push({
          key: `${business.slug}-${service.name}`,
          imageUrl: service.image_url,
          slug: business.slug,
          label: service.name,
        });
        seenUrls.add(service.image_url);
      }
    }
  }

  return candidates;
}

function buildTiles(businesses: PublicBusinessDirectoryItem[]): CollageTile[] {
  const imageCandidates = collectImageCandidates(businesses);
  const tiles: CollageTile[] = [];

  for (let index = 0; index < TILE_LAYOUTS.length; index += 1) {
    const candidate = imageCandidates[index];
    const fallback = FALLBACK_TILES[index];
    if (candidate) {
      tiles.push({
        key: candidate.key,
        imageUrl: candidate.imageUrl,
        slug: candidate.slug,
        label: candidate.label,
        className: TILE_LAYOUTS[index],
      });
    } else if (businesses[index]) {
      const business = businesses[index];
      tiles.push({
        key: business.slug,
        imageUrl: business.cover_image_url,
        slug: business.slug,
        label: business.name,
        className: TILE_LAYOUTS[index],
      });
    } else {
      tiles.push({
        ...fallback,
        className: TILE_LAYOUTS[index],
      });
    }
  }

  return tiles;
}

export function HeroMediaCollage({ businesses }: HeroMediaCollageProps) {
  const tiles = buildTiles(businesses);
  const topRating = businesses.find(
    (business) => business.average_rating != null && business.review_count > 0,
  );

  return (
    <div
      className="relative mx-auto h-[360px] w-full max-w-lg sm:h-[400px] lg:mx-0 lg:max-w-none"
      data-testid="homepage-hero-collage"
    >
      <div
        className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-brand-100/70 via-white to-slate-100"
        aria-hidden="true"
      />
      <div className="absolute -right-6 top-6 h-40 w-40 rounded-full bg-brand-200/40 blur-2xl" aria-hidden="true" />
      <div className="absolute bottom-0 left-8 h-32 w-32 rounded-full bg-teal-200/50 blur-2xl" aria-hidden="true" />

      {tiles.map((tile) => (
        <div
          key={tile.key}
          data-testid="hero-collage-tile"
          className={`absolute overflow-hidden rounded-2xl border-4 border-white shadow-lg ${tile.className}`}
        >
          {tile.imageUrl ? (
            <img src={tile.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div
              className={`flex h-full w-full flex-col justify-between bg-gradient-to-br ${gradientForBusinessSlug(tile.slug)} p-3`}
            >
              {tile.icon ? (
                <span className="text-2xl text-white/90" aria-hidden="true">
                  {tile.icon}
                </span>
              ) : (
                <span aria-hidden="true" />
              )}
              <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
                {tile.label}
              </span>
            </div>
          )}
        </div>
      ))}

      {topRating ? (
        <div className="absolute bottom-8 left-8 z-40 rounded-2xl bg-white px-3 py-2 shadow-md">
          <p className="text-xs font-semibold text-amber-500">★ {topRating.average_rating?.toFixed(1)}</p>
          <p className="text-xs text-slate-600">{topRating.review_count} reviews</p>
        </div>
      ) : null}
    </div>
  );
}
