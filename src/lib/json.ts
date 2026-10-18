// Ép kiểu các cột Json của Prisma
export type Highlight = { icon: string; text: string };
export type ItineraryDay = { title: string; description: string; meals: string };
export type Faq = { q: string; a: string };
export const arr = <T = string>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);
