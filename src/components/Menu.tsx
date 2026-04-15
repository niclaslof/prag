"use client";

import { ReactNode } from "react";

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenList: () => void;
  onOpenTransport: () => void;
  onOpenRoute: () => void;
  onOpenFilters: () => void;
  placeCount: number;
  favoriteCount: number;
  homeHotelName?: string;
}

interface MenuItem {
  icon: ReactNode;
  label: string;
  description: string;
  onClick: () => void;
  badge?: string;
  accent?: boolean;
}

export default function Menu({
  isOpen,
  onClose,
  onOpenList,
  onOpenTransport,
  onOpenRoute,
  onOpenFilters,
  placeCount,
  favoriteCount,
  homeHotelName,
}: MenuProps) {
  const items: MenuItem[] = [
    {
      icon: <span className="text-lg">✈</span>,
      label: "Transport",
      description: homeHotelName
        ? `Airport → ${homeHotelName}`
        : "Live transit from PRG airport",
      onClick: () => {
        onOpenTransport();
        onClose();
      },
      accent: true,
    },
    {
      icon: <span className="text-lg">☰</span>,
      label: "All places",
      description: `${placeCount} spots on the map`,
      onClick: () => {
        onOpenList();
        onClose();
      },
    },
    {
      icon: <span className="text-lg">⚙</span>,
      label: "Filters",
      description: "Category, price, rating, district",
      onClick: () => {
        onOpenFilters();
        onClose();
      },
    },
    {
      icon: <span className="text-lg">♥</span>,
      label: "Favorites & route",
      description: favoriteCount > 0 ? `${favoriteCount} saved` : "Save places to plan a walk",
      onClick: () => {
        onOpenRoute();
        onClose();
      },
      badge: favoriteCount > 0 ? String(favoriteCount) : undefined,
    },
  ];

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[70] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed left-0 top-0 bottom-0 w-[320px] max-w-[88vw] bg-panel z-[71] shadow-2xl transition-transform duration-300 ease-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-200 dark:border-stone-800">
          <div>
            <h2 className="font-[family-name:var(--font-playfair)] text-lg font-semibold text-ink">
              Walli <span className="italic text-accent-light">Prag</span>
            </h2>
            <p className="text-[0.65rem] text-warm uppercase tracking-wider mt-0.5">
              Your Prague city guide
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center justify-center text-lg text-warm cursor-pointer transition-colors"
            aria-label="Close menu"
          >
            ✕
          </button>
        </div>

        <nav className="py-2">
          {items.map((item) => (
            <button
              key={item.label}
              onClick={item.onClick}
              className="w-full text-left px-5 py-3.5 flex items-center gap-4 hover:bg-tag-bg transition-colors cursor-pointer group"
            >
              <span
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                  item.accent
                    ? "bg-accent/10 text-accent group-hover:bg-accent group-hover:text-white"
                    : "bg-stone-100 dark:bg-stone-800 text-warm group-hover:bg-stone-200 dark:group-hover:bg-stone-700"
                }`}
              >
                {item.icon}
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {item.label}
                </span>
                <span className="block text-[0.7rem] text-warm truncate">
                  {item.description}
                </span>
              </span>
              {item.badge && (
                <span className="shrink-0 px-2 py-0.5 rounded-full bg-amber-500 text-white text-[0.6rem] font-bold">
                  {item.badge}
                </span>
              )}
              <span className="text-warm text-sm">›</span>
            </button>
          ))}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 px-5 py-4 border-t border-stone-200 dark:border-stone-800 text-[0.65rem] text-warm">
          <p className="leading-relaxed">
            Data: curated + Google Places.<br />
            Built with Next.js · Tailwind · Google Maps.
          </p>
        </div>
      </aside>
    </>
  );
}
