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
};

const FALLBACK_TILES: CollageTile[] = [
  {
    key: "fallback-1",
    imageUrl: null,
    slug: "home-collage-1",
    label: "Home services",
    className: "left-0 top-8 h-44 w-36 sm:h-52 sm:w-44",
  },
  {
    key: "fallback-2",
    imageUrl: null,
    slug: "home-collage-2",
    label: "Wellness",
    className: "left-24 top-0 h-40 w-32 sm:left-32 sm:h-48 sm:w-40",
  },
  {
    key: "fallback-3",
    imageUrl: null,
    slug: "home-collage-3",
    label: "Lessons",
    className: "right-0 top-10 h-48 w-40 sm:h-56 sm:w-48",
  },
];

function buildTiles(businesses: PublicBusinessDirectoryItem[]): CollageTile[] {
  const withImages = businesses.filter((business) => business.cover_image_url);
  const source = withImages.length > 0 ? withImages : businesses;
  const picked = source.slice(0, 3);

  if (picked.length === 0) {
    return FALLBACK_TILES;
  }

  const layouts = [
    "left-0 top-8 h-44 w-36 sm:h-52 sm:w-44",
    "left-24 top-0 h-40 w-32 sm:left-32 sm:h-48 sm:w-40",
    "right-0 top-10 h-48 w-40 sm:h-56 sm:w-48",
  ];

  return picked.map((business, index) => ({
    key: business.slug,
    imageUrl: business.cover_image_url,
    slug: business.slug,
    label: business.name,
    className: layouts[index] ?? layouts[0],
  }));
}

export function HeroMediaCollage({ businesses }: HeroMediaCollageProps) {
  const tiles = buildTiles(businesses);
  const topRating = businesses.find(
    (business) => business.average_rating != null && business.review_count > 0,
  );

  return (
    <div className="relative mx-auto h-[340px] w-full max-w-md sm:h-[380px] lg:mx-0 lg:max-w-none">
      <div
        className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-brand-100/70 via-white to-slate-100"
        aria-hidden="true"
      />
      <div className="absolute -right-6 top-6 h-40 w-40 rounded-full bg-brand-200/40 blur-2xl" aria-hidden="true" />
      <div className="absolute bottom-0 left-8 h-32 w-32 rounded-full bg-teal-200/50 blur-2xl" aria-hidden="true" />

      {tiles.map((tile) => (
        <div
          key={tile.key}
          className={`absolute overflow-hidden rounded-2xl border-4 border-white shadow-lg ${tile.className}`}
        >
          {tile.imageUrl ? (
            <img src={tile.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
          ) : (
            <div
              className={`flex h-full w-full items-end bg-gradient-to-br ${gradientForBusinessSlug(tile.slug)} p-3`}
            >
              <span className="rounded-full bg-white/90 px-2 py-1 text-xs font-medium text-slate-700">
                {tile.label}
              </span>
            </div>
          )}
        </div>
      ))}

      {topRating ? (
        <div className="absolute bottom-6 left-6 rounded-2xl bg-white px-3 py-2 shadow-md">
          <p className="text-xs font-semibold text-amber-500">★ {topRating.average_rating?.toFixed(1)}</p>
          <p className="text-xs text-slate-600">{topRating.review_count} reviews</p>
        </div>
      ) : null}
    </div>
  );
}
