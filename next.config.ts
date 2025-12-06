import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Ignore ESLint warnings during production builds (they don't block functionality)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignore TypeScript errors during builds (use type-check in CI instead)
  typescript: {
    ignoreBuildErrors: true,
  },
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  webpack: (config) => {
    // Simple optimization without breaking changes
    config.performance = {
      hints: false,
    };
    return config;
  },
};

export default nextConfig;
