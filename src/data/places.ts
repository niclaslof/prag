import { Place } from "@/lib/types";
import { restaurants } from "./categories/restaurants";
import { bars } from "./categories/bars";
import { sights } from "./categories/sights";
import { cafes } from "./categories/cafes";
import { clubs } from "./categories/clubs";
import { spas } from "./categories/spas";
import { enrichment } from "./enrichment.generated";
import { ENRICHMENT } from "./enrichment";

/** Merge curated seed data with API-enriched + editorial fields. */
function withEnrichment(p: Place): Place {
  const apiExtra = enrichment[`${p.category}:${p.id}`];
  const editExtra = ENRICHMENT[p.id];
  if (!apiExtra && !editExtra) return p;
  // Editorial fields (insiderTip, signatureDishes, bestFor, vibe) take priority
  return { ...p, ...apiExtra, ...editExtra };
}

export const allPlaces: Place[] = [
  ...restaurants,
  ...bars,
  ...sights,
  ...cafes,
  ...clubs,
  ...spas,
].map(withEnrichment);

export const places = allPlaces;
