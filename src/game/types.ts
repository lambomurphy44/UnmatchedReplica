// ---- Core Types for Unmatched ----

export type CardType = 'attack' | 'defense' | 'versatile' | 'scheme';
export type EffectTiming = 'immediately' | 'duringCombat' | 'afterCombat';
export type FighterRestriction = 'hero' | 'sidekick' | 'any';

export interface CardEffect {
  type: string;
  timing: EffectTiming;
  amount?: number;
  param?: string; // e.g. card ID to search for
}

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  value: number;
  boost: number;
  effects: CardEffect[];
  restriction: FighterRestriction;
  quantity: number;
  effectText: string; // Human-readable effect description for display
}

export interface Card {
  id: string;
  defId: string;
}

export interface CharacterDef {
  id: string;
  name: string;
  hp: number;
  isRanged: boolean;
  moveValue: number;
  sidekick?: SidekickDef;
  deckCards: CardDef[];
  ability?: {
    name: string;
    description: string;
    timing: 'startOfTurn' | 'duringAttack';
  };
}

export interface SidekickDef {
  name: string;
  hp: number;
  isRanged: boolean;
  moveValue: number;
  quantity: number;
}

// ---- Game State ----

export interface Fighter {
  id: string;
  name: string;
  characterId: string;
  isHero: boolean;
  hp: number;
  maxHp: number;
  isRanged: boolean;
  moveValue: number;
  spaceId: string;
  owner: number;
}

export interface Player {
  index: number;
  name: string;
  characterId: string;
  hand: Card[];
  deck: Card[];
  discard: Card[];
  fighters: string[];
  actionsRemaining: number;
}

export interface Space {
  id: string;
  zone: string;
  x: number;
  y: number;
  adjacentIds: string[];
}

export interface BoardMap {
  id: string;
  name: string;
  spaces: Space[];
  startPositions: { player0: string[]; player1: string[] };
}

export type Phase =
  | 'characterSelect'
  | 'place_sidekick'
  | 'playing'
  | 'medusa_startAbility'
  | 'maneuver_boost'
  | 'maneuver_selectFighter'
  | 'maneuver_moveFighter'
  | 'attack_selectTarget'
  | 'attack_selectCard'
  | 'arthur_attackBoost'
  | 'attack_defenderCard'
  | 'attack_resolve'
  | 'combat_duringBoost'      // Noble Sacrifice / Second Shot: choose boost card mid-combat
  | 'effect_moveFighter'      // Post-combat: move a fighter
  | 'effect_opponentDiscard'  // Post-combat: opponent discards a card
  | 'effect_placeFighter'     // Post-combat: place fighter on any unoccupied space
  | 'scheme_selectCard'
  | 'scheme_selectTarget'
  | 'scheme_moveSidekick'
  | 'scheme_moveAll'          // Winged Frenzy / Command: move all your fighters
  | 'scheme_reviveHarpy'      // Winged Frenzy: place revived harpy
  | 'discard_excess'
  | 'gameOver';

export interface QueuedEffect {
  type: 'moveFighter' | 'opponentDiscard' | 'placeFighter';
  playerIndex: number;
  fighterId?: string;
  range?: number;
  label: string;
}

export interface CombatState {
  attackerId: string;
  defenderId: string;
  attackCard: Card | null;
  defenseCard: Card | null;
  attackBoostCard: Card | null;   // Arthur ability boost
  duringCombatBoost: Card | null; // Noble Sacrifice / Second Shot boost
  attackerEffectsCancelled: boolean;
  defenderEffectsCancelled: boolean;
  damageDealt: number;
  attackerWon: boolean;
}

export interface GameState {
  players: [Player, Player];
  fighters: Fighter[];
  board: BoardMap;
  currentPlayer: number;
  phase: Phase;
  combat: CombatState | null;
  winner: number | null;
  log: string[];
  selectedFighter: string | null;

  // Sidekick placement
  placementPlayer: number | null;
  placementFighterIds: string[];

  // Maneuver tracking
  maneuverBoost: number;
  maneuverFightersToMove: string[];
  maneuverCurrentFighter: string | null;

  // Pending scheme (for deferred resolution)
  pendingSchemeCard: Card | null;
  schemeMoveFighterId: string | null;
  schemeMoveRange: number;

  // Post-combat effect queue
  effectQueue: QueuedEffect[];

  // Start-of-turn fighter positions (for Momentous Shift)
  turnStartSpaces: Record<string, string>;
}
