import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Optimize images
  images: {
    formats: ["image/webp"],
    deviceSizes: [420, 640, 768],
    imageSizes: [300],
  },
  // Reduce bundle size
  experimental: {
    optimizePackageImports: ["@vis.gl/react-google-maps"],
  },
};

export default nextConfig;
