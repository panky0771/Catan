import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { PLAYER_COLORS, PlayerColor } from '../../types/game.types';

// =============================================
// TopBar: shows all other players' info
// =============================================

const TopBar: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  if (!gameState) return null;

  const myId = gameState.myPlayer?.id;
  const otherPlayers = gameState.players.filter((p) => p.id !== myId);
  const currentPlayer = gameState.players[gameState.currentPlayerIndex];

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-catan-panel border-b border-catan-border overflow-x-auto">
      {/* Game info */}
      <div className="flex-shrink-0 text-xs text-gray-400 mr-2">
        <div>Turn {gameState.turnNumber}</div>
        <div className="text-catan-wheat">VPs to win: {gameState.settings.victoryPointsToWin}</div>
      </div>

      {/* Special awards */}
      <div className="flex-shrink-0 flex flex-col gap-1 mr-3">
        {gameState.longestRoadHolder && (
          <div className="text-xs bg-yellow-800/50 border border-yellow-600 rounded px-2 py-0.5">
            🛣️ {gameState.players.find((p) => p.id === gameState.longestRoadHolder)?.username}
          </div>
        )}
        {gameState.largestArmyHolder && (
          <div className="text-xs bg-red-800/50 border border-red-600 rounded px-2 py-0.5">
            ⚔️ {gameState.players.find((p) => p.id === gameState.largestArmyHolder)?.username}
          </div>
        )}
      </div>

      {/* Other players */}
      <div className="flex gap-2 flex-1">
        {otherPlayers.map((player) => {
          const isCurrentTurn = player.id === currentPlayer?.id;
          const colorHex = PLAYER_COLORS[player.color as PlayerColor];

          return (
            <motion.div
              key={player.id}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex-shrink-0 rounded-lg border p-2 min-w-[130px] transition-all ${
                isCurrentTurn
                  ? 'border-yellow-400 bg-yellow-900/20 shadow-lg shadow-yellow-400/20'
                  : 'border-catan-border bg-catan-bg'
              } ${!player.isConnected ? 'opacity-50' : ''}`}
            >
              {/* Player name + color */}
              <div className="flex items-center gap-1.5 mb-1">
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-black/30"
                  style={{ backgroundColor: colorHex }}
                />
                <span className="text-xs font-semibold truncate max-w-[80px]">
                  {player.username}
                </span>
                {!player.isConnected && (
                  <span className="text-red-400 text-xs" title="Disconnected">⚠</span>
                )}
                {isCurrentTurn && (
                  <span className="text-yellow-400 text-xs animate-pulse">▶</span>
                )}
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-2 text-xs text-gray-300">
                {/* Victory Points */}
                <div className="flex items-center gap-0.5" title="Victory Points">
                  <span className="text-yellow-400">⭐</span>
                  <span className="font-mono">{player.publicVictoryPoints}</span>
                </div>

                {/* Resource cards */}
                <div className="flex items-center gap-0.5" title="Resource cards">
                  <span>🃏</span>
                  <span className="font-mono">{player.resourceCount}</span>
                </div>

                {/* Dev cards */}
                <div className="flex items-center gap-0.5" title="Development cards">
                  <span>🎴</span>
                  <span className="font-mono">{player.devCardCount}</span>
                </div>
              </div>

              {/* Knights played */}
              {player.knightsPlayed > 0 && (
                <div className="text-xs text-gray-400 mt-0.5">
                  ⚔️ {player.knightsPlayed} knights
                </div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Dev card deck count */}
      <div className="flex-shrink-0 ml-2 text-center">
        <div className="text-xs text-gray-400">Deck</div>
        <div className="text-sm font-bold text-purple-300">{gameState.devCardDeckSize}</div>
        <div className="text-xs text-gray-500">cards</div>
      </div>
    </div>
  );
};

export default TopBar;
