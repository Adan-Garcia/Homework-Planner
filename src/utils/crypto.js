/**
 * Cryptographic Utility Module
 * * This module implements the "Zero-Knowledge" security architecture using the Web Crypto API.
 * It handles key derivation, encryption, and decryption locally on the client device.
 * * Core Concepts:
 * 1. PBKDF2: Used to derive strong cryptographic keys from the user's password.
 * 2. AES-GCM: Used for authenticated encryption of event data.
 * 3. Salt: Random data added to password hashing to prevent rainbow table attacks.
 */

/**
 * Derives a cryptographic key from a password and salt using PBKDF2.
 * * We derive two distinct keys from the same password for security separation:
 * 1. AUTH Key: Used to prove identity to the server (HMAC-SHA256).
 * 2. DATA Key: Used to encrypt/decrypt personal data (AES-GCM).
 * * @param {string} password - The user's room password.
 * @param {string} salt - The unique salt for the room (provided by server).
 * @param {string} purpose - "AUTH" or "DATA" to determine the key usage.
 * @returns {Promise<string|CryptoKey>} - The raw hex string (for Auth) or CryptoKey object (for Data).
 */
export const deriveKey = async (password, salt, purpose) => {
  const enc = new TextEncoder();
  
  // 1. Import the password as raw key material
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  // Combine salt with purpose to ensure Auth and Data keys are mathematically distinct
  const saltBuffer = enc.encode(salt + purpose);

  if (purpose === "AUTH") {
    // AUTH Key: HMAC-SHA256
    // We export this as a hex string to send to the server for validation.
    // The server compares this hash against its own derived hash.
    const tempKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 600000, // High iteration count for resistance against brute-force
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "HMAC", hash: "SHA-256", length: 256 },
      true, // Extractable so we can convert to string
      ["sign"],
    );

    const exported = await window.crypto.subtle.exportKey("raw", tempKey);
    return Array.from(new Uint8Array(exported))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else {
    // DATA Key: AES-GCM
    // We keep this as a CryptoKey object. It NEVER leaves the client.
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 600000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false, // NOT extractable - key cannot be exported from memory
      ["encrypt", "decrypt"],
    );
  }
};

/**
 * Generates a random salt for new rooms.
 * @returns {string} Hex string of random bytes.
 */
export const generateSalt = () => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

/**
 * Encrypts an event object using AES-GCM.
 * * @param {Object} eventData - The plain text event object.
 * @param {CryptoKey} key - The derived DATA key.
 * @returns {Promise<Object>} The encrypted payload with IV and ciphertext.
 */
export const encryptEvent = async (eventData, key) => {
  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(eventData));
  
  // Generate a unique Initialization Vector (IV) for this specific encryption operation
  // AES-GCM requires a unique IV for every message to be secure.
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedData,
  );

  // Return the bundle. We must send the IV (public) along with the Data (secret).
  return {
    isEncrypted: true,
    iv: btoa(String.fromCharCode(...iv)), // Convert bytes to Base64 for transport
    data: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    id: eventData.id, // ID remains unencrypted for server-side indexing/deletion
  };
};

/**
 * Decrypts an encrypted event payload.
 * * @param {Object} encryptedData - The payload containing IV and ciphertext.
 * @param {CryptoKey} key - The derived DATA key.
 * @returns {Promise<Object>} The original plain text event object.
 */
export const decryptEvent = async (encryptedData, key) => {
  // If data isn't encrypted (legacy or error), return as is
  if (!encryptedData || !encryptedData.iv || !encryptedData.data)
    return encryptedData;

  try {
    // Convert Base64 strings back to byte arrays
    const iv = new Uint8Array(
      atob(encryptedData.iv)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );
    const data = new Uint8Array(
      atob(encryptedData.data)
        .split("")
        .map((c) => c.charCodeAt(0)),
    );

    // Perform decryption
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data,
    );

    const dec = new TextDecoder();
    const jsonString = dec.decode(decryptedContent);
    const parsed = JSON.parse(jsonString);

    // Restore the ID from the wrapper to ensure consistency
    if (typeof parsed === "object" && parsed !== null) {
      return { ...parsed, id: encryptedData.id };
    }
    return parsed;
  } catch (e) {
    console.error("Decryption failed", e);
    // Graceful failure: return a placeholder "Locked" event so the UI doesn't crash
    return {
      id: encryptedData.id,
      title: "🔒 Decryption Failed",
      description: "Could not decrypt this event. Check room password.",
      date: new Date().toISOString().split("T")[0],
      class: "System",
      type: "Error",
    };
  }
};