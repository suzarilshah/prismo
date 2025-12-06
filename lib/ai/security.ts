/**
 * AI Security Utilities
 * 
 * Handles encryption/decryption of sensitive AI configuration data
 * such as API keys using AES-256-GCM encryption.
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto';

// Encryption configuration
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;
const SALT_LENGTH = 32;
const KEY_LENGTH = 32;

/**
 * Derives an encryption key from the master secret using scrypt
 * Falls back to various auth secrets if AI_ENCRYPTION_SECRET is not set
 */
function deriveKey(salt: Buffer): Buffer {
  const masterSecret = 
    process.env.AI_ENCRYPTION_SECRET || 
    process.env.NEXTAUTH_SECRET ||
    process.env.NEON_AUTH_SECRET ||
    process.env.AUTH_SECRET ||
    process.env.STACK_SECRET_SERVER_KEY; // Stack Auth fallback
  
  if (!masterSecret) {
    throw new Error('Encryption secret not configured. Set AI_ENCRYPTION_SECRET environment variable.');
  }
  
  return scryptSync(masterSecret, salt, KEY_LENGTH);
}

/**
 * Encrypts an API key using AES-256-GCM
 * 
 * @param apiKey - The plain text API key to encrypt
 * @returns Base64 encoded encrypted string containing salt, iv, authTag, and ciphertext
 */
export function encryptApiKey(apiKey: string): string {
  if (!apiKey) {
    throw new Error('API key cannot be empty');
  }

  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH);
  const iv = randomBytes(IV_LENGTH);
  
  // Derive key from master secret
  const key = deriveKey(salt);
  
  // Create cipher and encrypt
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine all parts: salt + iv + authTag + ciphertext
  const combined = Buffer.concat([
    salt,
    iv,
    authTag,
    Buffer.from(encrypted, 'hex')
  ]);
  
  return combined.toString('base64');
}

/**
 * Decrypts an encrypted API key
 * 
 * @param encryptedKey - Base64 encoded encrypted string
 * @returns The decrypted plain text API key
 */
export function decryptApiKey(encryptedKey: string): string {
  if (!encryptedKey) {
    throw new Error('Encrypted key cannot be empty');
  }

  try {
    // Decode from base64
    const combined = Buffer.from(encryptedKey, 'base64');
    
    // Extract parts
    const salt = combined.subarray(0, SALT_LENGTH);
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    const ciphertext = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
    
    // Derive key from master secret
    const key = deriveKey(salt);
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt
    let decrypted = decipher.update(ciphertext.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error('Failed to decrypt API key. The key may be corrupted or the encryption secret may have changed.');
  }
}

/**
 * Validates that an API key can be encrypted and decrypted correctly
 * Used for testing the encryption configuration
 */
export function validateEncryption(): boolean {
  try {
    const testKey = 'test-api-key-' + randomBytes(16).toString('hex');
    const encrypted = encryptApiKey(testKey);
    const decrypted = decryptApiKey(encrypted);
    return testKey === decrypted;
  } catch {
    return false;
  }
}

/**
 * Masks an API key for display purposes
 * Shows first 4 and last 4 characters
 */
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 12) {
    return '••••••••';
  }
  
  const first = apiKey.substring(0, 4);
  const last = apiKey.substring(apiKey.length - 4);
  const middle = '•'.repeat(Math.min(apiKey.length - 8, 20));
  
  return `${first}${middle}${last}`;
}

/**
 * Type definitions for AI settings
 */
export interface AIProviderConfig {
  provider: 'azure_foundry' | 'openai' | 'anthropic';
  modelEndpoint: string;
  modelName: string;
  apiKey: string; // Plain text, will be encrypted before storage
}

export interface AIDataAccessPermissions {
  transactions: boolean;
  budgets: boolean;
  goals: boolean;
  subscriptions: boolean;
  creditCards: boolean;
  taxData: boolean;
  income: boolean;
  forecasts: boolean;
}

export interface AISettings {
  aiEnabled: boolean;
  provider: AIProviderConfig['provider'];
  modelEndpoint: string | null;
  modelName: string | null;
  temperature: number;
  maxTokens: number;
  enableCrag: boolean;
  relevanceThreshold: number;
  maxRetrievalDocs: number;
  enableWebSearchFallback: boolean;
  dataAccess: AIDataAccessPermissions;
  anonymizeVendors: boolean;
  excludeSensitiveCategories: string[];
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  aiEnabled: false,
  provider: 'azure_foundry',
  modelEndpoint: null,
  modelName: null,
  temperature: 0.7,
  maxTokens: 2048,
  enableCrag: true,
  relevanceThreshold: 0.7,
  maxRetrievalDocs: 10,
  enableWebSearchFallback: false,
  dataAccess: {
    transactions: true,
    budgets: true,
    goals: true,
    subscriptions: true,
    creditCards: true,
    taxData: true,
    income: true,
    forecasts: true,
  },
  anonymizeVendors: false,
  excludeSensitiveCategories: [],
};
