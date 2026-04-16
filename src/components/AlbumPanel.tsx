"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

/**
 * Shared photo album backed by a public Google Drive folder.
 *
 * Setup:
 * 1. Create a Google Drive folder and share it as "Anyone with link → Editor"
 * 2. Set NEXT_PUBLIC_ALBUM_FOLDER_ID to the folder ID in .env.local
 * 3. Enable the Google Drive API in Google Cloud Console
 *
 * Users upload photos by opening the Drive folder link (or using the Drive app).
 * This component fetches and displays all images from that folder.
 */

const FOLDER_ID = process.env.NEXT_PUBLIC_ALBUM_FOLDER_ID || "";
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

interface DriveFile {
  id: string;
  name: string;
  thumbnailLink?: string;
  createdTime: string;
  imageMediaMetadata?: {
    width?: number;
    height?: number;
  };
}

interface AlbumPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

function driveImageUrl(fileId: string, width = 800): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}

function driveThumbnailUrl(fileId: string): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=w400`;
}

export default function AlbumPanel({ isOpen, onClose }: AlbumPanelProps) {
  const [photos, setPhotos] = useState<DriveFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPhoto, setSelectedPhoto] = useState<DriveFile | null>(null);

  const fetchPhotos = useCallback(async () => {
    if (!FOLDER_ID || !API_KEY) {
      setError(
        !FOLDER_ID
          ? "Album folder not configured. Set NEXT_PUBLIC_ALBUM_FOLDER_ID in .env.local"
          : "API key missing."
      );
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const fields = "files(id,name,thumbnailLink,createdTime,imageMediaMetadata)";
      const q = encodeURIComponent(
        `'${FOLDER_ID}' in parents and mimeType contains 'image/' and trashed = false`
      );
      const url =
        `https://www.googleapis.com/drive/v3/files?q=${q}&key=${API_KEY}` +
        `&fields=${fields}&orderBy=createdTime desc&pageSize=100`;
      const res = await fetch(url);
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Drive API ${res.status}: ${text.slice(0, 200)}`);
      }
      const data = await res.json();
      setPhotos(data.files || []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && photos.length === 0 && !error) {
      fetchPhotos();
    }
  }, [isOpen, photos.length, error, fetchPhotos]);

  const uploadUrl = FOLDER_ID
    ? `https://drive.google.com/drive/folders/${FOLDER_ID}?usp=sharing`
    : "#";

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
        className={`fixed right-0 top-0 bottom-0 w-[520px] max-w-full bg-panel z-[76] shadow-2xl transition-transform duration-350 ease-out overflow-y-auto ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-ink text-paper px-5 py-4 flex items-start justify-between">
          <div>
            <p className="text-[0.6rem] uppercase tracking-[0.2em] text-warm mb-1">
              Shared photo album
            </p>
            <h2 className="font-[family-name:var(--font-playfair)] text-xl font-bold leading-tight">
              Walli Prag Album
            </h2>
            <p className="text-[0.68rem] text-warm mt-0.5">
              {photos.length > 0
                ? `${photos.length} photo${photos.length === 1 ? "" : "s"}`
                : "Upload your trip photos!"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-lg cursor-pointer transition-colors"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Upload CTA */}
        <div className="px-5 pt-4 pb-2">
          <a
            href={uploadUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-accent/10 dark:bg-accent/20 border border-accent/30 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
          >
            <span className="text-2xl">📷</span>
            <div>
              <div className="text-sm font-semibold">Add your photos</div>
              <div className="text-[0.68rem] text-warm">
                Opens the shared Google Drive folder — drag & drop or upload
              </div>
            </div>
          </a>
        </div>

        {/* Body */}
        <div className="px-5 pb-8 pt-3">
          {loading && (
            <div className="flex items-center gap-3 py-8 text-warm text-sm">
              <div className="w-5 h-5 border-2 border-stone-300 border-t-accent rounded-full animate-spin" />
              Loading album…
            </div>
          )}

          {error && !loading && (
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 p-4 text-[0.75rem] text-red-700 dark:text-red-300 leading-relaxed">
              {error}
            </div>
          )}

          {!loading && !error && photos.length === 0 && (
            <div className="text-center py-12 text-warm">
              <span className="text-4xl block mb-3">📸</span>
              <p className="text-sm font-medium">No photos yet</p>
              <p className="text-[0.72rem] mt-1">
                Be the first to upload! Tap &quot;Add your photos&quot; above.
              </p>
            </div>
          )}

          {/* Photo grid */}
          {photos.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {photos.map((photo) => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhoto(photo)}
                  className="relative aspect-square rounded-xl overflow-hidden bg-stone-100 dark:bg-stone-800 cursor-pointer hover:opacity-90 transition-opacity group"
                >
                  <Image
                    src={driveThumbnailUrl(photo.id)}
                    alt={photo.name}
                    width={400}
                    height={400}
                    className="w-full h-full object-cover"
                    unoptimized
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <p className="text-[0.6rem] text-white truncate">
                      {photo.name}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Refresh button */}
          {photos.length > 0 && (
            <button
              onClick={fetchPhotos}
              className="mt-4 w-full py-2 rounded-lg bg-stone-100 dark:bg-stone-800 text-sm text-warm font-medium hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors cursor-pointer"
            >
              Refresh album
            </button>
          )}
        </div>
      </aside>

      {/* Lightbox */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 z-[80] bg-black/95 flex items-center justify-center"
          onClick={() => setSelectedPhoto(null)}
        >
          <button
            onClick={() => setSelectedPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center text-xl cursor-pointer z-10"
            aria-label="Close"
          >
            ✕
          </button>
          <div className="absolute bottom-4 left-4 right-4 text-center">
            <p className="text-white/80 text-sm truncate">{selectedPhoto.name}</p>
            <p className="text-white/50 text-[0.65rem]">
              {new Date(selectedPhoto.createdTime).toLocaleDateString("sv-SE")}
            </p>
          </div>
          <Image
            src={driveImageUrl(selectedPhoto.id, 1600)}
            alt={selectedPhoto.name}
            width={1600}
            height={1200}
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg"
            unoptimized
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
