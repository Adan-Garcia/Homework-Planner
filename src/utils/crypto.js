// src/utils/crypto.js

/**
 * Derives a cryptographic key from the Room Password using PBKDF2.
 * The Room ID is used as the salt to ensure rainbow table attacks are difficult.
 */
export const deriveKey = async (password, salt) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  return window.crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: enc.encode(salt),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

/**
 * Encrypts an event object using AES-GCM.
 * Returns an object containing the IV and the encrypted data as Base64 strings.
 */
export const encryptEvent = async (eventData, key) => {
  const enc = new TextEncoder();
  // We encrypt the stringified JSON of the event
  const encodedData = enc.encode(JSON.stringify(eventData));

  // Generate a random IV (Initialization Vector) - 12 bytes is standard for GCM
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedData,
  );

  // Convert buffers to Base64 strings for storage in Firestore
  return {
    isEncrypted: true,
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    // Keep ID unencrypted so we can still identify/delete docs easily in Firestore
    id: eventData.id,
  };
};

/**
 * Decrypts an encrypted event object.
 * Returns the original event object.
 */
export const decryptEvent = async (encryptedData, key) => {
  // Graceful fallback: If data isn't marked as encrypted, return it as-is.
  // This helps if you have legacy data or mixed modes.
  if (!encryptedData.isEncrypted) return encryptedData;

  try {
    // Convert Base64 back to Uint8Array
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

    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv },
      key,
      data,
    );

    const dec = new TextDecoder();
    const jsonString = dec.decode(decryptedContent);
    const parsed = JSON.parse(jsonString);

    // Ensure the ID matches the doc ID (integrity check)
    return { ...parsed, id: encryptedData.id };
  } catch (e) {
    console.error("Decryption failed", e);
    // Return a placeholder if decryption fails (e.g., wrong password)
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
