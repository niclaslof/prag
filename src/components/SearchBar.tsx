"use client";

import { useState } from "react";
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
  onClearFilters: () => void;
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
  onClearFilters,
}: SearchBarProps) {
  const [filtersOpen, setFiltersOpen] = useState(false);

  const pill =
    "px-2 py-0.5 md:px-2.5 md:py-1 rounded-full text-[0.6rem] md:text-[0.65rem] font-semibold cursor-pointer whitespace-nowrap transition-all border";

  const advancedCount =
    priceLevels.length +
    (minRating > 0 ? 1 : 0) +
    activeDistricts.length +
    (openNowOnly ? 1 : 0);

  return (
    <div className="fixed top-[36px] md:top-[40px] left-0 right-0 z-40">
      {/* Main bar */}
      <div className="bg-white/95 dark:bg-stone-900/95 backdrop-blur-sm border-b border-stone-200 dark:border-stone-700 px-2 py-1 md:px-4 md:py-1.5">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
          {/* Search */}
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search Prague..."
            className="px-2 py-1 rounded-full border border-stone-300 dark:border-stone-600 text-[0.65rem] md:text-xs w-28 md:w-44 bg-white dark:bg-stone-800 dark:text-stone-100 outline-none focus:border-[#b45309] transition-colors shrink-0"
          />

          {/* Favorites */}
          {favoriteCount > 0 && (
            <button
              onClick={onToggleFavorites}
              className={`${pill} ${
                showFavoritesOnly
                  ? "bg-amber-500 border-amber-500 text-white"
                  : "bg-white dark:bg-stone-800 border-amber-300 text-amber-600"
              }`}
            >
              ♥{favoriteCount}
            </button>
          )}

          {/* Category pills */}
          {CATEGORY_FILTERS.filter((c) => availableCategories.includes(c)).map((c) => {
            const meta = CATEGORIES[c];
            const on = activeCategories.includes(c);
            return (
              <button
                key={c}
                onClick={() => onCategoryToggle(c)}
                className={`${pill} ${on ? "text-white" : "text-stone-500 bg-white dark:bg-stone-800"}`}
                style={{
                  backgroundColor: on ? meta.color : undefined,
                  borderColor: on ? meta.color : "#d6d3d1",
                }}
              >
                {meta.emoji} {meta.namePlural}
              </button>
            );
          })}

          {/* Filter toggle */}
          <button
            onClick={() => setFiltersOpen(!filtersOpen)}
            className={`${pill} ml-auto shrink-0 ${
              advancedCount > 0
                ? "bg-stone-800 border-stone-800 text-white"
                : "bg-white dark:bg-stone-800 border-stone-300 text-stone-500"
            }`}
          >
            {advancedCount > 0 ? `Filters (${advancedCount})` : "Filters ▾"}
          </button>
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
