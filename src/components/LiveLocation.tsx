"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useMap } from "@vis.gl/react-google-maps";

interface Person {
  name: string;
  lat: number;
  lng: number;
  updatedAt: string;
  stale: boolean;
}

const COLORS = ["#e11d48", "#2563eb", "#16a34a", "#9333ea", "#ea580c", "#0891b2", "#c026d3", "#65a30d"];

function colorForName(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

function makePeopleSvg(name: string, color: string): string {
  const initial = name.charAt(0).toUpperCase();
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">` +
    `<defs><filter id="ps" x="-30%" y="-30%" width="160%" height="160%">` +
    `<feDropShadow dx="0" dy="1.5" stdDeviation="2" flood-color="${color}" flood-opacity="0.5"/>` +
    `</filter></defs>` +
    `<circle filter="url(#ps)" cx="20" cy="20" r="16" fill="${color}" stroke="white" stroke-width="3"/>` +
    `<text x="20" y="20" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="700" font-family="system-ui" fill="white">${initial}</text>` +
    `<polygon points="20,50 14,30 26,30" fill="${color}"/>` +
    `</svg>`
  );
}

/** Renders other people's live locations on the map. */
export function PeopleLayer() {
  const map = useMap();
  const markersRef = useRef<google.maps.Marker[]>([]);
  const [people, setPeople] = useState<Person[]>([]);

  // Poll every 15 seconds
  useEffect(() => {
    let cancelled = false;
    const poll = async () => {
      try {
        const res = await fetch("/api/location");
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setPeople(data.people || []);
        }
      } catch { /* ok */ }
    };
    poll();
    const id = setInterval(poll, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  // Render markers
  useEffect(() => {
    if (!map) return;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    const myName = typeof window !== "undefined" ? localStorage.getItem("walliprag-name") || "" : "";

    people.forEach((p) => {
      const isMe = myName && p.name.toLowerCase() === myName.toLowerCase();
      const color = isMe ? "#16a34a" : colorForName(p.name);
      const svg = makePeopleSvg(p.name, color);
      const marker = new google.maps.Marker({
        position: { lat: p.lat, lng: p.lng },
        map,
        icon: {
          url: "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(svg),
          scaledSize: new google.maps.Size(40, 50),
          anchor: new google.maps.Point(20, 50),
        },
        title: `${isMe ? "You" : p.name} — ${new Date(p.updatedAt).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" })}`,
        zIndex: 60000,
        opacity: p.stale ? 0.5 : 1,
      });
      markersRef.current.push(marker);
    });

    return () => {
      markersRef.current.forEach((m) => m.setMap(null));
      markersRef.current = [];
    };
  }, [map, people]);

  return null;
}

/** Toggle button + sharing logic. */
export function LocationSharingToggle() {
  const [sharing, setSharing] = useState(false);
  const [name, setName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("walliprag-name") || "" : ""
  );
  const [showSetup, setShowSetup] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startSharing = useCallback(() => {
    if (!name.trim()) { setShowSetup(true); return; }
    localStorage.setItem("walliprag-name", name.trim());
    setSharing(true);

    const send = () => {
      if (!navigator.geolocation) return;
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: name.trim(),
              lat: Math.round(pos.coords.latitude * 100000) / 100000,
              lng: Math.round(pos.coords.longitude * 100000) / 100000,
            }),
          }).catch(() => {});
        },
        () => {},
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 10000 }
      );
    };

    send(); // immediately
    intervalRef.current = setInterval(send, 30000); // every 30s
  }, [name]);

  const stopSharing = useCallback(() => {
    setSharing(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (name.trim()) {
      fetch("/api/location", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      }).catch(() => {});
    }
  }, [name]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <>
      <button
        onClick={() => sharing ? stopSharing() : (name.trim() ? startSharing() : setShowSetup(true))}
        className={`fixed left-3 z-10 px-3 py-2 rounded-full shadow-lg border flex items-center gap-1.5 cursor-pointer transition-all text-[0.65rem] font-semibold ${
          sharing
            ? "bg-green-500 text-white border-green-400 shadow-[0_4px_16px_rgba(22,163,74,0.4)] animate-pulse"
            : "bg-white dark:bg-stone-900 text-stone-600 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800"
        }`}
        style={{ bottom: "calc(188px + env(safe-area-inset-bottom))" }}
        title={sharing ? "Stop sharing location" : "Share your location with the group"}
      >
        <span className="text-sm">{sharing ? "📍" : "👥"}</span>
        {sharing ? "Live" : "Share"}
      </button>

      {/* Name setup sheet */}
      {showSetup && (
        <div className="fixed inset-0 z-[85] bg-black/50 flex items-end justify-center" onClick={() => setShowSetup(false)}>
          <div
            className="bg-panel dark:bg-stone-900 rounded-t-3xl shadow-2xl p-6 w-full max-w-md"
            style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mb-5" />
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-ink mb-1">
              Share your location
            </h3>
            <p className="text-[0.72rem] text-warm mb-4">
              Others in the group will see where you are on the map. Your name appears as a pin. You can stop at any time.
            </p>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name (e.g. Tommy)"
              className="w-full px-4 py-2.5 rounded-xl border border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-800 text-ink text-sm outline-none focus:border-accent mb-3"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && name.trim()) {
                  setShowSetup(false);
                  startSharing();
                }
              }}
            />
            <button
              onClick={() => {
                if (name.trim()) {
                  setShowSetup(false);
                  startSharing();
                }
              }}
              disabled={!name.trim()}
              className="w-full py-2.5 rounded-xl bg-accent text-white text-sm font-semibold hover:bg-accent-light transition-colors cursor-pointer disabled:opacity-40"
            >
              Start sharing
            </button>
            <button
              onClick={() => setShowSetup(false)}
              className="w-full mt-2 py-2 text-sm text-warm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </>
  );
}
