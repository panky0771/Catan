import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';
import { DevCard, DevCardType, ResourceType, RESOURCE_TYPES, RESOURCE_ICONS } from '../../types/game.types';

// =============================================
// DevCardPanel: shows & plays development cards
// =============================================

const CARD_INFO: Record<DevCardType, { icon: string; name: string; desc: string }> = {
  knight: { icon: '⚔️', name: 'Knight', desc: 'Move the robber and steal a resource' },
  roadBuilding: { icon: '🛤️', name: 'Road Building', desc: 'Place 2 free roads' },
  yearOfPlenty: { icon: '🌟', name: 'Year of Plenty', desc: 'Take any 2 resources from bank' },
  monopoly: { icon: '💰', name: 'Monopoly', desc: 'Take all of one resource type from others' },
  victoryPoint: { icon: '⭐', name: 'Victory Point', desc: '+1 Victory Point' },
};

const YearOfPlentyModal: React.FC<{ onConfirm: (r: [ResourceType, ResourceType]) => void; onClose: () => void }> = ({ onConfirm, onClose }) => {
  const [picks, setPicks] = useState<ResourceType[]>([]);

  const toggle = (r: ResourceType) => {
    if (picks.includes(r)) setPicks(picks.filter((p) => p !== r));
    else if (picks.length < 2) setPicks([...picks, r]);
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-catan-panel border border-catan-border rounded-2xl p-6 w-80"
      >
        <h3 className="text-lg font-bold mb-4">Year of Plenty — Pick 2 Resources</h3>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {RESOURCE_TYPES.map((r) => (
            <button
              key={r}
              onClick={() => toggle(r)}
              className={`p-2 rounded-lg border text-center transition-all ${
                picks.includes(r)
                  ? 'border-yellow-400 bg-yellow-900/30'
                  : 'border-catan-border bg-catan-bg hover:border-gray-500'
              }`}
            >
              <div className="text-xl">{RESOURCE_ICONS[r]}</div>
              <div className="text-xs text-gray-300 capitalize">{r}</div>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-catan-border text-gray-400 hover:bg-catan-border">
            Cancel
          </button>
          <button
            onClick={() => picks.length === 2 && onConfirm(picks as [ResourceType, ResourceType])}
            disabled={picks.length !== 2}
            className="flex-1 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 font-bold disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const MonopolyModal: React.FC<{ onConfirm: (r: ResourceType) => void; onClose: () => void }> = ({ onConfirm, onClose }) => {
  const [pick, setPick] = useState<ResourceType | null>(null);

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-catan-panel border border-catan-border rounded-2xl p-6 w-80"
      >
        <h3 className="text-lg font-bold mb-4">Monopoly — Pick a Resource</h3>
        <div className="grid grid-cols-5 gap-2 mb-4">
          {RESOURCE_TYPES.map((r) => (
            <button
              key={r}
              onClick={() => setPick(r)}
              className={`p-2 rounded-lg border text-center transition-all ${
                pick === r
                  ? 'border-yellow-400 bg-yellow-900/30'
                  : 'border-catan-border bg-catan-bg hover:border-gray-500'
              }`}
            >
              <div className="text-xl">{RESOURCE_ICONS[r]}</div>
              <div className="text-xs text-gray-300 capitalize">{r}</div>
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-catan-border text-gray-400 hover:bg-catan-border">
            Cancel
          </button>
          <button
            onClick={() => pick && onConfirm(pick)}
            disabled={!pick}
            className="flex-1 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 font-bold disabled:opacity-50"
          >
            Monopolize
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const DevCardPanel: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const { playKnight, playRoadBuilding, playYearOfPlenty, playMonopoly, setBuildMode } = useGameStore();
  const { openModal, closeModal, activeModal } = useUIStore();

  const myPlayer = gameState?.myPlayer;
  if (!myPlayer) return null;

  const unplayedCards = myPlayer.devCards.filter((c) => !c.played && c.type !== 'victoryPoint');
  const vpCards = myPlayer.devCards.filter((c) => c.type === 'victoryPoint');
  const canPlay = isMyTurn && !myPlayer.hasPlayedDevCardThisTurn &&
    (gameState?.turnPhase === 'post_roll' || gameState?.turnPhase === 'pre_roll');

  const handlePlay = (card: DevCard) => {
    if (!canPlay) return;
    switch (card.type) {
      case 'knight':
        playKnight();
        break;
      case 'roadBuilding':
        playRoadBuilding();
        break;
      case 'yearOfPlenty':
        openModal('yearOfPlenty');
        break;
      case 'monopoly':
        openModal('monopoly');
        break;
    }
  };

  return (
    <>
      <div className="flex flex-col gap-2 p-3 bg-catan-panel rounded-xl border border-catan-border">
        <div className="text-sm font-semibold text-gray-300 flex items-center justify-between">
          <span>Development Cards</span>
          <span className="text-xs text-gray-500">{myPlayer.devCards.filter(c => !c.played).length} cards</span>
        </div>

        {unplayedCards.length === 0 && vpCards.length === 0 ? (
          <div className="text-xs text-gray-500 text-center py-3">No development cards</div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {/* Group unplayed cards by type */}
            {(['knight', 'roadBuilding', 'yearOfPlenty', 'monopoly'] as DevCardType[]).map((type) => {
              const cards = unplayedCards.filter((c) => c.type === type);
              if (cards.length === 0) return null;
              const info = CARD_INFO[type];
              const card = cards[0];
              const turnOk = card.purchasedTurn < (gameState?.turnNumber ?? 0);

              return (
                <motion.div
                  key={type}
                  whileHover={canPlay && turnOk ? { scale: 1.02 } : {}}
                  className={`flex items-center justify-between p-2 rounded-lg border transition-all ${
                    canPlay && turnOk
                      ? 'border-purple-600/50 bg-purple-900/20 cursor-pointer hover:border-purple-400'
                      : 'border-catan-border bg-catan-bg opacity-60'
                  }`}
                  onClick={() => canPlay && turnOk && handlePlay(card)}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{info.icon}</span>
                    <div>
                      <div className="text-xs font-semibold text-gray-200">
                        {info.name} {cards.length > 1 && `×${cards.length}`}
                      </div>
                      <div className="text-xs text-gray-500">{info.desc}</div>
                    </div>
                  </div>
                  {canPlay && turnOk && (
                    <span className="text-xs text-purple-400 font-semibold">PLAY</span>
                  )}
                  {!turnOk && (
                    <span className="text-xs text-gray-600">New</span>
                  )}
                </motion.div>
              );
            })}

            {/* VP cards */}
            {vpCards.length > 0 && (
              <div className="flex items-center gap-2 p-2 rounded-lg border border-yellow-800/50 bg-yellow-900/10">
                <span className="text-lg">⭐</span>
                <div>
                  <div className="text-xs font-semibold text-gray-200">
                    Victory Point ×{vpCards.length}
                  </div>
                  <div className="text-xs text-gray-500">Hidden until you win</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Knights played */}
        {myPlayer.knightsPlayed > 0 && (
          <div className="text-xs text-gray-500 border-t border-catan-border pt-2">
            ⚔️ {myPlayer.knightsPlayed} knights played
            {gameState?.largestArmyHolder === myPlayer.id && (
              <span className="text-yellow-400 ml-1">★ Largest Army</span>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {activeModal === 'yearOfPlenty' && (
          <YearOfPlentyModal
            onConfirm={(r) => { playYearOfPlenty(r); closeModal(); }}
            onClose={closeModal}
          />
        )}
        {activeModal === 'monopoly' && (
          <MonopolyModal
            onConfirm={(r) => { playMonopoly(r); closeModal(); }}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default DevCardPanel;
