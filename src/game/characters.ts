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

// =============================================
// MEWTWO (with Clones) — 30 cards
// =============================================

const mewtwoCards: CardDef[] = [
  // ---- Hero (Mewtwo only) ----
  {
    id: 'mewtwo_psystrike',
    name: 'Psystrike',
    type: 'attack',
    value: 4,
    boost: 3,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'plusPerClone', timing: 'duringCombat', amount: 1 },
    ],
    effectText: 'DURING COMBAT: This card gets +1 for each Clone you control.',
  },
  {
    id: 'mewtwo_mind_crush',
    name: 'Mind Crush',
    type: 'attack',
    value: 4,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'opponentDiscardsRandomIfWon', timing: 'afterCombat', amount: 1 },
    ],
    effectText: 'AFTER COMBAT: If you won the combat, your opponent discards 1 card at random.',
  },
  {
    id: 'mewtwo_psychic_storm',
    name: 'Psychic Storm',
    type: 'versatile',
    value: 4,
    boost: 3,
    restriction: 'hero',
    quantity: 1,
    effects: [
      { type: 'placeCloneAdjacentOpponent', timing: 'immediately' },
    ],
    effectText: 'IMMEDIATELY: Place 1 Clone in a space adjacent to the opposing fighter.',
  },
  {
    id: 'mewtwo_psychic_barrier',
    name: 'Psychic Barrier',
    type: 'defense',
    value: 4,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'preventEffectDamage', timing: 'immediately' },
    ],
    effectText: 'IMMEDIATELY: Prevent all damage you would take from card effects this combat.',
  },
  {
    id: 'mewtwo_reflect',
    name: 'Reflect',
    type: 'scheme',
    value: 0,
    boost: 1,
    restriction: 'hero',
    quantity: 2,
    effects: [],
    effectText: 'Put this card in your play area. During combat: Mewtwo takes 1 less damage from attacks. At the start of your turn, if Mewtwo controls no Clones, discard this card.',
  },
  {
    id: 'mewtwo_calm_focus',
    name: 'Calm Focus',
    type: 'defense',
    value: 1,
    boost: 1,
    restriction: 'hero',
    quantity: 3,
    effects: [
      { type: 'recycleDiscard', timing: 'immediately', amount: 3 },
    ],
    effectText: 'IMMEDIATELY: Return the top 3 cards of your discard pile to your deck and shuffle.',
  },
  {
    id: 'mewtwo_teleport',
    name: 'Teleport',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [],
    effectText: 'IMMEDIATELY: Move Mewtwo up to 5 spaces (may move through other fighters). Draw 1 card. Gain 1 action.',
  },
  {
    id: 'mewtwo_clone_batch',
    name: 'Clone Batch',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'hero',
    quantity: 1,
    effects: [],
    effectText: 'IMMEDIATELY: Mewtwo loses 1 health. Place up to 2 Clones in spaces adjacent to Mewtwo. Draw 1 card.',
  },
  {
    id: 'mewtwo_recover',
    name: 'Recover',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [],
    effectText: 'IMMEDIATELY: Recover 2 health. If Mewtwo has 6 or less health, recover 3 instead.',
  },

  // ---- Any fighter ----
  {
    id: 'mewtwo_sever_the_link',
    name: 'Sever the Link',
    type: 'attack',
    value: 3,
    boost: 1,
    restriction: 'any',
    quantity: 2,
    effects: [
      { type: 'moveAllClones', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'AFTER COMBAT: Move each Clone up to 2 spaces.',
  },
  {
    id: 'mewtwo_cloned_instincts',
    name: 'Cloned Instincts',
    type: 'versatile',
    value: 4,
    boost: 2,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'cancelIfFlanked', timing: 'immediately' },
    ],
    effectText: 'IMMEDIATELY: If the opposing fighter is flanked by Clones, ignore all effects on the opposing player\'s card this combat.',
  },
  {
    id: 'mewtwo_swarm_tactics',
    name: 'Swarm Tactics',
    type: 'versatile',
    value: 3,
    boost: 2,
    restriction: 'any',
    quantity: 4,
    effects: [
      { type: 'plusIfCloneAdjacent', timing: 'duringCombat', amount: 2 },
    ],
    effectText: 'DURING COMBAT: If a Clone is adjacent to the opposing fighter, this card gets +2.',
  },

  // ---- Sidekick (Clone only) ----
  {
    id: 'mewtwo_clone_rush',
    name: 'Clone Rush',
    type: 'versatile',
    value: 2,
    boost: 3,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'cloneRushDiscard', timing: 'afterCombat' },
    ],
    effectText: 'AFTER COMBAT: If the opposing fighter is flanked by Clones, look at that player\'s hand and choose 1 card. They discard it. Otherwise, that player discards 1 card at random.',
  },
  {
    id: 'mewtwo_sacrificial_block',
    name: 'Sacrificial Block',
    type: 'defense',
    value: 0,
    boost: 2,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'sacrificialBlock', timing: 'immediately' },
    ],
    effectText: 'IMMEDIATELY: Defeat this Clone. Draw 1 card. Deal 1 damage to the attacking fighter. Cancel all effects on the opposing fighter\'s card.',
  },
];

export const MEWTWO: CharacterDef = {
  id: 'mewtwo',
  name: 'Mewtwo',
  hp: 15,
  isRanged: true,
  moveValue: 2,
  sidekick: {
    name: 'Clone',
    hp: 1,
    isRanged: false,
    moveValue: 2,
    quantity: 3,
  },
  deckCards: mewtwoCards,
  ability: {
    name: 'Clone Vats',
    description: 'Once per turn, at the start of your turn, you may discard 1 card to place 1 Clone in a space adjacent to Mewtwo. After combat: If your attacker was a Clone and you won the combat, draw 1 card.',
    timing: 'startOfTurn',
  },
};

// =============================================
// YENNENGA (with Archers) — 30 cards
// =============================================

const yennengaCards: CardDef[] = [
  // ---- Hero (Yennenga only) ----
  {
    id: 'yennenga_stallion_charge',
    name: 'Stallion Charge',
    type: 'versatile',
    value: 3,
    boost: 2,
    restriction: 'hero',
    quantity: 3,
    effects: [
      { type: 'moveSelf', timing: 'afterCombat', amount: 5 },
    ],
    effectText: 'AFTER COMBAT: Move Yennenga up to 5 spaces. She may move through opposing fighters.',
  },

  // ---- Any fighter ----
  {
    id: 'yennenga_rain_of_arrows',
    name: 'Rain of Arrows',
    type: 'attack',
    value: 3,
    boost: 3,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'dealDamageIfWon', timing: 'afterCombat', amount: 3 },
    ],
    effectText: 'AFTER COMBAT: If you won the combat, deal 3 additional damage to the opposing fighter.',
  },
  {
    id: 'yennenga_surprise_volley',
    name: 'Surprise Volley',
    type: 'attack',
    value: 3,
    boost: 3,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'gainActionAndDraw', timing: 'immediately' },
    ],
    effectText: 'IMMEDIATELY: You may return a defeated Archer to a space in the opposing fighter\'s zone. If you do, that Archer is now the attacker. If you don\'t, gain 1 action.',
  },
  {
    id: 'yennenga_shield_formation',
    name: 'Shield Formation',
    type: 'defense',
    value: 3,
    boost: 3,
    restriction: 'any',
    quantity: 2,
    effects: [],
    effectText: 'IMMEDIATELY: Your opponent may discard a card. If they don\'t, return a defeated Archer to a space in Yennenga\'s zone.',
  },
  {
    id: 'yennenga_jaws_of_the_beast',
    name: 'Jaws of the Beast',
    type: 'versatile',
    value: 3,
    boost: 3,
    restriction: 'any',
    quantity: 3,
    effects: [],
    effectText: 'DURING COMBAT: For each zone the opposing fighter is in, increase the value of this card by +1.',
  },
  {
    id: 'yennenga_point_blank',
    name: 'Point Blank',
    type: 'versatile',
    value: 2,
    boost: 2,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'dealDamageIfWon', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'AFTER COMBAT: If the opposing fighter is adjacent to Yennenga, deal 2 damage to that fighter.',
  },
  {
    id: 'yennenga_momentous_shift',
    name: 'Momentous Shift',
    type: 'versatile',
    value: 3,
    boost: 2,
    restriction: 'any',
    quantity: 3,
    effects: [
      { type: 'valueIfMoved', timing: 'duringCombat', amount: 5 },
    ],
    effectText: 'DURING COMBAT: If your fighter started this turn in a different space, this card has a value of 5 instead.',
  },
  {
    id: 'yennenga_divide_and_conquer',
    name: 'Divide and Conquer',
    type: 'versatile',
    value: 2,
    boost: 1,
    restriction: 'any',
    quantity: 2,
    effects: [],
    effectText: 'DURING COMBAT: If your fighter is not in Yennenga\'s zone, the value of this card is 4 instead.',
  },
  {
    id: 'yennenga_pin_the_prey',
    name: 'Pin the Prey',
    type: 'versatile',
    value: 1,
    boost: 2,
    restriction: 'any',
    quantity: 2,
    effects: [
      { type: 'opponentDiscards', timing: 'afterCombat', amount: 1 },
    ],
    effectText: 'AFTER COMBAT: Move the opposing fighter up to 4 spaces. Your opponent discards 1 card.',
  },
  {
    id: 'yennenga_skirmish',
    name: 'Skirmish',
    type: 'versatile',
    value: 4,
    boost: 1,
    restriction: 'any',
    quantity: 2,
    effects: [
      { type: 'moveFighterIfWon', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'AFTER COMBAT: If you won the combat, choose one of the fighters in the combat and move them up to 2 spaces.',
  },
  {
    id: 'yennenga_master_of_the_hunt',
    name: 'Master of the Hunt',
    type: 'scheme',
    value: 0,
    boost: 3,
    restriction: 'any',
    quantity: 2,
    effects: [],
    effectText: 'Gain 2 actions.',
  },
  {
    id: 'yennenga_one_with_the_land',
    name: 'One With the Land',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'any',
    quantity: 2,
    effects: [
      { type: 'drawCards', timing: 'immediately', amount: 1 },
    ],
    effectText: 'Move each of your fighters up to 2 spaces. Each of your fighters recovers 1 health. Draw 1 card.',
  },
];

export const YENNENGA: CharacterDef = {
  id: 'yennenga',
  name: 'Yennenga',
  hp: 15,
  isRanged: true,
  moveValue: 2,
  sidekick: {
    name: 'Archer',
    hp: 2,
    isRanged: true,
    moveValue: 2,
    quantity: 2,
  },
  deckCards: yennengaCards,
  ability: {
    name: 'Shield of the Archers',
    description: 'If Yennenga would take damage, you may assign any amount of that damage to one or more Archers in her zone instead. You may not assign more damage to an Archer than their remaining health.',
    timing: 'duringAttack',
  },
};

// =============================================
// SOKKA (with Suki) — 30 cards
// =============================================

const sokkaCards: CardDef[] = [
  // ---- Hero (Sokka only) ----
  {
    id: 'sokka_space_sword_sweep',
    name: 'Space Sword Sweep',
    type: 'versatile',
    value: 4,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'discardToBoost', timing: 'duringCombat', amount: 2 },
    ],
    effectText: 'DURING COMBAT: You may discard 1 card. If you do, this card\'s value is +2.',
  },
  {
    id: 'sokka_precision_throw',
    name: 'Precision Throw',
    type: 'attack',
    value: 3,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'boomerangFlipForValue', timing: 'duringCombat', amount: 6 },
    ],
    effectText: 'DURING COMBAT: If the Boomerang is READY, you may flip it to OUT. If you do, this card\'s value is 6.',
  },
  {
    id: 'sokka_trick_shot',
    name: 'Trick Shot',
    type: 'attack',
    value: 3,
    boost: 2,
    restriction: 'hero',
    quantity: 3,
    effects: [
      { type: 'boomerangReadyIfLost', timing: 'afterCombat' },
    ],
    effectText: 'AFTER COMBAT: If you lost the combat, you may flip the Boomerang to READY.',
  },
  {
    id: 'sokka_boomerang_bounce',
    name: 'Boomerang Bounce',
    type: 'versatile',
    value: 3,
    boost: 3,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'boomerangBounceDamage', timing: 'afterCombat', amount: 1 },
    ],
    effectText: 'AFTER COMBAT: If the Boomerang is OUT and the opposing fighter was not defeated, deal 1 damage to a fighter in the opposing fighter\'s zone.',
  },
  {
    id: 'sokka_improvised_shield',
    name: 'Improvised Shield',
    type: 'defense',
    value: 2,
    boost: 2,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'boomerangFlipForValueAndCancel', timing: 'duringCombat', amount: 4 },
    ],
    effectText: 'DURING COMBAT: You may flip the Boomerang to OUT. If you do, this card\'s value is 4 and cancel all effects on your opponent\'s card.',
  },
  {
    id: 'sokka_boomerang_setup',
    name: 'Boomerang Set-Up',
    type: 'versatile',
    value: 2,
    boost: 3,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'boomerangSetupValue', timing: 'duringCombat', amount: 4 },
      { type: 'boomerangReadyAfterCombat', timing: 'afterCombat' },
    ],
    effectText: 'IMMEDIATELY: If the Boomerang is OUT, this card\'s value is 4 instead. AFTER COMBAT: If the Boomerang is OUT, you may flip it to READY.',
  },
  {
    id: 'sokka_reel_it_back',
    name: 'Reel It Back',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'hero',
    quantity: 3,
    effects: [
      { type: 'boomerangReelBack', timing: 'immediately' },
    ],
    effectText: 'If the Boomerang is OUT, flip it to READY. Then move Sokka up to 2 spaces. Gain 1 action.',
  },
  {
    id: 'sokka_cactus_juice',
    name: 'Cactus Juice',
    type: 'scheme',
    value: 0,
    boost: 4,
    restriction: 'hero',
    quantity: 2,
    effects: [
      { type: 'healSelf', timing: 'immediately', amount: 3 },
      { type: 'discardRandom', timing: 'immediately', amount: 1 },
    ],
    effectText: 'Sokka recovers 3 health. Then discard 1 random card.',
  },

  // ---- Sidekick (Suki only) ----
  {
    id: 'sokka_kyoshi_warrior_training',
    name: 'Kyoshi Warrior Training',
    type: 'scheme',
    value: 0,
    boost: 2,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'moveSelf', timing: 'immediately', amount: 3 },
      { type: 'opponentDiscards', timing: 'immediately', amount: 1 },
    ],
    effectText: 'Move Suki up to 3 spaces. She may move through opposing fighters. Choose an opposing fighter adjacent to Suki. That fighter discards 1 random card.',
  },
  {
    id: 'sokka_fan_sweep',
    name: 'Fan Sweep',
    type: 'versatile',
    value: 3,
    boost: 3,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'pushFighter', timing: 'immediately', amount: 2 },
    ],
    effectText: 'IMMEDIATELY: Move the defending fighter up to 2 spaces.',
  },
  {
    id: 'sokka_turn_their_energy',
    name: 'Turn Their Energy',
    type: 'versatile',
    value: 3,
    boost: 2,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'valueIfOpponentMoved', timing: 'duringCombat', amount: 5 },
    ],
    effectText: 'DURING COMBAT: If the opposing fighter is in a different space than they started the turn in, this card\'s value is 5 instead.',
  },
  {
    id: 'sokka_kyoshi_counter',
    name: 'Kyoshi Counter',
    type: 'versatile',
    value: 3,
    boost: 2,
    restriction: 'sidekick',
    quantity: 2,
    effects: [
      { type: 'dealDamageIfLost', timing: 'afterCombat', amount: 1 },
    ],
    effectText: 'AFTER COMBAT: If Suki lost the combat, deal 1 damage to the opposing fighter.',
  },

  // ---- Any fighter ----
  {
    id: 'sokka_skirmish',
    name: 'Skirmish',
    type: 'versatile',
    value: 4,
    boost: 1,
    restriction: 'any',
    quantity: 2,
    effects: [
      { type: 'moveFighterIfWon', timing: 'afterCombat', amount: 2 },
    ],
    effectText: 'AFTER COMBAT: If you won the combat, choose one of the fighters in the combat and move them up to 2 spaces.',
  },
  {
    id: 'sokka_regroup',
    name: 'Regroup',
    type: 'versatile',
    value: 1,
    boost: 2,
    restriction: 'any',
    quantity: 2,
    effects: [
      { type: 'regroupDraw', timing: 'afterCombat' },
    ],
    effectText: 'AFTER COMBAT: Draw 1 card. If you won this combat, draw 2 cards instead.',
  },
];

export const SOKKA: CharacterDef = {
  id: 'sokka',
  name: 'Sokka',
  hp: 15,
  isRanged: false,
  moveValue: 2,
  sidekick: {
    name: 'Suki',
    hp: 6,
    isRanged: false,
    moveValue: 2,
    quantity: 1,
  },
  deckCards: sokkaCards,
  ability: {
    name: 'Boomerang!',
    description: 'Start with the Boomerang READY. During your turn, you may flip it from READY to OUT to deal 1 damage to a fighter in Sokka\'s zone. Card effects can flip it back to READY.',
    timing: 'startOfTurn',
  },
};

export const ALL_CHARACTERS: CharacterDef[] = [KING_ARTHUR, MEDUSA, AANG, MEWTWO, YENNENGA, SOKKA];
