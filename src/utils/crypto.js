/**
 * src/utils/crypto.js
 * Cryptographic utilities for the planner.
 * * CHANGES:
 * - Increased PBKDF2 iterations to 600,000 (OWASP Standard)
 * - Added hashPassword for secure auth verification
 */

/**
 * Derives a cryptographic key from the Room Password using PBKDF2.
 * The Room ID is used as the salt.
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
      iterations: 600000, // INCREASED for better security
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

/**
 * Creates a one-way hash of the password using the room ID as salt.
 * Used for verifying room access without storing the actual password.
 */
export const hashPassword = async (password, salt) => {
  const enc = new TextEncoder();
  const data = enc.encode(password + salt); // Simple concatenation for salt
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);

  // Convert buffer to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
};

/**
 * Encrypts a single event object using AES-GCM.
 */
export const encryptEvent = async (eventData, key) => {
  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(eventData));

  // Generate a random IV (Initialization Vector) - 12 bytes
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedContent = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: iv },
    key,
    encodedData,
  );

  return {
    isEncrypted: true,
    iv: btoa(String.fromCharCode(...iv)),
    data: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    id: eventData.id,
  };
};

/**
 * Decrypts an encrypted event object.
 */
export const decryptEvent = async (encryptedData, key) => {
  if (!encryptedData.isEncrypted) return encryptedData;

  try {
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

    return { ...parsed, id: encryptedData.id };
  } catch (e) {
    console.error("Decryption failed", e);
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
