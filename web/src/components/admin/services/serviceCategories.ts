import type { MarketplaceCategoryId } from "@/data/marketplaceCategories";

export type ServiceCategoryId = Exclude<MarketplaceCategoryId, "all">;

export type ServiceCategoryOption = {
  id: ServiceCategoryId;
  label: string;
};

export const SERVICE_CATEGORY_OPTIONS: ServiceCategoryOption[] = [
  { id: "health-wellness", label: "Health & Wellness" },
  { id: "home-services", label: "Home Services" },
  { id: "tutors-classes", label: "Tutors & Classes" },
  { id: "coaching-courses", label: "Coaching & Courses" },
  { id: "beauty-salon", label: "Beauty & Salon" },
  { id: "events-photography", label: "Events & Photography" },
  { id: "design-creative", label: "Design & Creative" },
  { id: "automotive", label: "Automotive" },
];

const SUGGESTION_KEYWORDS: Array<{ id: ServiceCategoryId; keywords: string[] }> = [
  {
    id: "tutors-classes",
    keywords: ["tutor", "lesson", "class", "arabic", "language", "math", "education", "teach"],
  },
  {
    id: "coaching-courses",
    keywords: ["coach", "course", "training", "mentor", "program", "fitness"],
  },
  {
    id: "home-services",
    keywords: ["clean", "cleaning", "home", "repair", "plumb", "electric", "maintenance", "deep"],
  },
  {
    id: "design-creative",
    keywords: ["design", "bot", "telegram", "website", "creative", "brand", "logo", "dev", "software"],
  },
  {
    id: "beauty-salon",
    keywords: ["beauty", "salon", "hair", "spa", "nail", "skin", "barber"],
  },
  {
    id: "health-wellness",
    keywords: ["health", "wellness", "dental", "clinic", "medical", "therapy", "massage"],
  },
  {
    id: "events-photography",
    keywords: ["event", "photo", "wedding", "portrait", "studio", "camera"],
  },
  {
    id: "automotive",
    keywords: ["auto", "car", "vehicle", "mechanic", "garage"],
  },
];

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return "Uncategorized";
  return SERVICE_CATEGORY_OPTIONS.find((option) => option.id === category)?.label ?? category;
}

/** Suggest a marketplace category from service name/title. Null if no confident match. */
export function suggestServiceCategory(name: string): ServiceCategoryId | null {
  const haystack = name.trim().toLowerCase();
  if (!haystack) return null;

  let best: { id: ServiceCategoryId; score: number } | null = null;
  for (const entry of SUGGESTION_KEYWORDS) {
    let score = 0;
    for (const keyword of entry.keywords) {
      if (haystack.includes(keyword)) {
        score += keyword.length;
      }
    }
    if (score > 0 && (!best || score > best.score)) {
      best = { id: entry.id, score };
    }
  }
  return best?.id ?? null;
}
