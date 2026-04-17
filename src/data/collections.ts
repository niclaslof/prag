import { Collection } from "@/lib/types";

export const COLLECTIONS: Collection[] = [
  {
    id: "first-day",
    name: "If You Only Have One Day",
    description:
      "The essential Prague arc: castle to river to medieval square, ending with a cold beer and the best sunset view locals keep to themselves.",
    emoji: "🏰",
    placeIds: [201, 202, 203, 207, 216],
    estimatedDuration: "8-10 hours",
    idealFor: "First-timers, families",
  },
  {
    id: "beer-pilgrimage",
    name: "Beer Pilgrimage",
    description:
      "From a 500-year-old dark lager to experimental banana brews and cutting-edge craft taps -- six stops tracing the full arc of Czech beer culture.",
    emoji: "🍺",
    placeIds: [108, 109, 107, 1, 111, 402],
    estimatedDuration: "6-8 hours",
    idealFor: "Beer lovers, groups",
  },
  {
    id: "michelin-crawl",
    name: "Michelin & Fine Dining",
    description:
      "Prague's most polished tables: Michelin stars, river-view white tablecloths, and a legendary Art Deco dining room with just 24 seats.",
    emoji: "🌟",
    placeIds: [2, 3, 17, 6, 12, 11],
    estimatedDuration: "Pick 1-2 for a full evening",
    idealFor: "Couples, special occasions",
  },
  {
    id: "cocktail-tour",
    name: "World-Class Cocktails",
    description:
      "Six bars that put Prague on the global cocktail map, from a World's 50 Best legend to hidden speakeasies and a leather-bound American classic.",
    emoji: "🍸",
    placeIds: [101, 102, 103, 104, 105, 112],
    estimatedDuration: "5-7 hours",
    idealFor: "Couples, cocktail enthusiasts",
  },
  {
    id: "romantic-evening",
    name: "Romantic Evening",
    description:
      "Sunset over the spires from Letna, candlelit dinner with Castle views at Bellevue, then natural wine and charcuterie at a tiny bar named after Sideways.",
    emoji: "💕",
    placeIds: [216, 12, 114],
    estimatedDuration: "4-5 hours",
    idealFor: "Couples, anniversaries",
  },
  {
    id: "rainy-day",
    name: "Rainy Day Prague",
    description:
      "When the cobblestones are slick: baroque libraries, ceramic-tiled cafes, a grand museum, cubist pastries, and a steampunk labyrinth to close the night.",
    emoji: "🌧️",
    placeIds: [212, 303, 209, 304, 402],
    estimatedDuration: "6-8 hours",
    idealFor: "Anyone dodging weather",
  },
  {
    id: "art-nouveau",
    name: "Art Nouveau Trail",
    description:
      "Follow the Mucha-era thread through Prague: Gothic spires with Art Nouveau glass, gilded cafe ceilings, hand-painted ceramic walls, and the world's only cubist cafe.",
    emoji: "🎨",
    placeIds: [205, 305, 303, 217, 304],
    estimatedDuration: "4-6 hours",
    idealFor: "Architecture and design lovers",
  },
  {
    id: "sunset-to-midnight",
    name: "Sunset to Midnight",
    description:
      "Catch golden hour from Petrin tower, descend for game and duck in a Renaissance house, slip into a masked cocktail den, then dance until the metro restarts.",
    emoji: "🌆",
    placeIds: [210, 7, 102, 401],
    estimatedDuration: "6-8 hours",
    idealFor: "Night owls, adventurous couples",
  },
  {
    id: "coffee-crawl",
    name: "Prague Coffee Crawl",
    description:
      "Grand literary cafes where Kafka and Havel once sat, a cubist curiosity, and third-wave roasters pushing Czech specialty coffee forward.",
    emoji: "☕",
    placeIds: [301, 302, 303, 304, 306, 308],
    estimatedDuration: "5-7 hours",
    idealFor: "Coffee lovers, rainy mornings",
  },
  {
    id: "local-favorites",
    name: "Where Locals Actually Go",
    description:
      "Skip the tourist traps: a riverside farmers market, a butcher-counter meat bar, craft beer in Vinohrady, Czech game in Vysehrad, and sunset beers at Letna.",
    emoji: "🇨🇿",
    placeIds: [218, 10, 111, 18, 216],
    estimatedDuration: "6-8 hours",
    idealFor: "Repeat visitors, locals at heart",
  },
];
