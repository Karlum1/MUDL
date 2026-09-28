export const REPAIR_CATEGORIES = [
  { id: "spin", th: "ไม่หมุน", en: "Not spinning" },
  { id: "water-in", th: "น้ำไม่เข้า", en: "No water in" },
  { id: "water-out", th: "น้ำไม่ทิ้ง", en: "Not draining" },
  { id: "noise", th: "เสียงดังผิดปกติ", en: "Strange noise" },
  { id: "smell", th: "กลิ่นไหม้", en: "Burning smell" },
  { id: "door", th: "ฝาเปิดปิดไม่ได้", en: "Door stuck" },
  { id: "other", th: "อื่นๆ", en: "Other" },
] as const;

export type RepairCategoryId = (typeof REPAIR_CATEGORIES)[number]["id"];

export function repairCategoryLabel(id: string, locale: "th" | "en") {
  const found = REPAIR_CATEGORIES.find((item) => item.id === id);
  if (!found) return "";
  return locale === "en" ? found.en : found.th;
}
