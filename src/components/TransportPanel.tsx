"use client";

import { useEffect, useState } from "react";
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
  name: "Václav Havel Airport Prague (PRG)",
};

/* ------------------------------------------------------------------ */
/* Curated, verified PRG → Radisson Blu Alcron routes                  */
/* ------------------------------------------------------------------ */

interface CuratedStep {
  icon: string;
  kind: "bus" | "metro" | "walk" | "taxi" | "train";
  line?: string;
  lineColor?: string;
  title: string;
  detail: string;
  duration: string;
}

interface CuratedRoute {
  id: string;
  title: string;
  subtitle: string;
  totalDuration: string;
  cost: string;
  pros: string[];
  cons: string[];
  steps: CuratedStep[];
}

const CURATED_ROUTES: CuratedRoute[] = [
  {
    id: "bus119",
    title: "Bus 119 + Metro A",
    subtitle: "Cheapest & most reliable",
    totalDuration: "~50 min",
    cost: "40 CZK · 90-min ticket",
    pros: ["Cheapest option", "Runs every 10–15 min", "Covered by standard PID ticket"],
    cons: ["Two transfers", "Bus can get full with luggage"],
    steps: [
      {
        icon: "🚌",
        kind: "bus",
        line: "119",
        lineColor: "#0f62fe",
        title: "Airport bus to Nádraží Veleslavín",
        detail:
          "From stops at Terminal 1 or Terminal 2. Direction: Nádraží Veleslavín. Every 10–15 min. Buy a 90-min PID ticket (40 CZK) at the yellow machine before boarding — validate it when you step on.",
        duration: "17 min · ~12 stops",
      },
      {
        icon: "🚇",
        kind: "metro",
        line: "A",
        lineColor: "#2a9d3d",
        title: "Metro A (green) towards Depo Hostivař",
        detail:
          "At Nádraží Veleslavín, take the escalator down and board the green line. Ride 7 stops to Můstek or 8 stops to Muzeum — both work.",
        duration: "14 min",
      },
      {
        icon: "🚶",
        kind: "walk",
        title: "Walk to Radisson Blu Alcron",
        detail:
          "Exit Můstek station and walk south on Václavské náměstí, then turn left onto Štěpánská. Hotel is at Štěpánská 40 — look for the Art Deco façade.",
        duration: "5 min · ~450 m",
      },
    ],
  },
  {
    id: "ae",
    title: "Airport Express (AE) + short walk",
    subtitle: "Fastest public transport",
    totalDuration: "~40 min",
    cost: "100 CZK",
    pros: ["Fastest transit", "One transfer only", "Luggage space onboard"],
    cons: ["Higher fare than bus 119", "Runs every 30 min"],
    steps: [
      {
        icon: "🚌",
        kind: "bus",
        line: "AE",
        lineColor: "#e11d48",
        title: "Airport Express to Hlavní nádraží",
        detail:
          "Red AE bus leaves from Terminal 1, stop right outside Arrivals. Every 30 min, 04:30–22:00. Buy the 100 CZK ticket from the driver (cash or card). Terminus: Prague Main Station.",
        duration: "33 min",
      },
      {
        icon: "🚶",
        kind: "walk",
        title: "Walk to Radisson Blu Alcron",
        detail:
          "Exit the station, cross Wilsonova (use the overpass), walk through Vrchlického sady then along Ve Smečkách and Štěpánská to the hotel. Or take Metro C to Muzeum one stop and walk from there.",
        duration: "~12 min · 900 m",
      },
    ],
  },
  {
    id: "taxi",
    title: "Taxi / Uber / Bolt",
    subtitle: "Fastest door-to-door",
    totalDuration: "~25 min",
    cost: "550–750 CZK",
    pros: ["Door-to-door with luggage", "No transfers", "Fixed price via app"],
    cons: ["Most expensive", "Slower in rush-hour traffic"],
    steps: [
      {
        icon: "🚖",
        kind: "taxi",
        title: "Official airport taxi or ride-share",
        detail:
          "Use the official FIX taxi rank at Arrivals (approved price ~650 CZK) or order via Uber / Bolt apps directly to Radisson Blu Alcron, Štěpánská 40. Bolt is usually the cheapest.",
        duration: "~25 min · 18 km",
      },
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Live Google Directions (used for "My location" origin)              */
/* ------------------------------------------------------------------ */

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
  const [origin, setOrigin] = useState<"airport" | "current">("airport");
  const [expandedId, setExpandedId] = useState<string | null>("bus119");

  // Live API state (used only for "current location" origin)
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [liveRoute, setLiveRoute] = useState<RouteResult | null>(null);

  const destLat = homeHotel?.lat;
  const destLng = homeHotel?.lng;
  const destName = homeHotel?.name;

  // Only use live directions when the user picks "from my location"
  useEffect(() => {
    if (!isOpen || origin !== "current" || !apiLoaded) return;
    if (destLat === undefined || destLng === undefined) return;

    let cancelled = false;
    setLoading(true);
    setError(null);
    setLiveRoute(null);

    const run = async (from: { lat: number; lng: number }) => {
      try {
        const { DirectionsService } = (await google.maps.importLibrary(
          "routes"
        )) as google.maps.RoutesLibrary;
        if (cancelled) return;
        const service = new DirectionsService();
        const result = await service.route({
          origin: from,
          destination: { lat: destLat, lng: destLng },
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
        if (cancelled) return;
        const leg = result.routes[0]?.legs[0];
        if (!leg) {
          setError("No route found from your current location.");
          return;
        }
        setLiveRoute({
          totalDuration: leg.duration?.text || "",
          totalDistance: leg.distance?.text || "",
          departure: leg.departure_time?.text || "Now",
          arrival: leg.arrival_time?.text || "",
          steps: (leg.steps || []).map(formatStep),
          fare: (result.routes[0].fare as { text?: string } | undefined)?.text,
        });
      } catch (e: unknown) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : String(e);
        setError(
          `Could not fetch live directions: ${msg}. ` +
            "Make sure the 'Directions API' is enabled in Google Cloud on this key."
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (cancelled) return;
          run({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        () => {
          if (!cancelled) {
            setError("Location permission denied.");
            setLoading(false);
          }
        }
      );
    } else {
      setError("Geolocation is not supported in this browser.");
      setLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [isOpen, apiLoaded, origin, destLat, destLng]);

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
        className={`fixed right-0 top-0 bottom-0 w-[460px] max-w-full bg-panel z-[76] shadow-2xl transition-transform duration-350 ease-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-br from-accent to-amber-600 text-white px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] opacity-80 mb-1">
              Getting to your hotel
            </p>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold leading-tight">
              Airport → {destName || "Home"}
            </h2>
            <p className="text-[0.7rem] opacity-90 mt-1">
              Verified for Radisson Blu Alcron · Štěpánská 40
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

        {/* Origin toggle */}
        <div className="px-5 pt-4 pb-2 flex gap-1.5 text-[0.65rem] font-semibold">
          <button
            onClick={() => setOrigin("airport")}
            className={`flex-1 px-3 py-2 rounded-full border transition-colors cursor-pointer ${
              origin === "airport"
                ? "bg-ink text-paper border-ink"
                : "bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-700 text-warm"
            }`}
          >
            ✈ From PRG airport
          </button>
          <button
            onClick={() => setOrigin("current")}
            className={`flex-1 px-3 py-2 rounded-full border transition-colors cursor-pointer ${
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
          {/* === AIRPORT MODE: curated cards === */}
          {origin === "airport" && (
            <>
              <p className="text-[0.7rem] text-warm mb-3 leading-relaxed">
                Three verified ways to reach the hotel from Václav Havel Airport. Tap a card to see step-by-step directions.
              </p>
              <div className="space-y-3">
                {CURATED_ROUTES.map((r) => {
                  const expanded = expandedId === r.id;
                  return (
                    <div
                      key={r.id}
                      className={`rounded-xl bg-white dark:bg-stone-900 border shadow-sm transition-all ${
                        expanded
                          ? "border-accent"
                          : "border-stone-200 dark:border-stone-800"
                      }`}
                    >
                      <button
                        onClick={() => setExpandedId(expanded ? null : r.id)}
                        className="w-full text-left px-4 py-3 flex items-start gap-3 cursor-pointer"
                      >
                        <div className="shrink-0 flex items-center gap-1">
                          {r.steps.slice(0, 3).map((s, i) => (
                            <span
                              key={i}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-stone-100 dark:bg-stone-800 text-sm"
                            >
                              {s.icon}
                            </span>
                          ))}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm text-ink">
                            {r.title}
                          </div>
                          <div className="text-[0.68rem] text-warm truncate">
                            {r.subtitle}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-[0.68rem]">
                            <span className="font-semibold text-accent">
                              {r.totalDuration}
                            </span>
                            <span className="text-warm">{r.cost}</span>
                          </div>
                        </div>
                        <span className={`text-warm text-lg transition-transform ${expanded ? "rotate-90" : ""}`}>
                          ›
                        </span>
                      </button>

                      {expanded && (
                        <div className="px-4 pb-4 border-t border-stone-100 dark:border-stone-800 pt-3">
                          {/* pros / cons */}
                          <div className="grid grid-cols-2 gap-2 mb-4 text-[0.65rem]">
                            <div>
                              <p className="uppercase tracking-wider text-warm font-semibold mb-1">
                                Pros
                              </p>
                              <ul className="space-y-0.5 text-ink">
                                {r.pros.map((p, i) => (
                                  <li key={i}>+ {p}</li>
                                ))}
                              </ul>
                            </div>
                            <div>
                              <p className="uppercase tracking-wider text-warm font-semibold mb-1">
                                Cons
                              </p>
                              <ul className="space-y-0.5 text-ink">
                                {r.cons.map((c, i) => (
                                  <li key={i}>− {c}</li>
                                ))}
                              </ul>
                            </div>
                          </div>

                          {/* steps */}
                          <ol className="relative border-l-2 border-stone-200 dark:border-stone-800 ml-3 space-y-4">
                            {r.steps.map((s, i) => (
                              <li key={i} className="pl-6 relative">
                                <span className="absolute -left-[14px] top-0 w-6 h-6 rounded-full bg-paper dark:bg-panel border-2 border-accent flex items-center justify-center text-[0.75rem]">
                                  {s.icon}
                                </span>
                                {s.line && (
                                  <div className="mb-1">
                                    <span
                                      className="inline-block px-2 py-0.5 rounded text-white text-[0.7rem] font-bold tabular-nums"
                                      style={{ backgroundColor: s.lineColor || "#b45309" }}
                                    >
                                      {s.line}
                                    </span>
                                  </div>
                                )}
                                <div className="text-sm font-semibold text-ink leading-snug">
                                  {s.title}
                                </div>
                                <div className="text-[0.7rem] text-warm mt-0.5">
                                  {s.duration}
                                </div>
                                <div className="text-[0.72rem] text-ink/90 leading-relaxed mt-1">
                                  {s.detail}
                                </div>
                              </li>
                            ))}
                          </ol>

                          {/* Open live in Google Maps */}
                          {destLat !== undefined && destLng !== undefined && (
                            <a
                              href={`https://www.google.com/maps/dir/?api=1&origin=${PRG_AIRPORT.lat},${PRG_AIRPORT.lng}&destination=${destLat},${destLng}&travelmode=transit`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ink text-paper text-[0.72rem] font-semibold hover:bg-accent transition-colors"
                            >
                              Check live times in Google Maps ↗
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Ticket tip */}
              <div className="mt-5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-4">
                <p className="text-[0.7rem] uppercase tracking-wider font-bold text-amber-800 dark:text-amber-300 mb-1">
                  Ticket tip
                </p>
                <p className="text-[0.72rem] text-amber-900 dark:text-amber-200 leading-relaxed">
                  Prague's public transport uses one integrated PID ticket system. A
                  <strong> 90-min ticket (40 CZK)</strong> covers bus, metro and tram with
                  unlimited transfers. Buy at yellow DPP machines, tobacco kiosks or the
                  PID Lítačka app. Validate only once, when you first board.
                </p>
              </div>
            </>
          )}

          {/* === CURRENT LOCATION MODE: live Google Directions === */}
          {origin === "current" && (
            <>
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

              {!loading && liveRoute && (
                <>
                  <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 mb-4 shadow-sm">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <div className="text-[0.6rem] uppercase text-warm tracking-wider">
                          Total time
                        </div>
                        <div className="font-[family-name:var(--font-playfair)] text-2xl font-bold text-ink">
                          {liveRoute.totalDuration}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[0.6rem] uppercase text-warm tracking-wider">
                          Distance
                        </div>
                        <div className="text-sm font-semibold text-ink">
                          {liveRoute.totalDistance}
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[0.68rem] text-warm border-t border-stone-200 dark:border-stone-800 pt-2 mt-2">
                      <span>Depart: <strong className="text-ink">{liveRoute.departure}</strong></span>
                      {liveRoute.arrival && (
                        <span>Arrive: <strong className="text-ink">{liveRoute.arrival}</strong></span>
                      )}
                    </div>
                    {liveRoute.fare && (
                      <div className="text-[0.68rem] text-warm mt-1">
                        Fare: <strong className="text-ink">{liveRoute.fare}</strong>
                      </div>
                    )}
                  </div>

                  <ol className="relative border-l-2 border-stone-200 dark:border-stone-800 ml-3 space-y-4">
                    {liveRoute.steps.map((s, i) => (
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

                  {destLat !== undefined && destLng !== undefined && (
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&origin=Current+Location&destination=${destLat},${destLng}&travelmode=transit`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-paper text-sm font-semibold hover:bg-accent transition-colors"
                    >
                      Open in Google Maps
                    </a>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </aside>
    </>
  );
}
