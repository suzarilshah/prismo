/**
 * Security Utilities
 * 
 * Common security functions for input validation and sanitization.
 */

import { z } from "zod";

/**
 * Sanitize string input to prevent XSS
 * Removes or escapes potentially dangerous characters
 */
export function sanitizeString(input: string): string {
  if (!input) return "";
  
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .replace(/\\/g, "&#x5C;")
    .replace(/`/g, "&#x60;");
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      sanitized[key] = sanitizeString(value);
    } else if (typeof value === "object" && value !== null && !Array.isArray(value)) {
      sanitized[key] = sanitizeObject(value as Record<string, unknown>);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) =>
        typeof item === "string" ? sanitizeString(item) : item
      );
    } else {
      sanitized[key] = value;
    }
  }
  
  return sanitized as T;
}

/**
 * Validate and sanitize UUID
 */
export function isValidUUID(id: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(id);
}

/**
 * Common Zod schemas with security in mind
 */
export const secureSchemas = {
  // Safe string with max length
  safeString: (maxLength: number = 1000) =>
    z.string().max(maxLength).transform(sanitizeString),
  
  // Email with normalization
  email: z
    .string()
    .email()
    .toLowerCase()
    .trim()
    .max(255),
  
  // UUID validation
  uuid: z.string().uuid(),
  
  // Amount (for financial transactions)
  amount: z
    .union([z.string(), z.number()])
    .transform((val) => {
      const num = typeof val === "string" ? parseFloat(val) : val;
      if (isNaN(num)) throw new Error("Invalid amount");
      // Limit to reasonable range
      if (num < -999999999 || num > 999999999) throw new Error("Amount out of range");
      return num;
    }),
  
  // Date validation
  safeDate: z
    .string()
    .or(z.date())
    .transform((val) => {
      const date = typeof val === "string" ? new Date(val) : val;
      if (isNaN(date.getTime())) throw new Error("Invalid date");
      // Reasonable date range (1900-2100)
      const year = date.getFullYear();
      if (year < 1900 || year > 2100) throw new Error("Date out of range");
      return date;
    }),
  
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().min(1).max(1000).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),
};

/**
 * Mask sensitive data for logging
 */
export function maskSensitiveData(data: Record<string, unknown>): Record<string, unknown> {
  const sensitiveFields = [
    "password",
    "token",
    "secret",
    "apiKey",
    "api_key",
    "authorization",
    "cookie",
    "creditCard",
    "ssn",
    "encryptedKey",
  ];
  
  const masked: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveFields.some((field) => lowerKey.includes(field.toLowerCase()))) {
      masked[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      masked[key] = maskSensitiveData(value as Record<string, unknown>);
    } else {
      masked[key] = value;
    }
  }
  
  return masked;
}

/**
 * Validate origin for CORS
 */
export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  const allowedOrigins = [
    process.env.NEXT_PUBLIC_APP_URL,
    "https://prismo.airail.uk",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
  ].filter(Boolean);
  
  return allowedOrigins.some((allowed) => origin === allowed || origin.endsWith(".vercel.app"));
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  for (let i = 0; i < length; i++) {
    token += chars[array[i] % chars.length];
  }
  return token;
}
