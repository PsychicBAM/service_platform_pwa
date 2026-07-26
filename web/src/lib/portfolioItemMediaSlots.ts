export type PortfolioItemImageSlotKind = "portfolioProjectCover" | "portfolioTestimonialAvatar";

const SLOT_ID_SAFE = /[^A-Za-z0-9_-]/g;

export function buildPortfolioItemImageSlot(kind: PortfolioItemImageSlotKind, itemId: string): string {
  const safe = itemId.replace(SLOT_ID_SAFE, "").slice(0, 64) || "item";
  return `${kind}__${safe}`;
}
