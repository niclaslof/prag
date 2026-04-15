"use client";

import { useEffect, useRef, useState } from "react";
import { APIProvider, Map as GoogleMap, useMap } from "@vis.gl/react-google-maps";
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

    const markers = places.map((place) => {
      const meta = CATEGORIES[place.category];
      const pinColor = place.isTopPick ? "#f59e0b" : meta.color;
      const fav = isFavorite?.(place.category, place.id) ?? false;

      const marker = new google.maps.Marker({
        position: { lat: place.lat, lng: place.lng },
        title: place.name,
        label: {
          text: fav ? "♥" : meta.emoji,
          color: "#fff",
          fontWeight: "700",
          fontSize: "12px",
        },
        icon: {
          path: "M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z",
          fillColor: pinColor,
          fillOpacity: 1,
          strokeColor: fav ? "#f59e0b" : "#fff",
          strokeWeight: fav ? 3 : 2,
          scale: 1.6,
          anchor: new google.maps.Point(12, 22),
          labelOrigin: new google.maps.Point(12, 9),
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

  // Highlight selected marker
  useEffect(() => {
    markersRef.current.forEach((marker, idx) => {
      const place = places[idx];
      if (!place) return;
      const isSelected = marker.getTitle() === selectedPlace?.name;
      const fav = isFavorite?.(place.category, place.id) ?? false;
      const meta = CATEGORIES[place.category];
      const icon = marker.getIcon() as google.maps.Symbol;
      if (icon) {
        marker.setIcon({
          ...icon,
          fillColor: isSelected ? "#f59e0b" : place.isTopPick ? "#f59e0b" : meta.color,
          strokeColor: fav ? "#f59e0b" : "#fff",
          strokeWeight: fav ? 3 : 2,
          scale: isSelected ? 2.2 : fav ? 1.9 : 1.6,
        });
        marker.setLabel({
          text: fav ? "♥" : meta.emoji,
          color: "#fff",
          fontWeight: "700",
          fontSize: "12px",
        });
      }
    });
  }, [selectedPlace, places, isFavorite]);

  return null;
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
      className="fixed bottom-4 left-3 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm shadow-lg flex items-center justify-center cursor-pointer hover:bg-white transition-colors"
      title="Center on my location"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4285f4" strokeWidth="2.5" strokeLinecap="round">
        <circle cx="12" cy="12" r="3" fill="#4285f4" />
        <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
      </svg>
    </button>
  );
}

function MapTypeToggle() {
  const map = useMap();
  const [isSatellite, setIsSatellite] = useState(false);

  const toggle = () => {
    if (!map) return;
    const newType = isSatellite ? "roadmap" : "hybrid";
    map.setMapTypeId(newType);
    setIsSatellite(!isSatellite);
  };

  return (
    <button
      onClick={toggle}
      className="fixed top-[70px] md:top-[74px] right-2 z-10 px-2.5 py-1.5 rounded-full bg-white/90 backdrop-blur-sm shadow-md text-[0.65rem] font-medium cursor-pointer hover:bg-white transition-colors"
    >
      {isSatellite ? "Map" : "Satellite"}
    </button>
  );
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

export default function MapComponent({ places, selectedPlace, onSelectPlace, isFavorite }: MapProps) {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
  const [mapLoaded, setMapLoaded] = useState(false);

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
    <>
      {!mapLoaded && <LoadingSpinner />}
      <div className="fixed top-[68px] md:top-[72px] left-0 right-0 bottom-0 z-0">
        <APIProvider apiKey={apiKey} onLoad={() => setMapLoaded(true)}>
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
            styles={[
              { elementType: "geometry", stylers: [{ color: "#f5f0eb" }] },
              { elementType: "labels.text.stroke", stylers: [{ color: "#f5f0eb" }] },
              { elementType: "labels.text.fill", stylers: [{ color: "#78716c" }] },
              { featureType: "road", elementType: "geometry", stylers: [{ color: "#e7e5e4" }] },
              { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#d6d3d1" }] },
              { featureType: "water", elementType: "geometry", stylers: [{ color: "#c4d5e3" }] },
              { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#dde8d0" }] },
              { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
              { featureType: "transit.station", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            ]}
          >
            <MarkerLayer
              places={places}
              selectedPlace={selectedPlace}
              onSelectPlace={onSelectPlace}
              isFavorite={isFavorite}
            />
            <UserLocationDot />
            <MapTypeToggle />
          </GoogleMap>
        </APIProvider>
      </div>
    </>
  );
}
