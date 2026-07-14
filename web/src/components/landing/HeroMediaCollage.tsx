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
  accent?: string;
};

const TILE_LAYOUTS = [
  "left-2 top-16 z-10 h-44 w-36 -rotate-6 sm:left-4 sm:h-52 sm:w-40",
  "left-[34%] top-2 z-30 h-52 w-40 rotate-2 sm:h-60 sm:w-48",
  "right-[18%] top-8 z-20 h-48 w-36 -rotate-3 sm:h-56 sm:w-44",
  "right-2 top-36 z-40 h-40 w-32 rotate-6 sm:top-40 sm:h-48 sm:w-36",
] as const;

const IMAGE_SLOT_ORDER = [1, 2, 0, 3] as const;

const FALLBACK_TILES: Omit<CollageTile, "className">[] = [
  {
    key: "fallback-coach",
    imageUrl: null,
    slug: "collage-coach",
    label: "Coaching",
    icon: "◎",
    accent: "Personal training",
  },
  {
    key: "fallback-tutor",
    imageUrl: null,
    slug: "collage-tutor",
    label: "Tutoring",
    icon: "✎",
    accent: "Lessons & exams",
  },
  {
    key: "fallback-home",
    imageUrl: null,
    slug: "collage-home",
    label: "Home services",
    icon: "⌂",
    accent: "Cleaning & repair",
  },
  {
    key: "fallback-wellness",
    imageUrl: null,
    slug: "collage-wellness",
    label: "Wellness",
    icon: "♡",
    accent: "Care & therapy",
  },
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
  const tiles: CollageTile[] = FALLBACK_TILES.map((fallback, index) => ({
    ...fallback,
    className: TILE_LAYOUTS[index],
  }));

  let imageIndex = 0;
  for (const slotIndex of IMAGE_SLOT_ORDER) {
    if (imageIndex >= imageCandidates.length) {
      break;
    }
    const candidate = imageCandidates[imageIndex];
    imageIndex += 1;
    tiles[slotIndex] = {
      key: candidate.key,
      imageUrl: candidate.imageUrl,
      slug: candidate.slug,
      label: candidate.label,
      className: TILE_LAYOUTS[slotIndex],
    };
  }

  return tiles;
}

export function HeroMediaCollage({ businesses }: HeroMediaCollageProps) {
  const tiles = buildTiles(businesses);
  const topRating = businesses.find(
    (business) => business.average_rating != null && business.review_count > 0,
  );
  const totalReviews = businesses.reduce((sum, business) => sum + business.review_count, 0);

  return (
    <div
      className="relative mx-auto h-[420px] w-full max-w-xl sm:h-[460px] lg:mx-0 lg:h-[480px] lg:max-w-none"
      data-testid="homepage-hero-collage"
    >
      <div
        className="absolute inset-4 rounded-[2.5rem] bg-gradient-to-br from-brand-100 via-white to-teal-50 shadow-inner"
        aria-hidden="true"
      />
      <div
        className="absolute left-1/2 top-8 h-56 w-56 -translate-x-1/2 rounded-full bg-brand-200/50 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute bottom-6 right-10 h-40 w-40 rounded-full bg-teal-200/60 blur-3xl"
        aria-hidden="true"
      />
      <div
        className="absolute left-8 top-10 h-24 w-24 rounded-full bg-sky-100/80 blur-2xl"
        aria-hidden="true"
      />

      {tiles.map((tile) => (
        <div
          key={tile.key}
          data-testid="hero-collage-tile"
          className={`absolute overflow-hidden rounded-2xl border-[5px] border-white shadow-xl shadow-brand-900/10 ${tile.className}`}
        >
          {tile.imageUrl ? (
            <>
              <img src={tile.imageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-900/70 to-transparent px-3 py-3">
                <p className="truncate text-xs font-semibold text-white">{tile.label}</p>
              </div>
            </>
          ) : (
            <div
              className={`flex h-full w-full flex-col justify-between bg-gradient-to-br ${gradientForBusinessSlug(tile.slug)} p-4`}
            >
              <div className="space-y-2">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-xl text-white">
                  {tile.icon}
                </span>
                {tile.accent ? (
                  <p className="text-[11px] font-medium uppercase tracking-wide text-white/80">
                    {tile.accent}
                  </p>
                ) : null}
              </div>
              <span className="inline-flex w-fit rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-800 shadow-sm">
                {tile.label}
              </span>
            </div>
          )}
        </div>
      ))}

      {topRating ? (
        <div className="absolute bottom-10 left-10 z-50 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-sm font-semibold text-amber-500">★ {topRating.average_rating?.toFixed(1)}</p>
          <p className="text-xs text-slate-600">{topRating.review_count} reviews</p>
        </div>
      ) : totalReviews > 0 ? (
        <div className="absolute bottom-10 left-10 z-50 rounded-2xl border border-white/70 bg-white/95 px-4 py-3 shadow-lg backdrop-blur">
          <p className="text-sm font-semibold text-amber-500">★ Trusted reviews</p>
          <p className="text-xs text-slate-600">{totalReviews} published</p>
        </div>
      ) : null}

      <div className="absolute right-8 top-16 z-50 hidden rounded-full bg-white px-3 py-2 text-xs font-semibold text-brand-700 shadow-md sm:block">
        Book with confidence
      </div>
    </div>
  );
}
