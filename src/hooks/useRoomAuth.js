import { useState, useEffect } from "react";
import { API_BASE_URL } from "../utils/constants";
import { deriveKey } from "../utils/crypto";

/**
 * Custom Hook: useRoomAuth
 * * Handles the secure authentication handshake with the backend.
 * * Flow:
 * 1. Init: Client sends Room ID to server.
 * 2. Challenge: Server responds with a unique 'salt' and whether the room is new.
 * 3. Derivation: Client locally derives two keys from the user's password + salt:
 * - AUTH Key (HMAC): Proof of identity.
 * - DATA Key (AES-GCM): Encryption key for personal data.
 * 4. Login: Client sends the Room ID and the derived AUTH hash to the server.
 * 5. Token: If hash matches, server returns a JWT (session token).
 * * Note: The server NEVER receives the raw password or the DATA encryption key.
 */
export const useRoomAuth = (roomId, roomPassword) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isNewRoom, setIsNewRoom] = useState(false);

  useEffect(() => {
    
    if (!roomId) {
      setIsAuthorized(false);
      setAuthToken(null);
      setCryptoKey(null);
      setAuthError(null);
      setIsNewRoom(false);
      return;
    }

    
    if (!roomPassword) {
      // Waiting for user to input password
      setIsAuthorized(false);
      return;
    }

    let mounted = true;

    const authenticate = async () => {
      setAuthError(null);
      try {
        // Step 1: Initialize (Get Salt)
        const initRes = await fetch(`${API_BASE_URL}/api/auth/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });

        if (!initRes.ok) throw new Error("Failed to initialize room");
        const { salt, isNew } = await initRes.json();

        if (mounted) setIsNewRoom(isNew);

        // Step 2: Client-side Key Derivation
        // Heavy computation (PBKDF2) happens here to prevent brute-force attacks
        const authHash = await deriveKey(roomPassword, salt, "AUTH");
        
        const dataKey = await deriveKey(roomPassword, salt, "DATA");

        // Step 3: Login (Send Proof)
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
          // Success: Store the JWT and the Data Key in memory
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

    // Debounce the auth call slightly to avoid thrashing on rapid typing
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