import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { RESOURCE_TYPES, RESOURCE_ICONS, ResourceCards } from '../../types/game.types';
import toast from 'react-hot-toast';

// =============================================
// ActionPanel: turn actions and state prompts
// =============================================

const DiscardModal: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const discardResources = useGameStore((s) => s.discardResources);
  const myPlayer = gameState?.myPlayer;
  const [toDiscard, setToDiscard] = React.useState<ResourceCards>({
    wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0,
  });

  if (!myPlayer || !gameState?.mustDiscardPlayers.includes(myPlayer.id)) return null;

  const required = gameState.discardAmounts[myPlayer.id] ?? 0;
  const totalSelected = RESOURCE_TYPES.reduce((s, r) => s + (toDiscard[r] ?? 0), 0);

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-catan-panel border border-red-600 rounded-2xl p-6 w-96"
      >
        <h3 className="text-xl font-bold text-red-400 mb-2">⚠ Discard Resources</h3>
        <p className="text-sm text-gray-300 mb-4">
          A 7 was rolled! You have {myPlayer.resourceCount} resources and must discard{' '}
          <span className="font-bold text-red-300">{required}</span>.
          <br />Selected: {totalSelected}/{required}
        </p>

        <div className="flex gap-2 justify-center mb-4">
          {RESOURCE_TYPES.map((r) => {
            const have = myPlayer.resources[r] ?? 0;
            const discarding = toDiscard[r] ?? 0;
            return (
              <div key={r} className="flex flex-col items-center gap-1">
                <span className="text-lg">{RESOURCE_ICONS[r]}</span>
                <span className="text-xs text-gray-400">{have}</span>
                <button
                  className="w-6 h-5 text-xs rounded bg-gray-700 hover:bg-gray-600"
                  onClick={() => setToDiscard(p => ({ ...p, [r]: Math.min(have, discarding + 1) }))}
                  disabled={totalSelected >= required || discarding >= have}
                >+</button>
                <span className="text-sm font-bold text-red-300">{discarding}</span>
                <button
                  className="w-6 h-5 text-xs rounded bg-gray-700 hover:bg-gray-600"
                  onClick={() => setToDiscard(p => ({ ...p, [r]: Math.max(0, discarding - 1) }))}
                  disabled={discarding <= 0}
                >-</button>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => { if (totalSelected === required) discardResources(toDiscard); }}
          disabled={totalSelected !== required}
          className="w-full py-2 rounded-lg bg-red-700 hover:bg-red-600 font-bold disabled:opacity-50"
        >
          Discard {required} Cards
        </button>
      </motion.div>
    </div>
  );
};

const StealModal: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const { stealResource } = useGameStore();
  const myPlayer = gameState?.myPlayer;

  // Show steal modal when robber just moved and targets are available
  // We detect this by checking if turnPhase changed to post_roll after move_robber
  // The server sends robbable targets - we'd need to track them in state
  // For simplicity, use the game event system

  return null; // Handled via event notification
};

const ActionPanel: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const buildMode = useGameStore((s) => s.buildMode);
  const { endTurn, clearBuildMode } = useGameStore();
  const actionError = useGameStore((s) => s.actionError);
  const isLoading = useGameStore((s) => s.isLoading);

  React.useEffect(() => {
    if (actionError) {
      toast.error(actionError, { duration: 3000 });
    }
  }, [actionError]);

  if (!gameState) return null;

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const myPlayer = gameState.myPlayer;
  const mustDiscard = myPlayer && gameState.mustDiscardPlayers.includes(myPlayer.id);

  return (
    <>
      {/* Discard modal - shown to ANY player who must discard */}
      <AnimatePresence>{mustDiscard && <DiscardModal />}</AnimatePresence>

      <div className="flex flex-col gap-2 p-3 bg-catan-panel rounded-xl border border-catan-border">
        {/* Current turn indicator */}
        <div className="text-sm">
          {isMyTurn ? (
            <span className="text-yellow-400 font-semibold animate-pulse">▶ Your Turn</span>
          ) : (
            <span className="text-gray-400">
              ⏳ {currentPlayer?.username}'s turn
            </span>
          )}
          <span className="text-xs text-gray-500 ml-2 capitalize">
            ({gameState.turnPhase.replace(/_/g, ' ')})
          </span>
        </div>

        {/* Active build mode indicator */}
        {buildMode.type && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-between p-2 rounded-lg bg-blue-900/30 border border-blue-600"
          >
            <span className="text-xs text-blue-300">
              {{
                settlement: '🏠 Click a location to place settlement',
                city: '🏰 Click your settlement to upgrade',
                road: '🛤️ Click an edge to place road',
                robber: '🏴 Click a hex to move robber',
              }[buildMode.type]}
            </span>
            <button onClick={clearBuildMode} className="text-xs text-gray-400 hover:text-white ml-2">
              ✕ Cancel
            </button>
          </motion.div>
        )}

        {/* Phase-specific prompts */}
        {isMyTurn && gameState.turnPhase === 'move_robber' && !buildMode.type && (
          <motion.div
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            className="p-2 rounded-lg bg-red-900/30 border border-red-600 text-xs text-red-300"
          >
            🏴 You must move the robber to a new hex!
            <button
              onClick={() => useGameStore.getState().setBuildMode({ type: 'robber' })}
              className="ml-2 underline cursor-pointer"
            >
              Select hex
            </button>
          </motion.div>
        )}

        {isMyTurn && gameState.mustDiscardPlayers.length > 0 && (
          <div className="text-xs text-red-400">
            ⚠ Waiting for players to discard: {
              gameState.mustDiscardPlayers
                .map((id) => gameState.players.find((p) => p.id === id)?.username)
                .join(', ')
            }
          </div>
        )}

        {/* End turn button */}
        {isMyTurn && gameState.turnPhase === 'post_roll' && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={endTurn}
            disabled={isLoading || gameState.mustDiscardPlayers.length > 0}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-green-700 to-green-600
                       hover:from-green-600 hover:to-green-500 font-bold text-sm
                       shadow-lg shadow-green-900/50 disabled:opacity-50 disabled:cursor-not-allowed
                       transition-all"
          >
            ✓ End Turn
          </motion.button>
        )}

        {/* VP display */}
        {myPlayer && (
          <div className="flex items-center justify-between text-xs border-t border-catan-border pt-2">
            <span className="text-gray-400">Your Victory Points:</span>
            <span className="text-yellow-400 font-bold text-base">
              ⭐ {myPlayer.publicVictoryPoints}
              {myPlayer.victoryPoints > myPlayer.publicVictoryPoints && (
                <span className="text-purple-400 ml-1">
                  (+{myPlayer.victoryPoints - myPlayer.publicVictoryPoints} hidden)
                </span>
              )}
            </span>
          </div>
        )}
      </div>
    </>
  );
};

export default ActionPanel;
