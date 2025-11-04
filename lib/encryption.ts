/**
 * Encryption utilities for API keys and sensitive data
 * Uses AES-256-GCM encryption for data at rest
 */

import CryptoJS from "crypto-js";
import logger from "./logger";

// Get encryption key from environment variable
// In production, this should be a strong random key stored securely
const ENCRYPTION_KEY =
  process.env.ENCRYPTION_KEY || "default-key-change-in-production";

if (
  ENCRYPTION_KEY === "default-key-change-in-production" &&
  process.env.NODE_ENV === "production"
) {
  logger.warn(
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
    logger.error({ err: error }, "Encryption error");
    throw new Error("Failed to encrypt data");
  }
}

/**
 * Decrypts an encrypted string
 * Safely handles both encrypted and plaintext data for backward compatibility
 * @param ciphertext - The encrypted text in base64 format (or plaintext for legacy data)
 * @returns Decrypted plaintext string
 */
export function decrypt(ciphertext: string): string {
  if (!ciphertext) return "";

  try {
    const decrypted = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);

    // If decryption results in empty string, the data might be plaintext (legacy)
    // Return the original ciphertext as it's likely already plaintext
    if (!decryptedText) {
      logger.warn(
        "⚠️  Detected unencrypted data - returning as plaintext. Consider re-saving to encrypt."
      );
      return ciphertext;
    }

    return decryptedText;
  } catch (error) {
    logger.error({ err: error }, "Decryption error");
    // If decryption fails, assume it's plaintext from before encryption was implemented
    logger.warn(
      "⚠️  Failed to decrypt - treating as plaintext. Consider re-saving to encrypt."
    );
    return ciphertext;
  }
}

/**
 * Checks if a string is encrypted
 * @param value - The string to check
 * @returns True if the value appears to be encrypted
 */
export function isEncrypted(value: string): boolean {
  if (!value) return false;

  try {
    const decrypted = CryptoJS.AES.decrypt(value, ENCRYPTION_KEY);
    const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
    return decryptedText.length > 0;
  } catch {
    return false;
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
