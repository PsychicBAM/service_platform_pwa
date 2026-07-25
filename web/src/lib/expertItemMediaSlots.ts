/** Expert repeatable-item image upload slots (articles / works / testimonials). */

export type ExpertItemImageSlotKind = "articleCover" | "workCover" | "testimonialAvatar";

const SLOT_ID_SAFE = /[^A-Za-z0-9_-]/g;

export function buildExpertItemImageSlot(kind: ExpertItemImageSlotKind, itemId: string): string {
  const safe = itemId.replace(SLOT_ID_SAFE, "").slice(0, 64) || "item";
  return `${kind}__${safe}`;
}
