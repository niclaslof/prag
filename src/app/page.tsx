"use client";

import { useState, useMemo, useCallback } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import Header from "@/components/Header";
import SearchBar from "@/components/SearchBar";
import MapComponent, {
  type DirectionsMode,
  type DirectionsSummary,
} from "@/components/Map";
import PlacePanel from "@/components/PlacePanel";
import PlaceList from "@/components/PlaceList";
import RoutePlanner from "@/components/RoutePlanner";
import Menu from "@/components/Menu";
import TransportPanel from "@/components/TransportPanel";
import InfoPanel from "@/components/InfoPanel";
import AlbumPanel from "@/components/AlbumPanel";
import SplitPanel from "@/components/SplitPanel";
import BottomNav from "@/components/BottomNav";
import DirectionsBar from "@/components/DirectionsBar";
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
  const [kidFriendlyOnly, setKidFriendlyOnly] = useState(false);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [routeOpen, setRouteOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [transportOpen, setTransportOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [albumOpen, setAlbumOpen] = useState(false);
  const [splitOpen, setSplitOpen] = useState(false);
  const [focusFilters, setFocusFilters] = useState(0);

  // Interactive in-app directions
  const [directionsTarget, setDirectionsTarget] = useState<Place | null>(null);
  const [directionsMode, setDirectionsMode] = useState<DirectionsMode>("walking");
  const [directionsSummary, setDirectionsSummary] =
    useState<DirectionsSummary | null>(null);

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
    setKidFriendlyOnly(false);
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
      if (kidFriendlyOnly && !p.isKidFriendly) return false;

      return true;
    });
  }, [
    query,
    activeCategories,
    priceLevels,
    minRating,
    activeDistricts,
    openNowOnly,
    kidFriendlyOnly,
    showFavoritesOnly,
    isFavorite,
  ]);

  const favoritePlaces = allPlaces.filter((p) => isFavorite(p.category, p.id));
  const homeHotel = allPlaces.find((p) => p.isHomeHotel);

  // Memoised callback for the directions layer so Map doesn't re-mount.
  const handleDirectionsResult = useCallback(
    (summary: DirectionsSummary | null) => setDirectionsSummary(summary),
    []
  );

  const handleStartDirections = (place: Place) => {
    setDirectionsTarget(place);
    setDirectionsSummary(null); // reset until new summary arrives
  };

  const advancedFilterCount =
    priceLevels.length +
    (minRating > 0 ? 1 : 0) +
    activeDistricts.length +
    (openNowOnly ? 1 : 0) +
    (kidFriendlyOnly ? 1 : 0);

  return (
    <APIProvider apiKey={apiKey}>
      <Header
        activeCategories={activeCategories}
        favoriteCount={favoriteCount}
        isDark={isDark}
        onToggleDark={toggleDark}
        onOpenMenu={() => setMenuOpen(true)}
        query={query}
        onQueryChange={setQuery}
        onOpenFilters={() => setFocusFilters((n) => n + 1)}
        advancedFilterCount={advancedFilterCount}
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
        kidFriendlyOnly={kidFriendlyOnly}
        onToggleKidFriendly={() => setKidFriendlyOnly(!kidFriendlyOnly)}
        onClearFilters={handleClearFilters}
        forceOpenNonce={focusFilters}
      />

      <MapComponent
        places={filtered}
        selectedPlace={selectedPlace}
        onSelectPlace={setSelectedPlace}
        isFavorite={isFavorite}
        directionsTarget={directionsTarget}
        directionsMode={directionsMode}
        onDirectionsResult={handleDirectionsResult}
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
        onStartDirections={handleStartDirections}
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
        onOpenInfo={() => setInfoOpen(true)}
        placeCount={filtered.length}
        favoriteCount={favoriteCount}
        homeHotelName={homeHotel?.name}
      />

      <TransportPanel
        isOpen={transportOpen}
        onClose={() => setTransportOpen(false)}
        homeHotel={homeHotel}
      />

      <InfoPanel isOpen={infoOpen} onClose={() => setInfoOpen(false)} />

      <AlbumPanel isOpen={albumOpen} onClose={() => setAlbumOpen(false)} />

      <SplitPanel isOpen={splitOpen} onClose={() => setSplitOpen(false)} />

      <DirectionsBar
        target={directionsTarget}
        mode={directionsMode}
        onModeChange={setDirectionsMode}
        summary={directionsSummary}
        onClear={() => {
          setDirectionsTarget(null);
          setDirectionsSummary(null);
        }}
      />

      <BottomNav
        onOpenList={() => setListOpen(true)}
        onOpenTransport={() => setTransportOpen(true)}
        onOpenRoute={() => setRouteOpen(true)}
        onOpenSplit={() => setSplitOpen(true)}
        onOpenAlbum={() => setAlbumOpen(true)}
        onOpenMenu={() => setMenuOpen(true)}
        listCount={filtered.length}
        favoriteCount={favoriteCount}
      />
    </APIProvider>
  );
}
