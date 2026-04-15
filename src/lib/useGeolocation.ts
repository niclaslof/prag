"use client";

import { useState, useCallback } from "react";

interface GeoPosition {
  lat: number;
  lng: number;
}

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setError("Geolocation stöds inte av din webbläsare");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoading(false);
      },
      (err) => {
        setError("Kunde inte hämta din position");
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  return { position, loading, error, requestPosition };
}

export function distanceFromUser(
  userLat: number,
  userLng: number,
  artistLat: number,
  artistLng: number
): number {
  const R = 6371;
  const dLat = ((artistLat - userLat) * Math.PI) / 180;
  const dLng = ((artistLng - userLng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((userLat * Math.PI) / 180) *
      Math.cos((artistLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
