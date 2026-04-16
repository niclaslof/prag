"use client";

import Image from "next/image";
import { useMemo, useState, useEffect } from "react";
import { Place, CATEGORIES, PRICE_SYMBOLS } from "@/lib/types";

interface PlacePanelProps {
  place: Place | null;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onStartDirections?: (place: Place) => void;
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
  onStartDirections,
}: PlacePanelProps) {
  const [slideIdx, setSlideIdx] = useState(0);
  // Reset slider whenever a new place is opened
  useEffect(() => {
    setSlideIdx(0);
  }, [place?.id, place?.category]);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  const slides = useMemo(() => {
    if (!place) return [] as { src: string; label: string; unoptimized?: boolean }[];
    const list: { src: string; label: string; unoptimized?: boolean }[] = [];
    if (place.photoUrl) {
      list.push({ src: place.photoUrl, label: "Photo", unoptimized: true });
    }
    // Try our local scraped image (written by scripts/enrich_places.py)
    list.push({ src: `/images/places/${place.id}.jpg`, label: "Photo" });
    // Street View via Static API
    if (apiKey) {
      const sv =
        `https://maps.googleapis.com/maps/api/streetview?size=880x480` +
        `&location=${place.lat},${place.lng}` +
        `&fov=80&pitch=5&source=outdoor&key=${apiKey}`;
      list.push({ src: sv, label: "Street View", unoptimized: true });
    }
    return list;
  }, [place, apiKey]);

  if (!place) return null;

  const meta = CATEGORIES[place.category];
  const tagList = place.tags.split(",").map((t) => t.trim()).filter(Boolean);

  const goPrev = () => setSlideIdx((i) => (i - 1 + slides.length) % slides.length);
  const goNext = () => setSlideIdx((i) => (i + 1) % slides.length);

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
        {/* Header carousel: Photo → Street View */}
        <div className="relative h-60 overflow-hidden bg-stone-100 dark:bg-stone-800 group">
          {/* Gradient fallback behind the image */}
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(160deg, #faf8f5 0%, ${meta.colorLight} 55%, ${meta.colorDark} 100%)`,
            }}
          />
          {slides.map((slide, idx) => (
            <div
              key={idx}
              className={`absolute inset-0 transition-opacity duration-300 ${
                idx === slideIdx ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              <Image
                src={slide.src}
                alt={`${place.name} – ${slide.label}`}
                width={880}
                height={480}
                className="w-full h-full object-cover"
                loading="lazy"
                unoptimized={slide.unoptimized}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).parentElement!.classList.add("fallback-active");
                }}
              />
              <div className="absolute inset-0 hidden [.fallback-active>&]:flex flex-col items-center justify-center text-white pointer-events-none">
                <span className="text-6xl drop-shadow-lg mb-2">{meta.emoji}</span>
                <span className="font-[family-name:var(--font-playfair)] text-xl font-semibold drop-shadow-md text-center px-6">
                  {place.name}
                </span>
                <span className="text-[0.65rem] uppercase tracking-[0.2em] mt-1 opacity-80">
                  {place.district}
                </span>
              </div>
            </div>
          ))}

          {/* Slide label */}
          {slides.length > 1 && (
            <span className="absolute bottom-3 left-3 z-10 px-2.5 py-1 rounded-full bg-black/50 backdrop-blur-sm text-white text-[0.6rem] font-medium uppercase tracking-wide">
              {slides[slideIdx]?.label}
            </span>
          )}

          {/* Carousel arrows */}
          {slides.length > 1 && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors cursor-pointer z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                onClick={goNext}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors cursor-pointer z-10 opacity-0 group-hover:opacity-100 focus:opacity-100"
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}

          {/* Carousel dots */}
          {slides.length > 1 && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setSlideIdx(idx)}
                  className={`h-1.5 rounded-full transition-all ${
                    idx === slideIdx ? "w-6 bg-white" : "w-1.5 bg-white/50"
                  }`}
                  aria-label={`Go to slide ${idx + 1}`}
                />
              ))}
            </div>
          )}

          {/* Gradient scrim so favorite/close buttons stay legible over any photo */}
          <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/50 to-transparent pointer-events-none" />

          {/* Favorite */}
          <button
            onClick={onToggleFavorite}
            className={`absolute top-3 left-3 w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-all cursor-pointer text-lg z-10 ${
              isFavorite
                ? "bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                : "bg-black/40 hover:bg-amber-500/80 text-white/90 hover:text-white"
            }`}
            aria-label="Save to favorites"
          >
            {isFavorite ? "♥" : "♡"}
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/40 hover:bg-black/70 backdrop-blur-sm text-white flex items-center justify-center transition-colors cursor-pointer z-10"
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
              <span className="text-[0.6rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300">
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
              <span className="text-green-700 dark:text-green-400 font-semibold">
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

          {/* Reviews */}
          {place.reviews && place.reviews.length > 0 && (
            <div className="mb-5">
              <h3 className="text-[0.62rem] uppercase tracking-[0.2em] text-warm font-bold mb-3">
                Reviews
              </h3>
              <div className="space-y-3">
                {place.reviews.map((r, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {r.authorPhoto && (
                        <img
                          src={r.authorPhoto}
                          alt=""
                          className="w-6 h-6 rounded-full object-cover"
                          loading="lazy"
                        />
                      )}
                      <span className="text-[0.72rem] font-semibold text-ink truncate">
                        {r.authorName}
                      </span>
                      <span className="ml-auto flex items-center gap-0.5 text-[0.65rem] shrink-0">
                        <span className="text-amber-500">{"★".repeat(r.rating)}</span>
                        <span className="text-stone-300 dark:text-stone-600">{"★".repeat(5 - r.rating)}</span>
                      </span>
                    </div>
                    <p className="text-[0.72rem] text-warm leading-relaxed line-clamp-4">
                      {r.text}
                    </p>
                    {r.relativeTime && (
                      <p className="text-[0.6rem] text-warm/60 mt-1.5">{r.relativeTime}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                if (onStartDirections && place) {
                  onStartDirections(place);
                  onClose();
                }
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-ink text-paper text-sm font-semibold hover:bg-accent transition-colors cursor-pointer"
            >
              🧭 Directions
            </button>
            {place.website && (
              <a
                href={place.website.startsWith("http") ? place.website : `https://${place.website}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-ink text-sm font-semibold border border-stone-200 dark:border-stone-700 hover:border-accent hover:text-accent transition-colors"
              >
                🌐 Website
              </a>
            )}
            <a
              href={`/place/${place.category}/${place.id}`}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-stone-100 dark:bg-stone-800 text-ink text-sm font-semibold border border-stone-200 dark:border-stone-700 hover:border-accent hover:text-accent transition-colors"
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
