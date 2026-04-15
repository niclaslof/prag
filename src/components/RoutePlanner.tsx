"use client";

import { useState, useEffect } from "react";
import { Place, CATEGORIES } from "@/lib/types";

interface RoutePlannerProps {
  favorites: Place[];
  isOpen: boolean;
  onClose: () => void;
  onSelectPlace: (place: Place) => void;
}

type TravelMode = "walking" | "driving" | "transit";

function optimizeRoute(places: Place[], startLat?: number, startLng?: number): Place[] {
  if (places.length <= 1) return places;

  const remaining = [...places];
  const route: Place[] = [];

  if (startLat !== undefined && startLng !== undefined) {
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((p, i) => {
      const dist = Math.sqrt(Math.pow(p.lat - startLat, 2) + Math.pow(p.lng - startLng, 2));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    });
    route.push(remaining.splice(nearestIdx, 1)[0]);
  } else {
    route.push(remaining.shift()!);
  }

  while (remaining.length > 0) {
    const last = route[route.length - 1];
    let nearestIdx = 0;
    let nearestDist = Infinity;
    remaining.forEach((p, i) => {
      const dist = Math.sqrt(Math.pow(p.lat - last.lat, 2) + Math.pow(p.lng - last.lng, 2));
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = i;
      }
    });
    route.push(remaining.splice(nearestIdx, 1)[0]);
  }

  return route;
}

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function totalDistance(route: Place[]): number {
  let total = 0;
  for (let i = 0; i < route.length - 1; i++) {
    total += calcDistance(route[i].lat, route[i].lng, route[i + 1].lat, route[i + 1].lng);
  }
  return total;
}

/** Average speeds in km/h for each travel mode */
const SPEED: Record<TravelMode, number> = {
  walking: 4.5,
  driving: 25,  // city traffic
  transit: 18,
};

export default function RoutePlanner({
  favorites,
  isOpen,
  onClose,
  onSelectPlace,
}: RoutePlannerProps) {
  const [optimizedRoute, setOptimizedRoute] = useState<Place[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingPos, setGettingPos] = useState(false);
  const [travelMode, setTravelMode] = useState<TravelMode>("walking");

  useEffect(() => {
    setOptimizedRoute([]);
  }, [favorites.length]);

  const route = optimizedRoute.length > 0 ? optimizedRoute : favorites;
  const distance = route.length > 1 ? totalDistance(route) : 0;
  const travelTime = Math.round((distance / SPEED[travelMode]) * 60);

  const handleGetPosition = () => {
    setGettingPos(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserPos({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGettingPos(false);
      },
      () => setGettingPos(false),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleOptimize = () => {
    setOptimizedRoute(optimizeRoute(favorites, userPos?.lat, userPos?.lng));
  };

  const handleOpenGoogleMaps = () => {
    if (route.length === 0) return;

    const toPoint = (p: Place) => `${p.lat},${p.lng}`;

    const origin = userPos ? `${userPos.lat},${userPos.lng}` : toPoint(route[0]);
    const destination = toPoint(route[route.length - 1]);
    const waypointList = userPos ? route.slice(0, -1) : route.slice(1, -1);
    const waypoints = waypointList.map(toPoint).join("|");

    let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=${travelMode}`;
    if (waypoints) url += `&waypoints=${waypoints}`;

    window.open(url, "_blank");
  };

  if (!isOpen || favorites.length === 0) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onClose} />

      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[440px] max-w-[95vw] max-h-[85vh] bg-panel rounded-2xl shadow-2xl z-[61] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-ink text-paper px-5 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 className="font-[family-name:var(--font-playfair)] text-lg font-bold">
              Plan your itinerary
            </h2>
            <p className="text-xs text-warm mt-0.5">
              {favorites.length} stops in Prague
            </p>
          </div>
          <button onClick={onClose} className="text-warm hover:text-paper text-xl cursor-pointer">
            ✕
          </button>
        </div>

        {/* Travel mode */}
        <div className="px-5 py-3 bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 shrink-0">
          <p className="text-xs text-warm font-semibold uppercase mb-2">How will you travel?</p>
          <div className="flex gap-2">
            {(["walking", "driving", "transit"] as TravelMode[]).map((m) => (
              <button
                key={m}
                onClick={() => setTravelMode(m)}
                className={`flex-1 py-2 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                  travelMode === m
                    ? "bg-accent text-white"
                    : "bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-stone-600 dark:text-stone-300 hover:border-accent"
                }`}
              >
                {m === "walking" && "🚶 Walk"}
                {m === "driving" && "🚗 Drive"}
                {m === "transit" && "🚇 Transit"}
              </button>
            ))}
          </div>
        </div>

        {/* Start position */}
        <div className="px-5 py-3 bg-stone-50 dark:bg-stone-900/60 border-b border-stone-200 dark:border-stone-800 shrink-0">
          <p className="text-xs text-warm font-semibold uppercase mb-2">Start point</p>
          {userPos ? (
            <div className="flex items-center gap-2">
              <span className="text-green-600 dark:text-green-400 text-sm">📍 Using your location</span>
              <button
                onClick={() => setUserPos(null)}
                className="text-xs text-warm hover:text-ink cursor-pointer"
              >
                ✕ Clear
              </button>
            </div>
          ) : (
            <button
              onClick={handleGetPosition}
              disabled={gettingPos}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-700 text-sm font-medium cursor-pointer hover:border-accent transition-colors disabled:opacity-50"
            >
              {gettingPos ? "⏳ Locating..." : "📍 Use my location as start"}
            </button>
          )}
        </div>

        {/* Stats */}
        {route.length > 1 && (
          <div className="flex gap-4 px-5 py-3 bg-tag-bg border-b border-stone-200 shrink-0">
            <div className="text-center flex-1">
              <div className="text-lg font-bold text-accent">{distance.toFixed(1)} km</div>
              <div className="text-[0.6rem] text-warm uppercase">Distance</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-lg font-bold text-accent">~{travelTime} min</div>
              <div className="text-[0.6rem] text-warm uppercase">{travelMode === "walking" ? "Walking" : travelMode === "driving" ? "Driving" : "Transit"}</div>
            </div>
            <div className="text-center flex-1">
              <div className="text-lg font-bold text-accent">{route.length}</div>
              <div className="text-[0.6rem] text-warm uppercase">Stops</div>
            </div>
          </div>
        )}

        {/* Route list */}
        <div className="overflow-y-auto flex-1 px-2 py-2">
          {route.map((place, i) => {
            const meta = CATEGORIES[place.category];
            return (
              <div
                key={`${place.category}-${place.id}`}
                onClick={() => onSelectPlace(place)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg cursor-pointer hover:bg-tag-bg transition-colors"
              >
                <div className="flex flex-col items-center shrink-0">
                  <span
                    className="w-7 h-7 rounded-full text-white flex items-center justify-center text-xs font-bold"
                    style={{ backgroundColor: meta.color }}
                  >
                    {i + 1}
                  </span>
                  {i < route.length - 1 && (
                    <div className="w-0.5 h-4 bg-stone-300 mt-1" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-sm truncate">
                    {meta.emoji} {place.name}
                  </div>
                  <div className="text-xs text-warm truncate">
                    {place.district} · {place.tagline}
                  </div>
                </div>
                {i > 0 && (
                  <div className="ml-auto text-xs text-warm shrink-0">
                    {calcDistance(route[i - 1].lat, route[i - 1].lng, place.lat, place.lng).toFixed(1)} km
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="px-5 py-4 border-t border-stone-200 flex flex-col gap-2 shrink-0">
          <button
            onClick={handleOptimize}
            className="w-full py-2.5 rounded-lg bg-stone-100 text-ink text-sm font-semibold hover:bg-stone-200 transition-colors cursor-pointer"
          >
            🔄 Optimize route (nearest-neighbor)
          </button>
          <button
            onClick={handleOpenGoogleMaps}
            className="w-full py-2.5 rounded-lg bg-ink text-paper text-sm font-semibold hover:bg-accent transition-colors cursor-pointer"
          >
            🧭 Open in Google Maps
          </button>
        </div>
      </div>
    </>
  );
}
