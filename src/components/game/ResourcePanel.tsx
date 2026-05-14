import React from 'react';
import { motion } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { RESOURCE_TYPES, RESOURCE_ICONS, RESOURCE_COLORS, BUILDING_COSTS, ResourceType } from '../../types/game.types';

// =============================================
// ResourcePanel: shows my resources + build costs
// =============================================

const ResourceCard: React.FC<{
  type: ResourceType;
  count: number;
}> = ({ type, count }) => (
  <motion.div
    layout
    className="flex flex-col items-center gap-1 p-2 rounded-lg border border-catan-border"
    style={{ backgroundColor: RESOURCE_COLORS[type] + '22', borderColor: RESOURCE_COLORS[type] + '66' }}
    whileHover={{ scale: 1.05 }}
  >
    <span className="text-xl">{RESOURCE_ICONS[type]}</span>
    <span
      className="text-lg font-bold font-mono"
      style={{ color: count > 0 ? '#ffffff' : '#666666' }}
    >
      {count}
    </span>
    <span className="text-xs text-gray-400 capitalize">{type}</span>
  </motion.div>
);

const BuildCostRow: React.FC<{
  label: string;
  cost: Record<string, number>;
  canAfford: boolean;
  onClick: () => void;
  disabled?: boolean;
}> = ({ label, cost, canAfford, onClick, disabled }) => (
  <button
    onClick={onClick}
    disabled={disabled || !canAfford}
    className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg border text-xs
      transition-all ${
        canAfford && !disabled
          ? 'border-green-600 bg-green-900/20 hover:bg-green-900/40 cursor-pointer'
          : 'border-gray-700 bg-gray-900/20 opacity-50 cursor-not-allowed'
      }`}
  >
    <span className="font-medium text-gray-200">{label}</span>
    <div className="flex items-center gap-1">
      {RESOURCE_TYPES.map((r) => {
        const amt = cost[r] ?? 0;
        if (amt === 0) return null;
        return (
          <span key={r} className="flex items-center gap-0.5">
            <span>{RESOURCE_ICONS[r]}</span>
            <span className="text-gray-300">{amt}</span>
          </span>
        );
      })}
    </div>
  </button>
);

const ResourcePanel: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const buildMode = useGameStore((s) => s.buildMode);
  const { setBuildMode, clearBuildMode, buyDevCard } = useGameStore();

  const myPlayer = gameState?.myPlayer;
  if (!myPlayer) return null;

  const res = myPlayer.resources;
  const canAfford = (cost: Record<string, number>) =>
    RESOURCE_TYPES.every((r) => (res[r] ?? 0) >= (cost[r] ?? 0));

  const isPostRoll = gameState?.turnPhase === 'post_roll';

  return (
    <div className="flex flex-col gap-3 p-3 bg-catan-panel rounded-xl border border-catan-border">
      <div className="text-sm font-semibold text-gray-300 flex items-center justify-between">
        <span>My Resources</span>
        <span className="text-xs text-gray-500 font-mono">
          {RESOURCE_TYPES.reduce((s, r) => s + res[r], 0)} total
        </span>
      </div>

      {/* Resource cards */}
      <div className="grid grid-cols-5 gap-1">
        {RESOURCE_TYPES.map((r) => (
          <ResourceCard key={r} type={r} count={res[r] ?? 0} />
        ))}
      </div>

      {/* Build options */}
      {isMyTurn && isPostRoll && (
        <div className="flex flex-col gap-1.5">
          <div className="text-xs text-gray-400 font-semibold mb-1">Build</div>

          <BuildCostRow
            label="🛤️ Road"
            cost={BUILDING_COSTS.road}
            canAfford={canAfford(BUILDING_COSTS.road) && myPlayer.roadsLeft > 0}
            onClick={() =>
              buildMode.type === 'road' ? clearBuildMode() : setBuildMode({ type: 'road' })
            }
            disabled={myPlayer.roadsLeft === 0}
          />

          <BuildCostRow
            label="🏠 Settlement"
            cost={BUILDING_COSTS.settlement}
            canAfford={canAfford(BUILDING_COSTS.settlement) && myPlayer.settlementsLeft > 0}
            onClick={() =>
              buildMode.type === 'settlement'
                ? clearBuildMode()
                : setBuildMode({ type: 'settlement' })
            }
            disabled={myPlayer.settlementsLeft === 0}
          />

          <BuildCostRow
            label="🏰 City"
            cost={BUILDING_COSTS.city}
            canAfford={canAfford(BUILDING_COSTS.city) && myPlayer.citiesLeft > 0}
            onClick={() =>
              buildMode.type === 'city' ? clearBuildMode() : setBuildMode({ type: 'city' })
            }
            disabled={myPlayer.citiesLeft === 0}
          />

          <BuildCostRow
            label="🃏 Dev Card"
            cost={BUILDING_COSTS.devCard}
            canAfford={canAfford(BUILDING_COSTS.devCard) && gameState.devCardDeckSize > 0}
            onClick={buyDevCard}
            disabled={gameState.devCardDeckSize === 0}
          />
        </div>
      )}

      {/* Pieces remaining */}
      <div className="flex gap-3 text-xs text-gray-500 border-t border-catan-border pt-2">
        <span>🛤️ {myPlayer.roadsLeft}</span>
        <span>🏠 {myPlayer.settlementsLeft}</span>
        <span>🏰 {myPlayer.citiesLeft}</span>
      </div>
    </div>
  );
};

export default ResourcePanel;
