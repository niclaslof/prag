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
  fullResUrl: string; // original resolution for download
  date: string;
  source: "drive" | "blob";
}

interface AlbumPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

/** Extract GPS coordinates from JPEG EXIF data (returns null if not found). */
async function extractExifGPS(file: File): Promise<{ lat: number; lng: number } | null> {
  try {
    const buf = await file.slice(0, 128 * 1024).arrayBuffer(); // read first 128KB
    const view = new DataView(buf);
    if (view.getUint16(0) !== 0xFFD8) return null; // not JPEG

    let offset = 2;
    while (offset < view.byteLength - 4) {
      const marker = view.getUint16(offset);
      if (marker === 0xFFE1) { // APP1 = EXIF
        const len = view.getUint16(offset + 2);
        const exifData = new DataView(buf, offset + 4, len - 2);
        return parseExifGPS(exifData);
      }
      if ((marker & 0xFF00) !== 0xFF00) break;
      offset += 2 + view.getUint16(offset + 2);
    }
  } catch { /* ok */ }
  return null;
}

function parseExifGPS(data: DataView): { lat: number; lng: number } | null {
  try {
    // Check "Exif\0\0"
    if (data.getUint32(0) !== 0x45786966 || data.getUint16(4) !== 0) return null;
    const tiffOffset = 6;
    const le = data.getUint16(tiffOffset) === 0x4949; // little-endian?
    const g = (o: number, s: number) => s === 2 ? data.getUint16(tiffOffset + o, le) : data.getUint32(tiffOffset + o, le);

    // Find IFD0
    const ifd0Count = g(g(4, 4), 2);
    let gpsIFDOffset = 0;
    const ifd0Start = g(4, 4) + 2;
    for (let i = 0; i < ifd0Count; i++) {
      const entryOff = ifd0Start + i * 12;
      if (g(entryOff, 2) === 0x8825) { // GPSInfoIFDPointer
        gpsIFDOffset = g(entryOff + 8, 4);
        break;
      }
    }
    if (!gpsIFDOffset) return null;

    const gpsCount = g(gpsIFDOffset, 2);
    let latRef = "", lngRef = "";
    let latVals: number[] = [], lngVals: number[] = [];

    const rational = (off: number) => {
      const num = g(off, 4);
      const den = g(off + 4, 4);
      return den ? num / den : 0;
    };

    for (let i = 0; i < gpsCount; i++) {
      const e = gpsIFDOffset + 2 + i * 12;
      const tag = g(e, 2);
      const valOff = g(e + 8, 4);
      if (tag === 1) latRef = String.fromCharCode(data.getUint8(tiffOffset + e + 8));
      if (tag === 3) lngRef = String.fromCharCode(data.getUint8(tiffOffset + e + 8));
      if (tag === 2) latVals = [rational(valOff), rational(valOff + 8), rational(valOff + 16)];
      if (tag === 4) lngVals = [rational(valOff), rational(valOff + 8), rational(valOff + 16)];
    }

    if (latVals.length === 3 && lngVals.length === 3) {
      let lat = latVals[0] + latVals[1] / 60 + latVals[2] / 3600;
      let lng = lngVals[0] + lngVals[1] / 60 + lngVals[2] / 3600;
      if (latRef === "S") lat = -lat;
      if (lngRef === "W") lng = -lng;
      if (lat !== 0 || lng !== 0) {
        return { lat: Math.round(lat * 100000) / 100000, lng: Math.round(lng * 100000) / 100000 };
      }
    }
  } catch { /* ok */ }
  return null;
}

/** Compress image client-side before upload: max 1600px, JPEG 0.82 quality. */
async function compressImage(file: File): Promise<File> {
  if (file.size < 500_000) return file;
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const MAX = 2400; // Higher res for better download quality
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

interface Comment {
  author: string;
  text: string;
  createdAt: string;
}

function LightboxWithComments({
  photos: allPhotos, photoIdx, onClose, onPrev, onNext, onTouchStart, onTouchEnd, onGoTo,
}: {
  photos: PhotoItem[];
  photoIdx: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onTouchStart: (e: React.TouchEvent) => void;
  onTouchEnd: (e: React.TouchEvent) => void;
  onGoTo: (i: number) => void;
}) {
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [authorName, setAuthorName] = useState(() =>
    typeof window !== "undefined" ? localStorage.getItem("walliprag-name") || "" : ""
  );
  const [sending, setSending] = useState(false);

  const photo = allPhotos[photoIdx];
  const totalPhotos = allPhotos.length;

  // Preload prev + next images for instant transitions
  useEffect(() => {
    [-1, 1, 2].forEach((offset) => {
      const idx = photoIdx + offset;
      if (idx >= 0 && idx < allPhotos.length) {
        const img = new window.Image();
        img.src = allPhotos[idx].fullUrl;
      }
    });
  }, [photoIdx, allPhotos]);

  const fetchComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const res = await fetch(`/api/album/comments?photoUrl=${encodeURIComponent(photo.fullUrl)}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data.comments || []);
      }
    } catch { /* ok */ }
    setLoadingComments(false);
  }, [photo.fullUrl]);

  useEffect(() => {
    if (showComments) fetchComments();
  }, [showComments, fetchComments]);

  // Reload comments when photo changes (if comments panel is open)
  useEffect(() => {
    setComments([]);
    if (showComments) fetchComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photo.id]);

  const handleSend = async () => {
    if (!newComment.trim()) return;
    const name = authorName.trim() || "Anonymous";
    if (authorName.trim()) localStorage.setItem("walliprag-name", authorName.trim());

    setSending(true);
    try {
      const res = await fetch("/api/album/comments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoUrl: photo.fullUrl, author: name, text: newComment.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        setComments((prev) => [...prev, data.comment]);
        setNewComment("");
      }
    } catch { /* ok */ }
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black flex flex-col select-none">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
        <span className="text-white/70 text-sm tabular-nums">{photoIdx + 1} / {totalPhotos}</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowComments((v) => !v)}
            className={`px-3 py-1.5 rounded-full text-[0.68rem] font-semibold transition-colors cursor-pointer ${
              showComments ? "bg-accent text-white" : "bg-white/10 text-white/70 hover:bg-white/20"
            }`}
          >
            💬 {comments.length || ""}
          </button>
          <a
            href={photo.fullResUrl}
            download={photo.name}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center cursor-pointer"
            title="Download full resolution"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
          </a>
          <button onClick={onClose} className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-lg cursor-pointer">✕</button>
        </div>
      </div>

      {/* Photo area — only renders ±1 images for performance at any scale */}
      <div className="flex-1 relative min-h-0 overflow-hidden" onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        {photoIdx > 0 && <button onClick={(e) => { e.stopPropagation(); onPrev(); }} className="absolute left-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center cursor-pointer z-10">‹</button>}
        {photoIdx < totalPhotos - 1 && <button onClick={(e) => { e.stopPropagation(); onNext(); }} className="absolute right-2 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center cursor-pointer z-10">›</button>}
        {/* Only renders ±1 for perf. Center slot is pinch-zoomable. */}
        <div className="flex h-full w-[300%] transition-transform duration-200 ease-out will-change-transform" style={{ transform: "translateX(-33.333%)" }}>
          {[-1, 0, 1].map((offset) => {
            const idx = photoIdx + offset;
            const p = idx >= 0 && idx < totalPhotos ? allPhotos[idx] : null;
            return (
              <div key={offset} className="w-1/3 flex items-center justify-center overflow-auto" style={{ touchAction: offset === 0 ? "pinch-zoom" : "none" }}>
                {p && <Image src={p.fullUrl} alt={p.name} width={1600} height={1200} className="max-w-[95vw] max-h-full object-contain" unoptimized />}
              </div>
            );
          })}
        </div>
      </div>

      {/* Photo info + dots */}
      <div className="shrink-0 text-center py-2">
        <p className="text-white/80 text-sm truncate px-4">{photo.name}</p>
        <p className="text-white/50 text-[0.6rem]">{new Date(photo.date).toLocaleDateString("sv-SE")}</p>
        {totalPhotos <= 20 && (
          <div className="flex justify-center gap-1.5 mt-2">
            {Array.from({ length: totalPhotos }).map((_, i) => (
              <button key={i} onClick={() => onGoTo(i)} className={`rounded-full transition-all cursor-pointer ${i === photoIdx ? "w-5 h-1.5 bg-white" : "w-1.5 h-1.5 bg-white/40"}`} />
            ))}
          </div>
        )}
      </div>

      {/* Comments drawer */}
      {showComments && (
        <div className="shrink-0 max-h-[40vh] bg-stone-900 border-t border-stone-800 flex flex-col" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
          {/* Comments list */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-0">
            {loadingComments && (
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <div className="w-4 h-4 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
                Loading…
              </div>
            )}
            {!loadingComments && comments.length === 0 && (
              <p className="text-white/40 text-sm text-center py-4">No comments yet — be the first!</p>
            )}
            {comments.map((c, i) => (
              <div key={i}>
                <div className="flex items-baseline gap-2">
                  <span className="text-[0.72rem] font-semibold text-amber-400">{c.author}</span>
                  <span className="text-[0.6rem] text-white/30">
                    {new Date(c.createdAt).toLocaleString("sv-SE", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[0.78rem] text-white/80 leading-snug">{c.text}</p>
              </div>
            ))}
          </div>

          {/* Input */}
          <div className="border-t border-stone-800 px-4 py-2 flex gap-2 items-end shrink-0">
            <div className="flex-1 min-w-0">
              {!authorName && (
                <input
                  type="text"
                  value={authorName}
                  onChange={(e) => setAuthorName(e.target.value)}
                  placeholder="Your name…"
                  className="w-full px-3 py-1.5 mb-1.5 rounded-lg bg-stone-800 text-white text-[0.72rem] border border-stone-700 outline-none focus:border-amber-500 placeholder:text-white/30"
                />
              )}
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="Write a comment…"
                className="w-full px-3 py-2 rounded-lg bg-stone-800 text-white text-sm border border-stone-700 outline-none focus:border-amber-500 placeholder:text-white/30"
              />
            </div>
            <button
              onClick={handleSend}
              disabled={sending || !newComment.trim()}
              className="shrink-0 px-4 py-2 rounded-lg bg-accent text-white text-sm font-semibold hover:bg-accent-light transition-colors cursor-pointer disabled:opacity-40"
            >
              {sending ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AlbumPanel({ isOpen, onClose }: AlbumPanelProps) {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [storage, setStorage] = useState<{ usedMB: number; limitMB: number; percent: number } | null>(null);
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
            all.push({ id: `d-${f.id}`, name: f.name, thumbnailUrl: `https://lh3.googleusercontent.com/d/${f.id}=w400`, fullUrl: `https://lh3.googleusercontent.com/d/${f.id}=w1600`, fullResUrl: `https://lh3.googleusercontent.com/d/${f.id}=w4000`, date: f.createdTime, source: "drive" });
          }
        }
      } catch { /* ok */ }
    }

    try {
      const res = await fetch("/api/album");
      if (res.ok) {
        const data = await res.json();
        if (data.storage) setStorage(data.storage);
        for (const p of data.photos || []) {
          all.push({ id: `b-${p.url}`, name: p.name, thumbnailUrl: p.url, fullUrl: p.url, fullResUrl: p.fullResUrl || p.url, date: p.uploadedAt, source: "blob" });
        }
      }
    } catch { /* ok */ }

    all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setPhotos(all);
    setLoading(false);
  }, []);

  useEffect(() => { if (isOpen && photos.length === 0) fetchPhotos(); }, [isOpen, photos.length, fetchPhotos]);

  /** Get current GPS position (best-effort, times out after 5s). */
  const getGPS = (): Promise<{ lat: number; lng: number } | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) { resolve(null); return; }
      navigator.geolocation.getCurrentPosition(
        (p) => resolve({ lat: Math.round(p.coords.latitude * 100000) / 100000, lng: Math.round(p.coords.longitude * 100000) / 100000 }),
        () => resolve(null),
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 30000 }
      );
    });

  const uploadFiles = async (files: FileList | File[]) => {
    setShowUploadSheet(false);
    setUploading(true);
    setError(null);
    const arr = Array.from(files);
    let uploaded = 0, lastErr = "";

    // Get live GPS once as fallback for photos without EXIF
    setUploadProgress("Getting location…");
    const liveGPS = await getGPS();

    for (const file of arr) {
      try {
        // Try EXIF GPS from the original file first (before compression strips it)
        setUploadProgress(`Reading ${uploaded + 1}/${arr.length}…`);
        const exifGPS = await extractExifGPS(file);
        const gps = exifGPS || liveGPS;

        setUploadProgress(`Uploading ${uploaded + 1}/${arr.length}…`);
        const compressed = await compressImage(file);
        const fd = new FormData();
        fd.append("file", compressed);
        if (gps) {
          fd.append("lat", String(gps.lat));
          fd.append("lng", String(gps.lng));
        }
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
            <p className="text-[0.68rem] text-warm mt-0.5">
              {photos.length > 0
                ? `${photos.length} photo${photos.length === 1 ? "" : "s"}`
                : "Upload your trip photos!"}
              {storage && ` · ${storage.usedMB} / ${storage.limitMB} MB (${storage.percent}%)`}
            </p>
            {storage && (
              <div className="mt-1.5 w-full h-1 rounded-full bg-white/20 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${storage.percent > 90 ? "bg-red-400" : storage.percent > 70 ? "bg-amber-400" : "bg-green-400"}`}
                  style={{ width: `${Math.min(storage.percent, 100)}%` }}
                />
              </div>
            )}
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

      {/* Fullscreen swipe lightbox with comments */}
      {cur && (
        <LightboxWithComments
          photos={photos}
          photoIdx={lightboxIdx!}
          onClose={() => setLightboxIdx(null)}
          onPrev={goPrev}
          onNext={goNext}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          onGoTo={setLightboxIdx}
        />
      )}
    </>
  );
}
