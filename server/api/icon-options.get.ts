import { defineEventHandler, getQuery } from "h3";
import iconMetadata from "@iconify-json/ic/metadata.json";

const iconNames = [...new Set(Object.values(iconMetadata.categories ?? {}).flat())];

export default defineEventHandler((event) => {
  const rawQuery = getQuery(event).q;
  const query = typeof rawQuery === "string" ? rawQuery.trim().toLowerCase().slice(0, 80) : "";
  if (!query) return [];

  return iconNames
    .filter((name) => name.toLowerCase().includes(query))
    .sort((left, right) => {
      const leftStartsWith = left.toLowerCase().startsWith(query);
      const rightStartsWith = right.toLowerCase().startsWith(query);
      return Number(rightStartsWith) - Number(leftStartsWith) || left.localeCompare(right);
    })
    .slice(0, 100)
    .map((name) => {
      const icon = `i-ic-${name}`;
      return { label: name, value: icon, icon };
    });
});
