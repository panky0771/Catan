import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';

// =============================================
// DiceDisplay: animated dice + roll button
// =============================================

const DieFace: React.FC<{ value: number; animating: boolean }> = ({ value, animating }) => {
  const dots = getDotPositions(value);

  return (
    <motion.div
      className="w-14 h-14 bg-white rounded-xl shadow-lg flex items-center justify-center relative border-2 border-gray-200"
      animate={
        animating
          ? { rotate: [0, -15, 15, -10, 10, -5, 5, 0], scale: [1, 1.15, 0.9, 1.1, 1] }
          : { rotate: 0, scale: 1 }
      }
      transition={{ duration: 0.6 }}
    >
      <div className="grid grid-cols-3 gap-1 p-2 w-full h-full">
        {Array.from({ length: 9 }, (_, i) => (
          <div key={i} className="flex items-center justify-center">
            {dots.includes(i) && (
              <div className="w-2.5 h-2.5 rounded-full bg-gray-800" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
};

function getDotPositions(value: number): number[] {
  // 0=top-left, 1=top-center, 2=top-right, 3=mid-left, 4=center, 5=mid-right, 6=bot-left, 7=bot-center, 8=bot-right
  const map: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return map[value] ?? [];
}

const DiceDisplay: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const isLoading = useGameStore((s) => s.isLoading);
  const rollDice = useGameStore((s) => s.rollDice);
  const { diceAnimating, lastRoll, triggerDiceAnimation, clearDiceAnimation } = useUIStore();

  const [displayRoll, setDisplayRoll] = useState<[number, number]>([1, 1]);

  useEffect(() => {
    if (!gameState?.lastDiceRoll) return;
    const roll = gameState.lastDiceRoll;
    triggerDiceAnimation(roll);
    setDisplayRoll(roll);
    const t = setTimeout(clearDiceAnimation, 800);
    return () => clearTimeout(t);
  }, [gameState?.lastDiceRoll]);

  const canRoll = isMyTurn && gameState?.turnPhase === 'pre_roll';
  const total = displayRoll[0] + displayRoll[1];

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-catan-panel rounded-xl border border-catan-border">
      <div className="flex gap-3 items-center">
        <DieFace value={displayRoll[0]} animating={diceAnimating} />
        <DieFace value={displayRoll[1]} animating={diceAnimating} />
      </div>

      <AnimatePresence>
        {gameState?.lastDiceRoll && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-2xl font-bold text-yellow-300 font-display"
          >
            {total}
            {total === 7 && <span className="text-red-400 ml-2">🏴</span>}
          </motion.div>
        )}
      </AnimatePresence>

      {canRoll && (
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={rollDice}
          disabled={isLoading}
          className="px-6 py-2 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-bold rounded-lg
                     shadow-lg shadow-yellow-500/30 transition-colors disabled:opacity-50"
        >
          🎲 Roll Dice
        </motion.button>
      )}

      {gameState?.turnPhase === 'pre_roll' && !isMyTurn && (
        <div className="text-xs text-gray-400 text-center">
          Waiting for {gameState.players[gameState.currentPlayerIndex]?.username} to roll...
        </div>
      )}
    </div>
  );
};

export default DiceDisplay;
