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
}

export default function Header({
  activeCategories,
  favoriteCount,
  isDark,
  onToggleDark,
  onOpenMenu,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-ink/95 text-paper backdrop-blur-md border-b border-white/5">
      <div className="flex items-center justify-between px-2.5 py-1 md:px-5 md:py-1.5 gap-2">
        {/* Tommy avatar + Logo */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenMenu}
            className="relative w-9 h-9 rounded-full overflow-hidden ring-2 ring-amber-500/70 hover:ring-amber-400 transition-all cursor-pointer shrink-0 shadow-lg"
            aria-label="Open menu"
          >
            <Image
              src="/icon-512.png"
              alt="Tommy Wall"
              width={36}
              height={36}
              className="w-full h-full object-cover"
              priority
            />
          </button>
          <h1 className="font-[family-name:var(--font-playfair)] text-base md:text-lg font-semibold tracking-tight flex items-center gap-1.5">
            <span>Walli</span>
            <span className="text-accent-light italic">Prag</span>
          </h1>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          <WeatherChip />
          {/* Category dots */}
          <div className="hidden md:flex items-center gap-1">
            {activeCategories.map((cat) => (
              <div
                key={cat}
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: CATEGORIES[cat].color }}
              />
            ))}
          </div>
          {/* Favorites */}
          {favoriteCount > 0 && (
            <span className="text-[0.7rem] text-amber-400 font-medium">
              ♥ {favoriteCount}
            </span>
          )}
          {/* Dark toggle */}
          <button
            onClick={onToggleDark}
            className="relative w-11 h-6 rounded-full bg-stone-700/80 hover:bg-stone-600 border border-white/10 transition-colors cursor-pointer overflow-hidden shadow-inner"
            title={isDark ? "Light mode" : "Dark mode"}
            aria-label="Toggle dark mode"
            role="switch"
            aria-checked={isDark}
          >
            {/* Star dust – visible in dark state */}
            <span
              className={`absolute inset-0 transition-opacity duration-500 ${
                isDark ? "opacity-100" : "opacity-0"
              }`}
              aria-hidden
            >
              <span className="absolute top-1 left-1.5 w-0.5 h-0.5 rounded-full bg-white/80" />
              <span className="absolute top-2.5 left-3 w-[1px] h-[1px] rounded-full bg-white/70" />
              <span className="absolute top-1.5 left-4 w-[1px] h-[1px] rounded-full bg-white/60" />
            </span>
            {/* Knob */}
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full shadow-md transition-all duration-400 ease-out ${
                isDark
                  ? "translate-x-5 bg-gradient-to-br from-amber-200 to-amber-400"
                  : "translate-x-0 bg-gradient-to-br from-white to-stone-200"
              }`}
              aria-hidden
            >
              {/* Moon crater – slides in when dark, out of view otherwise */}
              <span
                className={`absolute top-1 left-1 w-2.5 h-2.5 rounded-full bg-stone-800 transition-transform duration-500 ${
                  isDark ? "translate-x-0" : "translate-x-4 opacity-0"
                }`}
              />
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
