import type { CharacterDef, CardDef } from './types';

// ---- KING ARTHUR ----

const arthurCards: CardDef[] = [
  // Attacks
  {
    id: 'arthur_excalibur',
    name: 'Excalibur',
    type: 'attack',
    value: 5,
    boost: 1,
    quantity: 2,
    characterOnly: true,
    effect: { type: 'afterCombatDamage', amount: 2, description: 'Deal 2 additional damage after combat.' },
  },
  {
    id: 'arthur_noble_strike',
    name: 'Noble Strike',
    type: 'attack',
    value: 4,
    boost: 2,
    quantity: 3,
  },
  {
    id: 'arthur_swift_strike',
    name: 'Swift Strike',
    type: 'attack',
    value: 3,
    boost: 3,
    quantity: 3,
  },
  {
    id: 'arthur_battle_cry',
    name: 'Battle Cry',
    type: 'attack',
    value: 2,
    boost: 2,
    quantity: 3,
    effect: { type: 'draw', amount: 1, description: 'Draw 1 card after combat.' },
  },
  // Defenses
  {
    id: 'arthur_royal_guard',
    name: 'Royal Guard',
    type: 'defense',
    value: 4,
    boost: 1,
    quantity: 2,
    effect: { type: 'heal', amount: 1, description: 'Recover 1 HP after defending.' },
  },
  {
    id: 'arthur_shield_wall',
    name: 'Shield Wall',
    type: 'defense',
    value: 3,
    boost: 2,
    quantity: 3,
  },
  // Versatile
  {
    id: 'arthur_feint',
    name: 'Feint',
    type: 'versatile',
    value: 3,
    boost: 1,
    quantity: 3,
    effect: { type: 'cancelEffects', description: "Cancel opponent's card effects." },
  },
  {
    id: 'arthur_regroup',
    name: 'Regroup',
    type: 'versatile',
    value: 2,
    boost: 3,
    quantity: 3,
  },
  // Schemes
  {
    id: 'arthur_rally',
    name: "King's Rally",
    type: 'scheme',
    value: 0,
    boost: 2,
    quantity: 3,
    characterOnly: true,
    effect: { type: 'draw', amount: 2, description: 'Draw 2 cards.' },
  },
  {
    id: 'arthur_fortify',
    name: 'Fortify',
    type: 'scheme',
    value: 0,
    boost: 1,
    quantity: 2,
    effect: { type: 'heal', amount: 3, description: 'Recover 3 HP.' },
  },
  {
    id: 'arthur_command',
    name: 'Royal Command',
    type: 'scheme',
    value: 0,
    boost: 2,
    quantity: 3,
    effect: { type: 'moveSidekick', amount: 4, description: 'Move Merlin up to 4 spaces.' },
  },
];

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
};

// ---- MEDUSA ----

const medusaCards: CardDef[] = [
  // Attacks
  {
    id: 'medusa_gaze',
    name: "Gorgon's Gaze",
    type: 'attack',
    value: 4,
    boost: 2,
    quantity: 3,
    characterOnly: true,
    effect: { type: 'afterCombatDamage', amount: 1, description: 'Deal 1 additional damage.' },
  },
  {
    id: 'medusa_arrow',
    name: 'Serpent Arrow',
    type: 'attack',
    value: 3,
    boost: 2,
    quantity: 4,
  },
  {
    id: 'medusa_strike',
    name: 'Venomous Strike',
    type: 'attack',
    value: 2,
    boost: 3,
    quantity: 3,
    effect: { type: 'afterCombatDamage', amount: 1, description: 'Deal 1 additional damage if attack deals damage.' },
  },
  // Defenses
  {
    id: 'medusa_stone_shield',
    name: 'Stone Shield',
    type: 'defense',
    value: 4,
    boost: 1,
    quantity: 2,
  },
  {
    id: 'medusa_serpent_dodge',
    name: 'Serpent Dodge',
    type: 'defense',
    value: 3,
    boost: 3,
    quantity: 3,
  },
  // Versatile
  {
    id: 'medusa_feint',
    name: 'Feint',
    type: 'versatile',
    value: 3,
    boost: 1,
    quantity: 3,
    effect: { type: 'cancelEffects', description: "Cancel opponent's card effects." },
  },
  {
    id: 'medusa_coil',
    name: 'Coiling Strike',
    type: 'versatile',
    value: 2,
    boost: 2,
    quantity: 3,
  },
  // Schemes
  {
    id: 'medusa_petrify',
    name: 'Petrify',
    type: 'scheme',
    value: 0,
    boost: 1,
    quantity: 2,
    characterOnly: true,
    effect: { type: 'dealDamage', amount: 2, description: 'Deal 2 damage to a fighter in your zone.' },
  },
  {
    id: 'medusa_summon',
    name: 'Summon Harpies',
    type: 'scheme',
    value: 0,
    boost: 2,
    quantity: 3,
    effect: { type: 'reviveSidekick', description: 'Place a defeated Harpy on your space.' },
  },
  {
    id: 'medusa_prey',
    name: 'Stalk Prey',
    type: 'scheme',
    value: 0,
    boost: 3,
    quantity: 2,
    effect: { type: 'draw', amount: 2, description: 'Draw 2 cards.' },
  },
];

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
};

export const ALL_CHARACTERS: CharacterDef[] = [KING_ARTHUR, MEDUSA];
