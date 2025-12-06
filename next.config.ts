import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Vercel deployment
  output: "standalone",
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  // Use Turbopack (Next.js 16 default)
  turbopack: {},
};

export default nextConfig;
