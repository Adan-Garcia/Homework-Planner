import React, { createContext, useContext, useState, useEffect } from "react";
import { useRoomAuth } from "../hooks/useRoomAuth";

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  // TODO: Refactor this to SessionStorage or Memory when UI permits
  const [roomId, setRoomId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("planner_curr_room_id"));
    } catch {
      return null;
    }
  });

  const [roomPassword, setRoomPassword] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("planner_curr_room_pass"));
    } catch {
      return "";
    }
  });

  // Persist (Legacy placeholder logic)
  useEffect(() => {
    if (roomId)
      localStorage.setItem("planner_curr_room_id", JSON.stringify(roomId));
    else localStorage.removeItem("planner_curr_room_id");
  }, [roomId]);

  useEffect(() => {
    if (roomPassword)
      localStorage.setItem(
        "planner_curr_room_pass",
        JSON.stringify(roomPassword),
      );
    else localStorage.removeItem("planner_curr_room_pass");
  }, [roomPassword]);

  const { isAuthorized, authToken, cryptoKey, authError, isNewRoom } =
    useRoomAuth(roomId, roomPassword);

  const disconnectRoom = () => {
    setRoomId(null);
    setRoomPassword("");
    // Clear legacy storage
    localStorage.removeItem("planner_curr_room_id");
    localStorage.removeItem("planner_curr_room_pass");
  };

  return (
    <AuthContext.Provider
      value={{
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
