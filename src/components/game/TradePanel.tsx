import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';
import {
  RESOURCE_TYPES,
  RESOURCE_ICONS,
  ResourceType,
  ResourceCards,
  PLAYER_COLORS,
  PlayerColor,
} from '../../types/game.types';

const EMPTY: ResourceCards = { wood: 0, brick: 0, sheep: 0, wheat: 0, ore: 0 };


// =============================================
// TradePanel: player and maritime trading
// =============================================

type TradeTab = 'player' | 'maritime';

const ResourceCounter: React.FC<{
  label: string;
  cards: ResourceCards;
  onChange: (cards: ResourceCards) => void;
  maxCards?: ResourceCards;
}> = ({ label, cards, onChange, maxCards }) => (
  <div className="flex flex-col gap-1">
    <div className="text-xs text-gray-400 font-semibold">{label}</div>
    <div className="flex gap-1">
      {RESOURCE_TYPES.map((r) => {
        const max = maxCards ? maxCards[r] : 9;
        return (
          <div key={r} className="flex flex-col items-center">
            <span className="text-sm">{RESOURCE_ICONS[r]}</span>
            <div className="flex flex-col items-center">
              <button
                className="w-5 h-4 text-xs text-gray-400 hover:text-white"
                onClick={() => onChange({ ...cards, [r]: Math.min(max, (cards[r] ?? 0) + 1) })}
                disabled={(cards[r] ?? 0) >= max}
              >▲</button>
              <span className="text-xs font-mono w-4 text-center">{cards[r] ?? 0}</span>
              <button
                className="w-5 h-4 text-xs text-gray-400 hover:text-white"
                onClick={() => onChange({ ...cards, [r]: Math.max(0, (cards[r] ?? 0) - 1) })}
                disabled={(cards[r] ?? 0) <= 0}
              >▼</button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const TradePanel: React.FC = () => {
  const gameState = useGameStore((s) => s.gameState);
  const isMyTurn = useGameStore((s) => s.isMyTurn);
  const { offerTrade, acceptTrade, rejectTrade, cancelTrade, maritimeTrade } = useGameStore();

  const [tab, setTab] = useState<TradeTab>('player');
  const [offerCards, setOfferCards] = useState<ResourceCards>({ ...EMPTY });
  const [requestCards, setRequestCards] = useState<ResourceCards>({ ...EMPTY });
  const [targetPlayerId, setTargetPlayerId] = useState<string | null>(null);
  const [maritimeGive, setMaritimeGive] = useState<ResourceType>('wood');
  const [maritimeReceive, setMaritimeReceive] = useState<ResourceType>('brick');

  const myPlayer = gameState?.myPlayer;
  if (!myPlayer) return null;

  const activeTrade = gameState?.activeTrade;
  const isPostRoll = gameState?.turnPhase === 'post_roll';
  const otherPlayers = gameState?.players.filter((p) => p.id !== myPlayer.id) ?? [];
  const amTradeInitiator = activeTrade?.fromPlayerId === myPlayer.id;
  const amTradeTarget = activeTrade?.toPlayerId === myPlayer.id || activeTrade?.toPlayerId === null;

  // Maritime trade ratios
  const ratios: Record<ResourceType, number> = { wood: 4, brick: 4, sheep: 4, wheat: 4, ore: 4 };
  for (const vertex of gameState?.board.vertices ?? []) {
    if (!vertex.building || vertex.building.playerId !== myPlayer.id) continue;
    if (!vertex.port) continue;
    if (vertex.port.type === 'any') {
      RESOURCE_TYPES.forEach((r) => { ratios[r] = Math.min(ratios[r], 3); });
    } else {
      ratios[vertex.port.type as ResourceType] = Math.min(ratios[vertex.port.type as ResourceType], 2);
    }
  }

  const handleOfferTrade = () => {
    const totalOffer = RESOURCE_TYPES.reduce((s, r) => s + (offerCards[r] ?? 0), 0);
    const totalRequest = RESOURCE_TYPES.reduce((s, r) => s + (requestCards[r] ?? 0), 0);
    if (totalOffer === 0 || totalRequest === 0) return;
    offerTrade(targetPlayerId, offerCards, requestCards);
    setOfferCards({ ...EMPTY });
    setRequestCards({ ...EMPTY });
  };

  const handleMaritimeTrade = () => {
    if (maritimeGive === maritimeReceive) return;
    maritimeTrade(maritimeGive, maritimeReceive, ratios[maritimeGive]);
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-catan-panel rounded-xl border border-catan-border">
      <div className="text-sm font-semibold text-gray-300">Trading</div>

      {/* Active trade notification */}
      <AnimatePresence>
        {activeTrade && activeTrade.status === 'pending' && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="rounded-lg border border-blue-600 bg-blue-900/20 p-2 text-xs">
              <div className="font-semibold text-blue-300 mb-1">
                {amTradeInitiator
                  ? '📤 Your trade offer is active...'
                  : `📥 Trade offer from ${gameState?.players.find(p => p.id === activeTrade.fromPlayerId)?.username}`}
              </div>
              <div className="flex items-center gap-2 text-gray-300">
                <span>Gives: {RESOURCE_TYPES.filter(r => (activeTrade.offer[r] ?? 0) > 0)
                  .map(r => `${activeTrade.offer[r]}${RESOURCE_ICONS[r]}`).join(' ')}</span>
                <span>↔</span>
                <span>Wants: {RESOURCE_TYPES.filter(r => (activeTrade.request[r] ?? 0) > 0)
                  .map(r => `${activeTrade.request[r]}${RESOURCE_ICONS[r]}`).join(' ')}</span>
              </div>
              <div className="flex gap-2 mt-2">
                {!amTradeInitiator && amTradeTarget && (
                  <>
                    <button onClick={acceptTrade}
                      className="flex-1 py-1 rounded bg-green-700 hover:bg-green-600 text-xs font-semibold">
                      ✓ Accept
                    </button>
                    <button onClick={rejectTrade}
                      className="flex-1 py-1 rounded bg-red-800 hover:bg-red-700 text-xs font-semibold">
                      ✗ Reject
                    </button>
                  </>
                )}
                {amTradeInitiator && (
                  <button onClick={cancelTrade}
                    className="flex-1 py-1 rounded bg-gray-700 hover:bg-gray-600 text-xs font-semibold">
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabs */}
      <div className="flex gap-1">
        {(['player', 'maritime'] as TradeTab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex-1 py-1 rounded text-xs font-semibold transition-all ${
              tab === t ? 'bg-blue-700 text-white' : 'bg-catan-bg text-gray-400 hover:text-gray-200'
            }`}>
            {t === 'player' ? '👥 Player Trade' : '⚓ Maritime'}
          </button>
        ))}
      </div>

      {/* Player trade */}
      {tab === 'player' && isMyTurn && isPostRoll && !activeTrade && (
        <div className="flex flex-col gap-2">
          <ResourceCounter
            label="You offer:"
            cards={offerCards}
            onChange={setOfferCards}
            maxCards={myPlayer.resources}
          />
          <ResourceCounter
            label="You want:"
            cards={requestCards}
            onChange={setRequestCards}
          />
          <div className="flex flex-col gap-1">
            <div className="text-xs text-gray-400">Offer to:</div>
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setTargetPlayerId(null)}
                className={`text-xs px-2 py-1 rounded border ${
                  targetPlayerId === null ? 'border-blue-500 bg-blue-900/30' : 'border-catan-border'
                }`}
              >Everyone</button>
              {otherPlayers.map((p) => (
                <button key={p.id}
                  onClick={() => setTargetPlayerId(p.id)}
                  className={`text-xs px-2 py-1 rounded border ${
                    targetPlayerId === p.id ? 'border-blue-500 bg-blue-900/30' : 'border-catan-border'
                  }`}
                  style={{ borderColor: PLAYER_COLORS[p.color as PlayerColor] + '88' }}
                >
                  {p.username}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={handleOfferTrade}
            className="w-full py-1.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-xs font-bold"
          >
            📤 Offer Trade
          </button>
        </div>
      )}

      {/* Maritime trade */}
      {tab === 'maritime' && isMyTurn && isPostRoll && (
        <div className="flex flex-col gap-2">
          <div className="text-xs text-gray-400">Your trade ratios:</div>
          <div className="flex gap-1 flex-wrap">
            {RESOURCE_TYPES.map((r) => (
              <div key={r} className="text-xs px-2 py-1 rounded bg-catan-bg border border-catan-border">
                {RESOURCE_ICONS[r]} {ratios[r]}:1
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">Give {ratios[maritimeGive]}×</div>
              <select
                value={maritimeGive}
                onChange={(e) => setMaritimeGive(e.target.value as ResourceType)}
                className="w-full bg-catan-bg border border-catan-border rounded px-2 py-1 text-xs"
              >
                {RESOURCE_TYPES.filter(r => (myPlayer.resources[r] ?? 0) >= ratios[r]).map(r => (
                  <option key={r} value={r}>{RESOURCE_ICONS[r]} {r} ({myPlayer.resources[r]})</option>
                ))}
              </select>
            </div>
            <span className="text-gray-400 mt-4">→</span>
            <div className="flex-1">
              <div className="text-xs text-gray-400 mb-1">Receive 1×</div>
              <select
                value={maritimeReceive}
                onChange={(e) => setMaritimeReceive(e.target.value as ResourceType)}
                className="w-full bg-catan-bg border border-catan-border rounded px-2 py-1 text-xs"
              >
                {RESOURCE_TYPES.filter(r => r !== maritimeGive).map(r => (
                  <option key={r} value={r}>{RESOURCE_ICONS[r]} {r}</option>
                ))}
              </select>
            </div>
          </div>
          <button
            onClick={handleMaritimeTrade}
            disabled={!RESOURCE_TYPES.some(r => (myPlayer.resources[r] ?? 0) >= ratios[r])}
            className="w-full py-1.5 rounded-lg bg-teal-700 hover:bg-teal-600 text-xs font-bold disabled:opacity-50"
          >
            ⚓ Trade with Bank
          </button>
        </div>
      )}

      {!isMyTurn && (
        <div className="text-xs text-gray-500 text-center py-1">Wait for your turn to trade</div>
      )}
    </div>
  );
};

export default TradePanel;
