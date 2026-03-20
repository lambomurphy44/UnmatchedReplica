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
  zones: string[];
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
  | 'genie_startAbility'    // Genie: discard a card to gain 1 extra action
  | 'genie_threeWishes'     // Genie: choose one of 3 wish options
  | 'genie_imprisoned_wrath' // Genie: optionally discard 2 for 2 damage
  | 'genie_wish_command'    // Genie: optionally discard 2 for 1 extra action
  | 'genie_sultans_discard' // Genie: view opponent's hand and choose card to discard
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
  | 'effect_pushFighter'      // Post-combat: push opposing fighter
  | 'effect_zoneDamageTarget' // Boomerang Bounce: choose a target in a zone
  | 'effect_chooseSearch'     // Meditate: choose a card from deck to add to hand
  | 'scheme_selectCard'
  | 'scheme_selectTarget'
  | 'scheme_moveSidekick'
  | 'scheme_moveAll'          // Winged Frenzy / Command: move all your fighters
  | 'scheme_reviveHarpy'      // Winged Frenzy: place revived harpy
  | 'combat_immediately_push' // Fan Sweep: push opposing fighter during immediately phase
  | 'aang_air_scooter_choice' // Air Scooter: choose which space to move into
  | 'aang_charge_choice'      // Sky Bison Charge: choose move or damage
  | 'aang_flying_bison_zone'  // Flying Bison: pick space in different zone
  | 'mewtwo_cloneVats'        // Clone Vats: discard a card to place a clone
  | 'mewtwo_placeClone'       // Place a clone on an adjacent space
  | 'mewtwo_cloneBatch_place' // Clone Batch: place up to 2 clones
  | 'mewtwo_teleport_move'    // Teleport: move Mewtwo up to 5 spaces (through fighters)
  | 'mewtwo_cloneRush_discard' // Clone Rush: choose a card from opponent's hand to discard
  | 'sokka_boomerang'          // Sokka: choose target for boomerang damage
  | 'sokka_improvised_shield'  // Sokka: choose whether to flip boomerang for Improvised Shield
  | 'sokka_precision_throw'    // Sokka: choose whether to flip boomerang for Precision Throw
  | 'yennenga_damage_split'    // Yennenga: split incoming damage among fighters in zone
  | 'rain_of_arrows_followup'  // Yennenga: second attack from Rain of Arrows
  | 'tesla_startAbility'       // Tesla: Electrical Overflow — mandatory damage, then interactive push
  | 'tesla_overflow_push'      // Tesla: push each adjacent enemy up to 1 space after overflow damage
  | 'tesla_coilChoice'         // Tesla: choose how many coils to discharge for a card effect
  | 'tesla_repulsion_move'     // Tesla: move opponent fighter for Repulsion Blast
  | 'tesla_repulsion_selfMove' // Tesla: move Tesla for Repulsion Blast (1 coil)
  | 'tesla_alternating_choice' // Tesla: choose charge or discharge for Alternating Current
  | 'tesla_remote_control'     // Tesla: move opposing fighters for Remote Control
  | 'zelda_formChoice'         // Zelda: choose Zelda or Sheik form
  | 'zelda_faroresWind'        // Zelda: place fighter in any space in your zone
  | 'zelda_impasTraining_move' // Zelda: Impa's Training — move up to 3 spaces
  | 'zelda_impasTraining_target' // Zelda: Impa's Training — choose adjacent opponent
  | 'zelda_impasTraining_discard' // Zelda: Impa's Training — choose card from revealed hand
  | 'zelda_songOfTime'         // Zelda: Song of Time — choose card from discard to return
  | 'zelda_goddessBlade'       // Zelda: Goddess Blade — choose card from discard to return
  | 'zelda_smokeBomb_move'     // Zelda: Smoke Bomb — move up to 2 spaces
  | 'zelda_dinsFireTarget'     // Zelda: Din's Fire — choose target in zone
  | 'discard_excess'
  | 'gameOver';

export interface QueuedEffect {
  type: 'moveFighter' | 'opponentDiscard' | 'placeFighter' | 'pushFighter' | 'zoneDamage' | 'zoneDamageTarget' | 'teslaCoilChoice' | 'teslaAlternatingChoice' | 'zeldaGoddessBlade' | 'zeldaDinsFireTarget' | 'genieFreedDamage' | 'genieWishCommand' | 'genieImprisonedWrath' | 'genieSultansDiscard';
  playerIndex: number;
  damageAmount?: number;  // for zoneDamage: how much damage to deal
  fighterId?: string;
  targetFighterId?: string;  // for push: the fighter being pushed
  range?: number;
  label: string;
  teslaEffectType?: string; // for teslaCoilChoice: which effect is pending
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
  airScooterUsed: boolean;        // Aang: attacked from 1 space away via Air Scooter
  teslaIgnoreOpponentValue: boolean; // Polyphase Coils: 2 coils — ignore opponent's card value
  teslaAtkValueDelta: number; // value adjustment from Tesla coil effects on attacker side
  teslaDefValueDelta: number; // value adjustment from Tesla coil effects on defender side
  teslaAtkValueReplace: number | null; // Death Ray: replace attacker's card value entirely
  teslaDefValueReplace: number | null; // Death Ray: replace defender's card value entirely
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

  // Aang-specific: push target fighter
  pushTargetId: string | null;
  pushRange: number;

  // Aang-specific: Air Scooter space choice
  airScooterSpaces: string[];
  airScooterDefenderId: string | null;

  // Aang-specific: deck search choices (Meditate)
  searchCards: Card[];

  // Mewtwo-specific
  mewtwoReflectActive: [boolean, boolean]; // per player: is Reflect in play area?
  mewtwoCloneBatchRemaining: number;       // how many clones still to place in Clone Batch
  mewtwoCloneVatsUsed: boolean;            // has Clone Vats been used this turn?
  mewtwoCloneRushCards: Card[];            // opponent's hand for Clone Rush choice
  mewtwoCloneRushPlayerIndex: number | null; // which player's hand is being viewed

  // Sokka-specific
  sokkaBoomerangReady: [boolean, boolean]; // per player: is Boomerang READY? (true=READY, false=OUT)

  // Zone damage target selection (Boomerang Bounce)
  zoneDamageTargetZone: string;    // space ID whose zone contains valid targets
  zoneDamageAmount: number;        // damage to deal
  zoneDamagePlayerIndex: number;   // which player is choosing the target

  // Yennenga-specific
  stallionChargeActive: boolean; // Stallion Charge: allows movement through enemies

  // Rain of Arrows follow-up
  rainOfArrowsFollowUp: {
    attackerId: string;
    defenderId: string;
    value: number;
  } | null;

  // Tesla-specific
  teslaCoilsCharged: [number, number]; // per player: 0-2 coils charged
  teslaPendingCoilEffect: string | null; // card effect type awaiting coil discharge choice
  teslaPendingCoilCardDefId: string | null; // the card that triggered the coil choice
  teslaCoilRevealedCard: { defId: string; boost: number } | null; // X-Ray Radiation revealed card
  teslaCoilChoiceContext: 'immediately' | 'duringCombat_atk' | 'duringCombat_def' | 'afterCombat' | null;
  teslaOverflowPushTargets: string[]; // fighter IDs to push during overflow

  // Genie-specific
  genieThreeWishesValueLock: [boolean, boolean]; // per player: cards have value 4 for rest of turn
  geniePendingFreedDamage: boolean; // "I Am Freed" — deal 1 damage to all adjacents after placement
  genieSultansRevealedCards: Card[]; // opponent's hand shown for Sultans choice
  genieSultansTargetPlayer: number | null; // which player's hand is being viewed

  // Zelda/Sheik-specific
  zeldaCurrentForm: [string, string]; // per player: 'zelda' or 'sheik'
  zeldaMovementLock: string | null;   // fighter ID locked from moving (Sheikah Veil)
  zeldaNayrusLoveActive: [boolean, boolean]; // per player: prevent card-effect damage this combat
  zeldaImpasRevealedCards: Card[];    // revealed hand for Impa's Training
  zeldaImpasTargetPlayer: number | null; // which player's hand is revealed
  zeldaBonusAttackUsed: boolean;      // track if attack was a bonus attack (for Needle Storm)

  // Yennenga damage splitting
  yennengaDamageSplit: {
    totalDamage: number;
    assignments: Record<string, number>; // fighterId -> damage assigned
    eligibleFighterIds: string[];        // fighters that can receive damage
    continuation: 'afterCombat' | 'rainFollowUp' | 'effectQueue' | 'playing'; // what to do after split
  } | null;
}
