import { Place } from "@/lib/types";
import { restaurants } from "./categories/restaurants";
import { bars } from "./categories/bars";
import { sights } from "./categories/sights";
import { cafes } from "./categories/cafes";
import { clubs } from "./categories/clubs";
import { enrichment } from "./enrichment.generated";

/** Merge curated seed data with optional API-enriched fields. */
function withEnrichment(p: Place): Place {
  const extra = enrichment[`${p.category}:${p.id}`];
  if (!extra) return p;
  return { ...p, ...extra };
}

export const allPlaces: Place[] = [
  ...restaurants,
  ...bars,
  ...sights,
  ...cafes,
  ...clubs,
].map(withEnrichment);

export const places = allPlaces;
