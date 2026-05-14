import {
  Player,
  DevCard,
  DevCardType,
  DEV_CARD_DISTRIBUTION,
  BUILDING_COSTS,
  ResourceCards,
  ResourceType,
  RESOURCE_TYPES,
  EMPTY_RESOURCES,
} from '../types/game.types';
import { hasResources, deductResources, addResources, countResources } from './ResourceEngine';

// =============================================
// Development Card Engine
// =============================================

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createDevCardDeck(): DevCardType[] {
  return shuffleArray([...DEV_CARD_DISTRIBUTION]);
}

export function buyDevCard(
  player: Player,
  deck: DevCardType[],
  turnNumber: number
): { card: DevCard | null; error: string | null } {
  if (!hasResources(player, BUILDING_COSTS.devCard)) {
    return { card: null, error: 'Not enough resources (need 1 sheep, 1 wheat, 1 ore)' };
  }
  if (deck.length === 0) {
    return { card: null, error: 'Development card deck is empty' };
  }

  deductResources(player, BUILDING_COSTS.devCard);
  const cardType = deck.pop()!;
  const card: DevCard = { type: cardType, purchasedTurn: turnNumber, played: false };
  player.devCards.push(card);
  player.devCardCount++;

  // VP cards immediately add to VP (but not public)
  if (cardType === 'victoryPoint') {
    player.victoryPoints += 1;
    // publicVictoryPoints NOT updated - hidden until win
  }

  return { card, error: null };
}

export function canPlayDevCard(
  player: Player,
  cardType: DevCardType,
  turnNumber: number,
  turnPhase: string
): string | null {
  if (player.hasPlayedDevCardThisTurn) {
    return 'Already played a development card this turn';
  }

  const card = player.devCards.find(
    (c) => c.type === cardType && !c.played && c.purchasedTurn < turnNumber
  );

  if (!card) {
    if (player.devCards.some((c) => c.type === cardType && !c.played)) {
      return 'Cannot play a card purchased this turn';
    }
    return `No unplayed ${cardType} card`;
  }

  if (cardType === 'victoryPoint') {
    return 'Victory Point cards are revealed automatically when you win';
  }

  // Knight can be played before or after rolling
  if (cardType !== 'knight' && turnPhase !== 'post_roll') {
    return 'Development cards (except Knight) must be played after rolling dice';
  }

  return null;
}

export function markCardPlayed(player: Player, cardType: DevCardType, turnNumber: number): void {
  const card = player.devCards.find(
    (c) => c.type === cardType && !c.played && c.purchasedTurn < turnNumber
  );
  if (card) {
    card.played = true;
    player.devCardCount--;
    player.hasPlayedDevCardThisTurn = true;
  }
}

// Year of Plenty: get 2 resources from the bank
export function playYearOfPlenty(
  player: Player,
  resources: [ResourceType, ResourceType]
): string | null {
  const [r1, r2] = resources;
  if (!RESOURCE_TYPES.includes(r1) || !RESOURCE_TYPES.includes(r2)) {
    return 'Invalid resource type';
  }
  player.resources[r1] += 1;
  player.resources[r2] += 1;
  player.resourceCount = countResources(player.resources);
  return null;
}

// Monopoly: steal all of one resource from all players
export function playMonopoly(
  player: Player,
  allPlayers: Player[],
  resource: ResourceType
): { stolen: number; error: string | null } {
  if (!RESOURCE_TYPES.includes(resource)) {
    return { stolen: 0, error: 'Invalid resource type' };
  }

  let totalStolen = 0;
  for (const p of allPlayers) {
    if (p.id === player.id) continue;
    const amount = p.resources[resource];
    if (amount > 0) {
      p.resources[resource] = 0;
      p.resourceCount -= amount;
      player.resources[resource] += amount;
      player.resourceCount += amount;
      totalStolen += amount;
    }
  }

  return { stolen: totalStolen, error: null };
}

// Road Building: places 2 free roads
export function playRoadBuilding(): null {
  // Just returns null (success) - road placement handled by BuildingEngine
  // The game engine will put the player in "road building" sub-phase
  return null;
}
