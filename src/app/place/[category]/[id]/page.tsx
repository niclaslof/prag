import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { allPlaces } from "@/data/places";
import { CATEGORIES, PRICE_SYMBOLS, Category } from "@/lib/types";

interface Props {
  params: Promise<{ category: string; id: string }>;
}

export function generateStaticParams() {
  return allPlaces.map((p) => ({
    category: p.category,
    id: String(p.id),
  }));
}

export async function generateMetadata({ params }: Props) {
  const { category, id } = await params;
  const place = allPlaces.find(
    (p) => p.category === category && p.id === Number(id)
  );
  if (!place) return { title: "Not found — Prag" };

  const desc = place.aiDescription || place.description || `${place.name} — ${place.tagline}`;

  return {
    title: `${place.name} — Prag`,
    description: desc,
    openGraph: {
      title: `${place.name} — Prag`,
      description: desc,
    },
  };
}

function formatStars(rating?: number): string {
  if (!rating) return "";
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return "★".repeat(full) + (half ? "½" : "");
}

export default async function PlaceDetailPage({ params }: Props) {
  const { category, id } = await params;
  const place = allPlaces.find(
    (p) => p.category === category && p.id === Number(id)
  );

  if (!place) notFound();

  const meta = CATEGORIES[place.category as Category];
  const tagList = place.tags.split(",").map((t) => t.trim()).filter(Boolean);

  return (
    <div className="min-h-screen bg-paper">
      <div className="sticky top-0 z-10 bg-ink text-paper px-4 py-3 flex items-center gap-3">
        <Link href="/" className="text-warm hover:text-paper transition-colors">
          ← Back to map
        </Link>
        <span className="text-warm">|</span>
        <span className="font-[family-name:var(--font-playfair)] font-bold">
          Prag <span className="text-[#b45309]">· Praha</span>
        </span>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Image */}
        <div
          className="relative h-64 md:h-80 rounded-2xl overflow-hidden mb-6 flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${meta.colorLight}, ${meta.color})` }}
        >
          {place.photoUrl ? (
            <Image src={place.photoUrl} alt={place.name} fill className="object-cover" unoptimized />
          ) : (
            <span className="text-8xl">{meta.emoji}</span>
          )}
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <span
            className="text-[0.65rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full text-white"
            style={{ backgroundColor: meta.color }}
          >
            {meta.emoji} {meta.name}
          </span>
          <span className="text-[0.65rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-tag-bg text-tag-text">
            {place.district}
          </span>
          {place.isTopPick && (
            <span className="text-[0.65rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              ⭐ Top pick
            </span>
          )}
          {tagList.map((tag) => (
            <span
              key={tag}
              className="text-[0.65rem] font-semibold uppercase tracking-wide px-2.5 py-1 rounded-full bg-tag-bg text-tag-text"
            >
              {tag}
            </span>
          ))}
        </div>

        {/* Name */}
        <h1 className="font-[family-name:var(--font-playfair)] text-3xl md:text-4xl font-bold mb-2">
          {place.name}
        </h1>
        <p className="text-accent font-medium mb-4">{place.tagline}</p>

        {/* Rating + price */}
        <div className="flex items-center gap-3 text-sm mb-4">
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
            <span className="text-green-700 font-semibold">{PRICE_SYMBOLS[place.priceLevel]}</span>
          )}
          {place.priceRange && <span className="text-xs text-warm">{place.priceRange}</span>}
        </div>

        {(place.aiDescription || place.description) && (
          <p className="text-warm leading-relaxed mb-6 text-lg">
            {place.aiDescription || place.description}
          </p>
        )}

        <div className="w-12 h-[3px] bg-accent rounded-full mb-6" />

        {/* Contact */}
        <div className="grid gap-3 mb-8">
          <ContactRow icon="📍" label="Address" value={place.address} />
          {place.phone && (
            <ContactRow icon="📞" label="Phone" value={place.phone} href={`tel:${place.phone}`} />
          )}
          {place.website && (
            <ContactRow
              icon="🌐"
              label="Website"
              value={place.website.replace(/^https?:\/\//, "")}
              href={place.website.startsWith("http") ? place.website : `https://${place.website}`}
              external
            />
          )}
          {place.menuUrl && (
            <ContactRow icon="📋" label="Menu" value="View menu" href={place.menuUrl} external />
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${place.lat},${place.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-ink text-paper font-semibold hover:bg-accent transition-colors"
          >
            🧭 Directions
          </a>
          {place.website && (
            <a
              href={place.website.startsWith("http") ? place.website : `https://${place.website}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-stone-100 text-ink font-semibold border border-stone-200 hover:border-accent hover:text-accent transition-colors"
            >
              🌐 Website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

function ContactRow({
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
    <div className="flex gap-3 items-start">
      <span className="w-5 text-center shrink-0">{icon}</span>
      <span className="text-warm font-semibold min-w-[56px]">{label}</span>
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
        <span className="break-words">{value}</span>
      )}
    </div>
  );
}
