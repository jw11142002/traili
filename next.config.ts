import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      // Photos are downscaled client-side before upload; Vercel caps request bodies at 4.5 MB.
      bodySizeLimit: "4mb",
      allowedOrigins: ["traili.justinyjwang.com", "localhost:3000"],
    },
  },
  images: {
    // Uploaded photos are served from our own route; no remote optimization needed.
    unoptimized: true,
  },
};

export default nextConfig;
