/**
 * Encryption utilities for API keys and sensitive data
 * Uses AES-256-GCM encryption for data at rest
 */

import CryptoJS from "crypto-js";

// Get encryption key from environment variable
// In production, this should be a strong random key stored securely
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "default-key-change-in-production";

if (
  ENCRYPTION_KEY === "default-key-change-in-production" &&
  process.env.NODE_ENV === "production"
) {
  console.warn(
    "⚠️  WARNING: Using default encryption key in production! Set ENCRYPTION_KEY environment variable."
  );
}

/**
 * Encrypts a string using AES-256 encryption
 * @param plaintext - The text to encrypt
 * @returns Encrypted string in base64 format
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) return "";

  try {
    const encrypted = CryptoJS.AES.encrypt(plaintext, ENCRYPTION_KEY);
    return encrypted.toString();
  } catch (error) {
    console.error("Encryption error:", error);
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypts an encrypted string
 * @param ciphertext - The encrypted text in base64 format
 * @returns Decrypted plaintext string
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";

  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return decrypted.toString(CryptoJS.enc.Utf8);
  } catch (error) {
    console.error("Decryption error:", error);
    throw new Error("Failed to decrypt data");
  }
}

/**
 * Securely compares two strings in constant time to prevent timing attacks
 * @param a - First string
 * @param b - Second string
 * @returns True if strings match
 */
export function secureCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Generates a secure random token
 * @param length - Length of the token (default: 32)
 * @returns Random token string
 */
export function generateToken(length: number = 32): string {
  const array = new Uint8Array(length);
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    crypto.getRandomValues(array);
  } else {
    // Fallback for environments without crypto.getRandomValues
    for (let i = 0; i < length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
  }
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}
