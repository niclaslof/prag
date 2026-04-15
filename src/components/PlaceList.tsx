"use client";

import { Place, CATEGORIES, PRICE_SYMBOLS } from "@/lib/types";

interface PlaceListProps {
  places: Place[];
  isOpen: boolean;
  onClose: () => void;
  onSelect: (place: Place) => void;
  isFavorite: (category: string, placeId: number) => boolean;
  onToggleFavorite: (category: string, placeId: number) => void;
}

export default function PlaceList({
  places,
  isOpen,
  onClose,
  onSelect,
  isFavorite,
  onToggleFavorite,
}: PlaceListProps) {
  // Sort: top picks first, then by rating (desc), then by name
  const sorted = [...places].sort((a, b) => {
    if (a.isTopPick !== b.isTopPick) return a.isTopPick ? -1 : 1;
    const ra = a.rating ?? 0;
    const rb = b.rating ?? 0;
    if (rb !== ra) return rb - ra;
    return a.name.localeCompare(b.name);
  });

  return (
    <div
      className={`fixed left-0 top-[68px] md:top-[72px] bottom-0 w-80 md:w-96 bg-panel z-[55] overflow-y-auto transition-transform duration-300 border-r border-stone-200 shadow-[4px_0_16px_rgba(0,0,0,0.1)] ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="sticky top-0 z-10 bg-ink text-paper px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">All places ({places.length})</h3>
        <button onClick={onClose} className="text-warm hover:text-paper text-lg cursor-pointer">
          ✕
        </button>
      </div>

      <div>
        {sorted.map((place) => {
          const fav = isFavorite(place.category, place.id);
          const meta = CATEGORIES[place.category];
          return (
            <div
              key={`${place.category}-${place.id}`}
              onClick={() => {
                onSelect(place);
                onClose();
              }}
              className={`flex items-center gap-3 px-4 py-2.5 border-b border-stone-100 cursor-pointer hover:bg-tag-bg transition-colors ${
                fav ? "bg-amber-50" : ""
              }`}
            >
              <span
                className={`w-9 h-9 rounded-full text-white flex items-center justify-center text-base shrink-0 ${
                  fav ? "ring-2 ring-amber-400" : ""
                }`}
                style={{ backgroundColor: meta.color }}
                title={meta.name}
              >
                {meta.emoji}
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-xs text-ink truncate">
                  {place.name}
                  {place.isTopPick && <span className="ml-1 text-amber-500">★</span>}
                </div>
                <div className="text-[0.65rem] text-warm truncate">
                  {place.district} · {place.tagline}
                </div>
                <div className="text-[0.65rem] text-warm flex gap-2 mt-0.5">
                  {place.rating !== undefined && (
                    <span>★ {place.rating.toFixed(1)}</span>
                  )}
                  {place.priceLevel !== undefined && place.priceLevel > 0 && (
                    <span className="text-green-700">{PRICE_SYMBOLS[place.priceLevel]}</span>
                  )}
                </div>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite(place.category, place.id);
                }}
                className={`shrink-0 w-6 h-6 flex items-center justify-center text-sm cursor-pointer transition-colors ${
                  fav ? "text-amber-500" : "text-stone-300 hover:text-amber-400"
                }`}
                aria-label="Toggle favorite"
              >
                {fav ? "♥" : "♡"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
