"use client";

import { useEffect, useState, useCallback } from "react";
import { useApiIsLoaded } from "@vis.gl/react-google-maps";
import { Place } from "@/lib/types";

interface TransportPanelProps {
  isOpen: boolean;
  onClose: () => void;
  homeHotel?: Place;
}

const PRG_AIRPORT = {
  lat: 50.1008,
  lng: 14.2600,
  name: "Václav Havel Airport (PRG)",
};

interface Step {
  instructions: string;
  travelMode: string;
  duration: string;
  distance: string;
  transitLine?: string;
  transitVehicle?: string;
  transitDeparture?: string;
  transitArrival?: string;
  transitHeadsign?: string;
  transitNumStops?: number;
}

interface RouteResult {
  summary: string;
  totalDuration: string;
  totalDistance: string;
  departure: string;
  arrival: string;
  steps: Step[];
  fare?: string;
}

function formatStep(raw: google.maps.DirectionsStep): Step {
  const s: Step = {
    instructions: raw.instructions || "",
    travelMode: raw.travel_mode || "WALKING",
    duration: raw.duration?.text || "",
    distance: raw.distance?.text || "",
  };
  const td = raw.transit;
  if (td) {
    const line = td.line;
    if (line) {
      s.transitLine = line.short_name || line.name || "";
      s.transitVehicle = line.vehicle?.name || line.vehicle?.type || "";
    }
    s.transitDeparture = td.departure_stop?.name;
    s.transitArrival = td.arrival_stop?.name;
    s.transitHeadsign = td.headsign;
    s.transitNumStops = td.num_stops;
  }
  return s;
}

function modeIcon(mode: string, vehicle?: string): string {
  if (mode === "WALKING") return "🚶";
  if (mode === "TRANSIT") {
    const v = (vehicle || "").toLowerCase();
    if (v.includes("tram")) return "🚊";
    if (v.includes("bus")) return "🚌";
    if (v.includes("train") || v.includes("rail")) return "🚆";
    if (v.includes("subway") || v.includes("metro")) return "🚇";
    return "🚏";
  }
  return "→";
}

export default function TransportPanel({
  isOpen,
  onClose,
  homeHotel,
}: TransportPanelProps) {
  const apiLoaded = useApiIsLoaded();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState<RouteResult | null>(null);
  const [origin, setOrigin] = useState<"airport" | "current">("airport");

  const destination = homeHotel
    ? { lat: homeHotel.lat, lng: homeHotel.lng, name: homeHotel.name }
    : null;

  const fetchRoute = useCallback(
    async (from: { lat: number; lng: number }) => {
      if (!destination) return;
      setLoading(true);
      setError(null);
      setRoute(null);
      try {
        // Ensure routes library is loaded
        const { DirectionsService } = (await google.maps.importLibrary(
          "routes"
        )) as google.maps.RoutesLibrary;
        const service = new DirectionsService();
        const result = await service.route({
          origin: from,
          destination: { lat: destination.lat, lng: destination.lng },
          travelMode: google.maps.TravelMode.TRANSIT,
          transitOptions: {
            departureTime: new Date(),
            modes: [
              google.maps.TransitMode.BUS,
              google.maps.TransitMode.RAIL,
              google.maps.TransitMode.SUBWAY,
              google.maps.TransitMode.TRAM,
            ],
          },
        });
        const leg = result.routes[0]?.legs[0];
        if (!leg) {
          setError("No route found.");
          return;
        }
        const steps = (leg.steps || []).map(formatStep);
        setRoute({
          summary: result.routes[0].summary || "",
          totalDuration: leg.duration?.text || "",
          totalDistance: leg.distance?.text || "",
          departure: leg.departure_time?.text || "Now",
          arrival: leg.arrival_time?.text || "",
          steps,
          fare: (result.routes[0].fare as { text?: string } | undefined)?.text,
        });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          `Could not fetch directions: ${msg}. ` +
            "Make sure the 'Directions API' is enabled in Google Cloud for this key."
        );
      } finally {
        setLoading(false);
      }
    },
    [destination]
  );

  // Auto-fetch from airport when panel opens
  useEffect(() => {
    if (!isOpen || !apiLoaded || !destination) return;
    if (origin === "airport") {
      fetchRoute(PRG_AIRPORT);
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          fetchRoute({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setError("Location permission denied.")
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, apiLoaded, origin, destination]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[75] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 bottom-0 w-[440px] max-w-[95vw] bg-panel z-[76] shadow-2xl transition-transform duration-350 ease-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-accent to-amber-600 text-white px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] opacity-80 mb-1">
              Live transit
            </p>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold leading-tight">
              Airport → {destination?.name || "Home"}
            </h2>
            <p className="text-[0.7rem] opacity-90 mt-1">
              Updated {new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center text-lg cursor-pointer transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Toggle from/current */}
        <div className="px-5 pt-4 pb-2 flex gap-1.5 text-[0.65rem] font-semibold">
          <button
            onClick={() => setOrigin("airport")}
            className={`px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
              origin === "airport"
                ? "bg-ink text-paper border-ink"
                : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-warm"
            }`}
          >
            ✈ From PRG airport
          </button>
          <button
            onClick={() => setOrigin("current")}
            className={`px-3 py-1.5 rounded-full border transition-colors cursor-pointer ${
              origin === "current"
                ? "bg-ink text-paper border-ink"
                : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-warm"
            }`}
          >
            📍 From my location
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pb-8 pt-3">
          {loading && (
            <div className="flex items-center gap-3 py-8 text-warm text-sm">
              <div className="w-5 h-5 border-2 border-stone-300 border-t-accent rounded-full animate-spin" />
              Finding the best route…
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 text-[0.75rem] text-red-700 dark:text-red-300 leading-relaxed">
              {error}
            </div>
          )}

          {!loading && route && (
            <>
              {/* Summary card */}
              <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 mb-4 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <div className="text-[0.6rem] uppercase text-warm tracking-wider">
                      Total time
                    </div>
                    <div className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-ink">
                      {route.totalDuration}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[0.6rem] uppercase text-warm tracking-wider">
                      Distance
                    </div>
                    <div className="text-sm font-semibold text-ink">
                      {route.totalDistance}
                    </div>
                  </div>
                </div>
                <div className="flex justify-between items-center text-[0.68rem] text-warm border-t border-stone-200 dark:border-stone-800 pt-2 mt-2">
                  <span>Depart: <strong className="text-ink">{route.departure}</strong></span>
                  {route.arrival && (
                    <span>Arrive: <strong className="text-ink">{route.arrival}</strong></span>
                  )}
                </div>
                {route.fare && (
                  <div className="text-[0.68rem] text-warm mt-1">
                    Fare: <strong className="text-ink">{route.fare}</strong>
                  </div>
                )}
              </div>

              {/* Step list */}
              <ol className="relative border-l-2 border-stone-200 dark:border-stone-800 ml-3 space-y-4">
                {route.steps.map((s, i) => (
                  <li key={i} className="pl-6 relative">
                    <span className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-paper dark:bg-panel border-2 border-accent flex items-center justify-center text-[0.7rem]">
                      {modeIcon(s.travelMode, s.transitVehicle)}
                    </span>
                    <div className="text-[0.7rem] uppercase text-warm tracking-wider mb-0.5">
                      {s.travelMode === "WALKING" ? "Walk" : s.transitVehicle || "Transit"}
                      <span className="ml-1.5 text-[0.65rem] normal-case tracking-normal">
                        · {s.duration} {s.distance && `(${s.distance})`}
                      </span>
                    </div>
                    {s.transitLine && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="px-2 py-0.5 rounded bg-accent text-white text-[0.7rem] font-bold tabular-nums">
                          {s.transitLine}
                        </span>
                        {s.transitHeadsign && (
                          <span className="text-[0.7rem] text-warm">
                            towards <span className="font-semibold text-ink">{s.transitHeadsign}</span>
                          </span>
                        )}
                      </div>
                    )}
                    <div
                      className="text-sm text-ink leading-snug"
                      dangerouslySetInnerHTML={{ __html: s.instructions }}
                    />
                    {s.transitDeparture && s.transitArrival && (
                      <div className="text-[0.68rem] text-warm mt-1">
                        {s.transitDeparture} → {s.transitArrival}
                        {s.transitNumStops !== undefined && ` · ${s.transitNumStops} stops`}
                      </div>
                    )}
                  </li>
                ))}
              </ol>

              {/* Open in Maps */}
              {destination && (
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${
                    origin === "airport"
                      ? `${PRG_AIRPORT.lat},${PRG_AIRPORT.lng}`
                      : "Current+Location"
                  }&destination=${destination.lat},${destination.lng}&travelmode=transit`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-paper text-sm font-semibold hover:bg-accent transition-colors"
                >
                  Open in Google Maps
                </a>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
