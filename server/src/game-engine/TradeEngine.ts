import {
  Player,
  TradeOffer,
  ResourceCards,
  RESOURCE_TYPES,
  EMPTY_RESOURCES,
} from '../types/game.types';
import { countResources } from './ResourceEngine';
import { v4 as uuidv4 } from 'uuid';

// =============================================
// Trading Engine (Player ↔ Player)
// =============================================

export function createTradeOffer(
  fromPlayer: Player,
  toPlayerId: string | null,
  offer: ResourceCards,
  request: ResourceCards
): { trade: TradeOffer | null; error: string | null } {
  // Validate offer
  for (const r of RESOURCE_TYPES) {
    if ((offer[r] ?? 0) > fromPlayer.resources[r]) {
      return { trade: null, error: `Not enough ${r} to offer` };
    }
  }

  if (countResources(offer) === 0) {
    return { trade: null, error: 'Must offer at least one resource' };
  }
  if (countResources(request) === 0) {
    return { trade: null, error: 'Must request at least one resource' };
  }

  const trade: TradeOffer = {
    id: uuidv4(),
    fromPlayerId: fromPlayer.id,
    toPlayerId,
    offer,
    request,
    status: 'pending',
    createdAt: Date.now(),
  };

  return { trade, error: null };
}

export function acceptTrade(
  fromPlayer: Player,
  toPlayer: Player,
  trade: TradeOffer
): string | null {
  // Validate both parties still have the resources
  for (const r of RESOURCE_TYPES) {
    if ((trade.offer[r] ?? 0) > fromPlayer.resources[r]) {
      return `${fromPlayer.username} no longer has enough ${r}`;
    }
    if ((trade.request[r] ?? 0) > toPlayer.resources[r]) {
      return `${toPlayer.username} no longer has enough ${r}`;
    }
  }

  // Execute trade
  for (const r of RESOURCE_TYPES) {
    const offerAmt = trade.offer[r] ?? 0;
    const requestAmt = trade.request[r] ?? 0;
    fromPlayer.resources[r] -= offerAmt;
    fromPlayer.resources[r] += requestAmt;
    toPlayer.resources[r] -= requestAmt;
    toPlayer.resources[r] += offerAmt;
  }

  fromPlayer.resourceCount = countResources(fromPlayer.resources);
  toPlayer.resourceCount = countResources(toPlayer.resources);
  trade.status = 'accepted';

  return null;
}

export function rejectTrade(trade: TradeOffer): void {
  trade.status = 'rejected';
}

export function cancelTrade(trade: TradeOffer): void {
  trade.status = 'expired';
}

export function isTradeExpired(trade: TradeOffer): boolean {
  return Date.now() - trade.createdAt > 60_000; // 60 seconds
}
