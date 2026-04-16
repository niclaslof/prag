"use client";

import { useState, useEffect, useMemo } from "react";
import Image from "next/image";
import { Place, CATEGORIES, PRICE_SYMBOLS } from "@/lib/types";

type SortMode = "rating" | "nearby";

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

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
  const [sortMode, setSortMode] = useState<SortMode>("rating");
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (sortMode === "nearby" && !userPos && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (p) => setUserPos({ lat: p.coords.latitude, lng: p.coords.longitude }),
        () => {},
        { enableHighAccuracy: true, timeout: 5000 }
      );
    }
  }, [sortMode, userPos]);

  const sorted = useMemo(() => {
    if (sortMode === "nearby" && userPos) {
      return [...places].sort((a, b) => {
        const da = haversineKm(userPos.lat, userPos.lng, a.lat, a.lng);
        const db = haversineKm(userPos.lat, userPos.lng, b.lat, b.lng);
        return da - db;
      });
    }
    return [...places].sort((a, b) => {
      if (a.isTopPick !== b.isTopPick) return a.isTopPick ? -1 : 1;
      return (b.rating ?? 0) - (a.rating ?? 0) || a.name.localeCompare(b.name);
    });
  }, [places, sortMode, userPos]);

  const distanceLabel = (p: Place) => {
    if (!userPos) return null;
    const d = haversineKm(userPos.lat, userPos.lng, p.lat, p.lng);
    return d < 1 ? `${Math.round(d * 1000)} m` : `${d.toFixed(1)} km`;
  };

  return (
    <div
      className={`fixed left-0 top-[98px] md:top-[102px] bottom-0 w-80 md:w-96 bg-panel z-[55] overflow-y-auto transition-transform duration-300 border-r border-stone-200 shadow-[4px_0_16px_rgba(0,0,0,0.1)] ${
        isOpen ? "translate-x-0" : "-translate-x-full"
      }`}
    >
      <div className="sticky top-0 z-10 bg-ink text-paper px-4 py-3 flex items-center justify-between">
        <h3 className="font-semibold text-sm">All places ({places.length})</h3>
        <button onClick={onClose} className="text-warm hover:text-paper text-lg cursor-pointer">
          ✕
        </button>
      </div>

      {/* Sort toggle */}
      <div className="sticky top-[44px] z-10 bg-panel border-b border-stone-200 dark:border-stone-800 px-3 py-2 flex gap-1.5">
        <button
          onClick={() => setSortMode("rating")}
          className={`flex-1 py-1.5 rounded-full text-[0.65rem] font-semibold cursor-pointer transition-colors ${
            sortMode === "rating" ? "bg-ink text-paper" : "bg-stone-100 dark:bg-stone-800 text-warm"
          }`}
        >
          ★ Top rated
        </button>
        <button
          onClick={() => setSortMode("nearby")}
          className={`flex-1 py-1.5 rounded-full text-[0.65rem] font-semibold cursor-pointer transition-colors ${
            sortMode === "nearby" ? "bg-ink text-paper" : "bg-stone-100 dark:bg-stone-800 text-warm"
          }`}
        >
          📍 Near me
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
              <div
                className={`relative w-11 h-11 rounded-lg overflow-hidden shrink-0 flex items-center justify-center text-white text-base ${
                  fav ? "ring-2 ring-amber-400" : ""
                }`}
                style={{ backgroundColor: meta.color }}
                title={meta.name}
              >
                <span className="absolute">{meta.emoji}</span>
                <Image
                  src={place.photoUrl || `/images/places/${place.id}.jpg`}
                  alt=""
                  width={88}
                  height={88}
                  unoptimized={!!place.photoUrl}
                  className="relative w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
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
                    <span className="text-green-700 dark:text-green-400">{PRICE_SYMBOLS[place.priceLevel]}</span>
                  )}
                  {sortMode === "nearby" && distanceLabel(place) && (
                    <span className="text-accent font-semibold">{distanceLabel(place)}</span>
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
