import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
} from "react";
import { useRoomAuth } from "../hooks/useRoomAuth";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

/**
 * AuthProvider Component
 * * Manages the global authentication state of the application.
 * * Responsibilities:
 * 1. Room Persistence: Remembers the last used `roomId` in localStorage.
 * 2. Password Handling: Manages the temporary `roomPassword` input (never stored).
 * 3. Hook Integration: Wraps the `useRoomAuth` hook to expose auth status, tokens, and keys.
 */
export const AuthProvider = ({ children }) => {
  
  // Initialize Room ID from LocalStorage if available
  const [roomId, setRoomId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("planner_curr_room_id"));
    } catch {
      return null;
    }
  });

  // Password is deliberately NOT persisted in localStorage for security
  const [roomPassword, setRoomPassword] = useState("");

  // Sync Room ID changes to LocalStorage
  useEffect(() => {
    if (roomId)
      localStorage.setItem("planner_curr_room_id", JSON.stringify(roomId));
    else localStorage.removeItem("planner_curr_room_id");
  }, [roomId]);

  // Execute the authentication handshake hook
  const { isAuthorized, authToken, cryptoKey, authError, isNewRoom } =
    useRoomAuth(roomId, roomPassword);

  // Logout / Switch Room handler
  const disconnectRoom = useCallback(() => {
    setRoomId(null);
    setRoomPassword("");
    localStorage.removeItem("planner_curr_room_id");
  }, []);

  const value = useMemo(
    () => ({
      roomId,
      setRoomId,
      roomPassword,
      setRoomPassword,
      isAuthorized, // True if we have valid tokens + keys
      authToken,    // JWT for API requests
      cryptoKey,    // AES-GCM key for decryption
      authError,
      isNewRoom,    // True if we just created this room
      disconnectRoom,
    }),
    [
      roomId,
      roomPassword,
      isAuthorized,
      authToken,
      cryptoKey,
      authError,
      isNewRoom,
      disconnectRoom, 
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};