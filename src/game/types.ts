// ---- Core Types for Unmatched ----

export type CardType = 'attack' | 'defense' | 'versatile' | 'scheme';

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  value: number;
  boost: number;
  effect?: EffectDef;
  characterOnly?: boolean;
  quantity: number;
}

export interface EffectDef {
  type: string;
  amount?: number;
  description: string;
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
  | 'scheme_selectCard'
  | 'scheme_selectTarget'
  | 'scheme_moveSidekick'
  | 'discard_excess'
  | 'gameOver';

export interface CombatState {
  attackerId: string;
  defenderId: string;
  attackCard: Card | null;
  defenseCard: Card | null;
  attackBoostCard: Card | null;
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
}
