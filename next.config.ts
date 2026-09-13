import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      bodySizeLimit: "25mb",
    },
  },
  images: {
    // Uploaded photos are served from our own route; no remote optimization needed.
    unoptimized: true,
  },
};

export default nextConfig;
