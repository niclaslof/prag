"use client";

interface BottomNavProps {
  onOpenList: () => void;
  onOpenTransport: () => void;
  onOpenRoute: () => void;
  onOpenInfo: () => void;
  onOpenAlbum: () => void;
  onOpenMenu: () => void;
  listCount: number;
  favoriteCount: number;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  badge?: string;
  accent?: boolean;
}

/** Mobile-first bottom navigation bar. Shows on both mobile and desktop; on
    desktop we keep it but shift it up a little – gives a single, always-visible
    entry point to every feature. */
export default function BottomNav({
  onOpenList,
  onOpenTransport,
  onOpenRoute,
  onOpenInfo,
  onOpenAlbum,
  onOpenMenu,
  listCount,
  favoriteCount,
}: BottomNavProps) {
  const items: NavItem[] = [
    {
      id: "list",
      label: "List",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="8" y1="6" x2="21" y2="6" />
          <line x1="8" y1="12" x2="21" y2="12" />
          <line x1="8" y1="18" x2="21" y2="18" />
          <circle cx="4" cy="6" r="1" fill="currentColor" />
          <circle cx="4" cy="12" r="1" fill="currentColor" />
          <circle cx="4" cy="18" r="1" fill="currentColor" />
        </svg>
      ),
      onClick: onOpenList,
      badge: String(listCount),
    },
    {
      id: "favorites",
      label: "Plan",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-5.5-7-11a4.5 4.5 0 0 1 8-3 4.5 4.5 0 0 1 8 3c0 5.5-7 11-7 11Z" />
        </svg>
      ),
      onClick: onOpenRoute,
      badge: favoriteCount > 0 ? String(favoriteCount) : undefined,
    },
    {
      id: "transport",
      label: "Transport",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2 L18 9 L15 9 L15 22 L9 22 L9 9 L6 9 Z" />
        </svg>
      ),
      onClick: onOpenTransport,
      accent: true,
    },
    {
      id: "album",
      label: "Album",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="m21 15-5-5L5 21" />
        </svg>
      ),
      onClick: onOpenAlbum,
    },
    {
      id: "menu",
      label: "Menu",
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="7" x2="20" y2="7" />
          <line x1="4" y1="12" x2="20" y2="12" />
          <line x1="4" y1="17" x2="20" y2="17" />
        </svg>
      ),
      onClick: onOpenMenu,
    },
  ];

  return (
    <nav
      className="fixed left-0 right-0 bottom-0 z-50 bg-paper/95 dark:bg-stone-950/95 backdrop-blur-md border-t border-stone-200 dark:border-stone-800"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Primary navigation"
    >
      <div className="max-w-2xl mx-auto flex items-stretch">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={item.onClick}
            className={`flex-1 relative flex flex-col items-center justify-center gap-0.5 py-2 cursor-pointer transition-colors active:scale-95 ${
              item.accent
                ? "text-accent hover:text-accent-light"
                : "text-warm hover:text-ink dark:hover:text-paper"
            }`}
            aria-label={item.label}
          >
            <div className="relative">
              {item.icon}
              {item.badge && (
                <span
                  className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[0.55rem] font-bold flex items-center justify-center tabular-nums ${
                    item.accent
                      ? "bg-accent text-white"
                      : "bg-ink text-paper dark:bg-paper dark:text-ink"
                  }`}
                >
                  {item.badge}
                </span>
              )}
            </div>
            <span className="text-[0.58rem] font-semibold uppercase tracking-wider">
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </nav>
  );
}
