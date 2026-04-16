"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";

const FOLDER_ID = process.env.NEXT_PUBLIC_ALBUM_FOLDER_ID || "";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface PhotoItem {
  id: string;
  name: string;
  thumbnailUrl: string;
  fullUrl: string;
  date: string;
  source: "drive" | "blob";
}

interface AlbumPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Compress image client-side before upload: max 1600px, JPEG 0.82 quality. */
async function compressImage(file: File): Promise<File> {
  if (file.size < 500_000) return file;
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 1600;
      let { width, height } = img;
      if (width > MAX || height > MAX) {
        const r = Math.min(MAX / width, MAX / height);
        width = Math.round(width * r);
        height = Math.round(height * r);
      }
      const c = document.createElement("canvas");
      c.width = width;
      c.height = height;
      c.getContext("2d")!.drawImage(img, 0, 0, width, height);
      c.toBlob(
        (blob) => {
          if (blob && blob.size < file.size) {
            resolve(new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" }));
          } else {
            resolve(file);
          }
        },
        "image/jpeg",
        0.82
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
}

export default function AlbumPanel({ isOpen, onClose }: AlbumPanelProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState("");
  const [showUploadSheet, setShowUploadSheet] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const fetchPhotos = useCallback(async () => {
    setLoading(true);
    setError(null);
    const all: PhotoItem[] = [];

    if (FOLDER_ID && API_KEY) {
      try {
        const q = encodeURIComponent(`'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`);
        const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&key=${API_KEY}&fields=files(id,name,createdTime)&orderBy=createdTime desc&pageSize=100`);
        if (res.ok) {
          for (const f of (await res.json()).files || []) {
            all.push({ id: `d-${f.id}`, name: f.name, thumbnailUrl: `https://lh3.googleusercontent.com/d/${f.id}=w400`, fullUrl: `https://lh3.googleusercontent.com/d/${f.id}=w1600`, date: f.createdTime, source: "drive" });
          }
        }
      } catch { /* ok */ }
    }

    try {
      const res = await fetch("/api/album");
      if (res.ok) {
        for (const p of (await res.json()).photos || []) {
          all.push({ id: `b-${p.url}`, name: p.name, thumbnailUrl: p.url, fullUrl: p.url, date: p.uploadedAt, source: "blob" });
        }
      }
    } catch { /* ok */ }

    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setPhotos(all);
    setLoading(false);
  }, []);

  useEffect(() => { if (isOpen && photos.length === 0) fetchPhotos(); }, [isOpen, photos.length, fetchPhotos]);

  const uploadFiles = async (files: FileList | File[]) => {
    setShowUploadSheet(false);
    setUploading(true);
    setError(null);
    const arr = Array.from(files);
    let uploaded = 0, lastErr = "";

    for (const file of arr) {
      try {
        setUploadProgress(`Compressing ${uploaded + 1}/${arr.length}…`);
        const compressed = await compressImage(file);
        setUploadProgress(`Uploading ${uploaded + 1}/${arr.length}…`);
        const fd = new FormData();
        fd.append("file", compressed);
        const res = await fetch("/api/album", { method: "POST", body: fd });
        if (res.ok) uploaded++;
        else lastErr = `Upload failed: ${res.status} ${(await res.text()).slice(0, 100)}`;
      } catch (e) {
        lastErr = `Error: ${e instanceof Error ? e.message : String(e)}`;
      }
    }

    setUploading(false);
    setUploadProgress("");
    if (uploaded === 0 && lastErr) setError(lastErr);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (uploaded > 0) { setPhotos([]); fetchPhotos(); }
  };

  // Lightbox navigation
  const goNext = useCallback(() => setLightboxIdx((i) => i !== null && i < photos.length - 1 ? i + 1 : i), [photos.length]);
  const goPrev = useCallback(() => setLightboxIdx((i) => i !== null && i > 0 ? i - 1 : i), []);

  const handleTouchStart = (e: React.TouchEvent) => { touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY }; };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const dx = e.changedTouches[0].clientX - touchStartRef.current.x;
    const dy = e.changedTouches[0].clientY - touchStartRef.current.y;
    touchStartRef.current = null;
    if (Math.abs(dx) < 50 || Math.abs(dy) > Math.abs(dx)) return;
    if (dx < 0) goNext(); else goPrev();
  };

  useEffect(() => {
    if (lightboxIdx === null) return;
    const h = (e: KeyboardEvent) => { if (e.key === "ArrowRight") goNext(); else if (e.key === "ArrowLeft") goPrev(); else if (e.key === "Escape") setLightboxIdx(null); };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [lightboxIdx, goNext, goPrev]);

  const cur = lightboxIdx !== null ? photos[lightboxIdx] : null;

  return (
    <>
      <div className={`fixed inset-0 bg-black/50 z-[75] transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`} onClick={onClose} />

      <aside className={`fixed right-0 top-0 bottom-0 w-[520px] max-w-full bg-panel z-[76] shadow-2xl transition-transform duration-350 ease-out overflow-y-auto ${isOpen ? "translate-x-0" : "translate-x-full"}`} style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        {/* Header */}
        <div className="sticky top-0 z-10 bg-ink text-paper px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-warm mb-1">Shared photo album</p>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold">Walli Prag Album</h2>
            <p className="text-[0.68rem] text-warm mt-0.5">{photos.length > 0 ? `${photos.length} photo${photos.length === 1 ? "" : "s"} · ~500 max` : "Upload your trip photos!"}</p>
          </div>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg cursor-pointer">✕</button>
        </div>

        <div className="px-5 pb-24 pt-4">
          {uploading && (
            <div className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl bg-accent/10 border border-accent/30">
              <div className="w-5 h-5 border-2 border-accent/30 border-t-accent rounded-full animate-spin shrink-0" />
              <span className="text-sm text-accent font-medium">{uploadProgress}</span>
            </div>
          )}

          {loading && <div className="flex items-center gap-3 py-8 text-warm text-sm"><div className="w-5 h-5 border-2 border-stone-300 border-t-accent rounded-full animate-spin" />Loading album…</div>}
          {error && !loading && <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 text-[0.75rem] text-red-700 dark:text-red-300">{error}</div>}
          {!loading && !error && photos.length === 0 && !uploading && (
            <div className="text-center py-12 text-warm">
              <span className="text-5xl block mb-3">📸</span>
              <p className="text-sm font-semibold mb-1">No photos yet</p>
              <p className="text-[0.72rem]">Tap <span className="text-accent font-bold">+</span> to take a photo or upload!</p>
            </div>
          )}

          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {photos.map((photo, idx) => (
                <button key={photo.id} onClick={() => setLightboxIdx(idx)} className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 cursor-pointer hover:opacity-90 transition-opacity group">
                  <Image src={photo.thumbnailUrl} alt={photo.name} width={400} height={400} className="w-full h-full object-cover" unoptimized />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[0.6rem] text-white truncate">{photo.name}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {photos.length > 0 && (
            <button onClick={() => { setPhotos([]); fetchPhotos(); }} className="mt-4 w-full py-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-sm text-warm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer">
              Refresh album
            </button>
          )}
        </div>

        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={(e) => e.target.files && uploadFiles(e.target.files)} />
        <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => e.target.files && uploadFiles(e.target.files)} />

        <button onClick={() => setShowUploadSheet(true)} disabled={uploading} className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-accent shadow-[0_6px_24px_rgba(180,83,9,0.5)] text-white text-3xl font-light flex items-center justify-center cursor-pointer hover:bg-accent-light hover:scale-105 active:scale-95 transition-all z-[78] disabled:opacity-60" style={{ bottom: "calc(24px + env(safe-area-inset-bottom))" }}>+</button>

        {showUploadSheet && (
          <div className="fixed inset-0 z-[79] bg-black/40" onClick={() => setShowUploadSheet(false)}>
            <div className="absolute bottom-0 left-0 right-0 bg-panel dark:bg-stone-900 rounded-t-3xl shadow-2xl p-6" style={{ paddingBottom: "calc(24px + env(safe-area-inset-bottom))" }} onClick={(e) => e.stopPropagation()}>
              <div className="w-10 h-1 rounded-full bg-stone-300 dark:bg-stone-700 mx-auto mb-5" />
              <h3 className="font-[family-name:var(--font-playfair)] text-lg font-bold text-ink mb-1">Add photos</h3>
              <p className="text-[0.72rem] text-warm mb-5">Auto-compressed to save space. Shared with everyone.</p>
              <div className="space-y-2.5">
                <button onClick={() => { setShowUploadSheet(false); cameraInputRef.current?.click(); }} className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl bg-accent text-white hover:bg-accent-light transition-colors cursor-pointer">
                  <span className="w-11 h-11 rounded-full bg-white/20 flex items-center justify-center text-xl shrink-0">📷</span>
                  <div className="text-left"><div className="text-sm font-semibold">Take a photo</div><div className="text-[0.68rem] text-white/80">Opens camera — snap and upload</div></div>
                </button>
                <button onClick={() => { setShowUploadSheet(false); fileInputRef.current?.click(); }} className="flex items-center gap-4 w-full px-4 py-3.5 rounded-xl bg-stone-100 dark:bg-stone-800 text-ink hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer">
                  <span className="w-11 h-11 rounded-full bg-stone-200 dark:bg-stone-700 flex items-center justify-center text-xl shrink-0">🖼️</span>
                  <div className="text-left"><div className="text-sm font-semibold">Choose from gallery</div><div className="text-[0.68rem] text-warm">Pick multiple photos at once</div></div>
                </button>
              </div>
              <button onClick={() => setShowUploadSheet(false)} className="w-full mt-4 py-2.5 rounded-xl text-sm text-warm font-medium hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors cursor-pointer">Cancel</button>
            </div>
          </div>
        )}
      </aside>

      {/* Fullscreen swipe lightbox */}
      {cur && (
        <div className="fixed inset-0 z-[80] bg-black flex items-center justify-center select-none" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          <button onClick={() => setLightboxIdx(null)} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl cursor-pointer z-10">✕</button>
          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium tabular-nums z-10">{lightboxIdx! + 1} / {photos.length}</div>
          {lightboxIdx! > 0 && <button onClick={(e) => { e.stopPropagation(); goPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center cursor-pointer z-10">‹</button>}
          {lightboxIdx! < photos.length - 1 && <button onClick={(e) => { e.stopPropagation(); goNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center cursor-pointer z-10">›</button>}
          <Image key={cur.id} src={cur.fullUrl} alt={cur.name} width={1600} height={1200} className="max-w-[95vw] max-h-[85vh] object-contain" unoptimized />
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-white/80 text-sm truncate">{cur.name}</p>
            <p className="text-white/50 text-[0.65rem]">{new Date(cur.date).toLocaleDateString("sv-SE")}</p>
          </div>
          {photos.length <= 20 && (
            <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex gap-1.5">
              {photos.map((_, i) => <button key={i} onClick={() => setLightboxIdx(i)} className={`rounded-full transition-all cursor-pointer ${i === lightboxIdx ? "w-6 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"}`} />)}
            </div>
          )}
        </div>
      )}
    </>
  );
}
