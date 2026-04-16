"use client";

import { useState, useEffect } from "react";
import {
  Category,
  CATEGORIES,
  CATEGORY_FILTERS,
  PriceLevel,
  PRICE_SYMBOLS,
  DISTRICTS,
  District,
} from "@/lib/types";

interface SearchBarProps {
  query: string;
  onQueryChange: (q: string) => void;
  activeCategories: Category[];
  onCategoryToggle: (c: Category) => void;
  availableCategories: Category[];
  showFavoritesOnly: boolean;
  onToggleFavorites: () => void;
  favoriteCount: number;
  priceLevels: PriceLevel[];
  onPriceToggle: (p: PriceLevel) => void;
  minRating: number;
  onMinRatingChange: (r: number) => void;
  activeDistricts: District[];
  onDistrictToggle: (d: District) => void;
  availableDistricts: District[];
  openNowOnly: boolean;
  onToggleOpenNow: () => void;
  kidFriendlyOnly: boolean;
  onToggleKidFriendly: () => void;
  onClearFilters: () => void;
  /** Increment to force the filters drawer open (used by the menu). */
  forceOpenNonce?: number;
}

export default function SearchBar({
  query,
  onQueryChange,
  activeCategories,
  onCategoryToggle,
  availableCategories,
  showFavoritesOnly,
  onToggleFavorites,
  favoriteCount,
  priceLevels,
  onPriceToggle,
  minRating,
  onMinRatingChange,
  activeDistricts,
  onDistrictToggle,
  availableDistricts,
  openNowOnly,
  onToggleOpenNow,
  kidFriendlyOnly,
  onToggleKidFriendly,
  onClearFilters,
  forceOpenNonce,
}: SearchBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  useEffect(() => {
    if (forceOpenNonce && forceOpenNonce > 0) {
      setFiltersOpen(true);
    }
  }, [forceOpenNonce]);

  const pill =
    "px-2.5 py-1 md:px-3 md:py-1 rounded-full text-[0.62rem] md:text-[0.68rem] font-medium cursor-pointer whitespace-nowrap transition-all border";

  const advancedCount =
    priceLevels.length +
    (minRating > 0 ? 1 : 0) +
    activeDistricts.length +
    (openNowOnly ? 1 : 0) +
    (kidFriendlyOnly ? 1 : 0);

  return (
    <div className="fixed top-[34px] md:top-[38px] left-0 right-0 z-40">
      {/* Search row */}
      <div className="bg-paper/95 dark:bg-stone-900/95 backdrop-blur-md border-b border-stone-200/60 dark:border-stone-800 px-2 py-1.5 md:px-4">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search places, districts…"
            className="flex-1 min-w-0 px-3 py-1.5 rounded-full border border-stone-300 dark:border-stone-700 text-xs bg-white dark:bg-stone-800 dark:text-stone-100 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all placeholder:text-stone-400"
          />
          {favoriteCount > 0 && (
            <button
              onClick={onToggleFavorites}
              className={`${pill} shrink-0 ${
                showFavoritesOnly
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-white dark:bg-stone-800 border-amber-300 dark:border-amber-700 text-amber-600 dark:text-amber-400"
              }`}
            >
              ♥ {favoriteCount}
            </button>
          )}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`${pill} shrink-0 ${
              advancedCount > 0
                ? "bg-stone-800 dark:bg-stone-200 border-stone-800 dark:border-stone-200 text-white dark:text-stone-900"
                : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400"
            }`}
          >
            {advancedCount > 0 ? `⚙ ${advancedCount}` : "⚙"}
          </button>
        </div>
      </div>

      {/* Category pills row */}
      <div className="bg-paper/90 dark:bg-stone-900/90 backdrop-blur-sm px-2 py-1 md:px-4 border-b border-stone-200/60 dark:border-stone-800">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {CATEGORY_FILTERS.filter((c) => availableCategories.includes(c)).map((c) => {
            const meta = CATEGORIES[c];
            const on = activeCategories.includes(c);
            return (
              <button
                key={c}
                onClick={() => onCategoryToggle(c)}
                className={`${pill} ${on ? "text-white" : "text-stone-500 bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600"}`}
                style={{
                  backgroundColor: on ? meta.color : undefined,
                  borderColor: on ? meta.color : undefined,
                }}
              >
                {meta.emoji} {meta.namePlural}
              </button>
            );
          })}
        </div>
      </div>

      {/* Expandable filters */}
      {filtersOpen && (
        <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm border-b border-stone-200 dark:border-stone-700 px-2 py-2 md:px-4 space-y-2 max-h-[70vh] overflow-y-auto">
          {/* Open now + rating row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={onToggleOpenNow}
              className={`${pill} ${
                openNowOnly
                  ? "bg-green-600 border-green-600 text-white"
                  : "bg-white dark:bg-stone-800 border-stone-300 text-stone-500"
              }`}
            >
              🕐 Open now
            </button>
            <button
              onClick={onToggleKidFriendly}
              className={`${pill} ${
                kidFriendlyOnly
                  ? "bg-pink-500 border-pink-500 text-white"
                  : "bg-white dark:bg-stone-800 border-stone-300 text-stone-500"
              }`}
            >
              👶 Kid-friendly
            </button>
            <span className="text-[0.6rem] text-warm font-semibold uppercase ml-2">Min rating</span>
            {[0, 4, 4.3, 4.5, 4.7].map((r) => (
              <button
                key={r}
                onClick={() => onMinRatingChange(r)}
                className={`${pill} ${
                  minRating === r
                    ? "bg-amber-500 border-amber-500 text-white"
                    : "bg-white dark:bg-stone-800 border-stone-300 text-stone-500"
                }`}
              >
                {r === 0 ? "Any" : `${r}+`}
              </button>
            ))}
          </div>

          {/* Price row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.6rem] text-warm font-semibold uppercase">Price</span>
            {[1, 2, 3, 4].map((p) => {
              const on = priceLevels.includes(p as PriceLevel);
              return (
                <button
                  key={p}
                  onClick={() => onPriceToggle(p as PriceLevel)}
                  className={`${pill} ${
                    on
                      ? "bg-stone-800 border-stone-800 text-white"
                      : "bg-white dark:bg-stone-800 border-stone-300 text-stone-500"
                  }`}
                >
                  {PRICE_SYMBOLS[p as PriceLevel]}
                </button>
              );
            })}
          </div>

          {/* District row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[0.6rem] text-warm font-semibold uppercase">District</span>
            {DISTRICTS.filter((d) => availableDistricts.includes(d)).map((d) => {
              const on = activeDistricts.includes(d);
              return (
                <button
                  key={d}
                  onClick={() => onDistrictToggle(d)}
                  className={`${pill} ${
                    on
                      ? "bg-stone-800 border-stone-800 text-white"
                      : "bg-white dark:bg-stone-800 border-stone-300 text-stone-500"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>

          {/* Clear all */}
          {advancedCount > 0 && (
            <div>
              <button
                onClick={() => {
                  onClearFilters();
                  setFiltersOpen(false);
                }}
                className="text-[0.65rem] text-accent hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
