"use client";

import { useEffect, useState } from "react";

// Open-Meteo — free, no API key, no attribution required for non-commercial use.
// https://open-meteo.com/en/docs
const PRAGUE_LAT = 50.0875;
const PRAGUE_LNG = 14.4213;

interface Forecast {
  currentTemp: number;
  currentWeatherCode: number;
  currentIsDay: boolean;
  daily: {
    date: string;
    weatherCode: number;
    tempMax: number;
    tempMin: number;
  }[];
}

/** Translate WMO weather codes to emoji + short label. */
function weatherEmoji(code: number, isDay = true): { emoji: string; label: string } {
  if (code === 0) return { emoji: isDay ? "☀️" : "🌙", label: "Clear" };
  if (code === 1 || code === 2) return { emoji: isDay ? "🌤️" : "🌙", label: "Partly cloudy" };
  if (code === 3) return { emoji: "☁️", label: "Cloudy" };
  if (code === 45 || code === 48) return { emoji: "🌫️", label: "Fog" };
  if (code >= 51 && code <= 57) return { emoji: "🌦️", label: "Drizzle" };
  if (code >= 61 && code <= 67) return { emoji: "🌧️", label: "Rain" };
  if (code >= 71 && code <= 77) return { emoji: "🌨️", label: "Snow" };
  if (code >= 80 && code <= 82) return { emoji: "🌧️", label: "Showers" };
  if (code >= 85 && code <= 86) return { emoji: "🌨️", label: "Snow showers" };
  if (code >= 95) return { emoji: "⛈️", label: "Thunderstorm" };
  return { emoji: "🌡️", label: "–" };
}

export function useWeather() {
  const [data, setData] = useState<Forecast | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const url =
      `https://api.open-meteo.com/v1/forecast?latitude=${PRAGUE_LAT}&longitude=${PRAGUE_LNG}` +
      `&current=temperature_2m,weather_code,is_day` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min` +
      `&timezone=Europe%2FPrague&forecast_days=4`;

    fetch(url)
      .then((r) => (r.ok ? r.json() : Promise.reject(r.statusText)))
      .then((json) => {
        if (cancelled) return;
        setData({
          currentTemp: Math.round(json.current.temperature_2m),
          currentWeatherCode: json.current.weather_code,
          currentIsDay: json.current.is_day === 1,
          daily: (json.daily.time as string[]).map((date, i) => ({
            date,
            weatherCode: json.daily.weather_code[i],
            tempMax: Math.round(json.daily.temperature_2m_max[i]),
            tempMin: Math.round(json.daily.temperature_2m_min[i]),
          })),
        });
      })
      .catch((e) => {
        if (!cancelled) setError(String(e));
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { data, error };
}

/** Tiny header chip – just current temp + emoji. */
export function WeatherChip() {
  const { data } = useWeather();
  if (!data) return null;
  const { emoji } = weatherEmoji(data.currentWeatherCode, data.currentIsDay);
  return (
    <span
      className="hidden sm:inline-flex items-center gap-1 text-[0.7rem] font-medium text-paper/90"
      title="Prague weather"
    >
      <span>{emoji}</span>
      <span className="tabular-nums">{data.currentTemp}°</span>
    </span>
  );
}

/** Full card used inside the menu / info panel. */
export function WeatherCard() {
  const { data, error } = useWeather();

  if (error) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 text-[0.72rem] text-warm">
        Couldn&apos;t load weather.
      </div>
    );
  }
  if (!data) {
    return (
      <div className="rounded-xl border border-stone-200 dark:border-stone-800 p-4 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-stone-300 border-t-accent rounded-full animate-spin" />
        <span className="text-[0.72rem] text-warm">Loading weather…</span>
      </div>
    );
  }

  const current = weatherEmoji(data.currentWeatherCode, data.currentIsDay);

  return (
    <div className="rounded-xl bg-gradient-to-br from-stone-50 to-stone-100 dark:from-stone-800 dark:to-stone-900 border border-stone-200 dark:border-stone-800 p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[0.58rem] uppercase tracking-wider text-warm font-semibold">
            Prague now
          </p>
          <p className="font-[family-name:var(--font-playfair)] text-3xl font-bold text-ink leading-none mt-1">
            {data.currentTemp}°
          </p>
          <p className="text-[0.68rem] text-warm mt-0.5">{current.label}</p>
        </div>
        <div className="text-5xl" aria-hidden>
          {current.emoji}
        </div>
      </div>
      <div className="grid grid-cols-4 gap-1 text-center border-t border-stone-200 dark:border-stone-700 pt-3">
        {data.daily.map((d, i) => {
          const label =
            i === 0
              ? "Today"
              : new Date(d.date).toLocaleDateString("en-GB", { weekday: "short" });
          const { emoji } = weatherEmoji(d.weatherCode);
          return (
            <div key={d.date}>
              <div className="text-[0.58rem] uppercase text-warm font-semibold">
                {label}
              </div>
              <div className="text-lg">{emoji}</div>
              <div className="text-[0.62rem] tabular-nums text-ink">
                <span className="font-semibold">{d.tempMax}°</span>
                <span className="text-warm ml-1">{d.tempMin}°</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
