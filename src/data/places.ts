import { Place } from "@/lib/types";
import { restaurants } from "./categories/restaurants";
import { bars } from "./categories/bars";
import { sights } from "./categories/sights";
import { cafes } from "./categories/cafes";
import { clubs } from "./categories/clubs";

export const allPlaces: Place[] = [
  ...restaurants,
  ...bars,
  ...sights,
  ...cafes,
  ...clubs,
];

export const places = allPlaces;
