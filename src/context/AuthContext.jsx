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
  
  const [roomId, setRoomId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("planner_curr_room_id"));
    } catch {
      return null;
    }
  });

  
  const [roomPassword, setRoomPassword] = useState("");

  
  useEffect(() => {
    if (roomId)
      localStorage.setItem("planner_curr_room_id", JSON.stringify(roomId));
    else localStorage.removeItem("planner_curr_room_id");
  }, [roomId]);

  const { isAuthorized, authToken, cryptoKey, authError, isNewRoom } =
    useRoomAuth(roomId, roomPassword);

  
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
      disconnectRoom, 
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
