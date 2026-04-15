"use client";

import Image from "next/image";
import { Place, CATEGORIES, PRICE_SYMBOLS } from "@/lib/types";

interface PlacePanelProps {
  place: Place | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
}

function formatStars(rating?: number): string {
  if (!rating) return "";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return "★".repeat(full) + (half ? "½" : "");
}

function dayLabel(d: number): string {
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d];
}

export default function PlacePanel({
  place,
  onClose,
  isFavorite,
  onToggleFavorite,
}: PlacePanelProps) {
  if (!place) return null;

  const meta = CATEGORIES[place.category];
  const tagList = place.tags.split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <>
      {/* Overlay */}
      <div
        className={`fixed inset-0 bg-black/40 z-[60] transition-opacity duration-300 ${
          place ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`fixed right-0 top-0 bottom-0 w-[440px] max-w-[95vw] bg-panel z-[61] transition-transform duration-350 ease-out shadow-[-4px_0_24px_rgba(0,0,0,0.2)] overflow-y-auto ${
          place ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header with image */}
        <div
          className="relative h-56 flex items-center justify-center overflow-hidden"
          style={{
            background: `linear-gradient(135deg, ${meta.colorLight}, ${meta.color})`,
          }}
        >
          {place.photoUrl ? (
            <Image
              src={place.photoUrl}
              alt={place.name}
              width={440}
              height={224}
              className="w-full h-full object-cover"
              loading="lazy"
              unoptimized
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.classList.add("fallback-active");
              }}
            />
          ) : (
            <Image
              src={`/images/places/${place.id}.jpg`}
              alt={place.name}
              width={440}
              height={224}
              className="w-full h-full object-cover"
              loading="lazy"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
                (e.target as HTMLImageElement).parentElement!.classList.add("fallback-active");
              }}
            />
          )}
          <span className="absolute text-7xl pointer-events-none hidden [.fallback-active>&]:block">
            {meta.emoji}
          </span>

          {/* Favorite */}
          <button
            onClick={onToggleFavorite}
            className={`absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center transition-all cursor-pointer text-lg ${
              isFavorite
                ? "bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                : "bg-black/40 hover:bg-amber-500/80 text-white/80 hover:text-white"
            }`}
            aria-label="Save to favorites"
          >
            {isFavorite ? "♥" : "♡"}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="p-5 pb-8">
          {/* Tags row */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            <span
              className="text-[0.6rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full text-white"
              style={{ backgroundColor: meta.color }}
            >
              {meta.emoji} {meta.name}
            </span>
            {place.isTopPick && (
              <span className="text-[0.6rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                ⭐ Top pick
              </span>
            )}
            {place.isNew && (
              <span className="text-[0.6rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-new-bg text-new-text">
                New
              </span>
            )}
            <span className="text-[0.6rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-tag-bg text-tag-text">
              {place.district}
            </span>
            {tagList.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="text-[0.6rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-tag-bg text-tag-text"
              >
                {tag}
              </span>
            ))}
          </div>

          {/* Name */}
          <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-bold leading-tight mb-1">
            {place.name}
          </h2>
          <p className="text-sm text-accent font-medium mb-2">{place.tagline}</p>

          {/* Rating + price row */}
          <div className="flex items-center gap-3 text-sm mb-3">
            {place.rating !== undefined && (
              <span className="flex items-center gap-1">
                <span className="text-amber-500 font-bold">{formatStars(place.rating)}</span>
                <span className="font-semibold">{place.rating.toFixed(1)}</span>
                {place.userRatingsTotal !== undefined && (
                  <span className="text-warm text-xs">({place.userRatingsTotal.toLocaleString()})</span>
                )}
              </span>
            )}
            {place.priceLevel !== undefined && place.priceLevel > 0 && (
              <span className="text-green-700 font-semibold">
                {PRICE_SYMBOLS[place.priceLevel]}
              </span>
            )}
            {place.priceRange && (
              <span className="text-xs text-warm">{place.priceRange}</span>
            )}
          </div>

          {/* Description */}
          {(place.aiDescription || place.description) && (
            <p className="text-sm text-warm leading-relaxed mb-4">
              {place.aiDescription || place.description}
            </p>
          )}

          <div className="w-9 h-[3px] bg-accent rounded-full mb-4" />

          {/* Contact info */}
          <div className="flex flex-col gap-3 mb-5">
            <InfoRow icon="📍" label="Address" value={place.address} />
            {place.phone && (
              <InfoRow icon="📞" label="Phone" value={place.phone} href={`tel:${place.phone}`} />
            )}
            {place.website && (
              <InfoRow
                icon="🌐"
                label="Website"
                value={place.website.replace(/^https?:\/\//, "")}
                href={place.website.startsWith("http") ? place.website : `https://${place.website}`}
                external
              />
            )}
            {place.menuUrl && (
              <InfoRow
                icon="📋"
                label="Menu"
                value="View menu"
                href={place.menuUrl}
                external
              />
            )}

            {/* Hours */}
            {place.hours && place.hours.length > 0 && (
              <div className="flex gap-2 text-sm items-start">
                <span className="w-5 text-center shrink-0">🕐</span>
                <span className="text-warm font-semibold min-w-[52px]">Hours</span>
                <div className="flex-1">
                  {place.hours.map((h) => (
                    <div key={h.day} className="text-xs">
                      <span className="inline-block w-8 font-semibold">{dayLabel(h.day)}</span>
                      {h.open === "closed" ? (
                        <span className="text-warm">Closed</span>
                      ) : (
                        <span>{h.open}–{h.close}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {!place.hours && place.hoursText && (
              <InfoRow icon="🕐" label="Hours" value={place.hoursText} />
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}&destination_place_id=${place.placeId || ""}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-paper text-sm font-semibold hover:bg-accent transition-colors"
            >
              🧭 Directions
            </a>
            {place.website && (
              <a
                href={place.website.startsWith("http") ? place.website : `https://${place.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-100 text-ink text-sm font-semibold border border-stone-200 hover:border-accent hover:text-accent transition-colors"
              >
                🌐 Website
              </a>
            )}
            <a
              href={`/place/${place.category}/${place.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-100 text-ink text-sm font-semibold border border-stone-200 hover:border-accent hover:text-accent transition-colors"
            >
              🔗 Share
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

function InfoRow({
  icon,
  label,
  value,
  href,
  external,
}: {
  icon: string;
  label: string;
  value: string;
  href?: string;
  external?: boolean;
}) {
  return (
    <div className="flex gap-2 text-sm items-start">
      <span className="w-5 text-center shrink-0">{icon}</span>
      <span className="text-warm font-semibold min-w-[52px]">{label}</span>
      {href ? (
        <a
          href={href}
          target={external ? "_blank" : undefined}
          rel={external ? "noopener noreferrer" : undefined}
          className="text-accent hover:underline break-all"
        >
          {value}
        </a>
      ) : (
        <span className="text-ink break-words">{value}</span>
      )}
    </div>
  );
}
