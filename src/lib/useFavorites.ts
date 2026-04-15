"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "prag-favorites";

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const ids = JSON.parse(stored) as string[];
        setFavorites(new Set(ids));
      }
    } catch {
      // Ignore parse errors
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...favorites]));
    }
  }, [favorites, loaded]);

  const toggleFavorite = useCallback((category: string, placeId: number) => {
    const key = `${category}-${placeId}`;
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (category: string, placeId: number) => {
      return favorites.has(`${category}-${placeId}`);
    },
    [favorites]
  );

  return {
    favorites,
    favoriteCount: favorites.size,
    toggleFavorite,
    isFavorite,
    loaded,
  };
}
