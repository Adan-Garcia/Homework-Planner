export const deriveKey = async (password, salt, purpose) => {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );

  
  const saltBuffer = enc.encode(salt + purpose);

  if (purpose === "AUTH") {
    
    
    const tempKey = await window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 600000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "HMAC", hash: "SHA-256", length: 256 },
      true,
      ["sign"],
    );

    const exported = await window.crypto.subtle.exportKey("raw", tempKey);
    return Array.from(new Uint8Array(exported))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } else {
    
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: saltBuffer,
        iterations: 600000,
        hash: "SHA-256",
      },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["encrypt", "decrypt"],
    );
  }
};

export const generateSalt = () => {
  const array = new Uint8Array(16);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    "",
  );
};

export const encryptEvent = async (eventData, key) => {
  const enc = new TextEncoder();
  const encodedData = enc.encode(JSON.stringify(eventData));
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

export const decryptEvent = async (encryptedData, key) => {
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
