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

export const AuthProvider = ({ children }) => {
  // Persist Room ID so we know where to return, but DO NOT persist password
  const [roomId, setRoomId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("planner_curr_room_id"));
    } catch {
      return null;
    }
  });

  // SECURITY FIX: Initialize empty, do not read from LocalStorage
  const [roomPassword, setRoomPassword] = useState("");

  // Persist Room ID only
  useEffect(() => {
    if (roomId)
      localStorage.setItem("planner_curr_room_id", JSON.stringify(roomId));
    else localStorage.removeItem("planner_curr_room_id");
  }, [roomId]);

  const { isAuthorized, authToken, cryptoKey, authError, isNewRoom } =
    useRoomAuth(roomId, roomPassword);

  // REFACTOR: Wrap in useCallback to prevent stale closure / unnecessary re-renders
  const disconnectRoom = useCallback(() => {
    setRoomId(null);
    setRoomPassword("");
    localStorage.removeItem("planner_curr_room_id");
  }, []);

  // MEMOIZATION FIX: Prevent context consumers from re-rendering on every parent render
  const value = useMemo(
    () => ({
      roomId,
      setRoomId,
      roomPassword,
      setRoomPassword,
      isAuthorized,
      authToken,
      cryptoKey,
      authError,
      isNewRoom,
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
      disconnectRoom, // Added to dependency array
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
