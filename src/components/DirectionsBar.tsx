"use client";

import { useState } from "react";
import type { DirectionsMode, DirectionsSummary } from "./Map";
import { Place } from "@/lib/types";

interface Props {
  target: Place | null;
  mode: DirectionsMode;
  onModeChange: (mode: DirectionsMode) => void;
  summary: DirectionsSummary | null;
  onClear: () => void;
}

const MODE_OPTIONS: { id: DirectionsMode; label: string; icon: string }[] = [
  { id: "walking", label: "Walk", icon: "🚶" },
  { id: "transit", label: "Transit", icon: "🚇" },
  { id: "bicycling", label: "Bike", icon: "🚴" },
  { id: "driving", label: "Drive", icon: "🚗" },
];

function stepIcon(mode: string, vehicle?: string): string {
  if (mode === "WALKING") return "🚶";
  if (mode === "BICYCLING") return "🚴";
  if (mode === "DRIVING") return "🚗";
  const v = (vehicle || "").toLowerCase();
  if (v.includes("tram")) return "🚊";
  if (v.includes("bus")) return "🚌";
  if (v.includes("subway") || v.includes("metro")) return "🚇";
  if (v.includes("train") || v.includes("rail")) return "🚆";
  return "🚏";
}

export default function DirectionsBar({
  target,
  mode,
  onModeChange,
  summary,
  onClear,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  if (!target) return null;

  return (
    <div
      className="fixed left-1/2 -translate-x-1/2 bottom-[76px] md:bottom-[84px] z-[55] w-[min(96vw,560px)] rounded-2xl bg-panel dark:bg-stone-900 shadow-[0_20px_60px_rgba(0,0,0,0.3)] border border-stone-200 dark:border-stone-800 overflow-hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      {/* Summary row */}
      <div className="flex items-stretch">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="flex-1 flex items-center gap-3 px-4 py-3 text-left cursor-pointer hover:bg-tag-bg transition-colors"
          aria-expanded={expanded}
        >
          <span className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center shrink-0">
            🧭
          </span>
          <div className="flex-1 min-w-0">
            <div className="text-[0.65rem] uppercase tracking-wider text-warm">
              Directions
            </div>
            <div className="text-sm font-semibold text-ink truncate">
              {target.name}
            </div>
            {summary ? (
              <div className="text-[0.7rem] text-warm tabular-nums">
                {summary.totalDuration} · {summary.totalDistance}
                {summary.fare ? ` · ${summary.fare}` : ""}
              </div>
            ) : (
              <div className="text-[0.7rem] text-warm">Calculating…</div>
            )}
          </div>
          <span
            className={`text-warm text-lg shrink-0 transition-transform ${
              expanded ? "rotate-90" : ""
            }`}
          >
            ›
          </span>
        </button>
        <button
          onClick={onClear}
          aria-label="Clear directions"
          className="px-3 text-warm hover:text-ink hover:bg-stone-100 dark:hover:bg-stone-800 cursor-pointer border-l border-stone-200 dark:border-stone-800"
        >
          ✕
        </button>
      </div>

      {/* Mode selector */}
      <div className="px-2 py-2 border-t border-stone-200 dark:border-stone-800 flex gap-1 overflow-x-auto scrollbar-none">
        {MODE_OPTIONS.map((m) => (
          <button
            key={m.id}
            onClick={() => onModeChange(m.id)}
            className={`flex-1 min-w-[64px] px-2 py-1.5 rounded-full text-[0.65rem] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
              mode === m.id
                ? "bg-ink text-paper"
                : "bg-stone-100 dark:bg-stone-800 text-warm hover:bg-stone-200 dark:hover:bg-stone-700"
            }`}
          >
            <span className="mr-1">{m.icon}</span>
            {m.label}
          </button>
        ))}
      </div>

      {/* Steps (expanded) */}
      {expanded && (
        <div className="border-t border-stone-200 dark:border-stone-800 max-h-[45vh] overflow-y-auto px-4 py-3">
          {!summary && (
            <div className="flex items-center gap-2 py-4 text-warm text-sm">
              <div className="w-4 h-4 border-2 border-stone-300 border-t-accent rounded-full animate-spin" />
              Building step-by-step directions…
            </div>
          )}
          {summary && summary.steps.length > 0 && (
            <ol className="relative border-l-2 border-stone-200 dark:border-stone-800 ml-3 space-y-3">
              {summary.steps.map((s, i) => (
                <li key={i} className="pl-5 relative">
                  <span className="absolute -left-[13px] top-0 w-5 h-5 rounded-full bg-paper dark:bg-panel border-2 border-accent flex items-center justify-center text-[0.6rem]">
                    {stepIcon(s.mode, s.transitVehicle)}
                  </span>
                  {s.transitLine && (
                    <div className="mb-0.5">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-accent text-white text-[0.6rem] font-bold tabular-nums">
                        {s.transitLine}
                      </span>
                    </div>
                  )}
                  <div
                    className="text-[0.75rem] text-ink leading-snug"
                    dangerouslySetInnerHTML={{ __html: s.instructions }}
                  />
                  <div className="text-[0.65rem] text-warm mt-0.5">
                    {s.duration} {s.distance && `· ${s.distance}`}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
