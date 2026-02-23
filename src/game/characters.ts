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
// AANG (with Appa) — 30 cards
// =============================================

const aangCards: CardDef[] = [
  // ---- Hero (Aang only) ----
  {
    id: 'aang_whirlwind_kick',
    name: 'Whirlwind Kick',
    type: 'attack',
    value: 3,
    boost: 2,
    restriction: 'hero',
    quantity: 3,
    effects: [
      { type: 'pushIfMoved', timing: 'duringCombat', amount: 1 },
      { type: 'moveHeroIfWon', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'DURING COMBAT: If Aang moved this turn, you may push the defender up to 1 space. AFTER COMBAT: If you won, move Aang up to 2 spaces.',
  },
  {
    id: 'aang_air_slice',
    name: 'Air Slice',
    type: 'attack',
    value: 2,
    boost: 1,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'gainActionAndDraw', timing: 'afterCombat' },
    ],
    effectText: 'AFTER COMBAT: Gain 1 action and draw 1 card.',
  },
  {
    id: 'aang_staff_sweep',
    name: 'Staff Sweep',
    type: 'versatile',
    value: 4,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'pushAndDrawIfWon', timing: 'afterCombat', amount: 1 },
    ],
    effectText: 'AFTER COMBAT: If you won the combat, push the opposing fighter up to 1 space and draw 1 card.',
  },
  {
    id: 'aang_riding_the_wind',
    name: 'Riding the Wind',
    type: 'attack',
    value: 5,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'moveHeroIfWon', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'AFTER COMBAT: If you won, move Aang up to 2 spaces.',
  },
  {
    id: 'aang_avatar_state',
    name: 'Avatar State',
    type: 'attack',
    value: 7,
    boost: 4,
    restriction: 'hero',
    quantity: 1,
    effects: [
      { type: 'discardRandomAndDeck', timing: 'immediately' },
      { type: 'zoneDamageAllEnemies', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'IMMEDIATELY: Discard 1 random card from your hand. Discard the top card of your deck. AFTER COMBAT: Deal 2 damage to each enemy fighter in Aang\'s zone.',
  },
  {
    id: 'aang_stone_wall',
    name: 'Stone Wall',
    type: 'versatile',
    value: 4,
    boost: 3,
    restriction: 'hero',
    quantity: 1,
    effects: [
      { type: 'dealDamageIfWon', timing: 'afterCombat', amount: 1 },
    ],
    effectText: 'AFTER COMBAT: If you won the combat, deal 1 damage to the opposing fighter.',
  },
  {
    id: 'aang_water_whip',
    name: 'Water Whip',
    type: 'versatile',
    value: 2,
    boost: 2,
    restriction: 'hero',
    quantity: 3,
    effects: [
      { type: 'pushAndDrawIfPushed', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'AFTER COMBAT: You may push the opposing fighter up to 2 spaces. If you pushed the opposing fighter, draw 1 card.',
  },
  {
    id: 'aang_elemental_counter',
    name: 'Elemental Counter',
    type: 'defense',
    value: 3,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'cancelEffects', timing: 'immediately' },
    ],
    effectText: "IMMEDIATELY: Cancel all effects on your opponent's card.",
  },
  {
    id: 'aang_meditate',
    name: 'Meditate',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [],
    effectText: 'Search your deck for any card to add to your hand and gain 1 action. Shuffle your deck.',
  },

  // ---- Sidekick (Appa only) ----
  {
    id: 'aang_flying_bison',
    name: 'Flying Bison',
    type: 'versatile',
    value: 4,
    boost: 3,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'moveToNewZone', timing: 'immediately' },
    ],
    effectText: 'IMMEDIATELY: Move Appa to any space in a different zone not shared with his current zone.',
  },
  {
    id: 'aang_sky_bison_charge',
    name: 'Sky Bison Charge',
    type: 'versatile',
    value: 4,
    boost: 2,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'chargeChoice', timing: 'immediately', amount: 3 },
    ],
    effectText: 'IMMEDIATELY: Choose one — move Appa up to 3 spaces or deal 1 damage to the opposing fighter.',
  },

  // ---- Any fighter ----
  {
    id: 'aang_evasive_flow',
    name: 'Evasive Flow',
    type: 'defense',
    value: 3,
    boost: 3,
    restriction: 'any',
    quantity: 2,
    effects: [
      { type: 'moveDefender', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'AFTER COMBAT: You may move the defender up to 2 spaces.',
  },
  {
    id: 'aang_air_shield',
    name: 'Air Shield',
    type: 'defense',
    value: 3,
    boost: 2,
    restriction: 'any',
    quantity: 2,
    effects: [
      { type: 'moveHeroIfDamaged', timing: 'afterCombat', amount: 1 },
    ],
    effectText: 'AFTER COMBAT: If you took damage, move Aang 1 space.',
  },
  {
    id: 'aang_sky_bison_swap',
    name: 'Sky Bison Swap',
    type: 'defense',
    value: 3,
    boost: 2,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'swapAangAppa', timing: 'immediately' },
    ],
    effectText: 'IMMEDIATELY: If Aang is the defender and Appa is in play, swap Aang and Appa. Appa becomes the defending fighter. If you swapped, draw 1 card.',
  },
  {
    id: 'aang_freedom_of_the_skies',
    name: 'Freedom of the Skies',
    type: 'scheme',
    value: 0,
    boost: 3,
    restriction: 'any',
    quantity: 1,
    effects: [],
    effectText: 'Your fighters each recover 1 health. Draw 1 card. Gain 1 action.',
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
  moveValue: 2,
  sidekick: {
    name: 'Merlin',
    hp: 7,
    isRanged: true,
    moveValue: 2,
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
    moveValue: 3,
    quantity: 3,
  },
  deckCards: medusaCards,
  ability: {
    name: 'Gaze of Stone',
    description: "At the start of your turn, you may deal 1 damage to an opposing fighter in Medusa's zone.",
    timing: 'startOfTurn',
  },
};

export const AANG: CharacterDef = {
  id: 'aang',
  name: 'Aang',
  hp: 12,
  isRanged: false,
  moveValue: 3,
  sidekick: {
    name: 'Appa',
    hp: 8,
    isRanged: false,
    moveValue: 3,
    quantity: 1,
  },
  deckCards: aangCards,
  ability: {
    name: 'Air Scooter',
    description: 'Aang may declare an attack from one space away from the defending fighter. If you do, move Aang into the space between the fighters. During combat, if you moved Aang this way, add +1 to your attack value. (This ability cannot be cancelled.)',
    timing: 'duringAttack',
  },
};

export const ALL_CHARACTERS: CharacterDef[] = [KING_ARTHUR, MEDUSA, AANG];
