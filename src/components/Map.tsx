"use client";

import { useEffect, useRef, useState } from "react";
import { Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Place, CATEGORIES, PRAGUE_CENTER } from "@/lib/types";

interface MapProps {
  places: Place[];
  selectedPlace: Place | null;
  onSelectPlace: (place: Place) => void;
  isFavorite?: (category: string, placeId: number) => boolean;
}

function MarkerLayer({ places, selectedPlace, onSelectPlace, isFavorite }: MapProps) {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);

  // Pan to selected place
  useEffect(() => {
    if (map && selectedPlace) {
      map.panTo({ lat: selectedPlace.lat, lng: selectedPlace.lng });
      map.setZoom(15);
    }
  }, [map, selectedPlace]);

  // Create markers + clustering
  useEffect(() => {
    if (!map) return;

    if (clustererRef.current) {
      clustererRef.current.clearMarkers();
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const makePinSvg = (color: string, fav: boolean, emoji: string) => {
      const stroke = fav ? "#f59e0b" : "#ffffff";
      const strokeW = fav ? 2.5 : 2;
      return (
        `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">` +
        `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%">` +
        `<feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-color="#000" flood-opacity="0.25"/>` +
        `</filter></defs>` +
        `<path filter="url(#s)" d="M17 2 C8.7 2 2 8.7 2 17 C2 28 17 42 17 42 C17 42 32 28 32 17 C32 8.7 25.3 2 17 2 Z" ` +
        `fill="${color}" stroke="${stroke}" stroke-width="${strokeW}"/>` +
        `<circle cx="17" cy="17" r="9" fill="#ffffff"/>` +
        `<text x="17" y="17" text-anchor="middle" dominant-baseline="central" font-size="12" font-family="-apple-system, system-ui, sans-serif">${fav ? "♥" : emoji}</text>` +
        `</svg>`
      );
    };

    const makeHomeStarSvg = () =>
      `<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 60 60">` +
      `<defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%">` +
      `<feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#f59e0b" flood-opacity="0.6"/>` +
      `</filter></defs>` +
      `<circle cx="30" cy="30" r="24" fill="#fef3c7" stroke="#f59e0b" stroke-width="2"/>` +
      `<path filter="url(#g)" d="M30 9 L34.9 22.3 L49 23.2 L38 32.1 L41.8 45.8 L30 38 L18.2 45.8 L22 32.1 L11 23.2 L25.1 22.3 Z" fill="#f59e0b" stroke="#ffffff" stroke-width="1.5"/>` +
      `</svg>`;

    const markers = places.map((place) => {
      const meta = CATEGORIES[place.category];
      const fav = isFavorite?.(place.category, place.id) ?? false;

      if (place.isHomeHotel) {
        const svg = makeHomeStarSvg();
        const marker = new google.maps.Marker({
          position: { lat: place.lat, lng: place.lng },
          title: place.name,
          icon: {
            url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
            scaledSize: new google.maps.Size(60, 60),
            anchor: new google.maps.Point(30, 30),
          },
          zIndex: 50000,
          optimized: true,
        });
        marker.addListener("click", () => onSelectPlace(place));
        return marker;
      }

      const pinColor = place.isTopPick ? "#f59e0b" : meta.color;
      const svg = makePinSvg(pinColor, fav, meta.emoji);

      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        title: place.name,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(34, 44),
          anchor: new google.maps.Point(17, 42),
        },
        optimized: true,
      });

      marker.addListener("click", () => onSelectPlace(place));
      return marker;
    });

    markersRef.current = markers;

    // Pie-chart cluster renderer, colors per category
    clustererRef.current = new MarkerClusterer({
      map,
      markers,
      renderer: {
        render: ({ count, position, markers: clusterMarkers }) => {
          const categoryCounts: Record<string, number> = {};
          clusterMarkers?.forEach((m) => {
            const title = (m as google.maps.Marker).getTitle() || "";
            const place = places.find((p) => p.name === title);
            if (place) {
              const color = CATEGORIES[place.category].color;
              categoryCounts[color] = (categoryCounts[color] || 0) + 1;
            }
          });

          const size = Math.min(58, 38 + Math.log2(count) * 6);
          const r = size / 2;
          const cx = r;
          const cy = r;
          const pr = r - 3;

          let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">`;

          const colors = Object.entries(categoryCounts);
          if (colors.length === 1) {
            svg += `<circle cx="${cx}" cy="${cy}" r="${pr}" fill="${colors[0][0]}" opacity="0.9"/>`;
          } else {
            let startAngle = -Math.PI / 2;
            for (const [color, cnt] of colors) {
              const sliceAngle = (cnt / count) * 2 * Math.PI;
              const endAngle = startAngle + sliceAngle;
              const x1 = cx + pr * Math.cos(startAngle);
              const y1 = cy + pr * Math.sin(startAngle);
              const x2 = cx + pr * Math.cos(endAngle);
              const y2 = cy + pr * Math.sin(endAngle);
              const largeArc = sliceAngle > Math.PI ? 1 : 0;
              svg += `<path d="M${cx},${cy} L${x1},${y1} A${pr},${pr} 0 ${largeArc},1 ${x2},${y2} Z" fill="${color}" opacity="0.9"/>`;
              startAngle = endAngle;
            }
          }

          svg += `<circle cx="${cx}" cy="${cy}" r="${pr}" fill="none" stroke="white" stroke-width="2"/>`;
          svg += `<circle cx="${cx}" cy="${cy}" r="${pr * 0.55}" fill="white" opacity="0.95"/>`;
          svg += `<text x="${cx}" y="${cy}" text-anchor="middle" dominant-baseline="central" font-family="system-ui,sans-serif" font-weight="700" font-size="${size > 46 ? 14 : 12}" fill="#1c1917">${count}</text>`;
          svg += `</svg>`;

          return new google.maps.Marker({
            position,
            icon: {
              url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
              scaledSize: new google.maps.Size(size, size),
              anchor: new google.maps.Point(r, r),
            },
            zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
          });
        },
      },
    });

    return () => {
      if (clustererRef.current) {
        clustererRef.current.clearMarkers();
      }
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, places, onSelectPlace, isFavorite]);

  // Highlight selected marker by scaling it up
  useEffect(() => {
    markersRef.current.forEach((marker, idx) => {
      const place = places[idx];
      if (!place) return;
      if (place.isHomeHotel) return; // home hotel stays as its golden star
      const isSelected = marker.getTitle() === selectedPlace?.name;
      const fav = isFavorite?.(place.category, place.id) ?? false;
      const meta = CATEGORIES[place.category];
      const color = isSelected ? "#f59e0b" : place.isTopPick ? "#f59e0b" : meta.color;
      const stroke = fav ? "#f59e0b" : "#ffffff";
      const strokeW = fav || isSelected ? 2.5 : 2;
      const text = fav ? "♥" : meta.emoji;
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44">` +
        `<defs><filter id="s" x="-20%" y="-20%" width="140%" height="140%">` +
        `<feDropShadow dx="0" dy="1.2" stdDeviation="1.2" flood-color="#000" flood-opacity="0.25"/>` +
        `</filter></defs>` +
        `<path filter="url(#s)" d="M17 2 C8.7 2 2 8.7 2 17 C2 28 17 42 17 42 C17 42 32 28 32 17 C32 8.7 25.3 2 17 2 Z" ` +
        `fill="${color}" stroke="${stroke}" stroke-width="${strokeW}"/>` +
        `<circle cx="17" cy="17" r="9" fill="#ffffff"/>` +
        `<text x="17" y="17" text-anchor="middle" dominant-baseline="central" font-size="12" font-family="-apple-system, system-ui, sans-serif">${text}</text>` +
        `</svg>`;
      const size = isSelected ? 44 : 34;
      const height = isSelected ? 56 : 44;
      marker.setIcon({
        url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
        scaledSize: new google.maps.Size(size, height),
        anchor: new google.maps.Point(size / 2, height - 2),
      });
      marker.setZIndex(isSelected ? 9999 : fav ? 500 : 100);
    });
  }, [selectedPlace, places, isFavorite]);

  return null;
}

function FindHomeButton({ home }: { home?: Place }) {
  const map = useMap();
  if (!home) return null;
  const goHome = () => {
    if (!map) return;
    map.panTo({ lat: home.lat, lng: home.lng });
    map.setZoom(16);
  };
  return (
    <button
      onClick={goHome}
      className="fixed bottom-20 right-3 z-10 pl-3 pr-3.5 py-2 rounded-full bg-amber-500 text-white shadow-[0_4px_20px_rgba(245,158,11,0.4)] border border-amber-300 flex items-center gap-1.5 cursor-pointer hover:bg-amber-600 hover:shadow-[0_4px_24px_rgba(245,158,11,0.5)] transition-all text-[0.68rem] font-semibold"
      title={`Find ${home.name}`}
    >
      <span className="text-sm leading-none">★</span>
      Home
    </button>
  );
}

function UserLocationDot() {
  const map = useMap();
  const markerRef = useRef<google.maps.Marker | null>(null);
  const posRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!map || !navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const position = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        posRef.current = position;

        if (markerRef.current) {
          markerRef.current.setPosition(position);
        } else {
          markerRef.current = new google.maps.Marker({
            position,
            map,
            icon: {
              url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22">
                  <circle cx="11" cy="11" r="10" fill="rgba(66,133,244,0.2)"/>
                  <circle cx="11" cy="11" r="6" fill="#4285f4" stroke="white" stroke-width="2.5"/>
                </svg>`
              ),
              scaledSize: new google.maps.Size(22, 22),
              anchor: new google.maps.Point(11, 11),
            },
            zIndex: 999999,
            clickable: false,
          });
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000 }
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
      markerRef.current?.setMap(null);
    };
  }, [map]);

  const centerOnMe = () => {
    if (map && posRef.current) {
      map.panTo(posRef.current);
      map.setZoom(15);
    } else if (map) {
      // No position yet – ask permission
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const p = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          posRef.current = p;
          map.panTo(p);
          map.setZoom(15);
        },
        () => {},
        { enableHighAccuracy: true }
      );
    }
  };

  return (
    <button
      onClick={centerOnMe}
      className="fixed bottom-4 right-3 z-10 w-11 h-11 rounded-full bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-lg border border-stone-200/80 dark:border-stone-700 flex items-center justify-center cursor-pointer hover:bg-white transition-colors"
      title="Center on my location"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285f4" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" fill="#4285f4" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    </button>
  );
}

type MapMode = "clean" | "terrain" | "satellite";

interface MapTypeToggleProps {
  mode: MapMode;
  onChange: (mode: MapMode) => void;
}

function MapTypeToggle({ mode, onChange }: MapTypeToggleProps) {
  const modes: { id: MapMode; label: string; title: string }[] = [
    { id: "clean", label: "Map", title: "Minimal map" },
    { id: "terrain", label: "Terrain", title: "Streets & buildings" },
    { id: "satellite", label: "Satellite", title: "Aerial view" },
  ];

  return (
    <div className="fixed top-[74px] md:top-[80px] right-2 z-10 bg-white/95 dark:bg-stone-900/95 backdrop-blur-md shadow-lg rounded-full p-0.5 flex gap-0.5 border border-stone-200 dark:border-stone-700">
      {modes.map((m) => (
        <button
          key={m.id}
          onClick={() => onChange(m.id)}
          title={m.title}
          className={`px-2.5 py-1 rounded-full text-[0.6rem] font-semibold uppercase tracking-wide transition-colors cursor-pointer ${
            mode === m.id
              ? "bg-ink text-paper dark:bg-paper dark:text-ink"
              : "text-stone-500 hover:text-ink dark:text-stone-400 dark:hover:text-paper"
          }`}
        >
          {m.label}
        </button>
      ))}
    </div>
  );
}

function MapModeApplier({ mode }: { mode: MapMode }) {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    if (mode === "satellite") {
      map.setMapTypeId("hybrid");
      map.setTilt(45); // aerial 3D when zoomed in
    } else if (mode === "terrain") {
      // Google's native roadmap without custom styles shows real buildings,
      // roads and POIs. setTilt(45) gives 2.5D building footprints at z≥17.
      map.setMapTypeId("roadmap");
      map.setTilt(45);
    } else {
      map.setMapTypeId("roadmap");
      map.setTilt(0);
    }
  }, [map, mode]);
  return null;
}

function LoadingSpinner() {
  return (
    <div className="fixed top-[68px] md:top-[72px] left-0 right-0 bottom-0 flex items-center justify-center bg-paper z-10">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-stone-200 border-t-accent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-warm font-medium">Loading map...</p>
      </div>
    </div>
  );
}

const CLEAN_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#f7f3ee" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f7f3ee" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#8b847c" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  {
    featureType: "administrative.neighborhood",
    elementType: "labels.text.fill",
    stylers: [{ color: "#a8a29e" }],
  },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ece7e0" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#e5ddd2" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#d8cfc0" }] },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#b5aea4" }],
  },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#b9cdd9" }] },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#5d7382" }],
  },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#d9e4c8" }] },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#6b7a5a" }],
  },
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.attraction", elementType: "labels.text", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "transit.station", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
];

export default function MapComponent({ places, selectedPlace, onSelectPlace, isFavorite }: MapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const [mapMode, setMapMode] = useState<MapMode>("clean");
  const homeHotel = places.find((p) => p.isHomeHotel);

  if (!apiKey) {
    return (
      <div className="fixed top-[68px] md:top-[72px] left-0 right-0 bottom-0 flex items-center justify-center bg-stone-100">
        <div className="text-center p-8 bg-white rounded-xl shadow-lg max-w-md">
          <p className="text-lg font-semibold mb-2">Google Maps API key missing</p>
          <p className="text-sm text-warm">
            Add <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</code> to{" "}
            <code className="bg-stone-100 px-1.5 py-0.5 rounded text-xs">.env.local</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed top-[68px] md:top-[72px] left-0 right-0 bottom-0 z-0">
      <GoogleMap
        defaultCenter={PRAGUE_CENTER}
        defaultZoom={13}
        gestureHandling="greedy"
        disableDefaultUI={false}
        mapTypeControl={false}
        zoomControl={true}
        streetViewControl={false}
        fullscreenControl={true}
        className="w-full h-full"
        styles={mapMode === "clean" ? CLEAN_STYLES : undefined}
      >
        <MarkerLayer
          places={places}
          selectedPlace={selectedPlace}
          onSelectPlace={onSelectPlace}
          isFavorite={isFavorite}
        />
        <MapModeApplier mode={mapMode} />
        <UserLocationDot />
        <MapTypeToggle mode={mapMode} onChange={setMapMode} />
        <FindHomeButton home={homeHotel} />
      </GoogleMap>
    </div>
  );
}

export { LoadingSpinner };
