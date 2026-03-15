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

  // Mewtwo's clones start off-board (not placed during setup)
  const unplacedP0 = fighters0.filter(f => f.spaceId === '' && char0.id !== 'mewtwo');
  const unplacedP1 = fighters1.filter(f => f.spaceId === '' && char1.id !== 'mewtwo');
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
    airScooterSpaces: [],
    airScooterDefenderId: null,
    searchCards: [],
    mewtwoReflectActive: [false, false],
    mewtwoCloneBatchRemaining: 0,
    mewtwoCloneVatsUsed: false,
    mewtwoCloneRushCards: [],
    mewtwoCloneRushPlayerIndex: null,
    sokkaBoomerangReady: [
      char0.id === 'sokka',
      char1.id === 'sokka',
    ],
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

/** Find ALL shared adjacent spaces between two spaces (for Air Scooter). Returns space IDs. */
export function getSpacesBetween(board: BoardMap, spaceA: string, spaceB: string, fighters: Fighter[], movingId: string): string[] {
  const sa = getSpace(board, spaceA);
  const sb = getSpace(board, spaceB);
  if (!sa || !sb) return [];
  const occupied = new Set(fighters.filter(f => f.hp > 0 && f.id !== movingId).map(f => f.spaceId));
  return sa.adjacentIds.filter(adjId => sb.adjacentIds.includes(adjId) && !occupied.has(adjId));
}

export function canAttack(board: BoardMap, attacker: Fighter, defender: Fighter, fighters?: Fighter[]): boolean {
  if (attacker.hp <= 0 || defender.hp <= 0) return false;
  if (attacker.isRanged) {
    return sameZone(board, attacker.spaceId, defender.spaceId) || areAdjacent(board, attacker.spaceId, defender.spaceId);
  }
  // Aang's Air Scooter: can attack from 1 space away if there's an unoccupied space between
  if (attacker.isHero && attacker.characterId === 'aang' && fighters) {
    if (!areAdjacent(board, attacker.spaceId, defender.spaceId)) {
      return getSpacesBetween(board, attacker.spaceId, defender.spaceId, fighters, attacker.id).length > 0;
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
  if (charDef.id === 'mewtwo') {
    state.mewtwoCloneVatsUsed = false;
    // Check Reflect: if no clones alive, discard Reflect
    const playerIdx = state.currentPlayer;
    if (state.mewtwoReflectActive[playerIdx]) {
      const clones = state.fighters.filter(f => f.owner === playerIdx && !f.isHero && f.characterId === 'mewtwo' && f.hp > 0 && f.spaceId !== '');
      if (clones.length === 0) {
        state.mewtwoReflectActive[playerIdx] = false;
        addLog(state, `Reflect fades — Mewtwo controls no Clones.`);
      }
    }
    // Clone Vats: if player has cards in hand, offer to discard
    const player = state.players[playerIdx];
    const hero = getHero(state, playerIdx);
    if (hero && hero.hp > 0 && player.hand.length > 0) {
      // Check if there's a dead or off-board clone to place
      const availableClone = state.fighters.find(f =>
        f.owner === playerIdx && !f.isHero && f.characterId === 'mewtwo' && (f.hp <= 0 || f.spaceId === '')
      );
      if (availableClone) {
        const adjacentSpaces = getMewtwoAdjacentSpaces(state, playerIdx);
        if (adjacentSpaces.length > 0) {
          state.phase = 'mewtwo_cloneVats';
          addLog(state, `Clone Vats: You may discard 1 card to place a Clone adjacent to Mewtwo.`);
        }
      }
    }
  }
  if (charDef.id === 'sokka') {
    const playerIdx = state.currentPlayer;
    if (state.sokkaBoomerangReady[playerIdx]) {
      const targets = getSokkaBoomerangTargets(state);
      if (targets.length > 0) {
        state.phase = 'sokka_boomerang';
        addLog(state, `Sokka's Boomerang is READY. You may flip it to OUT to deal 1 damage to a fighter in Sokka's zone.`);
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
  state.mewtwoCloneBatchRemaining = 0;
  state.mewtwoCloneRushCards = [];
  state.mewtwoCloneRushPlayerIndex = null;
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

// ---- Sokka Boomerang ----

export function getSokkaBoomerangTargets(state: GameState): Fighter[] {
  const hero = getHero(state, state.currentPlayer);
  if (!hero) return [];
  const opponentIndex = state.currentPlayer === 0 ? 1 : 0;
  return getAliveFighters(state, opponentIndex).filter(f =>
    sameZone(state.board, hero.spaceId, f.spaceId)
  );
}

export function useSokkaBoomerang(state: GameState, targetFighterId: string): GameState {
  const s = clone(state);
  const playerIdx = s.currentPlayer;
  const target = getFighter(s, targetFighterId);
  if (target) {
    s.sokkaBoomerangReady = [...s.sokkaBoomerangReady] as [boolean, boolean];
    s.sokkaBoomerangReady[playerIdx] = false;
    target.hp = Math.max(0, target.hp - 1);
    addLog(s, `Sokka's Boomerang hits ${target.name} for 1 damage! (${target.hp} HP) Boomerang is now OUT.`);
    checkHeroDeath(s);
  }
  if (s.phase !== 'gameOver') {
    s.phase = 'playing';
  }
  return s;
}

export function skipSokkaBoomerang(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Sokka keeps the Boomerang READY.`);
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
    const betweenSpaces = getSpacesBetween(s.board, attacker.spaceId, defender.spaceId, s.fighters, attacker.id);
    if (betweenSpaces.length === 1) {
      // Only one valid space — auto-select
      addLog(s, `Air Scooter! Aang zips to ${betweenSpaces[0]} between the fighters!`);
      attacker.spaceId = betweenSpaces[0];
      airScooterUsed = true;
    } else if (betweenSpaces.length > 1) {
      // Multiple valid spaces — prompt the player to choose
      s.airScooterSpaces = betweenSpaces;
      s.airScooterDefenderId = defenderId;
      s.phase = 'aang_air_scooter_choice';
      addLog(s, `Air Scooter! Choose which space Aang moves into.`);
      return s;
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

export function resolveAirScooterChoice(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  if (!s.airScooterSpaces.includes(spaceId) || !s.airScooterDefenderId) return s;

  const attacker = getFighter(s, s.selectedFighter!)!;
  const defenderId = s.airScooterDefenderId;
  const defender = getFighter(s, defenderId)!;

  addLog(s, `Air Scooter! Aang zips to ${spaceId} between the fighters!`);
  attacker.spaceId = spaceId;

  // Clear Air Scooter state
  s.airScooterSpaces = [];
  s.airScooterDefenderId = null;

  // Continue with combat setup (same as end of selectAttackTarget)
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
    airScooterUsed: true,
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
      // Mewtwo: Cloned Instincts — cancel opponent's effects if flanked
      if (effect.type === 'cancelIfFlanked') {
        const opponent = getFighter(s, s.combat.defenderId)!;
        if (isFlankedByClones(s, opponent.id, attacker.owner)) {
          s.combat.defenderEffectsCancelled = true;
          addLog(s, `Cloned Instincts: ${opponent.name} is flanked by Clones — all effects on defender's card are cancelled!`);
        }
      }
      // Mewtwo: Psychic Storm — place a clone adjacent to opponent
      if (effect.type === 'placeCloneAdjacentOpponent') {
        const opponent = getFighter(s, s.combat.defenderId)!;
        const cloneFighter = getAvailableClone(s, attacker.owner);
        if (cloneFighter) {
          const adjSpaces = getAdjacentSpacesOf(s, opponent.id);
          if (adjSpaces.length > 0) {
            // Auto-place on first available adjacent space
            const targetSpace = adjSpaces[0];
            if (cloneFighter.hp <= 0) cloneFighter.hp = cloneFighter.maxHp;
            cloneFighter.spaceId = targetSpace;
            addLog(s, `Psychic Storm: ${cloneFighter.name} placed on ${targetSpace} adjacent to ${opponent.name}!`);
          } else {
            addLog(s, `Psychic Storm: No adjacent spaces available near ${opponent.name}.`);
          }
        } else {
          addLog(s, `Psychic Storm: No Clones available to place.`);
        }
      }
      // Mewtwo: Calm Focus — recycle discard
      if (effect.type === 'recycleDiscard') {
        const count = Math.min(effect.amount || 3, atkPlayer.discard.length);
        for (let i = 0; i < count; i++) {
          const card = atkPlayer.discard.pop()!;
          atkPlayer.deck.push(card);
        }
        if (count > 0) {
          atkPlayer.deck = shuffle(atkPlayer.deck);
          addLog(s, `Calm Focus: Returned ${count} card(s) from discard to deck and shuffled.`);
        }
      }
      // Mewtwo: Psychic Barrier — prevent effect damage
      if (effect.type === 'preventEffectDamage') {
        addLog(s, `Psychic Barrier: Effect damage is prevented this combat.`);
      }
      // Fan Sweep: move defending fighter up to N spaces (auto-resolve: pick closest unoccupied adjacent space)
      if (effect.type === 'pushFighter' && effect.amount) {
        const pushSpaces = getPushSpaces(s, defender.id, effect.amount);
        if (pushSpaces.length > 0) {
          // Auto-pick first valid push space
          const target = pushSpaces[0];
          defender.spaceId = target;
          addLog(s, `${atkCardDef?.name}: ${defender.name} moved to ${target}!`);
        } else {
          addLog(s, `${atkCardDef?.name}: No valid spaces to move ${defender.name}.`);
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
      // Mewtwo: Cloned Instincts — cancel attacker's effects if flanked
      if (effect.type === 'cancelIfFlanked') {
        if (isFlankedByClones(s, attacker.id, defender.owner)) {
          s.combat.attackerEffectsCancelled = true;
          addLog(s, `Cloned Instincts: ${attacker.name} is flanked by Clones — all effects on attacker's card are cancelled!`);
        }
      }
      // Mewtwo: Psychic Storm — place clone adjacent to opponent (when used as defense)
      if (effect.type === 'placeCloneAdjacentOpponent') {
        const cloneFighter = getAvailableClone(s, defender.owner);
        if (cloneFighter) {
          const adjSpaces = getAdjacentSpacesOf(s, attacker.id);
          if (adjSpaces.length > 0) {
            const targetSpace = adjSpaces[0];
            if (cloneFighter.hp <= 0) cloneFighter.hp = cloneFighter.maxHp;
            cloneFighter.spaceId = targetSpace;
            addLog(s, `Psychic Storm: ${cloneFighter.name} placed on ${targetSpace} adjacent to ${attacker.name}!`);
          }
        }
      }
      // Mewtwo: Calm Focus — recycle discard
      if (effect.type === 'recycleDiscard') {
        const count = Math.min(effect.amount || 3, defPlayer.discard.length);
        for (let i = 0; i < count; i++) {
          const card = defPlayer.discard.pop()!;
          defPlayer.deck.push(card);
        }
        if (count > 0) {
          defPlayer.deck = shuffle(defPlayer.deck);
          addLog(s, `Calm Focus: Returned ${count} card(s) from discard to deck and shuffled.`);
        }
      }
      // Mewtwo: Psychic Barrier — prevent effect damage
      if (effect.type === 'preventEffectDamage') {
        addLog(s, `Psychic Barrier: Effect damage is prevented this combat.`);
      }
      // Mewtwo: Sacrificial Block
      if (effect.type === 'sacrificialBlock') {
        // Defeat this clone
        defender.hp = 0;
        addLog(s, `Sacrificial Block: ${defender.name} is defeated!`);
        // Draw 1 card
        drawCards(s, defPlayer.index, 1);
        addLog(s, `${defPlayer.name} draws 1 card.`);
        // Deal 1 damage to attacking fighter
        if (attacker.hp > 0) {
          attacker.hp = Math.max(0, attacker.hp - 1);
          addLog(s, `Sacrificial Block: Deals 1 damage to ${attacker.name}! (${attacker.hp} HP)`);
          checkHeroDeath(s);
        }
        // Cancel all effects on attacker's card
        s.combat.attackerEffectsCancelled = true;
        addLog(s, `Sacrificial Block: All effects on attacker's card are cancelled!`);
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
        addLog(s, `${defCardDef?.name}: Fighter moved this turn, value becomes ${effect.amount}!`);
      }
    }
    if (effect.type === 'valueIfOpponentMoved') {
      const startSpace = s.turnStartSpaces[attacker.id];
      if (startSpace && startSpace !== attacker.spaceId) {
        addLog(s, `${defCardDef?.name}: Opposing fighter moved this turn, value becomes ${effect.amount}!`);
      }
    }
    // Boomerang Set-Up: if boomerang is OUT, value becomes 4
    if (effect.type === 'boomerangSetupValue') {
      if (!s.sokkaBoomerangReady[defender.owner]) {
        addLog(s, `${defCardDef?.name}: Boomerang is OUT — value becomes ${effect.amount}!`);
      }
    }
    // Improvised Shield: flip boomerang to OUT, value becomes 4, cancel opponent effects
    if (effect.type === 'boomerangFlipForValueAndCancel') {
      if (s.sokkaBoomerangReady[defender.owner]) {
        s.sokkaBoomerangReady = [...s.sokkaBoomerangReady] as [boolean, boolean];
        s.sokkaBoomerangReady[defender.owner] = false;
        s.combat!.attackerEffectsCancelled = true;
        addLog(s, `${defCardDef?.name}: Boomerang flipped to OUT! Value becomes ${effect.amount}, opponent's effects cancelled!`);
      }
    }
  }

  // Attacker's DURING COMBAT
  let atkHasDuringBoost = false;
  for (const effect of atkDuring) {
    if (effect.type === 'boostAttack') {
      if (atkPlayer.hand.length > 0) {
        atkHasDuringBoost = true;
      }
    }
    if (effect.type === 'discardToBoost') {
      // Space Sword Sweep: discard 1 card for flat +2
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
    if (effect.type === 'valueIfOpponentMoved') {
      const startSpace = s.turnStartSpaces[defender.id];
      if (startSpace && startSpace !== defender.spaceId) {
        addLog(s, `${atkCardDef?.name}: Opposing fighter moved this turn, value becomes ${effect.amount}!`);
      }
    }
    // Precision Throw: if boomerang READY, flip to OUT, value becomes 6
    if (effect.type === 'boomerangFlipForValue') {
      if (s.sokkaBoomerangReady[attacker.owner]) {
        s.sokkaBoomerangReady = [...s.sokkaBoomerangReady] as [boolean, boolean];
        s.sokkaBoomerangReady[attacker.owner] = false;
        addLog(s, `${atkCardDef?.name}: Boomerang flipped to OUT! Value becomes ${effect.amount}!`);
      }
    }
    // Boomerang Set-Up: if boomerang is OUT, value becomes 4
    if (effect.type === 'boomerangSetupValue') {
      if (!s.sokkaBoomerangReady[attacker.owner]) {
        addLog(s, `${atkCardDef?.name}: Boomerang is OUT — value becomes ${effect.amount}!`);
      }
    }
    // Improvised Shield on attack side (versatile used as attack? unlikely but handle)
    if (effect.type === 'boomerangFlipForValueAndCancel') {
      if (s.sokkaBoomerangReady[attacker.owner]) {
        s.sokkaBoomerangReady = [...s.sokkaBoomerangReady] as [boolean, boolean];
        s.sokkaBoomerangReady[attacker.owner] = false;
        s.combat!.defenderEffectsCancelled = true;
        addLog(s, `${atkCardDef?.name}: Boomerang flipped to OUT! Value becomes ${effect.amount}, opponent's effects cancelled!`);
      }
    }
  }

  // If there's a during-combat boost to play, pause and let player choose
  if (atkHasDuringBoost) {
    s.phase = 'combat_duringBoost';
    const hasDiscardToBoost = atkDuring.some(e => e.type === 'discardToBoost');
    if (hasDiscardToBoost) {
      addLog(s, `${atkCardDef?.name}: You may discard a card for +2 value. Select a card or skip.`);
    } else {
      addLog(s, `${atkCardDef?.name}: You may play a card as a boost. Select a card or skip.`);
    }
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

  // During-combat card boost (Noble Sacrifice / Second Shot — but NOT discardToBoost)
  if (s.combat.duringCombatBoost) {
    const isDiscardToBoost = atkCardDef?.effects.some(e => e.type === 'discardToBoost') || false;
    if (!isDiscardToBoost) {
      const boostCharDef = getCharDef(atkPlayer.characterId);
      const boostDef = getCardDef(s.combat.duringCombatBoost, boostCharDef);
      atkValue += boostDef?.boost || 0;
    }
  }

  // Momentous Shift: if fighter moved, value becomes X
  if (!s.combat.attackerEffectsCancelled && atkCardDef) {
    for (const effect of atkCardDef.effects) {
      if (effect.timing === 'duringCombat' && effect.type === 'valueIfMoved') {
        const startSpace = s.turnStartSpaces[attacker.id];
        if (startSpace && startSpace !== attacker.spaceId) {
          atkValue = (atkValue - (atkCardDef.value || 0)) + (effect.amount || 0);
        }
      }
      // Turn Their Energy: if OPPONENT moved, value becomes X
      if (effect.timing === 'duringCombat' && effect.type === 'valueIfOpponentMoved') {
        const startSpace = s.turnStartSpaces[defender.id];
        if (startSpace && startSpace !== defender.spaceId) {
          atkValue = (atkValue - (atkCardDef.value || 0)) + (effect.amount || 0);
        }
      }
      // Precision Throw: if boomerang was flipped, value becomes 6
      if (effect.timing === 'duringCombat' && effect.type === 'boomerangFlipForValue') {
        if (!s.sokkaBoomerangReady[attacker.owner]) {
          atkValue = (atkValue - (atkCardDef.value || 0)) + (effect.amount || 0);
        }
      }
      // Boomerang Set-Up: if boomerang OUT, value becomes 4
      if (effect.timing === 'duringCombat' && effect.type === 'boomerangSetupValue') {
        if (!s.sokkaBoomerangReady[attacker.owner]) {
          atkValue = (atkValue - (atkCardDef.value || 0)) + (effect.amount || 0);
        }
      }
      // Improvised Shield used as attack: if boomerang was flipped, value becomes 4
      if (effect.timing === 'duringCombat' && effect.type === 'boomerangFlipForValueAndCancel') {
        if (!s.sokkaBoomerangReady[attacker.owner]) {
          atkValue = (atkValue - (atkCardDef.value || 0)) + (effect.amount || 0);
        }
      }
      // Space Sword Sweep: flat +2 if discard was made (tracked via duringCombatBoost)
      if (effect.timing === 'duringCombat' && effect.type === 'discardToBoost') {
        if (s.combat.duringCombatBoost) {
          atkValue += effect.amount || 0;
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
      if (effect.timing === 'duringCombat' && effect.type === 'valueIfOpponentMoved') {
        const startSpace = s.turnStartSpaces[attacker.id];
        if (startSpace && startSpace !== attacker.spaceId) {
          defValue = (defValue - (defCardDef.value || 0)) + (effect.amount || 0);
        }
      }
      if (effect.timing === 'duringCombat' && effect.type === 'boomerangSetupValue') {
        if (!s.sokkaBoomerangReady[defender.owner]) {
          defValue = (defValue - (defCardDef.value || 0)) + (effect.amount || 0);
        }
      }
      if (effect.timing === 'duringCombat' && effect.type === 'boomerangFlipForValueAndCancel') {
        if (!s.sokkaBoomerangReady[defender.owner]) {
          defValue = (defValue - (defCardDef.value || 0)) + (effect.amount || 0);
        }
      }
    }
  }

  // Mewtwo: Psystrike +1 per clone (attacker)
  if (!s.combat.attackerEffectsCancelled && atkCardDef) {
    for (const effect of atkCardDef.effects) {
      if (effect.timing === 'duringCombat' && effect.type === 'plusPerClone') {
        const cloneCount = countAliveClones(s, attacker.owner);
        if (cloneCount > 0) {
          atkValue += cloneCount * (effect.amount || 1);
          addLog(s, `Psystrike: +${cloneCount} for ${cloneCount} Clone(s)!`);
        }
      }
      if (effect.timing === 'duringCombat' && effect.type === 'plusIfCloneAdjacent') {
        const clones = s.fighters.filter(f =>
          f.owner === attacker.owner && !f.isHero && f.characterId === 'mewtwo' && f.hp > 0 && f.spaceId !== ''
        );
        const hasAdj = clones.some(c => areAdjacent(s.board, defender.spaceId, c.spaceId));
        if (hasAdj) {
          atkValue += effect.amount || 2;
          addLog(s, `Swarm Tactics: +${effect.amount || 2} (Clone adjacent to opponent)!`);
        }
      }
    }
  }
  // Mewtwo: Psystrike/Swarm Tactics on defense (versatile cards)
  if (!s.combat.defenderEffectsCancelled && defCardDef) {
    for (const effect of defCardDef.effects) {
      if (effect.timing === 'duringCombat' && effect.type === 'plusPerClone') {
        const cloneCount = countAliveClones(s, defender.owner);
        if (cloneCount > 0) {
          defValue += cloneCount * (effect.amount || 1);
          addLog(s, `Psystrike: +${cloneCount} for ${cloneCount} Clone(s)!`);
        }
      }
      if (effect.timing === 'duringCombat' && effect.type === 'plusIfCloneAdjacent') {
        const clones = s.fighters.filter(f =>
          f.owner === defender.owner && !f.isHero && f.characterId === 'mewtwo' && f.hp > 0 && f.spaceId !== ''
        );
        const hasAdj = clones.some(c => areAdjacent(s.board, attacker.spaceId, c.spaceId));
        if (hasAdj) {
          defValue += effect.amount || 2;
          addLog(s, `Swarm Tactics: +${effect.amount || 2} (Clone adjacent to opponent)!`);
        }
      }
    }
  }

  // Mewtwo: Reflect — Mewtwo takes 1 less damage (applies to defender if Mewtwo)
  let reflectReduction = 0;
  if (defender.isHero && defender.characterId === 'mewtwo' && s.mewtwoReflectActive[defender.owner]) {
    reflectReduction = 1;
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
  let damage = preventDamage ? 0 : Math.max(0, atkValue - defValue);
  if (reflectReduction > 0 && damage > 0) {
    damage = Math.max(0, damage - reflectReduction);
    addLog(s, `Reflect reduces damage by ${reflectReduction}!`);
  }
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

  // Mewtwo Clone Vats ability: if attacker was a Clone and won, draw 1 card
  if (attackerWon && !attacker.isHero && attacker.characterId === 'mewtwo') {
    drawCards(s, atkPlayer.index, 1);
    addLog(s, `Clone Vats: Clone won combat — ${atkPlayer.name} draws 1 card!`);
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
      // Avatar State: queue zone damage so it respects defender-first ordering
      const hero = getHero(state, selfPlayer.index);
      if (hero && hero.hp > 0) {
        queue.push({
          type: 'zoneDamage',
          playerIndex: selfPlayer.index,
          damageAmount: effect.amount || 2,
          label: `Avatar State: Deal ${effect.amount || 2} damage to each enemy fighter in Aang's zone.`,
        });
      }
      break;
    }

    // ---- Mewtwo-specific after-combat effects ----

    case 'opponentDiscardsRandomIfWon':
      // Mind Crush: if won, opponent discards 1 random card
      if (selfWon && opponentPlayer.hand.length > 0) {
        const randIdx = Math.floor(Math.random() * opponentPlayer.hand.length);
        const discarded = opponentPlayer.hand.splice(randIdx, 1)[0];
        opponentPlayer.discard.push(discarded);
        const charDef = getCharDef(opponentPlayer.characterId);
        const def = getCardDef(discarded, charDef);
        addLog(state, `Mind Crush: ${opponentPlayer.name} discards ${def?.name || 'a card'} at random!`);
      }
      break;

    case 'moveAllClones': {
      // Sever the Link: move each clone up to N spaces
      const clones = state.fighters.filter(f =>
        f.owner === selfPlayer.index && !f.isHero && f.characterId === 'mewtwo' && f.hp > 0 && f.spaceId !== ''
      );
      for (const cloneFighter of clones) {
        queue.push({
          type: 'moveFighter',
          playerIndex: selfPlayer.index,
          fighterId: cloneFighter.id,
          range: effect.amount || 2,
          label: `Move ${cloneFighter.name} up to ${effect.amount || 2} spaces.`,
        });
      }
      break;
    }

    case 'cloneRushDiscard': {
      // Clone Rush: if flanked, choose from opponent's hand; otherwise random discard
      if (isFlankedByClones(state, opponent.id, selfPlayer.index)) {
        if (opponentPlayer.hand.length > 0) {
          state.mewtwoCloneRushCards = [...opponentPlayer.hand];
          state.mewtwoCloneRushPlayerIndex = opponentPlayer.index;
          queue.push({
            type: 'opponentDiscard',
            playerIndex: selfPlayer.index, // The Mewtwo player chooses
            label: `Clone Rush: ${opponent.name} is flanked! Choose a card from ${opponentPlayer.name}'s hand to discard.`,
          });
        }
      } else {
        // Random discard
        if (opponentPlayer.hand.length > 0) {
          const randIdx = Math.floor(Math.random() * opponentPlayer.hand.length);
          const discarded = opponentPlayer.hand.splice(randIdx, 1)[0];
          opponentPlayer.discard.push(discarded);
          const charDef = getCharDef(opponentPlayer.characterId);
          const def = getCardDef(discarded, charDef);
          addLog(state, `Clone Rush: ${opponentPlayer.name} discards ${def?.name || 'a card'} at random.`);
        }
      }
      break;
    }

    // ---- Sokka / Suki after-combat effects ----

    case 'boomerangReadyIfLost': {
      // Trick Shot: if lost, flip boomerang to READY
      if (!selfWon && !state.sokkaBoomerangReady[selfPlayer.index]) {
        state.sokkaBoomerangReady = [...state.sokkaBoomerangReady] as [boolean, boolean];
        state.sokkaBoomerangReady[selfPlayer.index] = true;
        addLog(state, `Trick Shot: Boomerang flipped back to READY!`);
      }
      break;
    }

    case 'boomerangBounceDamage': {
      // Boomerang Bounce: if boomerang OUT and opponent alive, deal 1 damage
      if (!state.sokkaBoomerangReady[selfPlayer.index] && opponent.hp > 0) {
        opponent.hp = Math.max(0, opponent.hp - (effect.amount || 1));
        addLog(state, `Boomerang Bounce: Boomerang is OUT — deals ${effect.amount || 1} damage to ${opponent.name}! (${opponent.hp} HP)`);
        checkHeroDeath(state);
      }
      break;
    }

    case 'boomerangReadyAfterCombat': {
      // Boomerang Set-Up: if boomerang OUT, flip to READY
      if (!state.sokkaBoomerangReady[selfPlayer.index]) {
        state.sokkaBoomerangReady = [...state.sokkaBoomerangReady] as [boolean, boolean];
        state.sokkaBoomerangReady[selfPlayer.index] = true;
        addLog(state, `Boomerang Set-Up: Boomerang flipped back to READY!`);
      }
      break;
    }

    case 'dealDamageIfLost': {
      // Kyoshi Counter: if lost, deal 1 damage to opponent
      if (!selfWon && opponent.hp > 0) {
        opponent.hp = Math.max(0, opponent.hp - (effect.amount || 1));
        addLog(state, `Kyoshi Counter: Deals ${effect.amount || 1} damage to ${opponent.name}! (${opponent.hp} HP)`);
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

  // Check if this is a discardToBoost (Space Sword Sweep) vs normal boost (Noble Sacrifice)
  const attacker = getFighter(s, s.combat.attackerId)!;
  const atkCharDef = getCharDef(s.players[attacker.owner].characterId);
  const atkCardDef = s.combat.attackCard ? getCardDef(s.combat.attackCard, atkCharDef) : null;
  const isDiscardToBoost = atkCardDef?.effects.some(e => e.type === 'discardToBoost') || false;

  if (cardId) {
    const cardIdx = player.hand.findIndex(c => c.id === cardId);
    if (cardIdx >= 0) {
      const card = player.hand.splice(cardIdx, 1)[0];
      s.combat.duringCombatBoost = card;
      const charDef = getCharDef(player.characterId);
      const def = getCardDef(card, charDef);
      if (isDiscardToBoost) {
        addLog(s, `Discards ${def?.name} — Space Sword Sweep gains +2 value!`);
      } else {
        addLog(s, `Plays ${def?.name} as combat boost (+${def?.boost || 0}).`);
      }
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
      // Clone Rush: if mewtwoCloneRushCards is set, the current player chooses
      if (state.mewtwoCloneRushCards.length > 0) {
        state.phase = 'mewtwo_cloneRush_discard';
      } else {
        state.phase = 'effect_opponentDiscard';
      }
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

    case 'zoneDamage': {
      // Avatar State zone damage — auto-resolves (no user interaction needed)
      const hero = getHero(state, effect.playerIndex);
      const opponentIdx = effect.playerIndex === 0 ? 1 : 0;
      if (hero && hero.hp > 0) {
        const enemies = getAliveFighters(state, opponentIdx).filter(f =>
          sameZone(state.board, hero.spaceId, f.spaceId)
        );
        const dmg = effect.damageAmount || 2;
        for (const enemy of enemies) {
          enemy.hp = Math.max(0, enemy.hp - dmg);
          addLog(state, `Avatar State deals ${dmg} damage to ${enemy.name}! (${enemy.hp} HP)`);
        }
        if (enemies.length === 0) {
          addLog(state, `Avatar State: No enemy fighters in Aang's zone.`);
        }
        checkHeroDeath(state);
      }
      // Continue to next queued effect (no phase change / user input needed)
      return processNextEffect(state);
    }
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

    // --- Mewtwo schemes ---
    case 'mewtwo_reflect': {
      // Put this card in play area (don't discard)
      s.mewtwoReflectActive[s.currentPlayer] = true;
      addLog(s, `Reflect is now active! Mewtwo takes 1 less damage from attacks while Clones are in play.`);
      // Don't push to discard — it stays in play area
      if (s.phase !== 'gameOver') {
        useAction(s);
      }
      return s;
    }

    case 'mewtwo_teleport': {
      // Move Mewtwo up to 5 spaces (through fighters), draw 1, gain 1 action
      s.pendingSchemeCard = card;
      s.phase = 'mewtwo_teleport_move';
      addLog(s, `Teleport: Move Mewtwo up to 5 spaces (may move through other fighters).`);
      return s;
    }

    case 'mewtwo_clone_batch': {
      // Mewtwo loses 1 HP, place up to 2 clones adjacent, draw 1
      const hero = getHero(s, s.currentPlayer);
      if (hero && hero.hp > 0) {
        hero.hp = Math.max(0, hero.hp - 1);
        addLog(s, `Clone Batch: Mewtwo loses 1 health! (${hero.hp} HP)`);
        checkHeroDeath(s);
        if (s.phase === 'gameOver') return s;

        const availableClone = getAvailableClone(s, s.currentPlayer);
        const adjacentSpaces = getMewtwoAdjacentSpaces(s, s.currentPlayer);
        if (availableClone && adjacentSpaces.length > 0) {
          s.pendingSchemeCard = card;
          s.mewtwoCloneBatchRemaining = 2;
          s.phase = 'mewtwo_cloneBatch_place';
          addLog(s, `Place up to 2 Clones in spaces adjacent to Mewtwo.`);
          return s;
        }
        addLog(s, `No Clones or adjacent spaces available.`);
        drawCards(s, s.currentPlayer, 1);
        addLog(s, `Clone Batch: Drew 1 card.`);
      }
      break;
    }

    case 'mewtwo_recover': {
      // Recover 2 HP (or 3 if 6 or less)
      const hero = getHero(s, s.currentPlayer);
      if (hero && hero.hp > 0) {
        const amount = hero.hp <= 6 ? 3 : 2;
        hero.hp = Math.min(hero.maxHp, hero.hp + amount);
        addLog(s, `Recover: Mewtwo recovers ${amount} health! (${hero.hp}/${hero.maxHp} HP)`);
      }
      break;
    }

    // ---- Sokka schemes ----
    case 'sokka_reel_it_back': {
      // If boomerang is OUT, flip to READY
      if (!s.sokkaBoomerangReady[s.currentPlayer]) {
        s.sokkaBoomerangReady = [...s.sokkaBoomerangReady] as [boolean, boolean];
        s.sokkaBoomerangReady[s.currentPlayer] = true;
        addLog(s, `Reel It Back: Boomerang flipped to READY!`);
      } else {
        addLog(s, `Reel It Back: Boomerang is already READY.`);
      }
      // Move Sokka up to 2 spaces + gain 1 action
      const sokkaHero = getHero(s, s.currentPlayer);
      if (sokkaHero && sokkaHero.hp > 0) {
        s.pendingSchemeCard = card;
        s.schemeMoveFighterId = sokkaHero.id;
        s.schemeMoveRange = 2;
        player.actionsRemaining += 1; // Gain 1 action (net 0 since playing scheme costs 1)
        s.phase = 'scheme_moveSidekick'; // Reuse sidekick move phase for hero move
        addLog(s, `Move Sokka up to 2 spaces. Gain 1 action.`);
        return s;
      }
      player.actionsRemaining += 1; // Gain 1 action
      break;
    }

    case 'sokka_cactus_juice': {
      // Recover 3 health
      const sokkaHero2 = getHero(s, s.currentPlayer);
      if (sokkaHero2 && sokkaHero2.hp > 0) {
        const healed = Math.min(3, sokkaHero2.maxHp - sokkaHero2.hp);
        sokkaHero2.hp = Math.min(sokkaHero2.maxHp, sokkaHero2.hp + 3);
        addLog(s, `Cactus Juice: Sokka recovers ${healed} health! (${sokkaHero2.hp}/${sokkaHero2.maxHp} HP)`);
      }
      // Discard 1 random card
      if (player.hand.length > 0) {
        const randIdx = Math.floor(Math.random() * player.hand.length);
        const discarded = player.hand.splice(randIdx, 1)[0];
        player.discard.push(discarded);
        const charDef2 = getCharDef(player.characterId);
        const discDef = getCardDef(discarded, charDef2);
        addLog(s, `Cactus Juice: Discarded ${discDef?.name || 'a card'} at random.`);
      }
      break;
    }

    case 'sokka_kyoshi_warrior_training': {
      // Move Suki up to 3 spaces, then adjacent opponent discards 1 random card
      const suki = s.fighters.find(f => f.owner === s.currentPlayer && !f.isHero && f.hp > 0 && f.characterId === 'sokka');
      if (suki) {
        s.pendingSchemeCard = card;
        s.schemeMoveFighterId = suki.id;
        s.schemeMoveRange = 3;
        s.phase = 'scheme_moveSidekick';
        addLog(s, `Kyoshi Warrior Training: Move Suki up to 3 spaces.`);
        return s;
      }
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

  // Kyoshi Warrior Training: after Suki moves, adjacent opponent discards 1 random card
  if (state.pendingSchemeCard?.defId === 'sokka_kyoshi_warrior_training') {
    const suki = state.schemeMoveFighterId ? getFighter(state, state.schemeMoveFighterId) : null;
    if (suki && suki.hp > 0 && suki.spaceId) {
      const opponentIndex = state.currentPlayer === 0 ? 1 : 0;
      const opponentPlayer = state.players[opponentIndex];
      const adjEnemies = getAliveFighters(state, opponentIndex).filter(f =>
        areAdjacent(state.board, suki.spaceId, f.spaceId)
      );
      if (adjEnemies.length > 0 && opponentPlayer.hand.length > 0) {
        // Pick first adjacent enemy and discard 1 random card from their controller
        const target = adjEnemies[0];
        const randIdx = Math.floor(Math.random() * opponentPlayer.hand.length);
        const discarded = opponentPlayer.hand.splice(randIdx, 1)[0];
        opponentPlayer.discard.push(discarded);
        const charDef = getCharDef(opponentPlayer.characterId);
        const def = getCardDef(discarded, charDef);
        addLog(state, `Kyoshi Warrior Training: ${target.name} — ${opponentPlayer.name} discards ${def?.name || 'a card'} at random!`);
      }
    }
  }

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

// =============================================
// MEWTWO — Clone helpers and abilities
// =============================================

/** Get unoccupied spaces adjacent to Mewtwo */
export function getMewtwoAdjacentSpaces(state: GameState, playerIndex: number): string[] {
  const hero = getHero(state, playerIndex);
  if (!hero || hero.hp <= 0) return [];
  const heroSpace = getSpace(state.board, hero.spaceId);
  if (!heroSpace) return [];
  return heroSpace.adjacentIds.filter(adjId => !isSpaceOccupied(state, adjId));
}

/** Check if a fighter is flanked by clones (adjacent to 2+ clones of the opposing player) */
function isFlankedByClones(state: GameState, fighterId: string, cloneOwner: number): boolean {
  const fighter = getFighter(state, fighterId);
  if (!fighter) return false;
  const clones = state.fighters.filter(f =>
    f.owner === cloneOwner && !f.isHero && f.characterId === 'mewtwo' && f.hp > 0 && f.spaceId !== ''
  );
  const adjacentClones = clones.filter(c => areAdjacent(state.board, fighter.spaceId, c.spaceId));
  return adjacentClones.length >= 2;
}

/** Revive and return a clone fighter (or null if none available) */
function getAvailableClone(state: GameState, playerIndex: number): Fighter | null {
  return state.fighters.find(f =>
    f.owner === playerIndex && !f.isHero && f.characterId === 'mewtwo' && (f.hp <= 0 || f.spaceId === '')
  ) || null;
}

/** Count alive clones on the board */
function countAliveClones(state: GameState, playerIndex: number): number {
  return state.fighters.filter(f =>
    f.owner === playerIndex && !f.isHero && f.characterId === 'mewtwo' && f.hp > 0 && f.spaceId !== ''
  ).length;
}

// ---- Clone Vats (start of turn ability) ----

export function useCloneVats(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const player = s.players[s.currentPlayer];
  const cardIdx = player.hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s;

  const card = player.hand.splice(cardIdx, 1)[0];
  player.discard.push(card);
  const charDef = getCharDef(player.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `Clone Vats: Discarded ${def?.name || 'a card'}.`);

  s.mewtwoCloneVatsUsed = true;

  // Now place a clone adjacent to Mewtwo
  const adjacentSpaces = getMewtwoAdjacentSpaces(s, s.currentPlayer);
  if (adjacentSpaces.length > 0) {
    s.phase = 'mewtwo_placeClone';
    addLog(s, `Place a Clone on a space adjacent to Mewtwo.`);
  } else {
    addLog(s, `No adjacent spaces available for Clone placement.`);
    s.phase = 'playing';
  }
  return s;
}

export function skipCloneVats(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Clone Vats: Skipped.`);
  s.mewtwoCloneVatsUsed = true;
  s.phase = 'playing';
  return s;
}

export function placeClone(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  const playerIdx = s.currentPlayer;
  const cloneFighter = getAvailableClone(s, playerIdx);
  if (!cloneFighter) return s;

  if (isSpaceOccupied(s, spaceId)) return s;

  // Revive if dead
  if (cloneFighter.hp <= 0) {
    cloneFighter.hp = cloneFighter.maxHp;
  }
  cloneFighter.spaceId = spaceId;
  addLog(s, `${cloneFighter.name} placed on ${spaceId}.`);

  // Check what phase we came from
  if (s.phase === 'mewtwo_placeClone') {
    s.phase = 'playing';
  } else if (s.phase === 'mewtwo_cloneBatch_place') {
    s.mewtwoCloneBatchRemaining--;
    if (s.mewtwoCloneBatchRemaining > 0) {
      // Check if there's another clone to place and adjacent space available
      const nextClone = getAvailableClone(s, playerIdx);
      const adjacentSpaces = getMewtwoAdjacentSpaces(s, playerIdx);
      if (nextClone && adjacentSpaces.length > 0) {
        addLog(s, `Place another Clone adjacent to Mewtwo.`);
      } else {
        s.mewtwoCloneBatchRemaining = 0;
        finishCloneBatch(s);
      }
    } else {
      finishCloneBatch(s);
    }
  }

  return s;
}

export function skipClonePlacement(state: GameState): GameState {
  const s = clone(state);
  if (s.phase === 'mewtwo_cloneBatch_place') {
    s.mewtwoCloneBatchRemaining = 0;
    finishCloneBatch(s);
  } else {
    s.phase = 'playing';
  }
  return s;
}

function finishCloneBatch(state: GameState) {
  drawCards(state, state.currentPlayer, 1);
  addLog(state, `Clone Batch: Drew 1 card.`);
  const player = currentPlayer(state);
  if (state.pendingSchemeCard) {
    player.discard.push(state.pendingSchemeCard);
  }
  state.pendingSchemeCard = null;
  if (state.phase !== 'gameOver') {
    useAction(state);
  }
}

// ---- Teleport (move through fighters) ----

export function getTeleportSpaces(state: GameState): string[] {
  const hero = getHero(state, state.currentPlayer);
  if (!hero) return [];
  // Mewtwo can move through other fighters — use BFS ignoring occupied
  const visited = new Set<string>([hero.spaceId]);
  let frontier = [hero.spaceId];
  for (let i = 0; i < 5; i++) {
    const next: string[] = [];
    for (const sid of frontier) {
      const space = getSpace(state.board, sid);
      if (!space) continue;
      for (const adjId of space.adjacentIds) {
        if (!visited.has(adjId)) {
          visited.add(adjId);
          next.push(adjId);
        }
      }
    }
    frontier = next;
  }
  visited.delete(hero.spaceId);
  // Can only land on unoccupied spaces
  return Array.from(visited).filter(sid => !isSpaceOccupied(state, sid, hero.id));
}

export function resolveTeleport(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  const hero = getHero(s, s.currentPlayer);
  if (!hero) return s;

  const validSpaces = getTeleportSpaces(s);
  if (validSpaces.includes(spaceId)) {
    hero.spaceId = spaceId;
    addLog(s, `Teleport: Mewtwo moves to ${spaceId}!`);
  }

  drawCards(s, s.currentPlayer, 1);
  addLog(s, `Teleport: Drew 1 card.`);
  s.players[s.currentPlayer].actionsRemaining++;
  addLog(s, `Teleport: Gained 1 action.`);

  const player = currentPlayer(s);
  if (s.pendingSchemeCard) {
    player.discard.push(s.pendingSchemeCard);
  }
  s.pendingSchemeCard = null;

  if (s.phase !== 'gameOver') {
    useAction(s);
  }
  return s;
}

export function skipTeleport(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Teleport: Mewtwo stays in place.`);

  drawCards(s, s.currentPlayer, 1);
  addLog(s, `Teleport: Drew 1 card.`);
  s.players[s.currentPlayer].actionsRemaining++;
  addLog(s, `Teleport: Gained 1 action.`);

  const player = currentPlayer(s);
  if (s.pendingSchemeCard) {
    player.discard.push(s.pendingSchemeCard);
  }
  s.pendingSchemeCard = null;

  if (s.phase !== 'gameOver') {
    useAction(s);
  }
  return s;
}

// ---- Clone Rush (opponent hand discard choice) ----

export function resolveCloneRushDiscard(state: GameState, cardId: string): GameState {
  const s = clone(state);
  if (s.mewtwoCloneRushPlayerIndex === null) return continueEffectQueue(s);
  const opPlayer = s.players[s.mewtwoCloneRushPlayerIndex];
  const cardIdx = opPlayer.hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s;

  const card = opPlayer.hand.splice(cardIdx, 1)[0];
  opPlayer.discard.push(card);
  const charDef = getCharDef(opPlayer.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `Clone Rush: ${opPlayer.name} discards ${def?.name || 'a card'}.`);

  s.mewtwoCloneRushCards = [];
  s.mewtwoCloneRushPlayerIndex = null;

  return continueEffectQueue(s);
}

// ---- Get adjacent spaces to a specific fighter (for Psychic Storm clone placement) ----

export function getAdjacentSpacesOf(state: GameState, fighterId: string): string[] {
  const fighter = getFighter(state, fighterId);
  if (!fighter) return [];
  const space = getSpace(state.board, fighter.spaceId);
  if (!space) return [];
  return space.adjacentIds.filter(adjId => !isSpaceOccupied(state, adjId));
}
