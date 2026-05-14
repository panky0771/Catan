import { Player } from '../types/game.types';

// =============================================
// Victory Detection
// =============================================

export function checkVictory(players: Player[], targetVP: number): Player | null {
  // Victory is checked at end of the active player's turn
  // Victory Point cards count toward the total
  return players.find((p) => p.victoryPoints >= targetVP) ?? null;
}

// Reveal hidden VP cards for end-game display
export function revealAllVP(players: Player[]): void {
  for (const player of players) {
    player.publicVictoryPoints = player.victoryPoints;
  }
}

export function getPlayerVPBreakdown(player: Player, hasLongestRoad: boolean, hasLargestArmy: boolean) {
  const settlements = (5 - player.settlementsLeft);
  const cities = (4 - player.citiesLeft);
  const vpCards = player.devCards.filter((c) => c.type === 'victoryPoint').length;
  return {
    settlements,
    cities: cities * 2,
    longestRoad: hasLongestRoad ? 2 : 0,
    largestArmy: hasLargestArmy ? 2 : 0,
    vpCards,
    total: player.victoryPoints,
  };
}
