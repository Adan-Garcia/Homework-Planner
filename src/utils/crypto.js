export const deriveKey = async (password, salt, purpose) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  // We append the purpose to the salt to create unique keys
  const saltBuffer = enc.encode(salt + purpose);

  if (purpose === "AUTH") {
    // For Auth, we derive a string hash (SHA-256 hex)
    // We intermediate via a temporary key to get bits
    const tempKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "HMAC", hash: "SHA-256", length: 256 },
      true,
      ["sign"],
    );

    // Export key as raw bytes and hex stringify
    const exported = await window.crypto.subtle.exportKey("raw", tempKey);
    return Array.from(new Uint8Array(exported))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else {
    // For Data, we derive an AES-GCM Key
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 100000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
};

/**
 * Encrypts a single event object using AES-GCM.
 */
export const encryptEvent = async (eventData, key) => {
  const enc = new TextEncoder();
  // Ensure we stringify strictly as JSON
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
  // If raw data passed or not encrypted structure, return as is
  if (!encryptedData || !encryptedData.iv || !encryptedData.data)
    return encryptedData;

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

    // IMPORTANT FIX: Return the parsed object directly.
    // Do not assume it needs ID merging unless it's an object.
    if (typeof parsed === "object" && parsed !== null) {
      return { ...parsed, id: encryptedData.id };
    }
    return parsed;
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
export const createAccessChallenge = async (password, roomId) => {
  const key = await deriveKey(password, roomId);
  // Encrypt a simple validation token
  return encryptEvent({ challenge: "ACCESS_OK" }, key);
};
export const verifyAccessChallenge = async (
  password,
  roomId,
  encryptedChallenge,
) => {
  try {
    const key = await deriveKey(password, roomId);
    const decrypted = await decryptEvent(encryptedChallenge, key);
    return decrypted.challenge === "ACCESS_OK";
  } catch (e) {
    return false;
  }
};
