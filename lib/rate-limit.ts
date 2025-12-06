/**
 * Rate Limiting Utility
 * 
 * Simple in-memory rate limiter for API routes.
 * For production at scale, consider using Redis or Upstash.
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

// In-memory store (use Redis for production at scale)
const rateLimitStore = new Map<string, RateLimitRecord>();

// Clean up expired entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (now > record.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 60000); // Clean every minute

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in milliseconds */
  windowMs: number;
  /** Identifier for the rate limit (e.g., 'api', 'auth', 'ai') */
  identifier?: string;
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

/**
 * Check rate limit for a given key (usually IP or user ID)
 */
export function checkRateLimit(
  key: string,
  config: RateLimitConfig
): RateLimitResult {
  const { limit, windowMs, identifier = "default" } = config;
  const now = Date.now();
  const storeKey = `${identifier}:${key}`;

  let record = rateLimitStore.get(storeKey);

  // Create new record if doesn't exist or has expired
  if (!record || now > record.resetTime) {
    record = {
      count: 0,
      resetTime: now + windowMs,
    };
  }

  // Increment count
  record.count++;
  rateLimitStore.set(storeKey, record);

  const remaining = Math.max(0, limit - record.count);
  const success = record.count <= limit;

  return {
    success,
    limit,
    remaining,
    reset: record.resetTime,
  };
}

/**
 * Get client IP from request headers
 */
export function getClientIP(request: Request): string {
  // Check various headers for the real IP
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwardedFor.split(",")[0].trim();
  }

  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Vercel-specific header
  const vercelIP = request.headers.get("x-vercel-forwarded-for");
  if (vercelIP) {
    return vercelIP.split(",")[0].trim();
  }

  // Fallback
  return "unknown";
}

/**
 * Create rate limit headers for response
 */
export function rateLimitHeaders(result: RateLimitResult): HeadersInit {
  return {
    "X-RateLimit-Limit": result.limit.toString(),
    "X-RateLimit-Remaining": result.remaining.toString(),
    "X-RateLimit-Reset": result.reset.toString(),
    ...(result.success ? {} : { "Retry-After": Math.ceil((result.reset - Date.now()) / 1000).toString() }),
  };
}

// Pre-configured rate limiters
export const RATE_LIMITS = {
  // General API: 100 requests per minute
  api: { limit: 100, windowMs: 60 * 1000, identifier: "api" },
  
  // Auth endpoints: 10 requests per minute (prevent brute force)
  auth: { limit: 10, windowMs: 60 * 1000, identifier: "auth" },
  
  // AI chat: 30 requests per minute
  ai: { limit: 30, windowMs: 60 * 1000, identifier: "ai" },
  
  // Sensitive operations: 5 requests per minute
  sensitive: { limit: 5, windowMs: 60 * 1000, identifier: "sensitive" },
  
  // File uploads: 10 per minute
  upload: { limit: 10, windowMs: 60 * 1000, identifier: "upload" },
} as const;
