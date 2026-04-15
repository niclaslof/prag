export type Category =
  | "restaurant"
  | "bar"
  | "sight"
  | "cafe"
  | "club";

export interface CategoryMeta {
  id: Category;
  name: string;           // English display name
  namePlural: string;     // "Bars", "Restaurants", etc.
  emoji: string;
  color: string;          // Primary hex
  colorLight: string;
  colorDark: string;
}

export type PriceLevel = 0 | 1 | 2 | 3 | 4;

export interface OpeningHours {
  /** 0 = Sunday … 6 = Saturday */
  day: number;
  /** "09:00" or "closed" or "24h" */
  open: string;
  close: string;
}

export interface Place {
  id: number;
  /** Google Place ID (if sourced via Places API) */
  placeId?: string;
  category: Category;
  name: string;
  /** Short descriptor – cuisine for restaurants, type for sights, style for bars */
  tagline: string;
  /** Comma-separated tags used for filtering (e.g. "Czech,traditional,beer hall") */
  tags: string;
  address: string;
  district: string;       // "Staré Město", "Malá Strana"…
  lat: number;
  lng: number;
  phone?: string;
  website?: string;
  menuUrl?: string;
  priceLevel?: PriceLevel;
  priceRange?: string;            // "250–450 CZK"
  rating?: number;                // 0-5
  userRatingsTotal?: number;
  hours?: OpeningHours[];
  hoursText?: string;
  photoUrl?: string;
  description?: string;
  aiDescription?: string;
  /** Editorial highlight */
  isTopPick?: boolean;
  isNew?: boolean;
  /** The user's home hotel – renders as an oversized star on the map. */
  isHomeHotel?: boolean;
}

export type CategoryFilter = Category | "all";

export const CATEGORIES: Record<Category, CategoryMeta> = {
  restaurant: {
    id: "restaurant",
    name: "Restaurant",
    namePlural: "Restaurants",
    emoji: "🍽️",
    color: "#b91c1c",
    colorLight: "#fee2e2",
    colorDark: "#7f1d1d",
  },
  bar: {
    id: "bar",
    name: "Bar",
    namePlural: "Bars",
    emoji: "🍸",
    color: "#b45309",
    colorLight: "#fef3c7",
    colorDark: "#78350f",
  },
  sight: {
    id: "sight",
    name: "Sight",
    namePlural: "Sights",
    emoji: "🏛️",
    color: "#1d4ed8",
    colorLight: "#dbeafe",
    colorDark: "#1e3a8a",
  },
  cafe: {
    id: "cafe",
    name: "Café",
    namePlural: "Cafés",
    emoji: "☕",
    color: "#15803d",
    colorLight: "#dcfce7",
    colorDark: "#14532d",
  },
  club: {
    id: "club",
    name: "Club",
    namePlural: "Clubs",
    emoji: "🎶",
    color: "#be185d",
    colorLight: "#fce7f3",
    colorDark: "#831843",
  },
};

export const PRAGUE_CENTER = { lat: 50.0875, lng: 14.4213 };

export const DISTRICTS = [
  "Staré Město",
  "Malá Strana",
  "Hradčany",
  "Josefov",
  "Nové Město",
  "Vyšehrad",
  "Vinohrady",
  "Žižkov",
  "Holešovice",
  "Karlín",
  "Smíchov",
  "Dejvice",
  "Letná",
  "Other",
] as const;

export type District = (typeof DISTRICTS)[number];

export const PRICE_SYMBOLS: Record<PriceLevel, string> = {
  0: "Free",
  1: "$",
  2: "$$",
  3: "$$$",
  4: "$$$$",
};

export const CATEGORY_FILTERS: Category[] = [
  "restaurant",
  "bar",
  "sight",
  "cafe",
  "club",
];
