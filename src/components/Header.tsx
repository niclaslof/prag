"use client";

import Image from "next/image";
import { Category, CATEGORIES } from "@/lib/types";
import { WeatherChip } from "./Weather";

interface HeaderProps {
  activeCategories: Category[];
  favoriteCount: number;
  isDark: boolean;
  onToggleDark: () => void;
  onOpenMenu: () => void;
  query: string;
  onQueryChange: (q: string) => void;
  onOpenFilters: () => void;
  advancedFilterCount: number;
}

export default function Header({
  favoriteCount,
  isDark,
  onToggleDark,
  onOpenMenu,
  query,
  onQueryChange,
  onOpenFilters,
  advancedFilterCount,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-ink/95 text-paper backdrop-blur-md border-b border-white/5">
      <div className="flex items-center px-2 py-1.5 md:px-4 md:py-2 gap-2">
        {/* Tommy avatar → opens menu */}
        <button
          onClick={onOpenMenu}
          className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-amber-500/70 hover:ring-amber-400 transition-all cursor-pointer shrink-0"
          aria-label="Open menu"
        >
          <Image
            src="/icon-512.png"
            alt="Menu"
            width={32}
            height={32}
            className="w-full h-full object-cover"
            priority
          />
        </button>

        {/* Logo */}
        <h1 className="font-[family-name:var(--font-playfair)] text-sm md:text-base font-semibold tracking-tight shrink-0">
          <span>Walli</span>{" "}
          <span className="text-accent-light italic">Prag</span>
        </h1>

        {/* Search */}
        <input
          type="text"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search…"
          className="flex-1 min-w-0 px-2.5 py-1 rounded-full bg-white/10 border border-white/15 text-[0.7rem] text-paper placeholder:text-white/40 outline-none focus:bg-white/15 focus:border-white/30 transition-all"
        />

        {/* Weather */}
        <WeatherChip />

        {/* Favorites badge */}
        {favoriteCount > 0 && (
          <span className="text-[0.65rem] text-amber-400 font-semibold shrink-0">
            ♥{favoriteCount}
          </span>
        )}

        {/* Filters */}
        <button
          onClick={onOpenFilters}
          className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-[0.7rem] cursor-pointer transition-colors ${
            advancedFilterCount > 0
              ? "bg-accent text-white"
              : "bg-white/10 text-white/60 hover:bg-white/20"
          }`}
          title="Filters"
          aria-label="Open filters"
        >
          {advancedFilterCount > 0 ? advancedFilterCount : "⚙"}
        </button>

        {/* Dark toggle — compact */}
        <button
          onClick={onToggleDark}
          className="shrink-0 w-7 h-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-sm cursor-pointer transition-colors"
          title={isDark ? "Light mode" : "Dark mode"}
          aria-label="Toggle dark mode"
        >
          {isDark ? "☀" : "☾"}
        </button>
      </div>
    </header>
  );
}
