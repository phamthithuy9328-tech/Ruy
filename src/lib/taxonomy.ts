// Fixed taxonomies. Labels live in the i18n dictionaries (src/i18n/*.ts).
export const durationSlugs = ["day-trip", "2-days", "3-days", "4-5-days", "6-plus-days"] as const;
export const regionSlugs = ["north", "central", "south", "international"] as const;
export const transportSlugs = ["coach", "flight", "train", "cruise", "walking"] as const;
export const postCategorySlugs = ["travel-tips", "food", "itineraries", "visa"] as const;
export const sortSlugs = ["popular", "price-asc", "price-desc", "newest"] as const;

export const badgeClass: Record<string, string> = {
  bestseller: "bg-accent text-white",
  "few-seats": "bg-danger text-white",
  deal: "bg-primary text-white",
};
