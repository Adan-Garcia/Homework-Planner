import React, { useState } from "react";
import { Lock, LogOut, WifiOff } from "lucide-react";
import Modal from "../../ui/Modal";
import Button from "../../ui/Button";
import { useAuth } from "../../../context/AuthContext";

const ReLoginModal = ({ isOpen, onClose, onOffline }) => {
  const { roomId, setRoomPassword, disconnectRoom, authError } = useAuth();
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (password.trim()) {
      setRoomPassword(password);
    }
  };

  const handleDisconnect = () => {
    disconnectRoom();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title={`Unlock Room ${roomId}`}>
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="status-warning text-xs">
          For security, your password is not saved. Please re-enter it to sync.
        </div>

        <div>
          <label htmlFor="room-password" className="block text-xs font-bold text-secondary uppercase mb-1">
            Room Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-secondary" />
            <input
              type="password"
              id="room-password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 p-2.5 rounded-lg surface-input text-input text-sm"
              placeholder="Enter password..."
            />
          </div>
        </div>

        {authError && (
          <p className="status-error text-xs font-bold">{authError}</p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <Button
            type="submit"
            className="w-full py-2 text-sm font-bold shadow-md"
          >
            Unlock & Sync
          </Button>

          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              onClick={onOffline}
              variant="ghost"
              className="flex-1 py-2 text-xs font-bold gap-1"
            >
              <WifiOff className="w-3 h-3" /> Work Offline
            </Button>
            <Button
              type="button"
              onClick={handleDisconnect}
              variant="danger"
              className="flex-1 py-2 text-xs font-bold gap-1"
            >
              <LogOut className="w-3 h-3" /> Switch Room
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ReLoginModal;
