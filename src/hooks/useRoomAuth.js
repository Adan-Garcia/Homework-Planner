import { useState, useEffect, useRef } from "react";
import { getApiBaseUrl, AUTH_DEBOUNCE_MS } from "../utils/constants";
import { deriveKey } from "../utils/crypto";
import logger from "../utils/logger";

// Rate limiting constants
const MAX_AUTH_ATTEMPTS = 5;
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const LOCKOUT_DURATION_MS = 300000; // 5 minutes after too many failures

/**
 * useRoomAuth Hook
 * 
 * Handles the secure authentication handshake with the backend server.
 * 
 * **Authentication Flow:**
 * 1. **Init**: Client requests salt for the given Room ID
 * 2. **Derivation**: Client derives AUTH and DATA keys from password + salt using PBKDF2
 * 3. **Login**: Client sends AUTH hash to server for verification
 * 4. **Token**: Server returns JWT token if hash matches stored value
 * 
 * **Security Features:**
 * - Client-side rate limiting (5 attempts/minute, 5-minute lockout)
 * - Password never transmitted to server
 * - DATA encryption key never leaves client device
 * - High PBKDF2 iteration count (600k) prevents brute force
 * 
 * **Zero-Knowledge Architecture:**
 * The server only stores a hash of the AUTH key. It cannot decrypt user data
 * because the DATA key is derived separately and never transmitted.
 * 
 * @param {string|null} roomId - The unique room identifier (6-char hex)
 * @param {string} roomPassword - The user's room password (not persisted)
 * @returns {{isAuthorized: boolean, authToken: string|null, cryptoKey: CryptoKey|null, authError: string|null, isNewRoom: boolean}}
 * 
 * @example
 * const { isAuthorized, authToken, cryptoKey } = useRoomAuth("ABC123", "myPassword");
 * if (isAuthorized) {
 *   // Can now make authenticated API calls and encrypt/decrypt data
 * }
 */
export const useRoomAuth = (roomId, roomPassword) => {
  const [isAuthorizing, setIsAuthorizing] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authToken, setAuthToken] = useState(null);
  const [cryptoKey, setCryptoKey] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [isNewRoom, setIsNewRoom] = useState(false);
  const requestIdRef = useRef(0);
  
  // Rate limiting state
  const failedAttemptsRef = useRef([]);
  const lockoutUntilRef = useRef(0);

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
    const requestId = ++requestIdRef.current;
    const controller = new AbortController();

    const authenticate = async () => {
      setAuthError(null);
      setIsAuthorizing(true);
      
      // Check if user is locked out due to too many failed attempts
      const now = Date.now();
      if (lockoutUntilRef.current > now) {
        const remainingSeconds = Math.ceil((lockoutUntilRef.current - now) / 1000);
        setAuthError(`Too many failed attempts. Please wait ${remainingSeconds} seconds.`);
        setIsAuthorized(false);
        return;
      }
      
      // Clean up old attempts outside the rate limit window
      failedAttemptsRef.current = failedAttemptsRef.current.filter(
        timestamp => now - timestamp < RATE_LIMIT_WINDOW_MS
      );
      
      // Check if user has exceeded rate limit
      if (failedAttemptsRef.current.length >= MAX_AUTH_ATTEMPTS) {
        lockoutUntilRef.current = now + LOCKOUT_DURATION_MS;
        setAuthError(`Too many failed attempts. Please wait ${LOCKOUT_DURATION_MS / 60000} minutes.`);
        setIsAuthorized(false);
        return;
      }
      
      try {
        // Step 1: Initialize (Get Salt)
        const initRes = await fetch(`${getApiBaseUrl()}/api/auth/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
          signal: controller.signal,
        });

        if (!initRes.ok) throw new Error("Failed to initialize room");
        const { salt, isNew } = await initRes.json();

        if (requestId !== requestIdRef.current) return;

        if (mounted) setIsNewRoom(isNew);

        // Step 2: Client-side Key Derivation
        // Heavy computation (PBKDF2) happens here to prevent brute-force attacks
        const authHash = await deriveKey(roomPassword, salt, "AUTH");
        const dataKey = await deriveKey(roomPassword, salt, "DATA");

        if (requestId !== requestIdRef.current) {
          // Request was superseded, clean up and exit
          if (mounted) {
            setIsAuthorized(false);
            setAuthToken(null);
            setCryptoKey(null);
          }
          return;
        }

        // Step 3: Login (Send Proof)
        const authRes = await fetch(`${getApiBaseUrl()}/api/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId, authHash, salt }),
          signal: controller.signal,
        });

        const authData = await authRes.json();

        if (!authRes.ok) {
          // Record failed attempt
          failedAttemptsRef.current.push(Date.now());
          throw new Error(authData.error || "Authentication failed");
        }

        if (mounted && requestId === requestIdRef.current) {
          // Success: Clear failed attempts and store the JWT and the Data Key in memory
          failedAttemptsRef.current = [];
          lockoutUntilRef.current = 0;
          setAuthToken(authData.token);
          setCryptoKey(dataKey);
          setIsAuthorized(true);
          setIsAuthorizing(false);
        }
      } catch (err) {
        if (err.name === "AbortError") return;
        logger.error("Auth Error:", err);
        if (mounted) {
          setAuthError(err.message);
          setIsAuthorized(false);
          setIsAuthorizing(false);
        }
      }
    };

    // Debounce the auth call slightly to avoid thrashing on rapid typing
    const timer = setTimeout(() => {
      authenticate();
    }, AUTH_DEBOUNCE_MS);

    return () => {
      mounted = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [roomId, roomPassword]);

  return { isAuthorizing, isAuthorized, authToken, cryptoKey, authError, isNewRoom };
};