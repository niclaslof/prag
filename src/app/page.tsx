"use client";

import { useState, useMemo } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import MapComponent from "@/components/Map";
import PlacePanel from "@/components/PlacePanel";
import PlaceList from "@/components/PlaceList";
import RoutePlanner from "@/components/RoutePlanner";
import Menu from "@/components/Menu";
import TransportPanel from "@/components/TransportPanel";
import { allPlaces } from "@/data/places";
import {
  Place,
  Category,
  PriceLevel,
  CATEGORY_FILTERS,
  District,
  DISTRICTS,
} from "@/lib/types";
import { useFavorites } from "@/lib/useFavorites";
import { useDarkMode } from "@/lib/useDarkMode";

const availableCategories = CATEGORY_FILTERS.filter((c) =>
  allPlaces.some((p) => p.category === c)
);
const availableDistricts = DISTRICTS.filter((d) =>
  allPlaces.some((p) => p.district === d)
);

/** Returns true if place is open now based on local time (Europe/Prague). */
function isOpenNow(place: Place): boolean {
  if (!place.hours || place.hours.length === 0) return true;
  const now = new Date();
  const day = now.getDay();
  const minutes = now.getHours() * 60 + now.getMinutes();
  const today = place.hours.find((h) => h.day === day);
  if (!today) return false;
  if (today.open === "closed") return false;
  if (today.open === "24h") return true;

  const toMin = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + (m || 0);
  };
  const openMin = toMin(today.open);
  const closeMin = toMin(today.close);
  if (closeMin <= openMin) {
    return minutes >= openMin || minutes <= closeMin;
  }
  return minutes >= openMin && minutes <= closeMin;
}

export default function Home() {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const [query, setQuery] = useState("");
  const [activeCategories, setActiveCategories] =
    useState<Category[]>(availableCategories);
  const [priceLevels, setPriceLevels] = useState<PriceLevel[]>([]);
  const [minRating, setMinRating] = useState(0);
  const [activeDistricts, setActiveDistricts] = useState<District[]>([]);
  const [openNowOnly, setOpenNowOnly] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [transportOpen, setTransportOpen] = useState(false);
  const [focusFilters, setFocusFilters] = useState(0);

  const { favoriteCount, toggleFavorite, isFavorite } = useFavorites();
  const { isDark, toggle: toggleDark } = useDarkMode();

  const handleCategoryToggle = (c: Category) => {
    setActiveCategories((prev) => {
      if (prev.includes(c)) {
        if (prev.length === 1) return prev;
        return prev.filter((x) => x !== c);
      }
      return [...prev, c];
    });
  };

  const handlePriceToggle = (p: PriceLevel) => {
    setPriceLevels((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    );
  };

  const handleDistrictToggle = (d: District) => {
    setActiveDistricts((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d]
    );
  };

  const handleClearFilters = () => {
    setPriceLevels([]);
    setMinRating(0);
    setActiveDistricts([]);
    setOpenNowOnly(false);
  };

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return allPlaces.filter((p) => {
      // Always keep the home hotel visible
      if (p.isHomeHotel) return true;
      if (showFavoritesOnly && !isFavorite(p.category, p.id)) return false;
      if (!activeCategories.includes(p.category)) return false;

      if (q) {
        const haystack = (
          p.name +
          " " +
          p.tagline +
          " " +
          p.tags +
          " " +
          p.district +
          " " +
          p.address
        ).toLowerCase();
        if (!haystack.includes(q)) return false;
      }

      if (
        priceLevels.length > 0 &&
        (p.priceLevel === undefined || !priceLevels.includes(p.priceLevel))
      ) {
        return false;
      }

      if (minRating > 0 && (p.rating === undefined || p.rating < minRating)) {
        return false;
      }

      if (
        activeDistricts.length > 0 &&
        !activeDistricts.includes(p.district as District)
      ) {
        return false;
      }

      if (openNowOnly && !isOpenNow(p)) return false;

      return true;
    });
  }, [
    query,
    activeCategories,
    priceLevels,
    minRating,
    activeDistricts,
    openNowOnly,
    showFavoritesOnly,
    isFavorite,
  ]);

  const favoritePlaces = allPlaces.filter((p) => isFavorite(p.category, p.id));
  const homeHotel = allPlaces.find((p) => p.isHomeHotel);

  return (
    <APIProvider apiKey={apiKey}>
      <Header
        placeCount={filtered.length}
        activeCategories={activeCategories}
        favoriteCount={favoriteCount}
        isDark={isDark}
        onToggleDark={toggleDark}
        onOpenMenu={() => setMenuOpen(true)}
      />
      <SearchBar
        query={query}
        onQueryChange={setQuery}
        activeCategories={activeCategories}
        onCategoryToggle={handleCategoryToggle}
        availableCategories={availableCategories}
        showFavoritesOnly={showFavoritesOnly}
        onToggleFavorites={() => setShowFavoritesOnly(!showFavoritesOnly)}
        favoriteCount={favoriteCount}
        priceLevels={priceLevels}
        onPriceToggle={handlePriceToggle}
        minRating={minRating}
        onMinRatingChange={setMinRating}
        activeDistricts={activeDistricts}
        onDistrictToggle={handleDistrictToggle}
        availableDistricts={availableDistricts}
        openNowOnly={openNowOnly}
        onToggleOpenNow={() => setOpenNowOnly(!openNowOnly)}
        onClearFilters={handleClearFilters}
        forceOpenNonce={focusFilters}
      />

      <MapComponent
        places={filtered}
        selectedPlace={selectedPlace}
        onSelectPlace={setSelectedPlace}
        isFavorite={isFavorite}
      />

      <PlacePanel
        place={selectedPlace}
        onClose={() => setSelectedPlace(null)}
        isFavorite={
          selectedPlace ? isFavorite(selectedPlace.category, selectedPlace.id) : false
        }
        onToggleFavorite={() => {
          if (selectedPlace) toggleFavorite(selectedPlace.category, selectedPlace.id);
        }}
      />

      <PlaceList
        places={filtered}
        isOpen={listOpen}
        onClose={() => setListOpen(false)}
        onSelect={setSelectedPlace}
        isFavorite={isFavorite}
        onToggleFavorite={toggleFavorite}
      />

      <RoutePlanner
        favorites={favoritePlaces}
        isOpen={routeOpen}
        onClose={() => setRouteOpen(false)}
        onSelectPlace={(p) => {
          setRouteOpen(false);
          setSelectedPlace(p);
        }}
      />

      <Menu
        isOpen={menuOpen}
        onClose={() => setMenuOpen(false)}
        onOpenList={() => setListOpen(true)}
        onOpenTransport={() => setTransportOpen(true)}
        onOpenRoute={() => setRouteOpen(true)}
        onOpenFilters={() => setFocusFilters((n) => n + 1)}
        placeCount={filtered.length}
        favoriteCount={favoriteCount}
        homeHotelName={homeHotel?.name}
      />

      <TransportPanel
        isOpen={transportOpen}
        onClose={() => setTransportOpen(false)}
        homeHotel={homeHotel}
      />

      {/* Bottom bar */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex gap-2 pointer-events-none">
        <button
          onClick={() => setListOpen(!listOpen)}
          className="pointer-events-auto px-5 py-2.5 rounded-full bg-ink/95 backdrop-blur-md text-paper text-xs font-medium shadow-xl border border-white/10 hover:bg-ink transition-all cursor-pointer"
        >
          List · {filtered.length}
        </button>
        {favoriteCount > 0 && (
          <button
            onClick={() => setRouteOpen(true)}
            className="pointer-events-auto px-5 py-2.5 rounded-full bg-accent/95 backdrop-blur-md text-paper text-xs font-medium shadow-xl border border-white/10 hover:bg-accent transition-all cursor-pointer"
          >
            Itinerary · ♥ {favoriteCount}
          </button>
        )}
      </div>
    </APIProvider>
  );
}
