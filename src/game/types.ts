// ---- Core Types for Unmatched ----

export type CardType = 'attack' | 'defense' | 'versatile' | 'scheme';

export interface CardDef {
  id: string;
  name: string;
  type: CardType;
  value: number;      // attack/defense value (0 for schemes)
  boost: number;      // movement boost when discarded
  effect?: EffectDef;
  characterOnly?: boolean; // can only be played by the hero (not sidekick)
  quantity: number;    // how many copies in the deck
}

export interface EffectDef {
  type: string;
  amount?: number;
  description: string;
}

export interface Card {
  id: string;         // unique instance id
  defId: string;      // reference to CardDef.id
}

export interface CharacterDef {
  id: string;
  name: string;
  hp: number;
  isRanged: boolean;
  moveValue: number;
  sidekick?: SidekickDef;
  deckCards: CardDef[];
}

export interface SidekickDef {
  name: string;
  hp: number;
  isRanged: boolean;
  moveValue: number;
  quantity: number; // e.g. Medusa has 3 harpies
}

// ---- Game State ----

export interface Fighter {
  id: string;
  name: string;
  characterId: string; // references CharacterDef
  isHero: boolean;
  hp: number;
  maxHp: number;
  isRanged: boolean;
  moveValue: number;
  spaceId: string;
  owner: number; // player index 0 or 1
}

export interface Player {
  index: number;
  name: string;
  characterId: string;
  hand: Card[];
  deck: Card[];
  discard: Card[];
  fighters: string[]; // fighter ids
  actionsRemaining: number;
}

export interface Space {
  id: string;
  zone: string;      // zone color/name
  x: number;         // display position
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
  | 'playing'
  | 'maneuver_move'
  | 'attack_selectTarget'
  | 'attack_selectCard'
  | 'attack_defenderCard'
  | 'attack_resolve'
  | 'scheme_selectCard'
  | 'gameOver';

export interface CombatState {
  attackerId: string;
  defenderId: string;
  attackCard: Card | null;
  defenseCard: Card | null;
}

export interface GameState {
  players: [Player, Player];
  fighters: Fighter[];
  board: BoardMap;
  currentPlayer: number;  // 0 or 1
  phase: Phase;
  combat: CombatState | null;
  winner: number | null;
  log: string[];
  selectedFighter: string | null;
  // for maneuver: track who has moved
  maneuverMoved: boolean;
  maneuverDrawn: boolean;
  // Sinbad voyage counter (future use)
}
