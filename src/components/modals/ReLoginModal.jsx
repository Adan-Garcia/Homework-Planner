import React, { useState } from "react";
import { Lock, LogOut, WifiOff } from "lucide-react";
import Modal from "../ui/Modal";
import { useAuth } from "../../context/AuthContext";

const ReLoginModal = ({ isOpen, onClose, onOffline }) => {
  const { roomId, setRoomPassword, disconnectRoom, authError } = useAuth();
  const [password, setPassword] = useState("");

  const handleLogin = (e) => {
    e.preventDefault();
    if (password.trim()) {
      setRoomPassword(password);
      // The modal remains open until 'isAuthorized' changes in App.jsx,
      // or we can show a loading state here if we passed it down.
    }
  };

  const handleDisconnect = () => {
    disconnectRoom();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={() => {}} title={`Unlock Room ${roomId}`}>
      <form onSubmit={handleLogin} className="space-y-4">
        <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30 text-xs text-amber-800 dark:text-amber-400">
          For security, your password is not saved. Please re-enter it to sync.
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase mb-1">
            Room Password
          </label>
          <div className="relative">
            <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-9 p-2.5 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 dark:text-white text-sm"
              placeholder="Enter password..."
            />
          </div>
        </div>

        {authError && (
          <p className="text-xs text-red-500 font-bold">{authError}</p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          <button
            type="submit"
            className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700 shadow-md"
          >
            Unlock & Sync
          </button>

          <div className="flex gap-2 mt-2">
            <button
              type="button"
              onClick={onOffline}
              className="flex-1 py-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
            >
              <WifiOff className="w-3 h-3" /> Work Offline
            </button>
            <button
              type="button"
              onClick={handleDisconnect}
              className="flex-1 py-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-lg text-xs font-bold flex items-center justify-center gap-1"
            >
              <LogOut className="w-3 h-3" /> Switch Room
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};

export default ReLoginModal;
