import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLobbyStore } from '../../store/lobbyStore';
import { useAuthStore } from '../../store/authStore';
import { PLAYER_COLORS, PlayerColor } from '../../types/game.types';
import GameSettings from './GameSettings';

// =============================================
// LobbyRoom: pre-game lobby UI
// =============================================

const LobbyRoom: React.FC<{
  onGameStart: (roomCode: string) => void;
  onLeave: () => void;
}> = ({ onGameStart, onLeave }) => {
  const lobby = useLobbyStore((s) => s.lobby);
  const isLoading = useLobbyStore((s) => s.isLoading);
  const error = useLobbyStore((s) => s.error);
  const { setReady, startGame, leaveRoom } = useLobbyStore();
  const currentUser = useAuthStore((s) => s.user);
  const [copied, setCopied] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  if (!lobby) return null;

  const myPlayer = lobby.players.find((p) => p.id === currentUser?.id);
  const isHost = myPlayer?.isHost ?? false;
  const allReady = lobby.players.every((p) => p.isReady || p.isHost);
  const canStart = isHost && lobby.players.length >= 3 && allReady;

  const copyRoomCode = () => {
    navigator.clipboard.writeText(lobby.roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStart = async () => {
    try {
      await startGame();
      onGameStart(lobby.roomCode);
    } catch (err) {
      // error shown via store
    }
  };

  const handleLeave = () => {
    leaveRoom();
    onLeave();
  };

  return (
    <div className="min-h-screen bg-catan-bg flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl"
      >
        {/* Room code */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold font-display text-yellow-400 mb-2">Game Lobby</h1>
          <div className="flex items-center justify-center gap-3">
            <div className="bg-catan-panel border-2 border-yellow-600 rounded-xl px-6 py-3">
              <div className="text-xs text-gray-400 mb-1">Room Code</div>
              <div className="text-3xl font-mono font-bold text-yellow-300 tracking-widest">
                {lobby.roomCode}
              </div>
            </div>
            <button
              onClick={copyRoomCode}
              className="p-3 rounded-xl bg-catan-panel border border-catan-border hover:border-yellow-600 transition-colors"
              title="Copy room code"
            >
              {copied ? '✓' : '📋'}
            </button>
          </div>
          <p className="text-gray-400 text-sm mt-2">Share this code with friends to join</p>
        </div>

        {/* Players list */}
        <div className="bg-catan-panel rounded-2xl border border-catan-border p-4 mb-4">
          <h3 className="text-sm font-semibold text-gray-400 mb-3">
            Players ({lobby.players.length}/{lobby.settings.maxPlayers})
          </h3>
          <div className="space-y-2">
            <AnimatePresence>
              {lobby.players.map((player, idx) => {
                const color = PLAYER_COLORS[(['red', 'blue', 'green', 'orange', 'white'] as PlayerColor[])[idx]];
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="flex items-center justify-between p-3 rounded-xl bg-catan-bg border border-catan-border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-4 h-4 rounded-full border-2 border-black/30"
                        style={{ backgroundColor: color }}
                      />
                      <span className="font-medium">{player.username}</span>
                      {player.isHost && (
                        <span className="text-xs bg-yellow-900/40 border border-yellow-700 rounded px-1.5 py-0.5 text-yellow-400">
                          Host
                        </span>
                      )}
                      {!player.isConnected && (
                        <span className="text-xs text-red-400">Disconnected</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {player.isHost ? (
                        <span className="text-xs text-gray-500">Auto-ready</span>
                      ) : (
                        <span
                          className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                            player.isReady
                              ? 'bg-green-900/40 text-green-400 border border-green-700'
                              : 'bg-gray-800 text-gray-500'
                          }`}
                        >
                          {player.isReady ? '✓ Ready' : 'Not Ready'}
                        </span>
                      )}
                      {isHost && !player.isHost && (
                        <button
                          onClick={() => useLobbyStore.getState().kickPlayer(player.id)}
                          className="text-xs text-red-400 hover:text-red-300 px-1"
                          title="Kick player"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>

            {/* Empty slots */}
            {Array.from({ length: lobby.settings.maxPlayers - lobby.players.length }, (_, i) => (
              <div
                key={`empty-${i}`}
                className="p-3 rounded-xl bg-catan-bg border border-dashed border-catan-border text-gray-600 text-sm"
              >
                Waiting for player...
              </div>
            ))}
          </div>
        </div>

        {/* Settings preview */}
        <div className="bg-catan-panel rounded-2xl border border-catan-border p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-gray-400">Game Settings</h3>
            {isHost && (
              <button
                onClick={() => setShowSettings(!showSettings)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                {showSettings ? 'Close' : 'Edit'}
              </button>
            )}
          </div>
          {showSettings && isHost ? (
            <GameSettings />
          ) : (
            <div className="flex gap-4 text-sm text-gray-300">
              <span>🏆 {lobby.settings.victoryPointsToWin} VP to win</span>
              <span>⏱️ {lobby.settings.turnTimerSeconds > 0 ? `${lobby.settings.turnTimerSeconds}s timer` : 'No timer'}</span>
              <span>👥 Up to {lobby.settings.maxPlayers} players</span>
            </div>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-900/30 border border-red-600 text-red-300 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleLeave}
            className="flex-1 py-3 rounded-xl border border-catan-border text-gray-400 hover:bg-catan-border transition-colors"
          >
            ← Leave Room
          </button>

          {!isHost && myPlayer && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setReady(!myPlayer.isReady)}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                myPlayer.isReady
                  ? 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
                  : 'bg-green-700 hover:bg-green-600 text-white shadow-lg shadow-green-900/50'
              }`}
            >
              {myPlayer.isReady ? '✓ Ready (click to unready)' : '✓ Ready Up'}
            </motion.button>
          )}

          {isHost && (
            <motion.button
              whileHover={canStart ? { scale: 1.02 } : {}}
              whileTap={canStart ? { scale: 0.95 } : {}}
              onClick={handleStart}
              disabled={!canStart || isLoading}
              className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                canStart
                  ? 'bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-gray-900 shadow-lg shadow-yellow-900/50'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              {isLoading ? '⏳ Starting...' : canStart ? '🚀 Start Game' : `Need ${3 - lobby.players.length > 0 ? `${3 - lobby.players.length} more players` : 'all players ready'}`}
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default LobbyRoom;
