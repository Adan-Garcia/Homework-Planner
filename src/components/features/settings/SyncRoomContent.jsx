import React from "react";
import { Users, LogOut } from "lucide-react";
import { useUI } from "../../../context/PlannerContext";
import { useData } from "../../../context/DataContext";

const SyncRoomContent = () => {
  const { roomId, setRoomId, isHost, peers, setRoomPassword, syncError } =
    useData();
  const { setView, closeModal } = useUI();

  const handleLeaveAndSetup = () => {
    setRoomId(null);
    setRoomPassword("");
    setView("setup");
    closeModal("settings");
  };

  const handleConnect = () => {
    setView("setup");
    closeModal("settings");
  };

  return (
    <div className="space-y-3">
      {syncError && (
        <div className="p-2 rounded-lg text-xs status-error">
          {syncError}
        </div>
      )}

      {roomId ? (
        <div className="space-y-2">
          <div className="p-3 rounded-lg status-active-room">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-bold status-text-active">
                Active Room: {roomId}
              </span>
            </div>
            <div className="flex flex-col gap-1 text-[10px] text-secondary">
              <div className="flex items-center gap-1">
                <div
                  className={`w-2 h-2 rounded-full ${
                    isHost ? "status-dot-host" : "status-dot-peer"
                  }`}
                />
                <span>Role: {isHost ? "Host" : "Peer"}</span>
              </div>
              <div className="flex items-center gap-1">
                <Users className="icon-xs" />
                <span>Peers connected: {peers ? peers.length : 0}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLeaveAndSetup}
            className="w-full btn-base btn-danger-soft"
          >
            <LogOut className="icon-xs" /> Leave & Switch Room
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-[10px] text-center leading-relaxed text-secondary">
            You are currently working offline. To create or join a multiplayer
            room, please return to the setup screen.
          </p>
          <button
            onClick={handleConnect}
            className="w-full px-3 py-2 rounded-lg text-xs font-bold transition-colors btn-primary"
          >
            Go to Connection Setup
          </button>
        </div>
      )}
    </div>
  );
};

export default SyncRoomContent;