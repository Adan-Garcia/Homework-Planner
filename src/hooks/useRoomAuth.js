import { useState, useEffect } from "react";
import { API_BASE_URL } from "../utils/constants";
import { deriveKey } from "../utils/crypto";

export const useRoomAuth = (roomId, roomPassword) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isNewRoom, setIsNewRoom] = useState(false);

  useEffect(() => {
    // Reset state if inputs are invalid or changed
    if (!roomId) {
      setIsAuthorized(false);
      setAuthToken(null);
      setCryptoKey(null);
      setAuthError(null);
      setIsNewRoom(false);
      return;
    }

    // Only attempt auth if we have both ID and Password
    if (!roomPassword) {
      // Just waiting for password, reset auth state
      setIsAuthorized(false);
      return;
    }

    let mounted = true;

    const authenticate = async () => {
      setAuthError(null);
      try {
        // 1. Init: Get Salt
        const initRes = await fetch(`${API_BASE_URL}/api/auth/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });

        if (!initRes.ok) throw new Error("Failed to initialize room");
        const { salt, isNew } = await initRes.json();

        if (mounted) setIsNewRoom(isNew);

        // 2. Derive Keys
        // Key 1: For Authentication (String)
        const authHash = await deriveKey(roomPassword, salt, "AUTH");
        // Key 2: For Data Encryption (CryptoKey Object) - KEEP PRIVATE
        const dataKey = await deriveKey(roomPassword, salt, "DATA");

        // 3. Login / Register
        const authRes = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, authHash, salt }),
        });

        const authData = await authRes.json();

        if (!authRes.ok) {
          throw new Error(authData.error || "Authentication failed");
        }

        if (mounted) {
          setAuthToken(authData.token);
          setCryptoKey(dataKey);
          setIsAuthorized(true);
        }
      } catch (err) {
        console.error("Auth Error:", err);
        if (mounted) {
          setAuthError(err.message);
          setIsAuthorized(false);
        }
      }
    };

    // Debounce slightly to avoid rapid requests while typing
    const timer = setTimeout(() => {
      authenticate();
    }, 500);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [roomId, roomPassword]);

  return { isAuthorized, authToken, cryptoKey, authError, isNewRoom };
};
