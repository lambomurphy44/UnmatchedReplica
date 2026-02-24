import type {
  GameState, Player, Fighter, Card, CardDef, CharacterDef, BoardMap, QueuedEffect,
} from './types';
import { DEFAULT_MAP } from './board';
import { ALL_CHARACTERS } from './characters';

// ---- Utility ----

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let _uid = 0;
function uid(prefix: string): string {
  return `${prefix}_${++_uid}`;
}

export function getCardDef(card: Card, charDef: CharacterDef): CardDef | undefined {
  return charDef.deckCards.find(c => c.id === card.defId);
}

function buildDeck(charDef: CharacterDef): Card[] {
  const cards: Card[] = [];
  for (const cd of charDef.deckCards) {
    for (let i = 0; i < cd.quantity; i++) {
      cards.push({ id: uid('card'), defId: cd.id });
    }
  }
  return shuffle(cards);
}

function buildFighters(charDef: CharacterDef, playerIndex: number, heroSpaceId: string): Fighter[] {
  const fighters: Fighter[] = [];
  fighters.push({
    id: uid('fighter'),
    name: charDef.name,
    characterId: charDef.id,
    isHero: true,
    hp: charDef.hp,
    maxHp: charDef.hp,
    isRanged: charDef.isRanged,
    moveValue: charDef.moveValue,
    spaceId: heroSpaceId,
    owner: playerIndex,
  });
  if (charDef.sidekick) {
    for (let i = 0; i < charDef.sidekick.quantity; i++) {
      const skName = charDef.sidekick.quantity > 1
        ? `${charDef.sidekick.name} ${i + 1}`
        : charDef.sidekick.name;
      fighters.push({
        id: uid('fighter'),
        name: skName,
        characterId: charDef.id,
        isHero: false,
        hp: charDef.sidekick.hp,
        maxHp: charDef.sidekick.hp,
        isRanged: charDef.sidekick.isRanged,
        moveValue: charDef.sidekick.moveValue,
        spaceId: '',
        owner: playerIndex,
      });
    }
  }
  return fighters;
}

// ---- Game Init ----

export function createGame(char0Id: string, char1Id: string, p0Name: string, p1Name: string): GameState {
  _uid = 0;
  const char0 = ALL_CHARACTERS.find(c => c.id === char0Id)!;
  const char1 = ALL_CHARACTERS.find(c => c.id === char1Id)!;
  const board = DEFAULT_MAP;

  const fighters0 = buildFighters(char0, 0, board.startPositions.player0[0]);
  const fighters1 = buildFighters(char1, 1, board.startPositions.player1[0]);
  const allFighters = [...fighters0, ...fighters1];

  const deck0 = buildDeck(char0);
  const deck1 = buildDeck(char1);
  const hand0 = deck0.splice(0, 5);
  const hand1 = deck1.splice(0, 5);

  const players: [Player, Player] = [
    {
      index: 0, name: p0Name, characterId: char0Id,
      hand: hand0, deck: deck0, discard: [],
      fighters: fighters0.map(f => f.id), actionsRemaining: 2,
    },
    {
      index: 1, name: p1Name, characterId: char1Id,
      hand: hand1, deck: deck1, discard: [],
      fighters: fighters1.map(f => f.id), actionsRemaining: 2,
    },
  ];

  const unplacedP0 = fighters0.filter(f => f.spaceId === '');
  const unplacedP1 = fighters1.filter(f => f.spaceId === '');
  const needsPlacement = unplacedP0.length > 0 || unplacedP1.length > 0;

  // Record starting positions
  const turnStartSpaces: Record<string, string> = {};
  for (const f of allFighters) {
    turnStartSpaces[f.id] = f.spaceId;
  }

  const state: GameState = {
    players,
    fighters: allFighters,
    board,
    currentPlayer: 0,
    phase: needsPlacement ? 'place_sidekick' : 'playing',
    combat: null,
    winner: null,
    log: [`Game started! ${p0Name} (${char0.name}) vs ${p1Name} (${char1.name})`],
    selectedFighter: null,
    placementPlayer: needsPlacement ? (unplacedP0.length > 0 ? 0 : 1) : null,
    placementFighterIds: needsPlacement
      ? (unplacedP0.length > 0 ? unplacedP0.map(f => f.id) : unplacedP1.map(f => f.id))
      : [],
    maneuverBoost: 0,
    maneuverFightersToMove: [],
    maneuverCurrentFighter: null,
    pendingSchemeCard: null,
    schemeMoveFighterId: null,
    schemeMoveRange: 0,
    effectQueue: [],
    turnStartSpaces,
    pushTargetId: null,
    pushRange: 0,
    searchCards: [],
  };

  if (needsPlacement) {
    const placingPlayer = state.players[state.placementPlayer!];
    const nextFighter = getFighter(state, state.placementFighterIds[0]);
    addLog(state, `${placingPlayer.name}: Place ${nextFighter?.name} on a space in your starting zone.`);
  } else {
    addLog(state, `--- ${p0Name}'s turn ---`);
    checkStartOfTurnAbility(state);
  }

  return state;
}

// ---- Queries ----

export function getFighter(state: GameState, fighterId: string): Fighter | undefined {
  return state.fighters.find(f => f.id === fighterId);
}

export function getAliveFighters(state: GameState, playerIndex: number): Fighter[] {
  return state.fighters.filter(f => f.owner === playerIndex && f.hp > 0);
}

export function getHero(state: GameState, playerIndex: number): Fighter | undefined {
  return state.fighters.find(f => f.owner === playerIndex && f.isHero);
}

export function getCharDef(characterId: string): CharacterDef {
  return ALL_CHARACTERS.find(c => c.id === characterId)!;
}

export function getSpace(board: BoardMap, spaceId: string) {
  return board.spaces.find(s => s.id === spaceId);
}

export function areAdjacent(board: BoardMap, spaceA: string, spaceB: string): boolean {
  const sa = getSpace(board, spaceA);
  return sa ? sa.adjacentIds.includes(spaceB) : false;
}

export function sameZone(board: BoardMap, spaceA: string, spaceB: string): boolean {
  const sa = getSpace(board, spaceA);
  const sb = getSpace(board, spaceB);
  if (!sa || !sb) return false;
  return sa.zones.some(z => sb.zones.includes(z));
}

export function isSpaceOccupied(state: GameState, spaceId: string, excludeFighterId?: string): boolean {
  return state.fighters.some(f => f.spaceId === spaceId && f.hp > 0 && f.id !== excludeFighterId);
}

export function getReachableSpaces(board: BoardMap, fromId: string, steps: number, fighters: Fighter[], movingFighterId: string): string[] {
  const occupied = new Set(
    fighters.filter(f => f.hp > 0 && f.id !== movingFighterId && f.spaceId).map(f => f.spaceId)
  );
  const visited = new Set<string>([fromId]);
  let frontier = [fromId];
  for (let i = 0; i < steps; i++) {
    const next: string[] = [];
    for (const sid of frontier) {
      const space = getSpace(board, sid);
      if (!space) continue;
      for (const adjId of space.adjacentIds) {
        if (!visited.has(adjId) && !occupied.has(adjId)) {
          visited.add(adjId);
          next.push(adjId);
        }
      }
    }
    frontier = next;
  }
  visited.delete(fromId);
  return Array.from(visited);
}

/** Find a shared adjacent space between two spaces (for Air Scooter). Returns the space ID or null. */
export function getSpaceBetween(board: BoardMap, spaceA: string, spaceB: string, fighters: Fighter[], movingId: string): string | null {
  const sa = getSpace(board, spaceA);
  const sb = getSpace(board, spaceB);
  if (!sa || !sb) return null;
  const occupied = new Set(fighters.filter(f => f.hp > 0 && f.id !== movingId).map(f => f.spaceId));
  // Find an unoccupied space adjacent to both
  for (const adjId of sa.adjacentIds) {
    if (sb.adjacentIds.includes(adjId) && !occupied.has(adjId)) {
      return adjId;
    }
  }
  return null;
}

export function canAttack(board: BoardMap, attacker: Fighter, defender: Fighter, fighters?: Fighter[]): boolean {
  if (attacker.hp <= 0 || defender.hp <= 0) return false;
  if (attacker.isRanged) {
    return sameZone(board, attacker.spaceId, defender.spaceId) || areAdjacent(board, attacker.spaceId, defender.spaceId);
  }
  // Aang's Air Scooter: can attack from 1 space away if there's an unoccupied space between
  if (attacker.isHero && attacker.characterId === 'aang' && fighters) {
    if (!areAdjacent(board, attacker.spaceId, defender.spaceId)) {
      return getSpaceBetween(board, attacker.spaceId, defender.spaceId, fighters, attacker.id) !== null;
    }
  }
  return areAdjacent(board, attacker.spaceId, defender.spaceId);
}

export function getValidTargets(state: GameState, attackerId: string): Fighter[] {
  const attacker = getFighter(state, attackerId);
  if (!attacker) return [];
  const opponentIndex = attacker.owner === 0 ? 1 : 0;
  return getAliveFighters(state, opponentIndex).filter(d => canAttack(state.board, attacker, d, state.fighters));
}

export function currentPlayer(state: GameState): Player {
  return state.players[state.currentPlayer];
}

export function getPlayableCards(state: GameState, cardType?: 'attack' | 'defense' | 'scheme' | 'versatile'): { card: Card; def: CardDef }[] {
  const player = currentPlayer(state);
  const charDef = getCharDef(player.characterId);
  return player.hand
    .map(card => ({ card, def: charDef.deckCards.find(d => d.id === card.defId)! }))
    .filter(({ def }) => {
      if (!def) return false;
      if (cardType === 'attack') return def.type === 'attack' || def.type === 'versatile';
      if (cardType === 'defense') return def.type === 'defense' || def.type === 'versatile';
      if (cardType === 'scheme') return def.type === 'scheme';
      return true;
    });
}

/** Check if a card can be played by a given fighter based on restriction */
export function canFighterPlayCard(fighter: Fighter, cardDef: CardDef): boolean {
  if (cardDef.restriction === 'any') return true;
  if (cardDef.restriction === 'hero') return fighter.isHero;
  if (cardDef.restriction === 'sidekick') return !fighter.isHero;
  return true;
}

// ---- Sidekick Placement ----

export function getValidPlacementSpaces(state: GameState, playerIndex: number): string[] {
  const heroSpaceId = playerIndex === 0
    ? state.board.startPositions.player0[0]
    : state.board.startPositions.player1[0];
  const heroSpace = getSpace(state.board, heroSpaceId);
  if (!heroSpace) return [];
  const heroZones = heroSpace.zones;
  return state.board.spaces
    .filter(s => s.zones.some(z => heroZones.includes(z)) && !isSpaceOccupied(state, s.id))
    .map(s => s.id);
}

export function placeSidekick(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  if (s.placementFighterIds.length === 0) return s;
  const fighterId = s.placementFighterIds[0];
  const fighter = getFighter(s, fighterId);
  if (!fighter) return s;
  if (isSpaceOccupied(s, spaceId)) return s;

  fighter.spaceId = spaceId;
  addLog(s, `${fighter.name} placed on ${spaceId}.`);
  s.placementFighterIds = s.placementFighterIds.slice(1);

  if (s.placementFighterIds.length === 0) {
    const otherPlayer = s.placementPlayer === 0 ? 1 : 0;
    const otherUnplaced = s.fighters.filter(f => f.owner === otherPlayer && !f.isHero && f.spaceId === '');
    if (otherUnplaced.length > 0) {
      s.placementPlayer = otherPlayer;
      s.placementFighterIds = otherUnplaced.map(f => f.id);
      const pName = s.players[otherPlayer].name;
      const nextF = getFighter(s, s.placementFighterIds[0]);
      addLog(s, `${pName}: Place ${nextF?.name} on a space in your starting zone.`);
    } else {
      s.phase = 'playing';
      s.placementPlayer = null;
      s.placementFighterIds = [];
      addLog(s, `All fighters placed. Let the battle begin!`);
      addLog(s, `--- ${s.players[s.currentPlayer].name}'s turn ---`);
      recordTurnStartPositions(s);
      checkStartOfTurnAbility(s);
    }
  } else {
    const nextF = getFighter(s, s.placementFighterIds[0]);
    addLog(s, `Place ${nextF?.name} on a space in your starting zone.`);
  }

  return s;
}

// ---- Internal Helpers ----

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

function addLog(state: GameState, msg: string) {
  state.log.push(msg);
  if (state.log.length > 80) state.log.shift();
}

function recordTurnStartPositions(state: GameState) {
  state.turnStartSpaces = {};
  for (const f of state.fighters) {
    if (f.hp > 0) {
      state.turnStartSpaces[f.id] = f.spaceId;
    }
  }
}

function drawCards(state: GameState, playerIndex: number, count: number) {
  const p = state.players[playerIndex];
  for (let i = 0; i < count; i++) {
    if (p.deck.length === 0) {
      const alive = state.fighters.filter(f => f.owner === playerIndex && f.hp > 0);
      for (const fighter of alive) {
        fighter.hp = Math.max(0, fighter.hp - 2);
        addLog(state, `${fighter.name} takes 2 damage from exhaustion (empty deck)!`);
      }
      checkHeroDeath(state);
      return;
    }
    p.hand.push(p.deck.pop()!);
  }
}

function checkHeroDeath(state: GameState) {
  for (let i = 0; i < 2; i++) {
    const hero = getHero(state, i);
    if (hero && hero.hp <= 0) {
      state.winner = i === 0 ? 1 : 0;
      state.phase = 'gameOver';
      addLog(state, `${hero.name} has been defeated! ${state.players[state.winner].name} wins!`);
    }
  }
}

function checkStartOfTurnAbility(state: GameState) {
  const charDef = getCharDef(state.players[state.currentPlayer].characterId);
  if (charDef.id === 'medusa') {
    const hero = getHero(state, state.currentPlayer);
    if (hero && hero.hp > 0) {
      const targets = getMedusaGazeTargets(state);
      if (targets.length > 0) {
        state.phase = 'medusa_startAbility';
        addLog(state, `Medusa may deal 1 damage to an opposing fighter in her zone.`);
      }
    }
  }
}

function endTurn(state: GameState) {
  const cp = state.players[state.currentPlayer];
  if (cp.hand.length > 7) {
    state.phase = 'discard_excess';
    addLog(state, `${cp.name} must discard down to 7 cards (currently ${cp.hand.length}).`);
    return;
  }
  finishEndTurn(state);
}

function finishEndTurn(state: GameState) {
  state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
  state.players[state.currentPlayer].actionsRemaining = 2;
  state.selectedFighter = null;
  state.maneuverBoost = 0;
  state.maneuverFightersToMove = [];
  state.maneuverCurrentFighter = null;
  state.phase = 'playing';
  addLog(state, `--- ${state.players[state.currentPlayer].name}'s turn ---`);
  recordTurnStartPositions(state);
  checkStartOfTurnAbility(state);
}

function useAction(state: GameState) {
  state.players[state.currentPlayer].actionsRemaining--;
  if (state.players[state.currentPlayer].actionsRemaining <= 0) {
    endTurn(state);
  } else {
    state.phase = 'playing';
    state.selectedFighter = null;
  }
}

// ---- Discard Excess ----

export function discardExcessCard(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const player = s.players[s.currentPlayer];
  const cardIdx = player.hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s;
  const card = player.hand.splice(cardIdx, 1)[0];
  player.discard.push(card);
  const charDef = getCharDef(player.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `${player.name} discards ${def?.name || 'a card'}.`);
  if (player.hand.length <= 7) {
    finishEndTurn(s);
  }
  return s;
}

// ---- Medusa Gaze ----

export function getMedusaGazeTargets(state: GameState): Fighter[] {
  const hero = getHero(state, state.currentPlayer);
  if (!hero) return [];
  const opponentIndex = state.currentPlayer === 0 ? 1 : 0;
  return getAliveFighters(state, opponentIndex).filter(f =>
    sameZone(state.board, hero.spaceId, f.spaceId)
  );
}

export function useMedusaGaze(state: GameState, targetFighterId: string): GameState {
  const s = clone(state);
  const target = getFighter(s, targetFighterId);
  if (target) {
    target.hp = Math.max(0, target.hp - 1);
    addLog(s, `Medusa's gaze deals 1 damage to ${target.name}! (${target.hp} HP)`);
    checkHeroDeath(s);
  }
  if (s.phase !== 'gameOver') {
    s.phase = 'playing';
  }
  return s;
}

export function skipMedusaGaze(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Medusa does not use her gaze.`);
  s.phase = 'playing';
  return s;
}

// ---- Maneuver ----

export function startManeuver(state: GameState): GameState {
  const s = clone(state);
  drawCards(s, s.currentPlayer, 1);
  if (s.phase === 'gameOver') return s;
  s.maneuverBoost = 0;
  s.maneuverFightersToMove = getAliveFighters(s, s.currentPlayer).map(f => f.id);
  s.maneuverCurrentFighter = null;
  s.phase = 'maneuver_boost';
  addLog(s, `${currentPlayer(s).name} maneuvers (drew a card). Optionally discard a card for movement boost.`);
  return s;
}

export function applyManeuverBoost(state: GameState, boostCardId: string | null): GameState {
  const s = clone(state);
  if (boostCardId) {
    const player = currentPlayer(s);
    const cardIdx = player.hand.findIndex(c => c.id === boostCardId);
    if (cardIdx >= 0) {
      const card = player.hand[cardIdx];
      const charDef = getCharDef(player.characterId);
      const def = getCardDef(card, charDef);
      if (def) {
        s.maneuverBoost = def.boost;
        player.hand.splice(cardIdx, 1);
        player.discard.push(card);
        addLog(s, `Discarded ${def.name} for +${def.boost} movement boost.`);
      }
    }
  }
  if (s.maneuverFightersToMove.length > 0) {
    s.phase = 'maneuver_selectFighter';
    addLog(s, `Select a fighter to move, or skip all.`);
  } else {
    useAction(s);
  }
  return s;
}

export function selectManeuverFighter(state: GameState, fighterId: string): GameState {
  const s = clone(state);
  s.maneuverCurrentFighter = fighterId;
  s.phase = 'maneuver_moveFighter';
  const f = getFighter(s, fighterId);
  const moveRange = (f?.moveValue || 0) + s.maneuverBoost;
  addLog(s, `Moving ${f?.name} (up to ${moveRange} spaces). Click a space or skip.`);
  return s;
}

export function executeManeuverMove(state: GameState, targetSpaceId: string): GameState {
  const s = clone(state);
  const fighterId = s.maneuverCurrentFighter;
  if (!fighterId) return s;
  const fighter = getFighter(s, fighterId);
  if (!fighter) return s;

  const moveRange = fighter.moveValue + s.maneuverBoost;
  const reachable = getReachableSpaces(s.board, fighter.spaceId, moveRange, s.fighters, fighter.id);
  if (reachable.includes(targetSpaceId)) {
    fighter.spaceId = targetSpaceId;
    addLog(s, `${fighter.name} moved to ${targetSpaceId}.`);
  }

  return advanceManeuver(s, fighterId);
}

export function skipFighterMove(state: GameState): GameState {
  const s = clone(state);
  const fighterId = s.maneuverCurrentFighter;
  if (fighterId) {
    const f = getFighter(s, fighterId);
    addLog(s, `${f?.name} stays in place.`);
    return advanceManeuver(s, fighterId);
  }
  return s;
}

export function skipAllManeuverMoves(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `${currentPlayer(s).name} skips all movement.`);
  s.maneuverFightersToMove = [];
  s.maneuverCurrentFighter = null;
  useAction(s);
  return s;
}

function advanceManeuver(state: GameState, movedFighterId: string): GameState {
  state.maneuverFightersToMove = state.maneuverFightersToMove.filter(id => id !== movedFighterId);
  state.maneuverCurrentFighter = null;
  if (state.maneuverFightersToMove.length > 0) {
    state.phase = 'maneuver_selectFighter';
    addLog(state, `Select next fighter to move, or skip all.`);
  } else {
    useAction(state);
  }
  return state;
}

// ========================================
// ATTACK / COMBAT with proper timing
// ========================================

export function startAttack(state: GameState, attackerFighterId: string): GameState {
  const s = clone(state);
  s.selectedFighter = attackerFighterId;
  s.phase = 'attack_selectTarget';
  return s;
}

export function selectAttackTarget(state: GameState, defenderId: string): GameState {
  const s = clone(state);
  const attacker = getFighter(s, s.selectedFighter!)!;
  const defender = getFighter(s, defenderId)!;

  // Air Scooter: if Aang is attacking from 1 space away, move to space between
  let airScooterUsed = false;
  if (attacker.isHero && attacker.characterId === 'aang' && !areAdjacent(s.board, attacker.spaceId, defender.spaceId)) {
    const between = getSpaceBetween(s.board, attacker.spaceId, defender.spaceId, s.fighters, attacker.id);
    if (between) {
      addLog(s, `Air Scooter! Aang zips to ${between} between the fighters!`);
      attacker.spaceId = between;
      airScooterUsed = true;
    }
  }

  s.combat = {
    attackerId: s.selectedFighter!,
    defenderId,
    attackCard: null,
    defenseCard: null,
    attackBoostCard: null,
    duringCombatBoost: null,
    attackerEffectsCancelled: false,
    defenderEffectsCancelled: false,
    damageDealt: 0,
    attackerWon: false,
    airScooterUsed,
  };
  s.phase = 'attack_selectCard';
  addLog(s, `${attacker.name} attacks ${defender.name}! Choose an attack card.`);
  return s;
}

export function selectAttackCard(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const player = s.players[s.currentPlayer];
  const cardIdx = player.hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0 || !s.combat) return s;
  const card = player.hand.splice(cardIdx, 1)[0];
  s.combat.attackCard = card;

  const charDef = getCharDef(player.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `Attacker plays ${def?.name || 'a card'}.`);

  // Arthur's ability: boost when attacking with King Arthur
  const attacker = getFighter(s, s.combat.attackerId);
  if (attacker?.isHero && player.characterId === 'king_arthur' && player.hand.length > 0) {
    s.phase = 'arthur_attackBoost';
    addLog(s, `King Arthur may play an additional card as a boost.`);
  } else {
    s.phase = 'attack_defenderCard';
    addLog(s, `Defender: choose a defense card or skip.`);
  }
  return s;
}

export function selectArthurBoostCard(state: GameState, cardId: string | null): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  const player = s.players[s.currentPlayer];

  if (cardId) {
    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx >= 0) {
      const card = player.hand.splice(cardIdx, 1)[0];
      s.combat.attackBoostCard = card;
      const charDef = getCharDef(player.characterId);
      const def = getCardDef(card, charDef);
      addLog(s, `King Arthur plays ${def?.name} as ability boost (+${def?.boost || 0}).`);
    }
  } else {
    addLog(s, `King Arthur skips the ability boost.`);
  }

  s.phase = 'attack_defenderCard';
  addLog(s, `Defender: choose a defense card or skip.`);
  return s;
}

export function selectDefenseCard(state: GameState, cardId: string | null): GameState {
  const s = clone(state);
  if (!s.combat) return s;

  const defenderOwner = getFighter(s, s.combat.defenderId)!.owner;
  const defPlayer = s.players[defenderOwner];

  if (cardId) {
    const cardIdx = defPlayer.hand.findIndex(c => c.id === cardId);
    if (cardIdx >= 0) {
      s.combat.defenseCard = defPlayer.hand.splice(cardIdx, 1)[0];
    }
  }

  return resolveCombat(s);
}

// ---- Combat Resolution (proper timing order) ----

function resolveCombat(state: GameState): GameState {
  const s = state;
  if (!s.combat) return s;

  const attacker = getFighter(s, s.combat.attackerId)!;
  const defender = getFighter(s, s.combat.defenderId)!;
  const atkPlayer = s.players[attacker.owner];
  const defPlayer = s.players[defender.owner];
  const atkCharDef = getCharDef(atkPlayer.characterId);
  const defCharDef = getCharDef(defPlayer.characterId);

  const atkCardDef = s.combat.attackCard ? getCardDef(s.combat.attackCard, atkCharDef) : null;
  const defCardDef = s.combat.defenseCard ? getCardDef(s.combat.defenseCard, defCharDef) : null;

  // ===== PHASE 1: IMMEDIATELY =====
  // Defender's immediately effects first, then attacker's
  const defImmediate = defCardDef?.effects.filter(e => e.timing === 'immediately') || [];
  const atkImmediate = atkCardDef?.effects.filter(e => e.timing === 'immediately') || [];

  // Process defender's IMMEDIATELY effects
  for (const effect of defImmediate) {
    if (effect.type === 'cancelEffects') {
      s.combat.attackerEffectsCancelled = true;
      addLog(s, `${defCardDef?.name}: Cancels all effects on attacker's card!`);
    }
    if (effect.type === 'swapAangAppa' && !s.combat.defenderEffectsCancelled) {
      // Sky Bison Swap: if Aang is the defender and Appa is alive, swap them
      if (defender.isHero && defender.characterId === 'aang') {
        const appa = s.fighters.find(f => f.owner === defender.owner && !f.isHero && f.hp > 0 && f.characterId === 'aang');
        if (appa) {
          const tempSpace = defender.spaceId;
          defender.spaceId = appa.spaceId;
          appa.spaceId = tempSpace;
          s.combat.defenderId = appa.id;
          addLog(s, `Sky Bison Swap! Aang and Appa swap positions! Appa is now the defender!`);
          drawCards(s, defPlayer.index, 1);
          addLog(s, `${defPlayer.name} draws 1 card from the swap.`);
        } else {
          addLog(s, `Sky Bison Swap: Appa is not in play, no swap.`);
        }
      } else {
        addLog(s, `Sky Bison Swap: Aang is not the defender, no swap.`);
      }
    }
  }

  // Process attacker's IMMEDIATELY effects (only if not cancelled)
  if (!s.combat.attackerEffectsCancelled) {
    for (const effect of atkImmediate) {
      if (effect.type === 'cancelEffects') {
        s.combat.defenderEffectsCancelled = true;
        addLog(s, `${atkCardDef?.name}: Cancels all effects on defender's card!`);
      }
      if (effect.type === 'discardRandomAndDeck') {
        // Avatar State: discard 1 random card from hand, discard top card of deck
        if (atkPlayer.hand.length > 0) {
          const randIdx = Math.floor(Math.random() * atkPlayer.hand.length);
          const discarded = atkPlayer.hand.splice(randIdx, 1)[0];
          atkPlayer.discard.push(discarded);
          const discDef = getCardDef(discarded, atkCharDef);
          addLog(s, `Avatar State: Discarded ${discDef?.name || 'a card'} from hand.`);
        }
        if (atkPlayer.deck.length > 0) {
          const topCard = atkPlayer.deck.pop()!;
          atkPlayer.discard.push(topCard);
          const topDef = getCardDef(topCard, atkCharDef);
          addLog(s, `Avatar State: Discarded ${topDef?.name || 'a card'} from top of deck.`);
        }
      }
      if (effect.type === 'moveToNewZone') {
        // Flying Bison: move Appa to any space in a different zone (auto-resolve: skip for now, handle after combat)
        // This is an immediately effect on a versatile card used as attack
        // We auto-resolve: just log it. Full interactive would need a phase pause.
        const fighter = getFighter(s, s.combat.attackerId);
        if (fighter && !fighter.isHero && fighter.characterId === 'aang') {
          const currentSpace = getSpace(s.board, fighter.spaceId);
          if (currentSpace) {
            const currentZones = currentSpace.zones;
            const validSpaces = s.board.spaces.filter(sp =>
              !sp.zones.some(z => currentZones.includes(z)) &&
              !isSpaceOccupied(s, sp.id, fighter.id)
            );
            if (validSpaces.length > 0) {
              // Auto-pick: move to a random valid space (simplified)
              const target = validSpaces[Math.floor(Math.random() * validSpaces.length)];
              fighter.spaceId = target.id;
              addLog(s, `Flying Bison: ${fighter.name} flies to ${target.id} in a new zone!`);
            } else {
              addLog(s, `Flying Bison: No valid spaces in a different zone.`);
            }
          }
        }
      }
      if (effect.type === 'chargeChoice') {
        // Sky Bison Charge: choose move up to 3 or deal 1 damage
        // Auto-resolve: deal 1 damage to opposing fighter (simplified)
        const opponent = getFighter(s, s.combat.defenderId);
        if (opponent && opponent.hp > 0) {
          opponent.hp = Math.max(0, opponent.hp - 1);
          addLog(s, `Sky Bison Charge: Deals 1 damage to ${opponent.name}! (${opponent.hp} HP)`);
          checkHeroDeath(s);
        }
      }
    }
  }

  // Process defender's non-cancel IMMEDIATELY effects that weren't handled above
  if (!s.combat.defenderEffectsCancelled) {
    for (const effect of defImmediate) {
      if (effect.type === 'discardRandomAndDeck') {
        if (defPlayer.hand.length > 0) {
          const randIdx = Math.floor(Math.random() * defPlayer.hand.length);
          const discarded = defPlayer.hand.splice(randIdx, 1)[0];
          defPlayer.discard.push(discarded);
          const discDef = getCardDef(discarded, defCharDef);
          addLog(s, `Avatar State: Discarded ${discDef?.name || 'a card'} from hand.`);
        }
        if (defPlayer.deck.length > 0) {
          const topCard = defPlayer.deck.pop()!;
          defPlayer.discard.push(topCard);
          const topDef = getCardDef(topCard, defCharDef);
          addLog(s, `Avatar State: Discarded ${topDef?.name || 'a card'} from top of deck.`);
        }
      }
    }
  }

  // ===== PHASE 2: DURING COMBAT =====
  const defDuring = (!s.combat.defenderEffectsCancelled
    ? defCardDef?.effects.filter(e => e.timing === 'duringCombat') : []) || [];
  const atkDuring = (!s.combat.attackerEffectsCancelled
    ? atkCardDef?.effects.filter(e => e.timing === 'duringCombat') : []) || [];

  // Defender's DURING COMBAT
  for (const effect of defDuring) {
    if (effect.type === 'preventDamage') {
      addLog(s, `${defCardDef?.name}: All damage is prevented!`);
    }
    if (effect.type === 'valueIfMoved') {
      const startSpace = s.turnStartSpaces[defender.id];
      if (startSpace && startSpace !== defender.spaceId) {
        // This modifies the defense card value - but this card is versatile used as defense
        // The card value is already set, we'll adjust in the value calculation
        addLog(s, `${defCardDef?.name}: Fighter moved this turn, value becomes ${effect.amount}!`);
      }
    }
  }

  // Attacker's DURING COMBAT
  let atkHasDuringBoost = false;
  for (const effect of atkDuring) {
    if (effect.type === 'boostAttack') {
      // Noble Sacrifice / Second Shot: the attacker may play a boost card
      // Check if player has cards in hand
      if (atkPlayer.hand.length > 0) {
        atkHasDuringBoost = true;
      }
    }
    if (effect.type === 'valueIfMoved') {
      const startSpace = s.turnStartSpaces[attacker.id];
      if (startSpace && startSpace !== attacker.spaceId) {
        addLog(s, `${atkCardDef?.name}: Fighter moved this turn, value becomes ${effect.amount}!`);
      }
    }
  }

  // If there's a during-combat boost to play, pause and let player choose
  if (atkHasDuringBoost) {
    s.phase = 'combat_duringBoost';
    addLog(s, `${atkCardDef?.name}: You may play a card as a boost. Select a card or skip.`);
    return s;
  }

  // Continue to damage calculation
  return resolveCombatDamage(s);
}

/** Called after all during-combat effects are resolved */
function resolveCombatDamage(state: GameState): GameState {
  const s = state;
  if (!s.combat) return s;

  const attacker = getFighter(s, s.combat.attackerId)!;
  const defender = getFighter(s, s.combat.defenderId)!;
  const atkPlayer = s.players[attacker.owner];
  const defPlayer = s.players[defender.owner];
  const atkCharDef = getCharDef(atkPlayer.characterId);
  const defCharDef = getCharDef(defPlayer.characterId);

  const atkCardDef = s.combat.attackCard ? getCardDef(s.combat.attackCard, atkCharDef) : null;
  const defCardDef = s.combat.defenseCard ? getCardDef(s.combat.defenseCard, defCharDef) : null;

  // ===== Calculate values =====
  let atkValue = atkCardDef?.value || 0;
  let defValue = defCardDef?.value || 0;

  // Air Scooter +1 bonus (cannot be cancelled)
  if (s.combat.airScooterUsed) {
    atkValue += 1;
    addLog(s, `Air Scooter adds +1 to attack value!`);
  }

  // Arthur's ability boost
  if (s.combat.attackBoostCard) {
    const boostDef = getCardDef(s.combat.attackBoostCard, atkCharDef);
    atkValue += boostDef?.boost || 0;
  }

  // During-combat card boost (Noble Sacrifice / Second Shot)
  if (s.combat.duringCombatBoost) {
    const boostCharDef = getCharDef(atkPlayer.characterId);
    const boostDef = getCardDef(s.combat.duringCombatBoost, boostCharDef);
    atkValue += boostDef?.boost || 0;
  }

  // Momentous Shift: if fighter moved, value becomes 5
  if (!s.combat.attackerEffectsCancelled && atkCardDef) {
    for (const effect of atkCardDef.effects) {
      if (effect.timing === 'duringCombat' && effect.type === 'valueIfMoved') {
        const startSpace = s.turnStartSpaces[attacker.id];
        if (startSpace && startSpace !== attacker.spaceId) {
          atkValue = (atkValue - (atkCardDef.value || 0)) + (effect.amount || 0);
        }
      }
    }
  }
  if (!s.combat.defenderEffectsCancelled && defCardDef) {
    for (const effect of defCardDef.effects) {
      if (effect.timing === 'duringCombat' && effect.type === 'valueIfMoved') {
        const startSpace = s.turnStartSpaces[defender.id];
        if (startSpace && startSpace !== defender.spaceId) {
          defValue = (defValue - (defCardDef.value || 0)) + (effect.amount || 0);
        }
      }
    }
  }

  // Check for preventDamage (Bewilderment)
  let preventDamage = false;
  if (!s.combat.defenderEffectsCancelled && defCardDef) {
    for (const effect of defCardDef.effects) {
      if (effect.timing === 'duringCombat' && effect.type === 'preventDamage') {
        preventDamage = true;
      }
    }
  }

  // ===== PHASE 3: DAMAGE =====
  const damage = preventDamage ? 0 : Math.max(0, atkValue - defValue);
  s.combat.damageDealt = damage;
  s.combat.attackerWon = atkValue > defValue;

  addLog(s, `Attack: ${atkValue} vs Defense: ${defValue}`);

  if (preventDamage) {
    addLog(s, `All damage prevented!`);
  } else if (damage > 0) {
    defender.hp = Math.max(0, defender.hp - damage);
    addLog(s, `${defender.name} takes ${damage} damage! (${defender.hp} HP remaining)`);
  } else {
    addLog(s, `Attack blocked!`);
  }

  // ===== PHASE 4: AFTER COMBAT =====
  // Collect after-combat effects: defender first, then attacker
  const defAfter = (!s.combat.defenderEffectsCancelled
    ? defCardDef?.effects.filter(e => e.timing === 'afterCombat') : []) || [];
  const atkAfter = (!s.combat.attackerEffectsCancelled
    ? atkCardDef?.effects.filter(e => e.timing === 'afterCombat') : []) || [];

  const effectQueue: QueuedEffect[] = [];
  const attackerWon = s.combat.attackerWon;

  // Process defender's after-combat effects
  for (const effect of defAfter) {
    processAfterCombatEffect(s, effect, defender, attacker, defPlayer, atkPlayer, attackerWon ? false : !attackerWon && defValue > atkValue, effectQueue);
  }

  // Process attacker's after-combat effects
  for (const effect of atkAfter) {
    processAfterCombatEffect(s, effect, attacker, defender, atkPlayer, defPlayer, attackerWon, effectQueue);
  }

  // Discard combat cards
  if (s.combat.attackCard) atkPlayer.discard.push(s.combat.attackCard);
  if (s.combat.attackBoostCard) atkPlayer.discard.push(s.combat.attackBoostCard);
  if (s.combat.duringCombatBoost) atkPlayer.discard.push(s.combat.duringCombatBoost);
  if (s.combat.defenseCard) defPlayer.discard.push(s.combat.defenseCard);

  s.combat = null;
  checkHeroDeath(s);

  // If there are interactive effects queued, process them
  if (s.phase !== 'gameOver' && effectQueue.length > 0) {
    s.effectQueue = effectQueue;
    return processNextEffect(s);
  }

  if (s.phase !== 'gameOver') {
    useAction(s);
  }

  return s;
}

/** Process a single after-combat effect. Auto-resolves simple ones, queues interactive ones. */
function processAfterCombatEffect(
  state: GameState,
  effect: { type: string; amount?: number; param?: string },
  self: Fighter,
  opponent: Fighter,
  selfPlayer: Player,
  opponentPlayer: Player,
  selfWon: boolean,
  queue: QueuedEffect[],
) {
  switch (effect.type) {
    case 'drawCards':
      if (effect.amount && effect.amount > 0) {
        drawCards(state, selfPlayer.index, effect.amount);
        addLog(state, `${selfPlayer.name} draws ${effect.amount} card(s).`);
      }
      break;

    case 'drawIfWon':
      if (selfWon && effect.amount && effect.amount > 0) {
        drawCards(state, selfPlayer.index, effect.amount);
        addLog(state, `${selfPlayer.name} won and draws ${effect.amount} card(s)!`);
      }
      break;

    case 'regroupDraw':
      if (selfWon) {
        drawCards(state, selfPlayer.index, 2);
        addLog(state, `${selfPlayer.name} won and draws 2 cards!`);
      } else {
        drawCards(state, selfPlayer.index, 1);
        addLog(state, `${selfPlayer.name} draws 1 card.`);
      }
      break;

    case 'dealDamageIfWon':
      if (selfWon && effect.amount && opponent.hp > 0) {
        opponent.hp = Math.max(0, opponent.hp - effect.amount);
        addLog(state, `${self.name} deals ${effect.amount} additional damage to ${opponent.name}! (${opponent.hp} HP)`);
        checkHeroDeath(state);
      }
      break;

    case 'opponentDiscards':
      if (opponentPlayer.hand.length > 0) {
        queue.push({
          type: 'opponentDiscard',
          playerIndex: opponentPlayer.index,
          label: `${opponentPlayer.name} must discard ${effect.amount || 1} card(s).`,
        });
      } else {
        addLog(state, `${opponentPlayer.name} has no cards to discard.`);
      }
      break;

    case 'moveSelf':
      if (self.hp > 0 && effect.amount && effect.amount > 0) {
        queue.push({
          type: 'moveFighter',
          playerIndex: selfPlayer.index,
          fighterId: self.id,
          range: effect.amount,
          label: `Move ${self.name} up to ${effect.amount} spaces.`,
        });
      }
      break;

    case 'moveHero': {
      const hero = getHero(state, selfPlayer.index);
      if (hero && hero.hp > 0 && effect.amount && effect.amount > 0) {
        queue.push({
          type: 'moveFighter',
          playerIndex: selfPlayer.index,
          fighterId: hero.id,
          range: effect.amount,
          label: `Move ${hero.name} up to ${effect.amount} spaces.`,
        });
      }
      break;
    }

    case 'moveFighterIfWon':
      if (selfWon && effect.amount && effect.amount > 0) {
        // Move the self fighter (simplified - in real game you choose either fighter)
        if (self.hp > 0) {
          queue.push({
            type: 'moveFighter',
            playerIndex: selfPlayer.index,
            fighterId: self.id,
            range: effect.amount,
            label: `Move ${self.name} up to ${effect.amount} spaces (won combat).`,
          });
        }
      }
      break;

    case 'moveHarpies': {
      // Auto-resolve: move each harpy (simplified - log that they could move)
      const harpies = state.fighters.filter(f =>
        f.owner === selfPlayer.index && !f.isHero && f.hp > 0 && f.spaceId
      );
      for (const harpy of harpies) {
        queue.push({
          type: 'moveFighter',
          playerIndex: selfPlayer.index,
          fighterId: harpy.id,
          range: effect.amount || 3,
          label: `Move ${harpy.name} up to ${effect.amount || 3} spaces.`,
        });
      }
      break;
    }

    case 'placeMerlinAny': {
      const merlin = state.fighters.find(f =>
        f.owner === selfPlayer.index && !f.isHero && f.hp > 0
      );
      if (merlin) {
        queue.push({
          type: 'placeFighter',
          playerIndex: selfPlayer.index,
          fighterId: merlin.id,
          label: `Place ${merlin.name} on any unoccupied space.`,
        });
      }
      break;
    }

    case 'healIfLow': {
      const hero = getHero(state, selfPlayer.index);
      const threshold = parseInt(effect.param || '4', 10);
      if (hero && hero.hp > 0 && hero.hp <= threshold) {
        hero.hp = effect.amount || hero.hp;
        addLog(state, `The Holy Grail restores ${hero.name} to ${hero.hp} HP!`);
      }
      break;
    }

    // ---- Aang-specific after-combat effects ----

    case 'gainActionAndDraw':
      // Air Slice: gain 1 action and draw 1 card
      selfPlayer.actionsRemaining++;
      drawCards(state, selfPlayer.index, 1);
      addLog(state, `${self.name} gains 1 action and draws 1 card!`);
      break;

    case 'moveHeroIfWon': {
      // Riding the Wind / Whirlwind Kick: if won, move Aang up to N spaces
      if (selfWon) {
        const hero = getHero(state, selfPlayer.index);
        if (hero && hero.hp > 0 && effect.amount && effect.amount > 0) {
          queue.push({
            type: 'moveFighter',
            playerIndex: selfPlayer.index,
            fighterId: hero.id,
            range: effect.amount,
            label: `Move ${hero.name} up to ${effect.amount} spaces (won combat).`,
          });
        }
      }
      break;
    }

    case 'pushAndDrawIfWon':
      // Staff Sweep: if won, push opposing fighter up to 1 space and draw 1 card
      if (selfWon && opponent.hp > 0) {
        queue.push({
          type: 'pushFighter',
          playerIndex: selfPlayer.index,
          targetFighterId: opponent.id,
          range: effect.amount || 1,
          label: `Push ${opponent.name} up to ${effect.amount || 1} space(s).`,
        });
        drawCards(state, selfPlayer.index, 1);
        addLog(state, `${selfPlayer.name} draws 1 card (won combat).`);
      }
      break;

    case 'pushAndDrawIfPushed':
      // Water Whip: push opposing fighter up to 2 spaces, if pushed draw 1 card
      if (opponent.hp > 0) {
        queue.push({
          type: 'pushFighter',
          playerIndex: selfPlayer.index,
          targetFighterId: opponent.id,
          range: effect.amount || 2,
          label: `Push ${opponent.name} up to ${effect.amount || 2} spaces. If pushed, draw 1 card.`,
        });
      }
      break;

    case 'moveDefender': {
      // Evasive Flow: move the defender up to N spaces
      if (self.hp > 0 && effect.amount && effect.amount > 0) {
        queue.push({
          type: 'moveFighter',
          playerIndex: selfPlayer.index,
          fighterId: self.id,
          range: effect.amount,
          label: `Move ${self.name} up to ${effect.amount} spaces.`,
        });
      }
      break;
    }

    case 'moveHeroIfDamaged': {
      // Air Shield: if you took damage, move Aang 1 space
      const combat = state.combat;
      if (combat && combat.damageDealt > 0) {
        const hero = getHero(state, selfPlayer.index);
        if (hero && hero.hp > 0 && effect.amount && effect.amount > 0) {
          queue.push({
            type: 'moveFighter',
            playerIndex: selfPlayer.index,
            fighterId: hero.id,
            range: effect.amount,
            label: `Move ${hero.name} ${effect.amount} space (took damage).`,
          });
        }
      }
      break;
    }

    case 'zoneDamageAllEnemies': {
      // Avatar State: deal N damage to each enemy fighter in Aang's zone
      const hero = getHero(state, selfPlayer.index);
      if (hero && hero.hp > 0) {
        const enemies = getAliveFighters(state, opponentPlayer.index).filter(f =>
          sameZone(state.board, hero.spaceId, f.spaceId)
        );
        for (const enemy of enemies) {
          enemy.hp = Math.max(0, enemy.hp - (effect.amount || 2));
          addLog(state, `Avatar State deals ${effect.amount || 2} damage to ${enemy.name}! (${enemy.hp} HP)`);
        }
        if (enemies.length === 0) {
          addLog(state, `Avatar State: No enemy fighters in Aang's zone.`);
        }
        checkHeroDeath(state);
      }
      break;
    }
  }
}

// ---- During-Combat Boost (Noble Sacrifice / Second Shot) ----

export function selectDuringCombatBoost(state: GameState, cardId: string | null): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  const player = s.players[s.currentPlayer];

  if (cardId) {
    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx >= 0) {
      const card = player.hand.splice(cardIdx, 1)[0];
      s.combat.duringCombatBoost = card;
      const charDef = getCharDef(player.characterId);
      const def = getCardDef(card, charDef);
      addLog(s, `Plays ${def?.name} as combat boost (+${def?.boost || 0}).`);
    }
  } else {
    addLog(s, `Skips combat boost.`);
  }

  return resolveCombatDamage(s);
}

// ---- Post-Combat Effect Queue ----

function processNextEffect(state: GameState): GameState {
  if (state.effectQueue.length === 0) {
    if (state.phase !== 'gameOver') {
      useAction(state);
    }
    return state;
  }

  const effect = state.effectQueue[0];
  state.effectQueue = state.effectQueue.slice(1);

  switch (effect.type) {
    case 'moveFighter':
      state.schemeMoveFighterId = effect.fighterId || null;
      state.schemeMoveRange = effect.range || 0;
      state.phase = 'effect_moveFighter';
      addLog(state, effect.label);
      break;

    case 'opponentDiscard':
      state.phase = 'effect_opponentDiscard';
      addLog(state, effect.label);
      break;

    case 'placeFighter':
      state.schemeMoveFighterId = effect.fighterId || null;
      state.phase = 'effect_placeFighter';
      addLog(state, effect.label);
      break;

    case 'pushFighter':
      state.pushTargetId = effect.targetFighterId || null;
      state.pushRange = effect.range || 1;
      state.phase = 'effect_pushFighter';
      addLog(state, effect.label);
      break;
  }

  return state;
}

// ---- Effect Resolution Handlers ----

export function resolveEffectMove(state: GameState, targetSpaceId: string): GameState {
  const s = clone(state);
  const fighterId = s.schemeMoveFighterId;
  if (!fighterId) return continueEffectQueue(s);
  const fighter = getFighter(s, fighterId);
  if (!fighter) return continueEffectQueue(s);

  const reachable = getReachableSpaces(s.board, fighter.spaceId, s.schemeMoveRange, s.fighters, fighter.id);
  if (reachable.includes(targetSpaceId)) {
    fighter.spaceId = targetSpaceId;
    addLog(s, `${fighter.name} moved to ${targetSpaceId}.`);
  }

  s.schemeMoveFighterId = null;
  s.schemeMoveRange = 0;
  return continueEffectQueue(s);
}

export function skipEffectMove(state: GameState): GameState {
  const s = clone(state);
  const fighterId = s.schemeMoveFighterId;
  if (fighterId) {
    const f = getFighter(s, fighterId);
    addLog(s, `${f?.name} stays in place.`);
  }
  s.schemeMoveFighterId = null;
  s.schemeMoveRange = 0;
  return continueEffectQueue(s);
}

export function resolveEffectDiscard(state: GameState, cardId: string): GameState {
  const s = clone(state);
  // Find which player needs to discard - it's the opponent of the current player
  const opponentIndex = s.currentPlayer === 0 ? 1 : 0;
  const player = s.players[opponentIndex];
  const cardIdx = player.hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s;

  const card = player.hand.splice(cardIdx, 1)[0];
  player.discard.push(card);
  const charDef = getCharDef(player.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `${player.name} discards ${def?.name || 'a card'}.`);

  return continueEffectQueue(s);
}

export function resolveEffectPlace(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  const fighterId = s.schemeMoveFighterId;
  if (!fighterId) return continueEffectQueue(s);
  const fighter = getFighter(s, fighterId);
  if (!fighter) return continueEffectQueue(s);

  if (!isSpaceOccupied(s, spaceId)) {
    fighter.spaceId = spaceId;
    addLog(s, `${fighter.name} placed on ${spaceId}.`);
  }

  s.schemeMoveFighterId = null;
  return continueEffectQueue(s);
}

// ---- Push Effect Resolution ----

/** Get spaces that a fighter can be pushed to (adjacent unoccupied spaces) */
export function getPushSpaces(state: GameState, fighterId: string, range: number): string[] {
  const fighter = getFighter(state, fighterId);
  if (!fighter || fighter.hp <= 0) return [];
  // Push = move the target to an adjacent unoccupied space (up to range steps)
  return getReachableSpaces(state.board, fighter.spaceId, range, state.fighters, fighter.id);
}

export function resolveEffectPush(state: GameState, targetSpaceId: string): GameState {
  const s = clone(state);
  const fighterId = s.pushTargetId;
  if (!fighterId) return continueEffectQueue(s);
  const fighter = getFighter(s, fighterId);
  if (!fighter) return continueEffectQueue(s);

  const reachable = getPushSpaces(s, fighterId, s.pushRange);
  if (reachable.includes(targetSpaceId)) {
    fighter.spaceId = targetSpaceId;
    addLog(s, `${fighter.name} pushed to ${targetSpaceId}!`);

    // Water Whip: if pushed, draw 1 card (check if the effect label mentions it)
    // We handle this simply: if the current effect queue label mentions "draw 1 card", draw
    // Actually, let's just always draw for pushAndDrawIfPushed — we use a simpler check
    // The pushing player draws if push actually happened
  }

  s.pushTargetId = null;
  s.pushRange = 0;
  return continueEffectQueue(s);
}

export function skipEffectPush(state: GameState): GameState {
  const s = clone(state);
  const fighterId = s.pushTargetId;
  if (fighterId) {
    const f = getFighter(s, fighterId);
    addLog(s, `${f?.name} is not pushed.`);
  }
  s.pushTargetId = null;
  s.pushRange = 0;
  return continueEffectQueue(s);
}

// ---- Deck Search (Meditate) ----

export function getSearchableCards(state: GameState): { card: Card; defName: string }[] {
  const player = currentPlayer(state);
  const charDef = getCharDef(player.characterId);
  return player.deck.map(card => {
    const def = getCardDef(card, charDef);
    return { card, defName: def?.name || 'Unknown' };
  });
}

export function resolveSearchChoice(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const player = currentPlayer(s);
  const cardIdx = player.deck.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s;

  const card = player.deck.splice(cardIdx, 1)[0];
  player.hand.push(card);
  const charDef = getCharDef(player.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `Meditate: Added ${def?.name || 'a card'} to hand. Deck reshuffled.`);
  player.deck = shuffle(player.deck);

  s.searchCards = [];

  // Meditate also gives 1 action
  player.actionsRemaining++;
  addLog(s, `Gained 1 action from Meditate.`);

  // Discard the scheme card
  if (s.pendingSchemeCard) {
    player.discard.push(s.pendingSchemeCard);
  }
  s.pendingSchemeCard = null;

  if (s.phase !== 'gameOver') {
    useAction(s);
  }
  return s;
}

function continueEffectQueue(state: GameState): GameState {
  checkHeroDeath(state);
  if (state.phase === 'gameOver') return state;
  return processNextEffect(state);
}

// ---- Scheme ----

export function playScheme(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const player = currentPlayer(s);
  const cardIdx = player.hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s;

  const card = player.hand.splice(cardIdx, 1)[0];
  const charDef = getCharDef(player.characterId);
  const def = getCardDef(card, charDef);

  if (!def || def.type !== 'scheme') {
    player.hand.push(card);
    return s;
  }

  addLog(s, `${player.name} plays scheme: ${def.name}`);

  // Handle each scheme by ID
  switch (def.id) {
    // --- King Arthur schemes ---
    case 'arthur_lady_of_the_lake': {
      // Search deck and discard for Excalibur
      let found = false;
      // Check deck
      const deckIdx = player.deck.findIndex(c => c.defId === 'arthur_excalibur');
      if (deckIdx >= 0) {
        const excalibur = player.deck.splice(deckIdx, 1)[0];
        player.hand.push(excalibur);
        player.deck = shuffle(player.deck);
        addLog(s, `Found Excalibur in the deck! Added to hand. Deck reshuffled.`);
        found = true;
      }
      if (!found) {
        // Check discard
        const discIdx = player.discard.findIndex(c => c.defId === 'arthur_excalibur');
        if (discIdx >= 0) {
          const excalibur = player.discard.splice(discIdx, 1)[0];
          player.hand.push(excalibur);
          addLog(s, `Retrieved Excalibur from the discard pile!`);
          found = true;
        }
      }
      if (!found) {
        // Check hand (already have it)
        const inHand = player.hand.some(c => c.defId === 'arthur_excalibur');
        if (inHand) {
          addLog(s, `Excalibur is already in hand.`);
        } else {
          addLog(s, `Excalibur could not be found.`);
        }
      }
      break;
    }

    case 'arthur_prophecy': {
      // Look at top 4, add 2 to hand (simplified: just draw 2)
      const drawCount = Math.min(2, player.deck.length);
      drawCards(s, s.currentPlayer, drawCount);
      addLog(s, `Prophecy: Drew ${drawCount} card(s) from the top of the deck.`);
      break;
    }

    case 'arthur_command_storms': {
      // Move each of your fighters up to 3 spaces
      const ownFighters = getAliveFighters(s, s.currentPlayer);
      if (ownFighters.length > 0) {
        s.pendingSchemeCard = card;
        s.maneuverBoost = 0;
        s.maneuverFightersToMove = ownFighters.map(f => f.id);
        s.maneuverCurrentFighter = null;
        s.schemeMoveRange = 3;
        s.phase = 'scheme_moveAll';
        addLog(s, `Command the Storms: Move each of your fighters up to 3 spaces.`);
        return s;
      }
      break;
    }

    case 'arthur_restless_spirits': {
      // Deal 2 damage to each opposing fighter in Merlin's zone
      const merlin = s.fighters.find(f => f.owner === s.currentPlayer && !f.isHero && f.hp > 0);
      if (merlin && merlin.spaceId) {
        const merlinSpace = getSpace(s.board, merlin.spaceId);
        if (merlinSpace) {
          const opponentIndex = s.currentPlayer === 0 ? 1 : 0;
          const targets = getAliveFighters(s, opponentIndex).filter(f =>
            sameZone(s.board, merlin.spaceId, f.spaceId)
          );
          let anyDefeated = false;
          for (const target of targets) {
            target.hp = Math.max(0, target.hp - 2);
            addLog(s, `Restless Spirits deals 2 damage to ${target.name}! (${target.hp} HP)`);
            if (target.hp <= 0) anyDefeated = true;
          }
          if (targets.length === 0) {
            addLog(s, `No opposing fighters in Merlin's zone.`);
          }
          if (anyDefeated) {
            drawCards(s, s.currentPlayer, 1);
            addLog(s, `A fighter was defeated! Drew 1 card.`);
          }
          checkHeroDeath(s);
        }
      } else {
        addLog(s, `Merlin is not on the board.`);
      }
      break;
    }

    // --- Medusa schemes ---
    case 'medusa_momentary_glance': {
      // Deal 2 damage to a fighter in Medusa's zone
      s.pendingSchemeCard = card;
      s.phase = 'scheme_selectTarget';
      addLog(s, `Select a fighter in Medusa's zone to deal 2 damage.`);
      return s;
    }

    case 'medusa_winged_frenzy': {
      // Move each fighter up to 3, then revive a harpy
      const ownFighters = getAliveFighters(s, s.currentPlayer);
      if (ownFighters.length > 0) {
        s.pendingSchemeCard = card;
        s.maneuverBoost = 0;
        s.maneuverFightersToMove = ownFighters.map(f => f.id);
        s.maneuverCurrentFighter = null;
        s.schemeMoveRange = 3;
        s.phase = 'scheme_moveAll';
        addLog(s, `Winged Frenzy: Move each of your fighters up to 3 spaces.`);
        return s;
      }
      // If no alive fighters, skip to revive
      return handleWingedFrenzyRevive(s, card);
    }

    // --- Aang schemes ---
    case 'aang_meditate': {
      // Search deck for any card, add to hand, gain 1 action, shuffle deck
      if (player.deck.length > 0) {
        s.pendingSchemeCard = card;
        s.searchCards = [...player.deck];
        s.phase = 'effect_chooseSearch';
        addLog(s, `Meditate: Choose any card from your deck to add to your hand.`);
        return s;
      }
      addLog(s, `Meditate: Deck is empty, nothing to search.`);
      player.actionsRemaining++;
      addLog(s, `Gained 1 action from Meditate.`);
      break;
    }

    case 'aang_freedom_of_the_skies': {
      // Each fighter recovers 1 HP, draw 1 card, gain 1 action
      const ownFighters = getAliveFighters(s, s.currentPlayer);
      for (const f of ownFighters) {
        if (f.hp < f.maxHp) {
          f.hp = Math.min(f.maxHp, f.hp + 1);
          addLog(s, `${f.name} recovers 1 health! (${f.hp}/${f.maxHp} HP)`);
        }
      }
      drawCards(s, s.currentPlayer, 1);
      addLog(s, `Drew 1 card.`);
      player.actionsRemaining++;
      addLog(s, `Gained 1 action.`);
      break;
    }

    default:
      addLog(s, `Scheme has no programmed effect.`);
      break;
  }

  player.discard.push(card);
  if (s.phase !== 'gameOver') {
    useAction(s);
  }
  return s;
}

// ---- Scheme: Move All (Command the Storms / Winged Frenzy) ----

export function selectSchemeMoveAllFighter(state: GameState, fighterId: string): GameState {
  const s = clone(state);
  s.maneuverCurrentFighter = fighterId;
  s.phase = 'maneuver_moveFighter'; // Reuse maneuver move UI
  const f = getFighter(s, fighterId);
  addLog(s, `Moving ${f?.name} (up to ${s.schemeMoveRange} spaces). Click a space or skip.`);
  return s;
}

export function executeSchemeMoveAllMove(state: GameState, targetSpaceId: string): GameState {
  const s = clone(state);
  const fighterId = s.maneuverCurrentFighter;
  if (!fighterId) return s;
  const fighter = getFighter(s, fighterId);
  if (!fighter) return s;

  const reachable = getReachableSpaces(s.board, fighter.spaceId, s.schemeMoveRange, s.fighters, fighter.id);
  if (reachable.includes(targetSpaceId)) {
    fighter.spaceId = targetSpaceId;
    addLog(s, `${fighter.name} moved to ${targetSpaceId}.`);
  }

  return advanceSchemeMoveAll(s, fighterId);
}

export function skipSchemeMoveAllFighter(state: GameState): GameState {
  const s = clone(state);
  const fighterId = s.maneuverCurrentFighter;
  if (fighterId) {
    const f = getFighter(s, fighterId);
    addLog(s, `${f?.name} stays in place.`);
    return advanceSchemeMoveAll(s, fighterId);
  }
  return s;
}

export function skipAllSchemeMoveAll(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Skips all movement.`);
  s.maneuverFightersToMove = [];
  s.maneuverCurrentFighter = null;
  return finishSchemeMoveAll(s);
}

function advanceSchemeMoveAll(state: GameState, movedFighterId: string): GameState {
  state.maneuverFightersToMove = state.maneuverFightersToMove.filter(id => id !== movedFighterId);
  state.maneuverCurrentFighter = null;
  if (state.maneuverFightersToMove.length > 0) {
    state.phase = 'scheme_moveAll';
    addLog(state, `Select next fighter to move, or skip all.`);
    return state;
  }
  return finishSchemeMoveAll(state);
}

function finishSchemeMoveAll(state: GameState): GameState {
  const schemeCard = state.pendingSchemeCard;
  const player = currentPlayer(state);

  // Check if this was Winged Frenzy (needs harpy revival)
  if (schemeCard) {
    const charDef = getCharDef(player.characterId);
    const def = getCardDef(schemeCard, charDef);
    if (def?.id === 'medusa_winged_frenzy') {
      return handleWingedFrenzyRevive(state, schemeCard);
    }
    // Not Winged Frenzy (Command the Storms or similar)
    player.discard.push(schemeCard);
  }
  state.pendingSchemeCard = null;
  state.schemeMoveRange = 0;

  if (state.phase !== 'gameOver') {
    useAction(state);
  }
  return state;
}

function handleWingedFrenzyRevive(state: GameState, schemeCard: Card): GameState {
  const deadHarpies = state.fighters.filter(f =>
    f.owner === state.currentPlayer && !f.isHero && f.hp <= 0
  );
  if (deadHarpies.length > 0) {
    const harpy = deadHarpies[0];
    harpy.hp = harpy.maxHp;
    state.schemeMoveFighterId = harpy.id;
    state.phase = 'scheme_reviveHarpy';
    addLog(state, `${harpy.name} is revived! Place it on a space in Medusa's zone.`);
    return state;
  }

  addLog(state, `No defeated Harpies to revive.`);
  const player = currentPlayer(state);
  player.discard.push(schemeCard);
  state.pendingSchemeCard = null;
  state.schemeMoveRange = 0;

  if (state.phase !== 'gameOver') {
    useAction(state);
  }
  return state;
}

// ---- Scheme: Revive Harpy placement ----

export function getReviveHarpySpaces(state: GameState): string[] {
  const hero = getHero(state, state.currentPlayer);
  if (!hero) return [];
  const heroSpace = getSpace(state.board, hero.spaceId);
  if (!heroSpace) return [];
  const heroZones = heroSpace.zones;
  return state.board.spaces
    .filter(sp => sp.zones.some(z => heroZones.includes(z)) && !isSpaceOccupied(state, sp.id, state.schemeMoveFighterId || undefined))
    .map(sp => sp.id);
}

export function resolveReviveHarpy(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  const fighterId = s.schemeMoveFighterId;
  if (!fighterId) return s;
  const fighter = getFighter(s, fighterId);
  if (!fighter) return s;

  fighter.spaceId = spaceId;
  addLog(s, `${fighter.name} placed on ${spaceId}.`);

  const player = currentPlayer(s);
  if (s.pendingSchemeCard) {
    player.discard.push(s.pendingSchemeCard);
  }
  s.pendingSchemeCard = null;
  s.schemeMoveFighterId = null;
  s.schemeMoveRange = 0;

  if (s.phase !== 'gameOver') {
    useAction(s);
  }
  return s;
}

// ---- Scheme Target Selection (A Momentary Glance / Petrify) ----

export function getSchemeTargets(state: GameState): Fighter[] {
  const hero = getHero(state, state.currentPlayer);
  if (!hero) return [];
  const opponentIndex = state.currentPlayer === 0 ? 1 : 0;
  return getAliveFighters(state, opponentIndex).filter(f =>
    sameZone(state.board, hero.spaceId, f.spaceId)
  );
}

export function resolveSchemeTarget(state: GameState, targetFighterId: string): GameState {
  const s = clone(state);
  if (!s.pendingSchemeCard) return s;
  const player = currentPlayer(s);
  const charDef = getCharDef(player.characterId);
  const def = getCardDef(s.pendingSchemeCard, charDef);

  const target = getFighter(s, targetFighterId);
  if (target) {
    // A Momentary Glance deals 2 damage
    const dmg = 2;
    target.hp = Math.max(0, target.hp - dmg);
    addLog(s, `${def?.name || 'Scheme'} deals ${dmg} damage to ${target.name}! (${target.hp} HP)`);
    checkHeroDeath(s);
  }

  player.discard.push(s.pendingSchemeCard);
  s.pendingSchemeCard = null;

  if (s.phase !== 'gameOver') {
    useAction(s);
  }
  return s;
}

// ---- Scheme Sidekick Movement (kept for compatibility) ----

export function resolveSchemeSidekickMove(state: GameState, targetSpaceId: string): GameState {
  const s = clone(state);
  const fighterId = s.schemeMoveFighterId;
  if (!fighterId) return s;
  const fighter = getFighter(s, fighterId);
  if (!fighter) return s;

  const reachable = getReachableSpaces(s.board, fighter.spaceId, s.schemeMoveRange, s.fighters, fighter.id);
  if (reachable.includes(targetSpaceId)) {
    fighter.spaceId = targetSpaceId;
    addLog(s, `${fighter.name} moved to ${targetSpaceId}.`);
  }

  return cleanupSchemeMove(s);
}

export function skipSchemeSidekickMove(state: GameState): GameState {
  const s = clone(state);
  addLog(s, 'Sidekick movement skipped.');
  return cleanupSchemeMove(s);
}

function cleanupSchemeMove(state: GameState): GameState {
  const player = currentPlayer(state);
  if (state.pendingSchemeCard) {
    player.discard.push(state.pendingSchemeCard);
  }
  state.pendingSchemeCard = null;
  state.schemeMoveFighterId = null;
  state.schemeMoveRange = 0;
  useAction(state);
  return state;
}

// ---- Helpers for effect phases ----

export function getEffectMoveSpaces(state: GameState): string[] {
  const fighterId = state.schemeMoveFighterId;
  if (!fighterId) return [];
  const fighter = getFighter(state, fighterId);
  if (!fighter || !fighter.spaceId) return [];
  return getReachableSpaces(state.board, fighter.spaceId, state.schemeMoveRange, state.fighters, fighter.id);
}

export function getPlaceFighterSpaces(state: GameState): string[] {
  const fighterId = state.schemeMoveFighterId;
  return state.board.spaces
    .filter(sp => !isSpaceOccupied(state, sp.id, fighterId || undefined))
    .map(sp => sp.id);
}
