"use client";

import { Category, CATEGORIES } from "@/lib/types";

interface HeaderProps {
  placeCount: number;
  activeCategories: Category[];
  favoriteCount: number;
  isDark: boolean;
  onToggleDark: () => void;
}

export default function Header({
  placeCount,
  activeCategories,
  favoriteCount,
  isDark,
  onToggleDark,
}: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#1c1917] text-[#faf8f5]">
      <div className="flex items-center justify-between px-3 py-1.5 md:px-5 md:py-2">
        {/* Logo */}
        <h1 className="font-[family-name:var(--font-playfair)] text-base md:text-lg font-bold tracking-tight">
          Prag <span className="text-[#b91c1c]">&bull;</span> <span className="text-[#b45309]">Praha</span>
        </h1>

        {/* Right side */}
        <div className="flex items-center gap-2.5">
          {/* Category dots */}
          <div className="flex items-center gap-0.5">
            {activeCategories.map((cat) => (
              <div
                key={cat}
                className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full"
                style={{ backgroundColor: CATEGORIES[cat].color }}
              />
            ))}
          </div>
          {/* Favorites */}
          {favoriteCount > 0 && (
            <span className="text-[0.65rem] text-amber-400">♥{favoriteCount}</span>
          )}
          {/* Count */}
          <span className="text-[#b45309] text-sm md:text-base font-bold">{placeCount}</span>
          {/* Dark toggle */}
          <button
            onClick={onToggleDark}
            className="text-sm cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
            title={isDark ? "Light mode" : "Dark mode"}
          >
            {isDark ? "☀️" : "🌙"}
          </button>
        </div>
      </div>
    </header>
  );
}
