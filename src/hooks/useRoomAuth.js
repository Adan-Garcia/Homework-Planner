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
    
    if (!roomId) {
      setIsAuthorized(false);
      setAuthToken(null);
      setCryptoKey(null);
      setAuthError(null);
      setIsNewRoom(false);
      return;
    }

    
    if (!roomPassword) {
      
      setIsAuthorized(false);
      return;
    }

    let mounted = true;

    const authenticate = async () => {
      setAuthError(null);
      try {
        
        const initRes = await fetch(`${API_BASE_URL}/api/auth/init`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });

        if (!initRes.ok) throw new Error("Failed to initialize room");
        const { salt, isNew } = await initRes.json();

        if (mounted) setIsNewRoom(isNew);

        
        
        const authHash = await deriveKey(roomPassword, salt, "AUTH");
        
        const dataKey = await deriveKey(roomPassword, salt, "DATA");

        
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
