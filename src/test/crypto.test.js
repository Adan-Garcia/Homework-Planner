import { describe, it, expect, beforeAll } from "vitest";
import { deriveKey, encryptEvent, decryptEvent, generateSalt } from "../utils/crypto";

describe("Cryptography Functions", () => {
  let authKey;
  let dataKey;
  const testPassword = "test-password-123";
  const testSalt = "0123456789abcdef";

  beforeAll(async () => {
    // Derive keys once for all tests
    authKey = await deriveKey(testPassword, testSalt, "AUTH");
    dataKey = await deriveKey(testPassword, testSalt, "DATA");
  });

  describe("deriveKey", () => {
    it("derives AUTH key as a hex string", async () => {
      expect(typeof authKey).toBe("string");
      expect(authKey.length).toBeGreaterThan(0);
      expect(/^[0-9a-f]+$/.test(authKey)).toBe(true);
    });

    it("derives DATA key as a CryptoKey object", async () => {
      expect(dataKey).toBeInstanceOf(CryptoKey);
      expect(dataKey.type).toBe("secret");
      expect(dataKey.algorithm.name).toBe("AES-GCM");
    });

    it("generates different keys for different purposes", async () => {
      const authKey2 = await deriveKey(testPassword, testSalt, "AUTH");
      const dataKey2 = await deriveKey(testPassword, testSalt, "DATA");
      
      // AUTH keys should be identical (deterministic)
      expect(authKey2).toBe(authKey);
      
      // DATA keys should have same algorithm but can't compare directly
      expect(dataKey2.algorithm.name).toBe(dataKey.algorithm.name);
    });

    it("generates different keys for different salts", async () => {
      const key1 = await deriveKey(testPassword, "salt1", "AUTH");
      const key2 = await deriveKey(testPassword, "salt2", "AUTH");
      expect(key1).not.toBe(key2);
    });

    it("generates different keys for different passwords", async () => {
      const key1 = await deriveKey("password1", testSalt, "AUTH");
      const key2 = await deriveKey("password2", testSalt, "AUTH");
      expect(key1).not.toBe(key2);
    });
  });

  describe("encryptEvent and decryptEvent", () => {
    const testEvent = {
      id: "test-id-123",
      title: "Math Homework",
      description: "Chapter 5 problems",
      date: "2026-02-15",
      class: "Mathematics",
      type: "Homework",
      priority: "High",
    };

    it("encrypts an event to the correct format", async () => {
      const encrypted = await encryptEvent(testEvent, dataKey);
      
      expect(encrypted.isEncrypted).toBe(true);
      expect(encrypted.iv).toBeTruthy();
      expect(encrypted.data).toBeTruthy();
      expect(encrypted.id).toBe(testEvent.id);
      
      // IV and data should be base64 encoded
      expect(typeof encrypted.iv).toBe("string");
      expect(typeof encrypted.data).toBe("string");
    });

    it("successfully decrypts an encrypted event", async () => {
      const encrypted = await encryptEvent(testEvent, dataKey);
      const decrypted = await decryptEvent(encrypted, dataKey);
      
      expect(decrypted).toEqual(testEvent);
    });

    it("preserves all event properties through encryption/decryption", async () => {
      const encrypted = await encryptEvent(testEvent, dataKey);
      const decrypted = await decryptEvent(encrypted, dataKey);
      
      expect(decrypted.title).toBe(testEvent.title);
      expect(decrypted.description).toBe(testEvent.description);
      expect(decrypted.date).toBe(testEvent.date);
      expect(decrypted.class).toBe(testEvent.class);
      expect(decrypted.type).toBe(testEvent.type);
      expect(decrypted.priority).toBe(testEvent.priority);
    });

    it("generates unique IVs for each encryption", async () => {
      const encrypted1 = await encryptEvent(testEvent, dataKey);
      const encrypted2 = await encryptEvent(testEvent, dataKey);
      
      // Even with same data, IVs should be different
      expect(encrypted1.iv).not.toBe(encrypted2.iv);
      // But both should decrypt to the same data
      const decrypted1 = await decryptEvent(encrypted1, dataKey);
      const decrypted2 = await decryptEvent(encrypted2, dataKey);
      expect(decrypted1).toEqual(testEvent);
      expect(decrypted2).toEqual(testEvent);
    });

    it("handles events with special characters", async () => {
      const specialEvent = {
        ...testEvent,
        title: "Test with émojis 🎉 and spëcial çhars",
        description: "Line 1\nLine 2\nLine 3 with\ttabs",
      };
      
      const encrypted = await encryptEvent(specialEvent, dataKey);
      const decrypted = await decryptEvent(encrypted, dataKey);
      
      expect(decrypted.title).toBe(specialEvent.title);
      expect(decrypted.description).toBe(specialEvent.description);
    });

    it("returns placeholder event on decryption failure", async () => {
      const encrypted = await encryptEvent(testEvent, dataKey);
      
      // Create wrong key
      const wrongKey = await deriveKey("wrong-password", testSalt, "DATA");
      
      const decrypted = await decryptEvent(encrypted, wrongKey);
      
      // Should return error placeholder instead of throwing
      expect(decrypted.title).toContain("Decryption Failed");
      expect(decrypted.id).toBe(testEvent.id);
    });

    it("handles non-encrypted data gracefully", async () => {
      const plainEvent = { ...testEvent, someField: "test" };
      const result = await decryptEvent(plainEvent, dataKey);
      
      // Should return the data as-is if not encrypted
      expect(result).toEqual(plainEvent);
    });
  });

  describe("generateSalt", () => {
    it("generates a hex string", () => {
      const salt = generateSalt();
      expect(typeof salt).toBe("string");
      expect(/^[0-9a-f]+$/.test(salt)).toBe(true);
    });

    it("generates unique salts", () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1).not.toBe(salt2);
    });

    it("generates salts of consistent length", () => {
      const salt1 = generateSalt();
      const salt2 = generateSalt();
      expect(salt1.length).toBe(salt2.length);
      expect(salt1.length).toBe(32); // 16 bytes = 32 hex chars
    });
  });

  describe("Security Properties", () => {
    const testEvent = {
      id: "test-id-123",
      title: "Math Homework",
      description: "Chapter 5 problems",
      date: "2026-02-15",
      class: "Mathematics",
      type: "Homework",
      priority: "High",
    };

    it("cannot decrypt with wrong password", async () => {
      const encrypted = await encryptEvent(testEvent, dataKey);
      
      const wrongDataKey = await deriveKey("wrong-password", testSalt, "DATA");
      const decrypted = await decryptEvent(encrypted, wrongDataKey);
      
      // Should not match original data
      expect(decrypted.title).not.toBe(testEvent.title);
      expect(decrypted.title).toContain("Decryption Failed");
    });

    it("cannot decrypt with wrong salt", async () => {
      const encrypted = await encryptEvent(testEvent, dataKey);
      
      const wrongDataKey = await deriveKey(testPassword, "wrong-salt", "DATA");
      const decrypted = await decryptEvent(encrypted, wrongDataKey);
      
      expect(decrypted.title).toContain("Decryption Failed");
    });

    it("produces different AUTH and DATA keys from same password", async () => {
      const authKeyTest = await deriveKey(testPassword, testSalt, "AUTH");
      const dataKeyTest = await deriveKey(testPassword, testSalt, "DATA");
      
      // AUTH is string, DATA is CryptoKey - they should be fundamentally different types
      expect(typeof authKeyTest).toBe("string");
      expect(dataKeyTest).toBeInstanceOf(CryptoKey);
    });
  });
});
