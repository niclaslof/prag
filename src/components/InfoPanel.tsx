"use client";

import { WeatherCard } from "./Weather";

interface InfoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Phrase {
  cz: string;
  en: string;
  pron: string;
}

const PHRASES: Phrase[] = [
  { cz: "Dobrý den", en: "Hello (formal)", pron: "DOH-bree den" },
  { cz: "Děkuji", en: "Thank you", pron: "DYEH-koo-yih" },
  { cz: "Prosím", en: "Please / you're welcome", pron: "PROH-seem" },
  { cz: "Ano / Ne", en: "Yes / No", pron: "AH-no / neh" },
  { cz: "Na zdraví!", en: "Cheers!", pron: "nah ZDRAH-vee" },
  { cz: "Nemluvím česky", en: "I don't speak Czech", pron: "neh-MLOO-veem CHESS-kee" },
  { cz: "Zaplatím, prosím", en: "The bill, please", pron: "ZAH-plah-tyeem PROH-seem" },
  { cz: "Kde je toaleta?", en: "Where is the toilet?", pron: "gdeh yeh toh-ah-LEH-tah" },
  { cz: "Pomoc!", en: "Help!", pron: "POH-mots" },
];

const EMERGENCY = [
  { label: "Universal emergency", num: "112", note: "Works across EU, English-speaking operators" },
  { label: "Police", num: "158" },
  { label: "Ambulance", num: "155" },
  { label: "Fire brigade", num: "150" },
  { label: "Lost & found (Prague)", num: "+420 224 235 085" },
];

const TIPS = [
  {
    title: "💰 Currency & tipping",
    body:
      "Czech koruna (CZK, Kč). Most places take cards. Tipping 10% is polite in restaurants – round up in cafés and taxis. ATMs: avoid Euronet; prefer ČSOB, KB, Moneta, Air Bank.",
  },
  {
    title: "🎟️ Public transport tickets",
    body:
      "One unified PID ticket covers metro, tram, bus, funicular and the airport bus 119. 30 min: 30 CZK · 90 min: 40 CZK · 24 h: 120 CZK · 72 h: 330 CZK. Buy from yellow DPP machines, tobacco kiosks, or the PID Lítačka app. Validate only once when you first board.",
  },
  {
    title: "🚇 Metro quick guide",
    body:
      "Three lines: A (green) through the historic centre, B (yellow) east-west, C (red) north-south. Runs ~05:00–24:00. Watch out for the gap and mind the escalators – they're among the fastest in Europe.",
  },
  {
    title: "🍽️ Restaurant etiquette",
    body:
      "Bread, water and couvert (small nibbles) are usually not free – check the menu. Table service is slower than in Sweden or the US; wave the waiter over when you're ready to order or pay. Reservations recommended for dinner.",
  },
  {
    title: "🚰 Tap water",
    body:
      "Tap water is safe and good to drink everywhere. Restaurants will serve bottled by default – ask for 'voda z kohoutku' if you want tap.",
  },
  {
    title: "⚠️ Scams to avoid",
    body:
      "Unofficial taxis (use Bolt/Uber or the AAA/FIX ranks), currency exchange offices with 'zero commission' (they hide the bad rate), and people offering to change money on the street. On Charles Bridge keep an eye on pockets – it's where most pickpocketing happens.",
  },
];

export default function InfoPanel({ isOpen, onClose }: InfoPanelProps) {
  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-[75] transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <aside
        className={`fixed right-0 top-0 bottom-0 w-[460px] max-w-full bg-panel z-[76] shadow-2xl transition-transform duration-350 ease-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-ink text-paper px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-warm mb-1">
              Prague survival kit
            </p>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold leading-tight">
              Essentials & info
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg cursor-pointer transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* Weather */}
          <section>
            <h3 className="text-[0.62rem] uppercase tracking-[0.2em] text-warm font-bold mb-2">
              Weather
            </h3>
            <WeatherCard />
          </section>

          {/* Emergency */}
          <section>
            <h3 className="text-[0.62rem] uppercase tracking-[0.2em] text-warm font-bold mb-2">
              Emergency numbers
            </h3>
            <div className="rounded-xl border border-red-200 dark:border-red-900/40 bg-red-50 dark:bg-red-950/20 divide-y divide-red-200/60 dark:divide-red-900/40 overflow-hidden">
              {EMERGENCY.map((e) => (
                <a
                  key={e.label}
                  href={`tel:${e.num.replace(/\s/g, "")}`}
                  className="flex items-center justify-between px-4 py-2.5 hover:bg-red-100/50 dark:hover:bg-red-950/40 transition-colors"
                >
                  <div>
                    <div className="text-sm font-semibold text-red-800 dark:text-red-300">
                      {e.label}
                    </div>
                    {e.note && (
                      <div className="text-[0.65rem] text-red-700/80 dark:text-red-300/70">
                        {e.note}
                      </div>
                    )}
                  </div>
                  <div className="font-[family-name:var(--font-playfair)] text-lg font-bold text-red-700 dark:text-red-300 tabular-nums">
                    {e.num}
                  </div>
                </a>
              ))}
            </div>
          </section>

          {/* Travel tips */}
          <section>
            <h3 className="text-[0.62rem] uppercase tracking-[0.2em] text-warm font-bold mb-2">
              Travel tips
            </h3>
            <div className="space-y-2">
              {TIPS.map((t) => (
                <details
                  key={t.title}
                  className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden group"
                >
                  <summary className="px-4 py-3 cursor-pointer text-sm font-semibold text-ink flex items-center justify-between list-none">
                    <span>{t.title}</span>
                    <span className="text-warm text-lg group-open:rotate-90 transition-transform">
                      ›
                    </span>
                  </summary>
                  <p className="px-4 pb-4 text-[0.72rem] text-warm leading-relaxed">
                    {t.body}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Phrases */}
          <section>
            <h3 className="text-[0.62rem] uppercase tracking-[0.2em] text-warm font-bold mb-2">
              Czech phrases
            </h3>
            <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
              {PHRASES.map((p) => (
                <div key={p.cz} className="flex items-start justify-between gap-3 px-4 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-ink">{p.cz}</div>
                    <div className="text-[0.68rem] text-warm italic">
                      {p.pron}
                    </div>
                  </div>
                  <div className="text-[0.72rem] text-warm text-right shrink-0 max-w-[45%]">
                    {p.en}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </aside>
    </>
  );
}
