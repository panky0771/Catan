import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { PLAYER_COLORS, PlayerColor } from '../../types/game.types';

// =============================================
// VictoryScreen: shown when game ends
// =============================================

const VictoryScreen: React.FC<{ onLeave: () => void }> = ({ onLeave }) => {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState || !gameState.winner) return null;

  const winner = gameState.players.find((p) => p.id === gameState.winner);
  const myPlayer = gameState.myPlayer;
  const isWinner = myPlayer?.id === gameState.winner;
  const sortedPlayers = [...gameState.players].sort(
    (a, b) => b.victoryPoints - a.victoryPoints
  );

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0, opacity: 0, rotate: -10 }}
        animate={{ scale: 1, opacity: 1, rotate: 0 }}
        transition={{ type: 'spring', damping: 15 }}
        className="bg-catan-panel border-2 border-yellow-500 rounded-3xl p-8 w-full max-w-md mx-4
                   shadow-2xl shadow-yellow-500/20"
      >
        {/* Trophy */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="text-center text-7xl mb-4"
        >
          🏆
        </motion.div>

        <h2 className="text-3xl font-bold text-center font-display text-yellow-300 mb-1">
          {isWinner ? 'You Win!' : 'Game Over!'}
        </h2>

        {winner && (
          <div className="text-center mb-6">
            <div
              className="text-xl font-bold"
              style={{ color: PLAYER_COLORS[winner.color as PlayerColor] }}
            >
              {winner.username}
            </div>
            <div className="text-gray-400 text-sm">wins with {winner.victoryPoints} victory points</div>
          </div>
        )}

        {/* Leaderboard */}
        <div className="space-y-2 mb-6">
          {sortedPlayers.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex items-center justify-between px-3 py-2 rounded-lg bg-catan-bg
                         border border-catan-border"
            >
              <div className="flex items-center gap-2">
                <span className="text-gray-400 w-5">{i + 1}.</span>
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PLAYER_COLORS[p.color as PlayerColor] }}
                />
                <span className="font-medium">{p.username}</span>
                {p.id === gameState.winner && <span>🏆</span>}
              </div>
              <span className="text-yellow-400 font-bold">⭐ {p.victoryPoints}</span>
            </motion.div>
          ))}
        </div>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={onLeave}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500
                     hover:from-yellow-500 hover:to-yellow-400 font-bold text-gray-900 text-lg
                     shadow-lg shadow-yellow-500/30"
        >
          🏠 Return to Lobby
        </motion.button>
      </motion.div>
    </div>
  );
};

export default VictoryScreen;
