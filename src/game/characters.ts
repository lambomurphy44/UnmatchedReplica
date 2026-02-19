import type { CharacterDef, CardDef } from './types';

// =============================================
// KING ARTHUR — 30 cards
// =============================================

const arthurCards: CardDef[] = [
  // ---- Hero (King Arthur only) ----
  {
    id: 'arthur_excalibur',
    name: 'Excalibur',
    type: 'attack',
    value: 6,
    boost: 3,
    restriction: 'hero',
    quantity: 1,
    effects: [],
    effectText: '',
  },
  {
    id: 'arthur_noble_sacrifice',
    name: 'Noble Sacrifice',
    type: 'attack',
    value: 2,
    boost: 3,
    restriction: 'hero',
    quantity: 3,
    effects: [
      { type: 'boostAttack', timing: 'duringCombat' },
    ],
    effectText: 'DURING COMBAT: You may BOOST this attack.',
  },
  {
    id: 'arthur_holy_grail',
    name: 'The Holy Grail',
    type: 'defense',
    value: 1,
    boost: 2,
    restriction: 'hero',
    quantity: 1,
    effects: [
      { type: 'healIfLow', timing: 'afterCombat', amount: 8, param: '4' },
    ],
    effectText: 'AFTER COMBAT: If King Arthur has 4 or fewer health (not defeated), set his health to 8.',
  },
  {
    id: 'arthur_lady_of_the_lake',
    name: 'Lady of the Lake',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'hero',
    quantity: 1,
    effects: [],
    effectText: 'Search your deck and discard pile for Excalibur. Add it to your hand. Shuffle your deck.',
  },

  // ---- Sidekick (Merlin only) ----
  {
    id: 'arthur_aid_of_morgana',
    name: 'The Aid of Morgana',
    type: 'attack',
    value: 4,
    boost: 2,
    restriction: 'sidekick',
    quantity: 1,
    effects: [
      { type: 'drawCards', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'AFTER COMBAT: Draw 2 cards.',
  },
  {
    id: 'arthur_aid_chosen_one',
    name: 'Aid the Chosen One',
    type: 'attack',
    value: 4,
    boost: 2,
    restriction: 'sidekick',
    quantity: 1,
    effects: [
      { type: 'drawIfWon', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'AFTER COMBAT: If you won the combat, draw 2 cards.',
  },
  {
    id: 'arthur_divine_intervention',
    name: 'Divine Intervention',
    type: 'versatile',
    value: 3,
    boost: 2,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'moveHero', timing: 'afterCombat', amount: 5 },
    ],
    effectText: 'AFTER COMBAT: Move King Arthur up to 5 spaces.',
  },
  {
    id: 'arthur_bewilderment',
    name: 'Bewilderment',
    type: 'defense',
    value: 0,
    boost: 2,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'preventDamage', timing: 'duringCombat' },
      { type: 'placeMerlinAny', timing: 'afterCombat' },
    ],
    effectText: 'DURING COMBAT: Prevent all damage to Merlin. AFTER COMBAT: Place Merlin in any space.',
  },
  {
    id: 'arthur_prophecy',
    name: 'Prophecy',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'sidekick',
    quantity: 1,
    effects: [],
    effectText: 'Look at the top 4 cards of your deck. Add 2 to your hand, put the other 2 back on top.',
  },
  {
    id: 'arthur_command_storms',
    name: 'Command the Storms',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'sidekick',
    quantity: 2,
    effects: [],
    effectText: 'Move each of your fighters up to 3 spaces.',
  },
  {
    id: 'arthur_restless_spirits',
    name: 'Restless Spirits',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'sidekick',
    quantity: 1,
    effects: [],
    effectText: "Deal 2 damage to each opposing fighter in Merlin's zone. If any are defeated, draw 1 card.",
  },

  // ---- Any fighter ----
  {
    id: 'arthur_swift_strike',
    name: 'Swift Strike',
    type: 'attack',
    value: 3,
    boost: 2,
    restriction: 'any',
    quantity: 2,
    effects: [
      { type: 'moveSelf', timing: 'afterCombat', amount: 4 },
    ],
    effectText: 'AFTER COMBAT: Move your fighter up to 4 spaces.',
  },
  {
    id: 'arthur_momentous_shift',
    name: 'Momentous Shift',
    type: 'versatile',
    value: 3,
    boost: 1,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'valueIfMoved', timing: 'duringCombat', amount: 5 },
    ],
    effectText: 'DURING COMBAT: If your fighter started this turn in a different space, this card has a value of 5 instead.',
  },
  {
    id: 'arthur_skirmish',
    name: 'Skirmish',
    type: 'versatile',
    value: 4,
    boost: 1,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'moveFighterIfWon', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'AFTER COMBAT: If you won the combat, move any one fighter in the combat up to 2 spaces.',
  },
  {
    id: 'arthur_regroup',
    name: 'Regroup',
    type: 'versatile',
    value: 1,
    boost: 1,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'regroupDraw', timing: 'afterCombat' },
    ],
    effectText: 'AFTER COMBAT: Draw 1 card. If you won the combat, draw 2 cards instead.',
  },
  {
    id: 'arthur_feint',
    name: 'Feint',
    type: 'versatile',
    value: 2,
    boost: 1,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'cancelEffects', timing: 'immediately' },
    ],
    effectText: "IMMEDIATELY: Cancel all effects on your opponent's card.",
  },
];

// =============================================
// MEDUSA — 30 cards
// =============================================

const medusaCards: CardDef[] = [
  // ---- Hero (Medusa only) ----
  {
    id: 'medusa_gaze_of_stone',
    name: 'Gaze of Stone',
    type: 'attack',
    value: 2,
    boost: 4,
    restriction: 'hero',
    quantity: 3,
    effects: [
      { type: 'dealDamageIfWon', timing: 'afterCombat', amount: 8 },
    ],
    effectText: 'AFTER COMBAT: If you won the combat, deal 8 damage to the opposing fighter.',
  },
  {
    id: 'medusa_second_shot',
    name: 'Second Shot',
    type: 'attack',
    value: 3,
    boost: 3,
    restriction: 'hero',
    quantity: 3,
    effects: [
      { type: 'boostAttack', timing: 'duringCombat' },
    ],
    effectText: 'DURING COMBAT: You may BOOST this attack.',
  },
  {
    id: 'medusa_hiss_and_slither',
    name: 'Hiss and Slither',
    type: 'defense',
    value: 4,
    boost: 3,
    restriction: 'hero',
    quantity: 3,
    effects: [
      { type: 'opponentDiscards', timing: 'afterCombat', amount: 1 },
    ],
    effectText: 'AFTER COMBAT: Your opponent discards 1 card.',
  },
  {
    id: 'medusa_momentary_glance',
    name: 'A Momentary Glance',
    type: 'scheme',
    value: 0,
    boost: 4,
    restriction: 'hero',
    quantity: 2,
    effects: [],
    effectText: "Deal 2 damage to any one fighter in Medusa's zone.",
  },
  {
    id: 'medusa_winged_frenzy',
    name: 'Winged Frenzy',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [],
    effectText: "Move each of your fighters up to 3 spaces. Then return a defeated Harpy to any space in Medusa's zone.",
  },

  // ---- Sidekick (Harpy only) ----
  {
    id: 'medusa_clutching_claws',
    name: 'Clutching Claws',
    type: 'versatile',
    value: 3,
    boost: 2,
    restriction: 'sidekick',
    quantity: 3,
    effects: [
      { type: 'opponentDiscards', timing: 'afterCombat', amount: 1 },
    ],
    effectText: 'AFTER COMBAT: Your opponent discards 1 card.',
  },
  {
    id: 'medusa_hounds_of_zeus',
    name: 'The Hounds of Mighty Zeus',
    type: 'versatile',
    value: 4,
    boost: 3,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'moveHarpies', timing: 'afterCombat', amount: 3 },
    ],
    effectText: 'AFTER COMBAT: Move each Harpy up to 3 spaces.',
  },

  // ---- Any fighter ----
  {
    id: 'medusa_feint',
    name: 'Feint',
    type: 'versatile',
    value: 2,
    boost: 2,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'cancelEffects', timing: 'immediately' },
    ],
    effectText: "IMMEDIATELY: Cancel all effects on your opponent's card.",
  },
  {
    id: 'medusa_regroup',
    name: 'Regroup',
    type: 'versatile',
    value: 1,
    boost: 2,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'regroupDraw', timing: 'afterCombat' },
    ],
    effectText: 'AFTER COMBAT: Draw 1 card. If you won the combat, draw 2 cards instead.',
  },
  {
    id: 'medusa_snipe',
    name: 'Snipe',
    type: 'versatile',
    value: 3,
    boost: 1,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'drawCards', timing: 'afterCombat', amount: 1 },
    ],
    effectText: 'AFTER COMBAT: Draw 1 card.',
  },
  {
    id: 'medusa_dash',
    name: 'Dash',
    type: 'versatile',
    value: 3,
    boost: 1,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'moveSelf', timing: 'afterCombat', amount: 3 },
    ],
    effectText: 'AFTER COMBAT: Move your fighter up to 3 spaces.',
  },
];

// =============================================
// Character Definitions
// =============================================

export const KING_ARTHUR: CharacterDef = {
  id: 'king_arthur',
  name: 'King Arthur',
  hp: 18,
  isRanged: false,
  moveValue: 3,
  sidekick: {
    name: 'Merlin',
    hp: 7,
    isRanged: true,
    moveValue: 3,
    quantity: 1,
  },
  deckCards: arthurCards,
  ability: {
    name: 'Noble Sacrifice',
    description: 'When King Arthur attacks, you may play an additional card face-down. Its BOOST value is added to the attack.',
    timing: 'duringAttack',
  },
};

export const MEDUSA: CharacterDef = {
  id: 'medusa',
  name: 'Medusa',
  hp: 16,
  isRanged: true,
  moveValue: 3,
  sidekick: {
    name: 'Harpy',
    hp: 1,
    isRanged: false,
    moveValue: 4,
    quantity: 3,
  },
  deckCards: medusaCards,
  ability: {
    name: 'Gaze of Stone',
    description: "At the start of your turn, you may deal 1 damage to an opposing fighter in Medusa's zone.",
    timing: 'startOfTurn',
  },
};

export const ALL_CHARACTERS: CharacterDef[] = [KING_ARTHUR, MEDUSA];
