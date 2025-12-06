import type { NextConfig } from "next";

// Security headers for production
const securityHeaders = [
  {
    // Prevent clickjacking attacks
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME type sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Enable XSS protection
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    // Control referrer information
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Permissions policy (formerly Feature-Policy)
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // Strict Transport Security (HTTPS only)
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    // Content Security Policy
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://vercel.live https://*.vercel-scripts.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com data:",
      "img-src 'self' data: blob: https: http:",
      "connect-src 'self' https: wss:",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Enable standalone output for Vercel deployment
  output: "standalone",
  reactStrictMode: true,
  
  // Security headers
  async headers() {
    return [
      {
        // Apply headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
  
  images: {
    remotePatterns: [
      // Stack Auth profile images
      {
        protocol: "https",
        hostname: "*.stack-auth.com",
      },
      // Appwrite storage
      {
        protocol: "https",
        hostname: "cloud.appwrite.io",
      },
      // Common avatar services
      {
        protocol: "https",
        hostname: "avatars.githubusercontent.com",
      },
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      // Placeholder images
      {
        protocol: "https",
        hostname: "placehold.co",
      },
      {
        protocol: "https",
        hostname: "via.placeholder.com",
      },
    ],
  },
  
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  
  // Use Turbopack and set workspace root
  turbopack: {
    root: __dirname,
  },
  
  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
