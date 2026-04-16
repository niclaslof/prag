import type { Metadata, Viewport } from "next";

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "Walli Split — Expense splitting",
  description: "Split expenses with your group. No login needed.",
};

export default function SplitLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-stone-900 font-[family-name:var(--font-inter)]">
      {children}
    </div>
  );
}
