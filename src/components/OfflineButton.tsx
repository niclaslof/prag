"use client";

import { useState, useEffect, useCallback } from "react";
import { allPlaces } from "@/data/places";

type Status = "idle" | "downloading" | "done" | "error";

export default function OfflineButton() {
  const [status, setStatus] = useState<Status>("idle");
  const [cached, setCached] = useState(false);

  // Check if images are already cached
  useEffect(() => {
    if (!("caches" in window)) return;
    caches.open("walliprag-v2").then(async (cache) => {
      const first = await cache.match(`/images/places/${allPlaces[0]?.id}.jpg`);
      if (first) setCached(true);
    });
  }, []);

  // Listen for SW completion message
  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === "PRECACHE_DONE") {
        setStatus("done");
        setCached(true);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, []);

  const handleDownload = useCallback(async () => {
    if (!("serviceWorker" in navigator)) {
      setStatus("error");
      return;
    }
    const reg = await navigator.serviceWorker.ready;
    if (!reg.active) {
      setStatus("error");
      return;
    }

    setStatus("downloading");

    // Collect all image URLs
    const imageUrls = allPlaces.map((p) => `/images/places/${p.id}.jpg`);

    // Also prefetch the main page to cache all JS chunks
    try {
      await fetch("/", { cache: "reload" });
    } catch {
      // ok
    }

    // Ask the SW to cache all photos
    reg.active.postMessage({
      type: "PRECACHE_IMAGES",
      urls: imageUrls,
    });

    // Timeout fallback
    setTimeout(() => {
      setStatus((s) => (s === "downloading" ? "done" : s));
      setCached(true);
    }, 30000);
  }, []);

  if (status === "done" || cached) {
    return (
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 text-[0.72rem] text-green-800 dark:text-green-300">
        <span className="text-lg">✓</span>
        <div>
          <div className="font-semibold">Available offline</div>
          <div className="text-green-700/70 dark:text-green-400/60">
            {allPlaces.length} places with photos cached on this device.
            Map tiles need internet.
          </div>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={handleDownload}
      disabled={status === "downloading"}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 dark:bg-accent/20 border border-accent/30 text-accent hover:bg-accent/20 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-wait"
    >
      <span className="text-2xl shrink-0">
        {status === "downloading" ? (
          <span className="inline-block w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
        ) : (
          "📥"
        )}
      </span>
      <div className="text-left">
        <div className="text-sm font-semibold">
          {status === "downloading"
            ? "Downloading photos…"
            : "Download for offline"}
        </div>
        <div className="text-[0.68rem] text-warm">
          {status === "downloading"
            ? `Caching ${allPlaces.length} place photos (~23 MB)`
            : `Save all ${allPlaces.length} places + photos for offline use`}
        </div>
      </div>
    </button>
  );
}
