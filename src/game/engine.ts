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
    airScooterPendingSpace: null,
    searchCards: [],
    prophecySelected: [],
    mewtwoReflectActive: [false, false],
    mewtwoCloneBatchRemaining: 0,
    mewtwoCloneVatsUsed: false,
    mewtwoCloneRushCards: [],
    mewtwoCloneRushPlayerIndex: null,
    sokkaBoomerangReady: [
      char0.id === 'sokka',
      char1.id === 'sokka',
    ],
    zoneDamageTargetZone: '',
    zoneDamageAmount: 0,
    zoneDamagePlayerIndex: 0,
    stallionChargeActive: false,
    rainOfArrowsFollowUp: null,
    yennengaDamageSplit: null,
    teslaCoilsCharged: [
      char0.id === 'tesla' ? 1 : 0,
      char1.id === 'tesla' ? 1 : 0,
    ],
    teslaPendingCoilEffect: null,
    teslaPendingCoilCardDefId: null,
    teslaCoilRevealedCard: null,
    teslaCoilChoiceContext: null,
    teslaOverflowPushTargets: [],
    zeldaCurrentForm: [
      char0.id === 'zelda' ? 'zelda' : '',
      char1.id === 'zelda' ? 'zelda' : '',
    ],
    zeldaMovementLock: null,
    zeldaNayrusLoveActive: [false, false],
    zeldaImpasRevealedCards: [],
    zeldaImpasTargetPlayer: null,
    zeldaBonusAttackUsed: false,
    actionsTakenThisTurn: 0,
    teslaCoilChoicePlayerIndex: null,
    genieThreeWishesValueLock: [false, false],
    geniePendingFreedDamage: false,
    genieSultansRevealedCards: [],
    genieSultansTargetPlayer: null,
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

/** Check if a fighter is locked from movement by Sheikah Veil */
export function isMovementLocked(state: GameState, fighterId: string): boolean {
  return state.zeldaMovementLock === fighterId;
}

export function getReachableSpaces(board: BoardMap, fromId: string, steps: number, fighters: Fighter[], movingFighterId: string): string[] {
  // Can move THROUGH friendly fighters but not enemy fighters.
  // Cannot END on any occupied space.
  const movingFighter = fighters.find(f => f.id === movingFighterId);
  const movingOwner = movingFighter?.owner;
  const enemyOccupied = new Set(
    fighters.filter(f => f.hp > 0 && f.id !== movingFighterId && f.spaceId && f.owner !== movingOwner).map(f => f.spaceId)
  );
  const friendlyOccupied = new Set(
    fighters.filter(f => f.hp > 0 && f.id !== movingFighterId && f.spaceId && f.owner === movingOwner).map(f => f.spaceId)
  );
  const visited = new Set<string>([fromId]);
  let frontier = [fromId];
  for (let i = 0; i < steps; i++) {
    const next: string[] = [];
    for (const sid of frontier) {
      const space = getSpace(board, sid);
      if (!space) continue;
      for (const adjId of space.adjacentIds) {
        if (!visited.has(adjId) && !enemyOccupied.has(adjId)) {
          visited.add(adjId);
          // Can pass through friendlies but they still get added to visited for pathing
          next.push(adjId);
        }
      }
    }
    frontier = next;
  }
  visited.delete(fromId);
  // Remove spaces occupied by ANY fighter (can't end on them)
  const allOccupied = new Set([...enemyOccupied, ...friendlyOccupied]);
  return Array.from(visited).filter(sid => !allOccupied.has(sid));
}

/** Like getReachableSpaces but also allows moving through enemy fighters (Stallion Charge) */
function getReachableSpacesThroughEnemies(board: BoardMap, fromId: string, steps: number, fighters: Fighter[], movingFighterId: string): string[] {
  const allOccupied = new Set(
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
        if (!visited.has(adjId)) {
          visited.add(adjId);
          next.push(adjId);
        }
      }
    }
    frontier = next;
  }
  visited.delete(fromId);
  return Array.from(visited).filter(sid => !allOccupied.has(sid));
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
export function canFighterPlayCard(fighter: Fighter, cardDef: CardDef, state?: GameState): boolean {
  if (cardDef.restriction === 'Any') return true;
  // Zelda/Sheik form restrictions
  if (cardDef.restriction === 'Zelda' || cardDef.restriction === 'Sheik') {
    if (!fighter.isHero || fighter.characterId !== 'zelda') return false;
    if (state) {
      const form = state.zeldaCurrentForm[fighter.owner];
      if (cardDef.restriction === 'Sheik' && form !== 'sheik') return false;
      if (cardDef.restriction === 'Zelda' && form !== 'zelda') return false;
    }
    return true;
  }
  // Hero restriction: card's restriction matches the hero's name
  if (fighter.isHero) return fighter.name === cardDef.restriction;
  // Sidekick: strip trailing number (e.g., "Harpy 1" → "Harpy")
  const baseName = fighter.name.replace(/ \d+$/, '');
  return baseName === cardDef.restriction;
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
    const otherUnplaced = s.fighters.filter(f => f.owner === otherPlayer && !f.isHero && f.spaceId === '' && f.characterId !== 'mewtwo');
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
          addLog(state, `Clone Vats: You may discard cards to place Clones adjacent to Mewtwo.`);
        }
      }
    }
  }
  // Tesla: Electrical Overflow — if both coils charged, MUST deal 1 damage to adjacent opposing fighters
  if (charDef.id === 'tesla') {
    const pi = state.currentPlayer;
    if (state.teslaCoilsCharged[pi] >= 2) {
      const hero = getHero(state, pi);
      if (hero && hero.hp > 0) {
        const opponentIndex = pi === 0 ? 1 : 0;
        const adjacentEnemies = getAliveFighters(state, opponentIndex).filter(f =>
          areAdjacent(state.board, hero.spaceId, f.spaceId)
        );
        if (adjacentEnemies.length > 0) {
          addLog(state, `Electrical Overflow: Both coils charged! Dealing 1 damage to each adjacent opposing fighter.`);
          // Deal damage to all adjacent enemies (mandatory)
          for (const target of adjacentEnemies) {
            target.hp = Math.max(0, target.hp - 1);
            addLog(state, `Electrical Overflow: ${target.name} takes 1 damage! (${target.hp} HP)`);
          }
          checkHeroDeath(state);
          if (state.phase === 'gameOver') return;
          // Build push targets list (surviving adjacent enemies only)
          const survivingTargets = adjacentEnemies.filter(f => f.hp > 0);
          if (survivingTargets.length > 0) {
            state.teslaOverflowPushTargets = survivingTargets.map(f => f.id);
            const first = survivingTargets[0];
            state.pushTargetId = first.id;
            state.pushRange = 1;
            state.phase = 'tesla_overflow_push';
            addLog(state, `Electrical Overflow: Move ${first.name} up to 1 space, or skip.`);
          }
          return;
        }
      }
    }
  }
  // Zelda: Veil of Two Fates — choose form at start of turn
  if (charDef.id === 'zelda') {
    const hero = getHero(state, state.currentPlayer);
    if (hero && hero.hp > 0) {
      state.phase = 'zelda_formChoice';
      addLog(state, `Veil of Two Fates: Choose Zelda (Ranged, Move 2, +1 combat value) or Sheik (Melee, Move 3, +1 action).`);
    }
  }
  // Genie: Three Rules — at start of turn, may discard 1 card for 1 extra action
  if (charDef.id === 'genie') {
    const player = state.players[state.currentPlayer];
    const hero = getHero(state, state.currentPlayer);
    if (hero && hero.hp > 0 && player.hand.length > 0) {
      state.phase = 'genie_startAbility';
      addLog(state, `Three Rules: You may discard 1 card to gain 1 extra action this turn.`);
    }
  }
  // Sokka's boomerang is used via a button during playing phase, not start of turn
}

function endTurn(state: GameState) {
  // Tesla: charge 1 coil at end of turn
  const cpChar = getCharDef(state.players[state.currentPlayer].characterId);
  if (cpChar.id === 'tesla') {
    const pi = state.currentPlayer;
    if (state.teslaCoilsCharged[pi] < 2) {
      state.teslaCoilsCharged = [...state.teslaCoilsCharged] as [number, number];
      state.teslaCoilsCharged[pi] = Math.min(2, state.teslaCoilsCharged[pi] + 1);
      addLog(state, `Electrical Overflow: Tesla charges a coil. (${state.teslaCoilsCharged[pi]}/2 coils charged)`);
    }
  }
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
  state.actionsTakenThisTurn = 0;
  state.selectedFighter = null;
  state.maneuverBoost = 0;
  state.maneuverFightersToMove = [];
  state.maneuverCurrentFighter = null;
  state.mewtwoCloneBatchRemaining = 0;
  state.mewtwoCloneRushCards = [];
  state.mewtwoCloneRushPlayerIndex = null;
  state.zeldaMovementLock = null;
  state.zeldaNayrusLoveActive = [false, false];
  state.zeldaBonusAttackUsed = false;
  // Reset Three Wishes value lock for the player whose turn just ended
  const prevPlayer = state.currentPlayer === 0 ? 1 : 0;
  if (state.genieThreeWishesValueLock[prevPlayer]) {
    state.genieThreeWishesValueLock = [...state.genieThreeWishesValueLock] as [boolean, boolean];
    state.genieThreeWishesValueLock[prevPlayer] = false;
  }
  state.phase = 'playing';
  addLog(state, `--- ${state.players[state.currentPlayer].name}'s turn ---`);
  recordTurnStartPositions(state);
  checkStartOfTurnAbility(state);
}

function useAction(state: GameState) {
  state.actionsTakenThisTurn++;
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

// ---- Genie Start-of-Turn Ability ----

export function useGenieAbility(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const player = s.players[s.currentPlayer];
  const cardIdx = player.hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s;
  const card = player.hand.splice(cardIdx, 1)[0];
  player.discard.push(card);
  const charDef = getCharDef(player.characterId);
  const def = getCardDef(card, charDef);
  player.actionsRemaining++;
  addLog(s, `Three Rules: Discarded ${def?.name || 'a card'} to gain 1 extra action!`);
  s.phase = 'playing';
  return s;
}

export function skipGenieAbility(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Genie skips Three Rules.`);
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
    addLog(s, `Sokka's Boomerang hits ${target.name}! Boomerang is now OUT.`);
    // Check for Yennenga damage splitting
    if (tryYennengaDamageSplit(s, target, 1, 'playing')) {
      return s;
    }
    target.hp = Math.max(0, target.hp - 1);
    addLog(s, `${target.name} takes 1 damage! (${target.hp} HP)`);
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

// ---- Tesla Coils ----

export function getTeslaOverflowTargets(state: GameState): Fighter[] {
  const hero = getHero(state, state.currentPlayer);
  if (!hero) return [];
  const opponentIndex = state.currentPlayer === 0 ? 1 : 0;
  return getAliveFighters(state, opponentIndex).filter(f =>
    areAdjacent(state.board, hero.spaceId, f.spaceId)
  );
}

/** Resolve Tesla overflow push: move a target fighter to a space */
export function resolveTeslaOverflowPush(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  const fighterId = s.pushTargetId;
  if (!fighterId) return advanceTeslaOverflowPush(s);
  const fighter = getFighter(s, fighterId);
  if (!fighter) return advanceTeslaOverflowPush(s);

  const reachable = getPushSpaces(s, fighterId, s.pushRange);
  if (reachable.includes(spaceId)) {
    fighter.spaceId = spaceId;
    addLog(s, `Electrical Overflow: ${fighter.name} moved to ${spaceId}.`);
  }
  return advanceTeslaOverflowPush(s);
}

/** Skip Tesla overflow push for the current target */
export function skipTeslaOverflowPush(state: GameState): GameState {
  const s = clone(state);
  const fighterId = s.pushTargetId;
  if (fighterId) {
    const f = getFighter(s, fighterId);
    addLog(s, `Electrical Overflow: ${f?.name} stays in place.`);
  }
  return advanceTeslaOverflowPush(s);
}

/** Advance to the next overflow push target, or finish */
function advanceTeslaOverflowPush(s: GameState): GameState {
  // Remove the current target from the list
  const currentId = s.pushTargetId;
  s.teslaOverflowPushTargets = s.teslaOverflowPushTargets.filter(id => id !== currentId);
  s.pushTargetId = null;
  s.pushRange = 0;

  if (s.teslaOverflowPushTargets.length > 0) {
    const nextId = s.teslaOverflowPushTargets[0];
    const nextFighter = getFighter(s, nextId);
    if (nextFighter && nextFighter.hp > 0) {
      s.pushTargetId = nextId;
      s.pushRange = 1;
      s.phase = 'tesla_overflow_push';
      addLog(s, `Electrical Overflow: Move ${nextFighter.name} up to 1 space, or skip.`);
      return s;
    }
    // If fighter died somehow, skip to next
    return advanceTeslaOverflowPush(s);
  }

  s.phase = 'playing';
  return s;
}

function teslaDischargeCoils(state: GameState, playerIndex: number, count: number) {
  state.teslaCoilsCharged = [...state.teslaCoilsCharged] as [number, number];
  state.teslaCoilsCharged[playerIndex] = Math.max(0, state.teslaCoilsCharged[playerIndex] - count);
  addLog(state, `Tesla discharges ${count} coil(s). (${state.teslaCoilsCharged[playerIndex]}/2 coils remaining)`);
}

function teslaChargeCoils(state: GameState, playerIndex: number, count: number) {
  state.teslaCoilsCharged = [...state.teslaCoilsCharged] as [number, number];
  state.teslaCoilsCharged[playerIndex] = Math.min(2, state.teslaCoilsCharged[playerIndex] + count);
  addLog(state, `Tesla charges ${count} coil(s). (${state.teslaCoilsCharged[playerIndex]}/2 coils charged)`);
}

/** Tesla coil choice: 0 = skip, 1 = discharge 1, 2 = discharge 2 */
export function resolveTeslaCoilChoice(state: GameState, coilCount: number): GameState {
  const s = clone(state);
  const effectType = s.teslaPendingCoilEffect;
  const context = s.teslaCoilChoiceContext;
  s.teslaPendingCoilEffect = null;
  s.teslaCoilChoiceContext = null;

  // Find which player owns the Tesla card
  let teslaPlayerIndex = s.teslaCoilChoicePlayerIndex ?? s.currentPlayer;
  if (teslaPlayerIndex === null || teslaPlayerIndex === undefined) {
    teslaPlayerIndex = s.currentPlayer;
  }
  if (s.combat) {
    const attacker = getFighter(s, s.combat.attackerId)!;
    const defender = getFighter(s, s.combat.defenderId)!;
    if (attacker.characterId === 'tesla') teslaPlayerIndex = attacker.owner;
    else if (defender.characterId === 'tesla') teslaPlayerIndex = defender.owner;
  }
  s.teslaCoilChoicePlayerIndex = null;

  if (!effectType || coilCount === 0) {
    addLog(s, `Tesla chooses not to discharge coils.`);
  } else {
    teslaDischargeCoils(s, teslaPlayerIndex, coilCount);
  }

  // Apply the effect based on type and coilCount
  switch (effectType) {
    case 'teslaCoilCancel': {
      // Polyphase Coils (immediately): 1 = cancel effects, 2 = also ignore value
      if (coilCount >= 1 && s.combat) {
        const attacker = getFighter(s, s.combat.attackerId)!;
        if (attacker.characterId === 'tesla') {
          s.combat.defenderEffectsCancelled = true;
          addLog(s, `Polyphase Coils: Opponent's card effects cancelled!`);
          if (coilCount >= 2) {
            s.combat.teslaIgnoreOpponentValue = true;
            addLog(s, `Polyphase Coils: Opponent's card value ignored!`);
          }
        } else {
          s.combat.attackerEffectsCancelled = true;
          addLog(s, `Polyphase Coils: Opponent's card effects cancelled!`);
          if (coilCount >= 2) {
            s.combat.teslaIgnoreOpponentValue = true;
            addLog(s, `Polyphase Coils: Opponent's card value ignored!`);
          }
        }
      }
      return continueCombatAfterImmediately(s);
    }

    case 'teslaCoilValue': {
      // Death Ray (during-combat): 1 coil = value 5, 2 coils = value 7
      if (coilCount >= 1 && s.combat) {
        const atkCardDef = s.combat.attackCard ? getCardDef(s.combat.attackCard, getCharDef(s.players[teslaPlayerIndex].characterId)) : null;
        let newVal = 5;
        if (coilCount >= 2) {
          // Use the param value (default 7) for 2-coil
          const effects = atkCardDef?.effects || [];
          const deathRayEffect = effects.find(e => e.type === 'teslaCoilValue');
          newVal = parseInt(deathRayEffect?.param || '7', 10);
          addLog(s, `Death Ray: Value becomes ${newVal}!`);
        } else {
          // Use the amount value (default 5) for 1-coil
          const effects = atkCardDef?.effects || [];
          const deathRayEffect = effects.find(e => e.type === 'teslaCoilValue');
          newVal = deathRayEffect?.amount || 5;
          addLog(s, `Death Ray: Value becomes ${newVal}!`);
        }
        if (context === 'duringCombat_atk') {
          s.combat.teslaAtkValueReplace = newVal;
        } else {
          s.combat.teslaDefValueReplace = newVal;
        }
      }
      break;
    }

    case 'teslaCoilRevealDiscard': {
      // X-Ray Radiation (during-combat): reveal top card, 1 = discard it, 2 = discard + add boost
      if (s.combat) {
        const opponentIdx = context === 'duringCombat_atk'
          ? getFighter(s, s.combat.defenderId)!.owner
          : getFighter(s, s.combat.attackerId)!.owner;
        const opponentPlayer = s.players[opponentIdx];
        const opponentCharDef = getCharDef(opponentPlayer.characterId);
        if (opponentPlayer.deck.length > 0) {
          const topCard = opponentPlayer.deck[opponentPlayer.deck.length - 1];
          const topDef = getCardDef(topCard, opponentCharDef);
          addLog(s, `X-Ray Radiation: Revealed ${topDef?.name || 'a card'} (boost ${topDef?.boost || 0}) on top of opponent's deck.`);
          if (coilCount >= 1) {
            const removed = opponentPlayer.deck.pop()!;
            opponentPlayer.discard.push(removed);
            if (coilCount >= 2) {
              const boost = topDef?.boost || 0;
              if (context === 'duringCombat_atk') {
                s.combat.teslaAtkValueDelta += boost;
              } else {
                s.combat.teslaDefValueDelta += boost;
              }
              addLog(s, `X-Ray Radiation: Discarded ${topDef?.name} and added +${boost} to value!`);
            } else {
              addLog(s, `X-Ray Radiation: Discarded ${topDef?.name}!`);
            }
          }
        } else {
          addLog(s, `X-Ray Radiation: Opponent's deck is empty.`);
        }
      }
      break;
    }

    case 'teslaCoilGainActions': {
      // 7 Hertz (after-combat): 1 coil = +1 action, 2 coils = +2 actions
      if (coilCount >= 1) {
        s.players[teslaPlayerIndex].actionsRemaining += coilCount;
        addLog(s, `7 Hertz (${coilCount} coil${coilCount > 1 ? 's' : ''}): Gained ${coilCount} action${coilCount > 1 ? 's' : ''}!`);
      }
      return continueAfterCombatTeslaChoice(s);
    }

    case 'teslaCoilZoneDamage': {
      // Lightning Storm (after-combat): 1 coil = 1 zone dmg, 2 coils = 2 zone dmg
      if (coilCount >= 1) {
        const damageAmt = coilCount;
        const hero = getHero(s, teslaPlayerIndex);
        if (hero && hero.hp > 0) {
          const opponentIdx = teslaPlayerIndex === 0 ? 1 : 0;
          const enemiesInZone = getAliveFighters(s, opponentIdx).filter(f =>
            sameZone(s.board, hero.spaceId, f.spaceId)
          );
          for (const target of enemiesInZone) {
            target.hp = Math.max(0, target.hp - damageAmt);
            addLog(s, `Lightning Storm: ${target.name} takes ${damageAmt} damage! (${target.hp} HP)`);
          }
          if (enemiesInZone.length === 0) {
            addLog(s, `Lightning Storm: No opposing fighters in Tesla's zone.`);
          }
          checkHeroDeath(s);
        }
      }
      return continueAfterCombatTeslaChoice(s);
    }

    case 'teslaCoilRepulsion': {
      // Repulsion Blast (after-combat): 1 coil = also move Tesla 2, 2 coils = also opponent discards random
      if (coilCount >= 1) {
        const hero = getHero(s, teslaPlayerIndex);
        if (hero && hero.hp > 0) {
          s.effectQueue.push({
            type: 'moveFighter',
            playerIndex: teslaPlayerIndex,
            fighterId: hero.id,
            range: 2,
            label: `Repulsion Blast (${coilCount} coil${coilCount > 1 ? 's' : ''}): Move Tesla up to 2 spaces.`,
          });
        }
        if (coilCount >= 2) {
          const opponentIdx = teslaPlayerIndex === 0 ? 1 : 0;
          const opponentPlayer = s.players[opponentIdx];
          if (opponentPlayer.hand.length > 0) {
            const randIdx = Math.floor(Math.random() * opponentPlayer.hand.length);
            const discarded = opponentPlayer.hand.splice(randIdx, 1)[0];
            opponentPlayer.discard.push(discarded);
            const charDef = getCharDef(opponentPlayer.characterId);
            const def = getCardDef(discarded, charDef);
            addLog(s, `Repulsion Blast (2 coils): ${opponentPlayer.name} discards ${def?.name || 'a card'} at random!`);
          }
        }
      }
      return continueAfterCombatTeslaChoice(s);
    }

    case 'teslaCoilDraw': {
      // Intense Experimentation (after-combat): base draw 1 always happens, 1 coil = draw 2, 2 coils = draw 3 + heal 1
      if (coilCount >= 2) {
        drawCards(s, teslaPlayerIndex, 3);
        const hero = getHero(s, teslaPlayerIndex);
        if (hero && hero.hp < hero.maxHp) {
          hero.hp = Math.min(hero.maxHp, hero.hp + 1);
          addLog(s, `Intense Experimentation (2 coils): Drew 3 cards, Tesla recovers 1 health! (${hero.hp}/${hero.maxHp} HP)`);
        } else {
          addLog(s, `Intense Experimentation (2 coils): Drew 3 cards!`);
        }
      } else if (coilCount >= 1) {
        drawCards(s, teslaPlayerIndex, 2);
        addLog(s, `Intense Experimentation (1 coil): Drew 2 cards!`);
      } else {
        drawCards(s, teslaPlayerIndex, 1);
        addLog(s, `Intense Experimentation: Drew 1 card.`);
      }
      return continueAfterCombatTeslaChoice(s);
    }

    default:
      break;
  }

  // For during-combat effects, continue to next step in combat pipeline
  if (context === 'duringCombat_def') {
    return continueAttackerDuringCombat(s);
  }
  if (context === 'duringCombat_atk') {
    // Check if there's a during-combat boost to play (re-enter that check)
    return continueAfterTeslaAttackerDuringCombat(s);
  }
  return continueAfterCombatTeslaChoice(s);
}

/** After attacker's Tesla during-combat choice, check for during-combat boosts and proceed */
function continueAfterTeslaAttackerDuringCombat(s: GameState): GameState {
  if (!s.combat) return s;
  const attacker = getFighter(s, s.combat.attackerId)!;
  const atkPlayer = s.players[attacker.owner];
  const atkCharDef = getCharDef(atkPlayer.characterId);
  const atkCardDef = s.combat.attackCard ? getCardDef(s.combat.attackCard, atkCharDef) : null;
  const atkDuring = atkCardDef?.effects.filter(e => e.timing === 'duringCombat') || [];

  let atkHasDuringBoost = false;
  for (const effect of atkDuring) {
    if (effect.type === 'boostAttack' && atkPlayer.hand.length > 0) atkHasDuringBoost = true;
    if (effect.type === 'discardToBoost' && atkPlayer.hand.length > 0) atkHasDuringBoost = true;
  }

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

  return resolveCombatDamage(s);
}

/** Continue processing after-combat effect queue after a Tesla coil choice */
function continueAfterCombatTeslaChoice(state: GameState): GameState {
  if (state.phase === 'gameOver') return state;
  state.teslaPendingCoilCardDefId = null;
  state.teslaCoilRevealedCard = null;
  // Continue processing the effect queue
  if (state.effectQueue.length > 0) {
    return processNextEffect(state);
  }
  return checkRainOfArrowsFollowUp(state);
}

/** The Alternating Current: binary choice — charge both coils or discharge both to heal 2 */
export function resolveTeslaAlternatingChoice(state: GameState, choice: string): GameState {
  const s = clone(state);
  const pi = s.currentPlayer;
  const hero = getHero(s, pi);

  if (choice === 'charge') {
    teslaChargeCoils(s, pi, 2);
    addLog(s, `The Alternating Current: Both coils charged!`);
  } else if (choice === 'heal') {
    if (s.teslaCoilsCharged[pi] >= 2 && hero) {
      teslaDischargeCoils(s, pi, 2);
      hero.hp = Math.min(hero.maxHp, hero.hp + 2);
      addLog(s, `The Alternating Current: Discharged both coils — Tesla recovers 2 health! (${hero.hp}/${hero.maxHp} HP)`);
    } else {
      addLog(s, `The Alternating Current: Not enough coils to heal. No effect.`);
    }
  }

  return continueAfterCombatTeslaChoice(s);
}

/** Improvised Shield: player chooses to flip boomerang for value + cancel effects */
export function resolveImprovisedShield(state: GameState): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  const defender = getFighter(s, s.combat.defenderId)!;
  // Flip boomerang to OUT
  s.sokkaBoomerangReady = [...s.sokkaBoomerangReady] as [boolean, boolean];
  s.sokkaBoomerangReady[defender.owner] = false;
  // Cancel attacker's effects
  s.combat.attackerEffectsCancelled = true;
  addLog(s, `Improvised Shield: Boomerang flipped to OUT! Value becomes 4, attacker's effects cancelled!`);
  return continueAttackerDuringCombat(s);
}

/** Improvised Shield: player declines to flip boomerang */
export function skipImprovisedShield(state: GameState): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  addLog(s, `Improvised Shield: Chose not to flip the Boomerang.`);
  return continueAttackerDuringCombat(s);
}

/** Combat Immediately Push: player moves the opposing fighter */
export function resolveCombatImmediatelyPush(state: GameState, targetSpaceId: string): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  const fighterId = s.pushTargetId;
  if (!fighterId) return continueCombatAfterImmediately(s);
  const fighter = getFighter(s, fighterId);
  if (!fighter) return continueCombatAfterImmediately(s);

  const reachable = getPushSpaces(s, fighterId, s.pushRange);
  if (reachable.includes(targetSpaceId)) {
    fighter.spaceId = targetSpaceId;
    addLog(s, `${fighter.name} moved to ${targetSpaceId}!`);
  }

  s.pushTargetId = null;
  s.pushRange = 0;
  return continueCombatAfterImmediately(s);
}

/** Combat Immediately Push: player skips moving the opposing fighter */
export function skipCombatImmediatelyPush(state: GameState): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  const fighterId = s.pushTargetId;
  if (fighterId) {
    const f = getFighter(s, fighterId);
    addLog(s, `${f?.name} is not moved.`);
  }
  s.pushTargetId = null;
  s.pushRange = 0;
  return continueCombatAfterImmediately(s);
}

/** Precision Throw: player chooses to flip boomerang for value 6 */
export function resolvePrecisionThrow(state: GameState): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  const attacker = getFighter(s, s.combat.attackerId)!;
  s.sokkaBoomerangReady = [...s.sokkaBoomerangReady] as [boolean, boolean];
  s.sokkaBoomerangReady[attacker.owner] = false;
  addLog(s, `Precision Throw: Boomerang flipped to OUT! Value becomes 6!`);
  return continuePrecisionThrowResume(s);
}

/** Precision Throw: player declines to flip boomerang */
export function skipPrecisionThrow(state: GameState): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  addLog(s, `Precision Throw: Chose not to flip the Boomerang.`);
  return continuePrecisionThrowResume(s);
}

/** Resume continueAttackerDuringCombat after Precision Throw choice, skipping the already-handled effect */
function continuePrecisionThrowResume(s: GameState): GameState {
  if (!s.combat) return s;

  const attacker = getFighter(s, s.combat.attackerId)!;
  const atkPlayer = s.players[attacker.owner];
  const atkCharDef = getCharDef(atkPlayer.characterId);
  const atkCardDef = s.combat.attackCard ? getCardDef(s.combat.attackCard, atkCharDef) : null;
  const atkDuring = atkCardDef?.effects.filter(e => e.timing === 'duringCombat') || [];

  // Continue processing remaining effects (skip boomerangFlipForValue since already handled)
  let atkHasDuringBoost = false;
  for (const effect of atkDuring) {
    if (effect.type === 'boostAttack') {
      if (atkPlayer.hand.length > 0) atkHasDuringBoost = true;
    }
    if (effect.type === 'discardToBoost') {
      if (atkPlayer.hand.length > 0) atkHasDuringBoost = true;
    }
  }

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

  return resolveCombatDamage(s);
}

// ---- Zelda/Sheik ----

/** Resolve form choice at start of turn */
export function resolveZeldaFormChoice(state: GameState, form: string): GameState {
  const s = clone(state);
  const pi = s.currentPlayer;
  const hero = getHero(s, pi);
  if (!hero) return s;

  s.zeldaCurrentForm = [...s.zeldaCurrentForm] as [string, string];
  s.zeldaCurrentForm[pi] = form;

  if (form === 'zelda') {
    hero.name = 'Zelda';
    hero.isRanged = true;
    hero.moveValue = 2;
    addLog(s, `Zelda form chosen: Ranged, Move 2, +1 combat value (Royal Radiance).`);
  } else {
    hero.name = 'Sheik';
    hero.isRanged = false;
    hero.moveValue = 3;
    s.players[pi].actionsRemaining++;
    addLog(s, `Sheik form chosen: Melee, Move 3, +1 action (Swift Strike).`);
  }

  // Clear movement lock from previous turn
  s.zeldaMovementLock = null;
  s.zeldaBonusAttackUsed = false;
  s.phase = 'playing';
  return s;
}

/** Get spaces in the hero's zone for Farore's Wind */
export function getZeldaZoneSpaces(state: GameState): string[] {
  const hero = getHero(state, state.currentPlayer);
  if (!hero) return [];
  const heroSpace = getSpace(state.board, hero.spaceId);
  if (!heroSpace) return [];
  const heroZones = heroSpace.zones;
  return state.board.spaces
    .filter(sp => sp.zones.some(z => heroZones.includes(z)) && !isSpaceOccupied(state, sp.id, hero.id))
    .map(sp => sp.id);
}

/** Resolve Farore's Wind: place fighter in any space in their zone */
export function resolveZeldaFaroresWind(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  const fighter = getFighter(s, s.combat.attackerId)!.owner === s.currentPlayer
    ? getFighter(s, s.combat.attackerId)!
    : getFighter(s, s.combat.defenderId)!;
  // Validate zone
  const fighterSpace = getSpace(s.board, fighter.spaceId);
  if (!fighterSpace) return continueCombatAfterImmediately(s);
  const zones = fighterSpace.zones;
  const targetSpace = getSpace(s.board, spaceId);
  if (!targetSpace || !targetSpace.zones.some(z => zones.includes(z))) return s;
  if (isSpaceOccupied(s, spaceId, fighter.id)) return s;

  fighter.spaceId = spaceId;
  addLog(s, `Farore's Wind: ${fighter.name} teleports to ${spaceId}!`);
  return continueCombatAfterImmediately(s);
}

/** Skip Farore's Wind */
export function skipZeldaFaroresWind(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Farore's Wind: Skipped.`);
  return continueCombatAfterImmediately(s);
}

/** Resolve Smoke Bomb move */
export function resolveZeldaSmokeBombMove(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  // Find which fighter is the Zelda player
  const attacker = getFighter(s, s.combat.attackerId)!;
  const defender = getFighter(s, s.combat.defenderId)!;
  const self = attacker.characterId === 'zelda' ? attacker : defender;
  const reachable = getReachableSpaces(s.board, self.spaceId, 2, s.fighters, self.id);
  if (!reachable.includes(spaceId)) return s;
  self.spaceId = spaceId;
  addLog(s, `Smoke Bomb: ${self.name} moves to ${spaceId}!`);
  return continueCombatAfterImmediately(s);
}

/** Skip Smoke Bomb move */
export function skipZeldaSmokeBombMove(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Smoke Bomb: Stays in place.`);
  return continueCombatAfterImmediately(s);
}

/** Resolve Song of Time: return card from discard to hand */
export function resolveZeldaSongOfTime(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const player = currentPlayer(s);
  const cardIdx = player.discard.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s;
  const card = player.discard.splice(cardIdx, 1)[0];
  player.hand.push(card);
  const charDef = getCharDef(player.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `Song of Time: ${def?.name || 'a card'} returned to hand!`);
  player.discard.push(s.pendingSchemeCard!);
  s.pendingSchemeCard = null;
  if (s.phase !== 'gameOver') useAction(s);
  return s;
}

/** Skip Song of Time */
export function skipZeldaSongOfTime(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Song of Time: No card returned.`);
  const player = currentPlayer(s);
  player.discard.push(s.pendingSchemeCard!);
  s.pendingSchemeCard = null;
  if (s.phase !== 'gameOver') useAction(s);
  return s;
}

/** Resolve Goddess Blade: return card from discard to hand (after combat) */
export function resolveZeldaGoddessBlade(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const player = s.players[s.currentPlayer];
  const cardIdx = player.discard.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s;
  const card = player.discard.splice(cardIdx, 1)[0];
  player.hand.push(card);
  const charDef = getCharDef(player.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `Goddess Blade: ${def?.name || 'a card'} returned to hand!`);
  return continueEffectQueue(s);
}

/** Skip Goddess Blade */
export function skipZeldaGoddessBlade(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Goddess Blade: No card returned.`);
  return continueEffectQueue(s);
}

/** Resolve Impa's Training move */
export function resolveZeldaImpasMove(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  const hero = getHero(s, s.currentPlayer);
  if (!hero) return s;
  const reachable = getReachableSpaces(s.board, hero.spaceId, 3, s.fighters, hero.id);
  if (!reachable.includes(spaceId)) return s;
  hero.spaceId = spaceId;
  addLog(s, `Impa's Training: ${hero.name} moves to ${spaceId}.`);

  // Now choose adjacent opponent
  const opponentIndex = s.currentPlayer === 0 ? 1 : 0;
  const adjacentEnemies = getAliveFighters(s, opponentIndex).filter(f =>
    areAdjacent(s.board, hero.spaceId, f.spaceId)
  );
  if (adjacentEnemies.length > 0) {
    s.phase = 'zelda_impasTraining_target';
    addLog(s, `Choose an adjacent opponent to reveal their hand.`);
  } else {
    addLog(s, `No adjacent opponents.`);
    const player = currentPlayer(s);
    player.discard.push(s.pendingSchemeCard!);
    s.pendingSchemeCard = null;
    if (s.phase !== 'gameOver') useAction(s);
  }
  return s;
}

/** Skip Impa's Training move */
export function skipZeldaImpasMove(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Impa's Training: Stays in place.`);
  const hero = getHero(s, s.currentPlayer);
  if (!hero) {
    const player = currentPlayer(s);
    player.discard.push(s.pendingSchemeCard!);
    s.pendingSchemeCard = null;
    if (s.phase !== 'gameOver') useAction(s);
    return s;
  }
  const opponentIndex = s.currentPlayer === 0 ? 1 : 0;
  const adjacentEnemies = getAliveFighters(s, opponentIndex).filter(f =>
    areAdjacent(s.board, hero.spaceId, f.spaceId)
  );
  if (adjacentEnemies.length > 0) {
    s.phase = 'zelda_impasTraining_target';
    addLog(s, `Choose an adjacent opponent to reveal their hand.`);
  } else {
    addLog(s, `No adjacent opponents.`);
    const player = currentPlayer(s);
    player.discard.push(s.pendingSchemeCard!);
    s.pendingSchemeCard = null;
    if (s.phase !== 'gameOver') useAction(s);
  }
  return s;
}

/** Resolve Impa's Training: choose adjacent opponent */
export function resolveZeldaImpasTarget(state: GameState, targetFighterId: string): GameState {
  const s = clone(state);
  const hero = getHero(s, s.currentPlayer);
  if (!hero) return s;
  const target = getFighter(s, targetFighterId);
  if (!target || target.owner === s.currentPlayer) return s;
  if (!areAdjacent(s.board, hero.spaceId, target.spaceId)) return s;

  const opponentPlayer = s.players[target.owner];
  if (opponentPlayer.hand.length === 0) {
    addLog(s, `${opponentPlayer.name} has no cards in hand.`);
    const player = currentPlayer(s);
    player.discard.push(s.pendingSchemeCard!);
    s.pendingSchemeCard = null;
    if (s.phase !== 'gameOver') useAction(s);
    return s;
  }

  s.zeldaImpasRevealedCards = [...opponentPlayer.hand];
  s.zeldaImpasTargetPlayer = target.owner;
  s.phase = 'zelda_impasTraining_discard';
  addLog(s, `${opponentPlayer.name}'s hand is revealed! Choose 1 card for them to discard.`);
  return s;
}

/** Resolve Impa's Training: choose card from revealed hand to discard */
export function resolveZeldaImpasDiscard(state: GameState, cardId: string): GameState {
  const s = clone(state);
  if (s.zeldaImpasTargetPlayer === null) return s;
  const opponentPlayer = s.players[s.zeldaImpasTargetPlayer];
  const cardIdx = opponentPlayer.hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s;

  const card = opponentPlayer.hand.splice(cardIdx, 1)[0];
  opponentPlayer.discard.push(card);
  const charDef = getCharDef(opponentPlayer.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `Impa's Training: ${opponentPlayer.name} discards ${def?.name || 'a card'}!`);

  s.zeldaImpasRevealedCards = [];
  s.zeldaImpasTargetPlayer = null;
  const player = currentPlayer(s);
  player.discard.push(s.pendingSchemeCard!);
  s.pendingSchemeCard = null;
  if (s.phase !== 'gameOver') useAction(s);
  return s;
}

/** Get adjacent opponents for Impa's Training target selection */
export function getZeldaImpasTargets(state: GameState): Fighter[] {
  const hero = getHero(state, state.currentPlayer);
  if (!hero) return [];
  const opponentIndex = state.currentPlayer === 0 ? 1 : 0;
  return getAliveFighters(state, opponentIndex).filter(f =>
    areAdjacent(state.board, hero.spaceId, f.spaceId)
  );
}

/** Resolve Din's Fire: deal 1 damage to another opponent in defender's zone */
export function resolveZeldaDinsFireTarget(state: GameState, targetFighterId: string): GameState {
  const s = clone(state);
  const target = getFighter(s, targetFighterId);
  if (!target || target.hp <= 0) return continueEffectQueue(s);

  if (s.zeldaNayrusLoveActive[target.owner]) {
    addLog(s, `Din's Fire: Damage to ${target.name} prevented by Nayru's Love!`);
  } else {
    target.hp = Math.max(0, target.hp - 1);
    addLog(s, `Din's Fire: Deals 1 damage to ${target.name}! (${target.hp} HP)`);
    checkHeroDeath(s);
  }
  return continueEffectQueue(s);
}

/** Skip Din's Fire */
export function skipZeldaDinsFire(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Din's Fire: No valid target.`);
  return continueEffectQueue(s);
}

// ---- Yennenga Damage Split ----

/** Check if damage to a Yennenga-owned fighter should trigger damage splitting.
 *  Returns true if split was set up (caller should return s), false if damage should be applied normally. */
function tryYennengaDamageSplit(
  s: GameState, target: Fighter, damage: number, continuation: 'afterCombat' | 'rainFollowUp' | 'effectQueue' | 'playing'
): boolean {
  const ownerCharId = s.players[target.owner].characterId;
  if (ownerCharId !== 'yennenga' || damage <= 0) return false;

  const friendliesInZone = getAliveFighters(s, target.owner).filter(f =>
    f.id !== target.id && sameZone(s.board, f.spaceId, target.spaceId)
  );
  if (friendliesInZone.length === 0) return false;

  const eligible = [target, ...friendliesInZone];
  s.yennengaDamageSplit = {
    totalDamage: damage,
    assignments: {},
    eligibleFighterIds: eligible.map(f => f.id),
    continuation,
  };
  for (const f of eligible) {
    s.yennengaDamageSplit.assignments[f.id] = 0;
  }
  s.phase = 'yennenga_damage_split';
  addLog(s, `Yennenga: Distribute ${damage} damage among your fighters in the zone.`);
  return true;
}

/** Assign 1 damage to a fighter during damage split */
export function assignYennengaDamage(state: GameState, fighterId: string): GameState {
  const s = clone(state);
  if (!s.yennengaDamageSplit) return s;
  const split = s.yennengaDamageSplit;
  if (!split.eligibleFighterIds.includes(fighterId)) return s;

  const assigned = Object.values(split.assignments).reduce((a, b) => a + b, 0);
  if (assigned >= split.totalDamage) return s; // all damage assigned

  // Don't assign more damage than the fighter has HP
  const fighter = getFighter(s, fighterId);
  if (!fighter || fighter.hp <= 0) return s;
  if (split.assignments[fighterId] >= fighter.hp) return s; // can't overkill

  split.assignments[fighterId] = (split.assignments[fighterId] || 0) + 1;
  return s;
}

/** Remove 1 damage from a fighter during damage split */
export function unassignYennengaDamage(state: GameState, fighterId: string): GameState {
  const s = clone(state);
  if (!s.yennengaDamageSplit) return s;
  const split = s.yennengaDamageSplit;
  if ((split.assignments[fighterId] || 0) <= 0) return s;
  split.assignments[fighterId] -= 1;
  return s;
}

/** Confirm the damage split and apply damage */
export function confirmYennengaDamageSplit(state: GameState): GameState {
  const s = clone(state);
  if (!s.yennengaDamageSplit) return s;
  const split = s.yennengaDamageSplit;
  const assigned = Object.values(split.assignments).reduce((a, b) => a + b, 0);
  if (assigned !== split.totalDamage) return s; // must assign all damage

  const continuation = split.continuation;

  // Apply damage to each fighter
  for (const [fid, dmg] of Object.entries(split.assignments)) {
    if (dmg > 0) {
      const fighter = getFighter(s, fid);
      if (fighter) {
        fighter.hp = Math.max(0, fighter.hp - dmg);
        addLog(s, `${fighter.name} takes ${dmg} damage! (${fighter.hp} HP remaining)`);
      }
    }
  }

  s.yennengaDamageSplit = null;
  checkHeroDeath(s);

  switch (continuation) {
    case 'afterCombat':
      return continueAfterCombat(s);
    case 'rainFollowUp':
      return finishRainOfArrowsFollowUp(s);
    case 'effectQueue':
      return continueEffectQueue(s);
    case 'playing':
    default:
      if (s.phase !== 'gameOver') {
        s.phase = 'playing';
      }
      return s;
  }
}

/** Continue from damage to after-combat effects (used by both normal flow and Yennenga split) */
function continueAfterCombat(s: GameState): GameState {
  if (!s.combat) return s;

  const attacker = getFighter(s, s.combat.attackerId)!;
  const defender = getFighter(s, s.combat.defenderId)!;
  const atkPlayer = s.players[attacker.owner];
  const defPlayer = s.players[defender.owner];
  const atkCharDef = getCharDef(atkPlayer.characterId);
  const defCharDef = getCharDef(defPlayer.characterId);
  const atkCardDef = s.combat.attackCard ? getCardDef(s.combat.attackCard, atkCharDef) : null;
  const defCardDef = s.combat.defenseCard ? getCardDef(s.combat.defenseCard, defCharDef) : null;

  // ===== PHASE 4: AFTER COMBAT =====
  const defAfter = (!s.combat.defenderEffectsCancelled
    ? defCardDef?.effects.filter(e => e.timing === 'afterCombat') : []) || [];
  const atkAfter = (!s.combat.attackerEffectsCancelled
    ? atkCardDef?.effects.filter(e => e.timing === 'afterCombat') : []) || [];

  const effectQueue: QueuedEffect[] = [];
  const attackerWon = s.combat.attackerWon;

  for (const effect of defAfter) {
    processAfterCombatEffect(s, effect, defender, attacker, defPlayer, atkPlayer, !attackerWon, effectQueue);
  }

  for (const effect of atkAfter) {
    processAfterCombatEffect(s, effect, attacker, defender, atkPlayer, defPlayer, attackerWon, effectQueue);
  }

  // Mewtwo Clone Vats ability
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

  if (effectQueue.length > 0) {
    s.effectQueue = effectQueue;
    return processNextEffect(s);
  }

  return checkRainOfArrowsFollowUp(s);
}

/** Check and start Rain of Arrows follow-up combat, or finish turn */
function checkRainOfArrowsFollowUp(s: GameState): GameState {
  if (s.phase === 'gameOver') return s;
  s.zeldaNayrusLoveActive = [false, false];

  if (s.rainOfArrowsFollowUp) {
    const followUp = s.rainOfArrowsFollowUp;
    s.rainOfArrowsFollowUp = null;
    const atk = getFighter(s, followUp.attackerId);
    const def = getFighter(s, followUp.defenderId);
    if (atk && def && atk.hp > 0 && def.hp > 0) {
      // Set up a follow-up combat
      s.combat = {
        attackerId: followUp.attackerId,
        defenderId: followUp.defenderId,
        attackCard: null,
        defenseCard: null,
        attackBoostCard: null,
        duringCombatBoost: null,
        attackerEffectsCancelled: false,
        defenderEffectsCancelled: false,
        damageDealt: 0,
        attackerWon: false,
        airScooterUsed: false,
        teslaIgnoreOpponentValue: false,
        teslaAtkValueDelta: 0,
        teslaDefValueDelta: 0,
        teslaAtkValueReplace: null,
        teslaDefValueReplace: null,
      };
      // Store the follow-up value for damage resolution
      s.rainOfArrowsFollowUp = { ...followUp }; // re-store for damage calc
      s.phase = 'rain_of_arrows_followup';
      addLog(s, `Rain of Arrows: Follow-up attack (value ${followUp.value})! ${def.name}, play a defense card or take the hit.`);
      return s;
    }
  }

  useAction(s);
  return s;
}

/** Defender plays a defense card (or skips) for Rain of Arrows follow-up */
export function resolveRainOfArrowsDefense(state: GameState, cardId: string | null): GameState {
  const s = clone(state);
  if (!s.combat || !s.rainOfArrowsFollowUp) return s;

  const followUp = s.rainOfArrowsFollowUp;
  const defender = getFighter(s, s.combat.defenderId)!;
  const defPlayer = s.players[defender.owner];
  const defCharDef = getCharDef(defPlayer.characterId);

  let defValue = 0;
  let defCardDef: ReturnType<typeof getCardDef> = undefined;

  if (cardId) {
    const cardIdx = defPlayer.hand.findIndex(c => c.id === cardId);
    if (cardIdx >= 0) {
      const card = defPlayer.hand.splice(cardIdx, 1)[0];
      s.combat.defenseCard = card;
      defCardDef = getCardDef(card, defCharDef);
      defValue = defCardDef?.value || 0;
      addLog(s, `${defPlayer.name} defends with ${defCardDef?.name} (value ${defValue}).`);
    }
  } else {
    addLog(s, `${defPlayer.name} takes the hit (no defense).`);
  }

  const atkValue = followUp.value;
  const damage = Math.max(0, atkValue - defValue);
  s.combat.damageDealt = damage;
  s.combat.attackerWon = atkValue > defValue;

  addLog(s, `Follow-up Attack: ${atkValue} vs Defense: ${defValue}`);

  if (damage > 0) {
    if (tryYennengaDamageSplit(s, defender, damage, 'rainFollowUp')) {
      return s;
    }
    defender.hp = Math.max(0, defender.hp - damage);
    addLog(s, `${defender.name} takes ${damage} damage! (${defender.hp} HP remaining)`);
  } else {
    addLog(s, `Follow-up attack blocked!`);
  }

  return finishRainOfArrowsFollowUp(s);
}

function finishRainOfArrowsFollowUp(s: GameState): GameState {
  if (s.combat) {
    const defender = getFighter(s, s.combat.defenderId)!;
    const defPlayer = s.players[defender.owner];
    if (s.combat.defenseCard) {
      defPlayer.discard.push(s.combat.defenseCard);
    }
  }
  s.rainOfArrowsFollowUp = null;
  s.combat = null;
  checkHeroDeath(s);
  if (s.phase !== 'gameOver') {
    useAction(s);
  }
  return s;
}

// ---- Maneuver ----

export function startManeuver(state: GameState): GameState {
  const s = clone(state);
  drawCards(s, s.currentPlayer, 1);
  if (s.phase === 'gameOver') return s;
  s.maneuverBoost = 0;
  s.maneuverFightersToMove = getAliveFighters(s, s.currentPlayer).filter(f => f.spaceId !== '').map(f => f.id);
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

  const moveRange = s.pendingSchemeCard ? s.schemeMoveRange : fighter.moveValue + s.maneuverBoost;
  const reachable = getReachableSpaces(s.board, fighter.spaceId, moveRange, s.fighters, fighter.id);
  if (!reachable.includes(targetSpaceId)) {
    // Invalid space — don't skip, just return unchanged
    return s;
  }
  fighter.spaceId = targetSpaceId;
  addLog(s, `${fighter.name} moved to ${targetSpaceId}.`);

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
      // Store pending space; Aang moves only after attack card is confirmed
      s.airScooterPendingSpace = betweenSpaces[0];
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
    teslaIgnoreOpponentValue: false,
    teslaAtkValueDelta: 0,
    teslaDefValueDelta: 0,
    teslaAtkValueReplace: null,
    teslaDefValueReplace: null,
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

  // Store pending space; Aang moves only after attack card is confirmed
  s.airScooterPendingSpace = spaceId;

  // Clear Air Scooter choice state
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
    teslaIgnoreOpponentValue: false,
    teslaAtkValueDelta: 0,
    teslaDefValueDelta: 0,
    teslaAtkValueReplace: null,
    teslaDefValueReplace: null,
  };
  s.phase = 'attack_selectCard';
  addLog(s, `${attacker.name} attacks ${defender.name}! Choose an attack card.`);
  return s;
}

/** Sky Bison Charge: resolve the move/damage choice */
export function resolveAangChargeChoice(state: GameState, choice: 'move' | 'damage'): GameState {
  const s = clone(state);
  if (!s.combat) return s;
  const appa = getFighter(s, s.combat.attackerId);
  if (!appa) return continueCombatAfterImmediately(s);

  if (choice === 'damage') {
    const opponent = getFighter(s, s.combat.defenderId);
    if (opponent && opponent.hp > 0) {
      if (s.zeldaNayrusLoveActive[opponent.owner]) {
        addLog(s, `Sky Bison Charge: Damage prevented by Nayru's Love!`);
      } else {
        opponent.hp = Math.max(0, opponent.hp - 1);
        addLog(s, `Sky Bison Charge: ${appa.name} deals 1 damage to ${opponent.name}! (${opponent.hp} HP)`);
        checkHeroDeath(s);
      }
    }
    return continueCombatAfterImmediately(s);
  } else {
    // Move Appa up to 3 spaces — reuse airScooterSpaces to store valid destinations
    const reachable = getReachableSpaces(s.board, appa.spaceId, 3, s.fighters, appa.id);
    s.airScooterSpaces = reachable;
    s.airScooterDefenderId = appa.id; // store the fighter being moved
    s.phase = 'aang_flying_bison_zone'; // reuse the interactive move phase
    addLog(s, `Sky Bison Charge: Choose where to move ${appa.name} (up to 3 spaces).`);
    return s;
  }
}

export function resolveAangFlyingBisonZone(state: GameState, spaceId: string): GameState {
  const s = clone(state);
  if (!s.airScooterSpaces.includes(spaceId) || !s.combat) return s;
  const fighterId = s.airScooterDefenderId!;
  const fighter = getFighter(s, fighterId);
  if (fighter) {
    fighter.spaceId = spaceId;
    // Determine context from the attack card
    const atkCharDef = getCharDef(s.players[s.currentPlayer].characterId);
    const atkCardDef = s.combat.attackCard ? getCardDef(s.combat.attackCard, atkCharDef) : null;
    const cardName = atkCardDef?.name ?? 'Ability';
    addLog(s, `${cardName}: ${fighter.name} moves to ${spaceId}!`);
  }
  s.airScooterSpaces = [];
  s.airScooterDefenderId = null;
  return continueCombatAfterImmediately(s);
}

export function selectAttackCard(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const player = s.players[s.currentPlayer];
  const cardIdx = player.hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0 || !s.combat) return s;
  const card = player.hand.splice(cardIdx, 1)[0];
  s.combat.attackCard = card;

  // Air Scooter: now that attack is confirmed, move Aang to the pending between-space
  if (s.airScooterPendingSpace) {
    const attacker = getFighter(s, s.combat.attackerId);
    if (attacker) {
      addLog(s, `Air Scooter! Aang zips to ${s.airScooterPendingSpace} between the fighters!`);
      attacker.spaceId = s.airScooterPendingSpace;
      s.combat.airScooterUsed = true;
    }
    s.airScooterPendingSpace = null;
  }

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

  // Pause at attack_resolve so the UI can show both cards before resolving
  s.phase = 'attack_resolve';
  return s;
}

/** Continue from the attack_resolve display phase into actual combat resolution */
export function confirmCombatResolve(state: GameState): GameState {
  const s = clone(state);
  if (!s.combat) return s;
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
    // Tesla: Polyphase Coils (defender) — interactive coil choice
    if (effect.type === 'teslaCoilCancel' && !s.combat.defenderEffectsCancelled) {
      const coils = s.teslaCoilsCharged[defender.owner];
      if (coils >= 1) {
        s.teslaPendingCoilEffect = 'teslaCoilCancel';
        s.teslaCoilChoiceContext = 'immediately';
        s.teslaCoilChoicePlayerIndex = defender.owner;
        s.phase = 'tesla_coilChoice';
        addLog(s, `Polyphase Coils: Choose how many coils to discharge (${coils} available). 1 = cancel effects, 2 = cancel effects + ignore value.`);
        return s;
      }
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
    // Zelda: Light Arrow (defender) — form-dependent
    if (effect.type === 'zeldaLightArrow' && !s.combat.defenderEffectsCancelled) {
      const form = s.zeldaCurrentForm[defender.owner];
      if (form === 'zelda') {
        drawCards(s, defPlayer.index, 1);
        addLog(s, `Light Arrow: Zelda form — drew 1 card.`);
      } else if (form === 'sheik') {
        if (attacker.hp > 0) {
          if (s.zeldaNayrusLoveActive[attacker.owner]) {
            addLog(s, `Light Arrow: Sheik form — damage prevented by Nayru's Love!`);
          } else {
            attacker.hp = Math.max(0, attacker.hp - 1);
            addLog(s, `Light Arrow: Sheik form — deals 1 damage to ${attacker.name}! (${attacker.hp} HP)`);
            checkHeroDeath(s);
          }
        }
      }
    }
    // Zelda: Sheikah Veil (defender) — lock opponent movement
    if (effect.type === 'zeldaSheikahVeil' && !s.combat.defenderEffectsCancelled) {
      s.zeldaMovementLock = attacker.id;
      addLog(s, `Sheikah Veil: ${attacker.name} cannot leave their space for the rest of this turn!`);
    }
    // Zelda: Farore's Wind (defender) — place in zone
    if (effect.type === 'zeldaFaroresWind' && !s.combat.defenderEffectsCancelled) {
      s.phase = 'zelda_faroresWind';
      addLog(s, `Farore's Wind: Place your fighter in any space in your zone.`);
      return s;
    }
    // Zelda: Smoke Bomb (defender) — move up to 2 + cancel opponent effects
    if (effect.type === 'zeldaSmokeBomb' && !s.combat.defenderEffectsCancelled) {
      s.combat.attackerEffectsCancelled = true;
      addLog(s, `Smoke Bomb: All effects on opponent's card are ignored!`);
      s.phase = 'zelda_smokeBomb_move';
      addLog(s, `Smoke Bomb: You may move up to 2 spaces.`);
      return s;
    }
    // Fan Sweep: push the opposing fighter up to N spaces
    if (effect.type === 'pushFighter' && !s.combat.defenderEffectsCancelled) {
      const pushTarget = attacker; // defender pushes the attacker
      if (pushTarget.hp > 0 && effect.amount && effect.amount > 0) {
        s.pushTargetId = pushTarget.id;
        s.pushRange = effect.amount;
        s.phase = 'combat_immediately_push';
        addLog(s, `${defCardDef?.name}: Move ${pushTarget.name} up to ${effect.amount} space(s).`);
        return s;
      }
    }
    // Genie: Back in the Lamp — recover health immediately (defense card)
    if (effect.type === 'healSelf' && !s.combat.defenderEffectsCancelled) {
      if (defender.hp > 0 && effect.amount && effect.amount > 0) {
        const healed = Math.min(effect.amount, defender.maxHp - defender.hp);
        defender.hp = Math.min(defender.maxHp, defender.hp + effect.amount);
        addLog(s, `${defCardDef?.name}: ${defender.name} recovers ${healed} health! (${defender.hp}/${defender.maxHp} HP)`);
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
      // Tesla: Polyphase Coils (attacker) — interactive coil choice
      if (effect.type === 'teslaCoilCancel') {
        const coils = s.teslaCoilsCharged[attacker.owner];
        if (coils >= 1) {
          s.teslaPendingCoilEffect = 'teslaCoilCancel';
          s.teslaCoilChoiceContext = 'immediately';
          s.teslaCoilChoicePlayerIndex = attacker.owner;
          s.phase = 'tesla_coilChoice';
          addLog(s, `Polyphase Coils: Choose how many coils to discharge (${coils} available). 1 = cancel effects, 2 = cancel effects + ignore value.`);
          return s;
        }
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
        // Flying Bison: move Appa to any space in a different zone (interactive)
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
              s.airScooterSpaces = validSpaces.map(sp => sp.id);
              s.airScooterDefenderId = s.combat!.attackerId; // reuse field to store fighter being moved
              s.phase = 'aang_flying_bison_zone';
              addLog(s, `Flying Bison: Choose a space in a different zone for ${fighter.name}!`);
              return s;
            } else {
              addLog(s, `Flying Bison: No valid spaces in a different zone.`);
            }
          }
        }
      }
      if (effect.type === 'chargeChoice') {
        // Sky Bison Charge: interactive choice — move Appa up to 3 spaces OR deal 1 damage
        const appa = getFighter(s, s.combat.attackerId);
        if (appa) {
          s.phase = 'aang_charge_choice';
          addLog(s, `Sky Bison Charge: Choose — move ${appa.name} up to 3 spaces, or deal 1 damage to the opposing fighter.`);
          return s;
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
      // Zelda: Light Arrow (attacker) — form-dependent
      if (effect.type === 'zeldaLightArrow') {
        const form = s.zeldaCurrentForm[attacker.owner];
        if (form === 'zelda') {
          drawCards(s, atkPlayer.index, 1);
          addLog(s, `Light Arrow: Zelda form — drew 1 card.`);
        } else if (form === 'sheik') {
          if (defender.hp > 0) {
            if (s.zeldaNayrusLoveActive[defender.owner]) {
              addLog(s, `Light Arrow: Sheik form — damage prevented by Nayru's Love!`);
            } else {
              defender.hp = Math.max(0, defender.hp - 1);
              addLog(s, `Light Arrow: Sheik form — deals 1 damage to ${defender.name}! (${defender.hp} HP)`);
              checkHeroDeath(s);
            }
          }
        }
      }
      // Zelda: Sheikah Veil (attacker) — lock opponent movement
      if (effect.type === 'zeldaSheikahVeil') {
        s.zeldaMovementLock = defender.id;
        addLog(s, `Sheikah Veil: ${defender.name} cannot leave their space for the rest of this turn!`);
      }
      // Zelda: Farore's Wind (attacker) — place in zone
      if (effect.type === 'zeldaFaroresWind') {
        s.phase = 'zelda_faroresWind';
        addLog(s, `Farore's Wind: Place your fighter in any space in your zone.`);
        return s;
      }
      // Zelda: Smoke Bomb (attacker) — move up to 2 + cancel opponent effects
      if (effect.type === 'zeldaSmokeBomb') {
        s.combat.defenderEffectsCancelled = true;
        addLog(s, `Smoke Bomb: All effects on opponent's card are ignored!`);
        s.phase = 'zelda_smokeBomb_move';
        addLog(s, `Smoke Bomb: You may move up to 2 spaces.`);
        return s;
      }
      // Fan Sweep: push the opposing fighter up to N spaces
      if (effect.type === 'pushFighter' && effect.amount) {
        if (defender.hp > 0) {
          s.pushTargetId = defender.id;
          s.pushRange = effect.amount;
          s.phase = 'combat_immediately_push';
          addLog(s, `${atkCardDef?.name}: Move ${defender.name} up to ${effect.amount} space(s).`);
          return s;
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
          if (s.zeldaNayrusLoveActive[attacker.owner]) {
            addLog(s, `Sacrificial Block: Damage to ${attacker.name} prevented by Nayru's Love!`);
          } else {
            attacker.hp = Math.max(0, attacker.hp - 1);
            addLog(s, `Sacrificial Block: Deals 1 damage to ${attacker.name}! (${attacker.hp} HP)`);
            checkHeroDeath(s);
          }
        }
        // Cancel all effects on attacker's card
        s.combat.attackerEffectsCancelled = true;
        addLog(s, `Sacrificial Block: All effects on attacker's card are cancelled!`);
      }
    }
  }

  // All immediately effects processed — continue to during-combat phase
  return continueCombatAfterImmediately(s);
}

/** Resume combat after all immediately effects (including interactive push) are resolved */
function continueCombatAfterImmediately(s: GameState): GameState {
  if (!s.combat) return s;

  const attacker = getFighter(s, s.combat.attackerId)!;
  const defender = getFighter(s, s.combat.defenderId)!;
  const defPlayer = s.players[defender.owner];
  const defCharDef = getCharDef(defPlayer.characterId);
  const defCardDef = s.combat.defenseCard ? getCardDef(s.combat.defenseCard, defCharDef) : null;

  // ===== PHASE 2: DURING COMBAT =====
  const defDuring = (!s.combat.defenderEffectsCancelled
    ? defCardDef?.effects.filter(e => e.timing === 'duringCombat') : []) || [];
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
    // Improvised Shield: optionally flip boomerang to OUT for value 4 + cancel effects
    if (effect.type === 'boomerangFlipForValueAndCancel') {
      if (s.sokkaBoomerangReady[defender.owner]) {
        // Pause for player choice
        s.phase = 'sokka_improvised_shield';
        addLog(s, `Improvised Shield: You may flip the Boomerang to OUT for value ${effect.amount} and cancel opponent's effects.`);
        return s;
      }
    }
  }

  // Zelda: Nayru's Love (defender) — prevent card-effect damage
  if (!s.combat.defenderEffectsCancelled && defCardDef) {
    for (const effect of defDuring) {
      if (effect.type === 'zeldaNayrusLove') {
        s.zeldaNayrusLoveActive = [...s.zeldaNayrusLoveActive] as [boolean, boolean];
        s.zeldaNayrusLoveActive[defender.owner] = true;
        addLog(s, `Nayru's Love: All card-effect damage to ${defender.name} is prevented this combat!`);
      }
      // Zelda: Needle Storm during (defender — versatile used as defense)
      if (effect.type === 'zeldaNeedleStormDuring') {
        if (s.actionsTakenThisTurn >= 2) {
          addLog(s, `Needle Storm: Third action this turn — value +2!`);
        }
      }
    }
  }

  // Tesla: check if defender has a during-combat coil effect that needs choice
  if (!s.combat.defenderEffectsCancelled && defCardDef) {
    for (const effect of defCardDef.effects) {
      if (effect.timing === 'duringCombat' && (effect.type === 'teslaCoilValue' || effect.type === 'teslaCoilRevealDiscard')) {
        const coils = s.teslaCoilsCharged[defender.owner];
        if (coils >= 1) {
          s.teslaPendingCoilEffect = effect.type;
          s.teslaCoilChoiceContext = 'duringCombat_def';
          s.teslaCoilChoicePlayerIndex = defender.owner;
          s.phase = 'tesla_coilChoice';
          const effectName = effect.type === 'teslaCoilValue' ? 'Death Ray' : 'X-Ray Radiation';
          addLog(s, `${effectName}: Choose how many coils to discharge (${coils} available).`);
          return s;
        }
      }
    }
  }

  // Continue to attacker's during-combat phase
  return continueAttackerDuringCombat(s);
}

/** Process attacker's during-combat effects, then continue to damage resolution */
function continueAttackerDuringCombat(s: GameState): GameState {
  if (!s.combat) return s;

  const attacker = getFighter(s, s.combat.attackerId)!;
  const defender = getFighter(s, s.combat.defenderId)!;
  const atkPlayer = s.players[attacker.owner];
  const atkCharDef = getCharDef(atkPlayer.characterId);
  const atkCardDef = s.combat.attackCard ? getCardDef(s.combat.attackCard, atkCharDef) : null;
  const atkDuring = atkCardDef?.effects.filter(e => e.timing === 'duringCombat') || [];

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
    // Precision Throw: if boomerang READY, may flip to OUT, value becomes 6
    if (effect.type === 'boomerangFlipForValue') {
      if (s.sokkaBoomerangReady[attacker.owner]) {
        s.phase = 'sokka_precision_throw';
        addLog(s, `Precision Throw: You may flip the Boomerang to OUT for value ${effect.amount}.`);
        return s;
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

  // Genie: This Is No Parlor Trick — log the effect (handled in damage calc)
  if (!s.combat.attackerEffectsCancelled && atkCardDef) {
    for (const effect of atkDuring) {
      if (effect.type === 'genieParlorTrick') {
        const defCardDefLocal = s.combat.defenseCard ? getCardDef(s.combat.defenseCard, getCharDef(s.players[defender.owner].characterId)) : null;
        addLog(s, `This Is No Parlor Trick: The opposing card's value is treated as its boost number (${defCardDefLocal?.boost ?? 0})!`);
      }
    }
  }
  const defCharDefLocal = getCharDef(s.players[defender.owner].characterId);
  const defCardDef = s.combat.defenseCard ? getCardDef(s.combat.defenseCard, defCharDefLocal) : null;
  if (!s.combat.defenderEffectsCancelled && defCardDef) {
    const defDuringLocal = defCardDef.effects.filter((e: { timing: string; type: string }) => e.timing === 'duringCombat');
    for (const effect of defDuringLocal) {
      if (effect.type === 'genieParlorTrick') {
        addLog(s, `This Is No Parlor Trick: The opposing card's value is treated as its boost number (${atkCardDef?.boost ?? 0})!`);
      }
    }
  }

  // Zelda: Needle Storm during (attacker) + Nayru's Love (attacker side)
  if (!s.combat.attackerEffectsCancelled && atkCardDef) {
    for (const effect of atkDuring) {
      if (effect.type === 'zeldaNeedleStormDuring') {
        if (s.actionsTakenThisTurn >= 2) {
          addLog(s, `Needle Storm: Third action this turn — value +2!`);
        }
      }
      if (effect.type === 'zeldaNayrusLove') {
        s.zeldaNayrusLoveActive = [...s.zeldaNayrusLoveActive] as [boolean, boolean];
        s.zeldaNayrusLoveActive[attacker.owner] = true;
        addLog(s, `Nayru's Love: All card-effect damage to ${attacker.name} is prevented this combat!`);
      }
    }
  }

  // Tesla: check if attacker has a during-combat coil effect that needs choice
  if (!s.combat.attackerEffectsCancelled && atkCardDef) {
    for (const effect of atkCardDef.effects) {
      if (effect.timing === 'duringCombat' && (effect.type === 'teslaCoilValue' || effect.type === 'teslaCoilRevealDiscard')) {
        const coils = s.teslaCoilsCharged[attacker.owner];
        if (coils >= 1) {
          s.teslaPendingCoilEffect = effect.type;
          s.teslaCoilChoiceContext = 'duringCombat_atk';
          s.teslaCoilChoicePlayerIndex = attacker.owner;
          s.phase = 'tesla_coilChoice';
          const effectName = effect.type === 'teslaCoilValue' ? 'Death Ray' : 'X-Ray Radiation';
          addLog(s, `${effectName}: Choose how many coils to discharge (${coils} available).`);
          return s;
        }
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

  // Genie: Three Wishes value lock — if active, card value is 4 (cannot be changed by other effects)
  // Apply after initial value, before other modifications (checked again at end)
  const genieAtkLock = s.genieThreeWishesValueLock[attacker.owner];
  const genieDefLock = s.genieThreeWishesValueLock[defender.owner];

  // Genie: This Is No Parlor Trick — treat opposing card's value as its boost number
  if (!s.combat.attackerEffectsCancelled && atkCardDef) {
    const hasParlorTrick = atkCardDef.effects.some(e => e.timing === 'duringCombat' && e.type === 'genieParlorTrick');
    if (hasParlorTrick) {
      defValue = defCardDef?.boost || 0;
    }
  }
  if (!s.combat.defenderEffectsCancelled && defCardDef) {
    const hasParlorTrick = defCardDef.effects.some(e => e.timing === 'duringCombat' && e.type === 'genieParlorTrick');
    if (hasParlorTrick) {
      atkValue = atkCardDef?.boost || 0;
    }
  }

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
      // Jaws of the Beast: +1 per zone the opposing fighter is in
      if (effect.timing === 'duringCombat' && effect.type === 'plusPerZone') {
        const defSpace = getSpace(s.board, defender.spaceId);
        if (defSpace) {
          const zoneCount = defSpace.zones.length;
          atkValue += zoneCount * (effect.amount || 1);
          addLog(s, `Jaws of the Beast: +${zoneCount} (opponent in ${zoneCount} zone(s))!`);
        }
      }
      // Divide and Conquer: if fighter not in hero's zone, value becomes 4
      if (effect.timing === 'duringCombat' && effect.type === 'valueIfDifferentZone') {
        const hero = getHero(s, attacker.owner);
        if (hero && !sameZone(s.board, attacker.spaceId, hero.spaceId)) {
          atkValue = (atkValue - (atkCardDef.value || 0)) + (effect.amount || 0);
          addLog(s, `Divide and Conquer: Fighter not in hero's zone — value becomes ${effect.amount}!`);
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
      if (effect.timing === 'duringCombat' && effect.type === 'plusPerZone') {
        const atkSpace = getSpace(s.board, attacker.spaceId);
        if (atkSpace) {
          const zoneCount = atkSpace.zones.length;
          defValue += zoneCount * (effect.amount || 1);
          addLog(s, `Jaws of the Beast: +${zoneCount} (opponent in ${zoneCount} zone(s))!`);
        }
      }
      if (effect.timing === 'duringCombat' && effect.type === 'valueIfDifferentZone') {
        const hero = getHero(s, defender.owner);
        if (hero && !sameZone(s.board, defender.spaceId, hero.spaceId)) {
          defValue = (defValue - (defCardDef.value || 0)) + (effect.amount || 0);
          addLog(s, `Divide and Conquer: Fighter not in hero's zone — value becomes ${effect.amount}!`);
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
        // Count OTHER friendly fighters adjacent to the opposing fighter
        const adjFriendlies = s.fighters.filter(f =>
          f.owner === attacker.owner && f.id !== attacker.id && f.hp > 0 && f.spaceId !== '' &&
          areAdjacent(s.board, defender.spaceId, f.spaceId)
        );
        if (adjFriendlies.length > 0) {
          const bonus = adjFriendlies.length;
          atkValue += bonus;
          addLog(s, `Swarm Tactics: +${bonus} (${adjFriendlies.length} other friendly fighter(s) adjacent to opponent)!`);
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

  // Zelda: Needle Storm +2 if third action this turn
  if (!s.combat.attackerEffectsCancelled && atkCardDef) {
    for (const effect of atkCardDef.effects) {
      if (effect.timing === 'duringCombat' && effect.type === 'zeldaNeedleStormDuring' && s.actionsTakenThisTurn >= 2) {
        atkValue += 2;
      }
    }
  }
  if (!s.combat.defenderEffectsCancelled && defCardDef) {
    for (const effect of defCardDef.effects) {
      if (effect.timing === 'duringCombat' && effect.type === 'zeldaNeedleStormDuring' && s.actionsTakenThisTurn >= 2) {
        defValue += 2;
      }
    }
  }

  // Zelda: Royal Radiance +1 combat value (ABILITY effect — cannot be cancelled by card effects like Feint)
  if (attacker.characterId === 'zelda' && s.zeldaCurrentForm[attacker.owner] === 'zelda') {
    atkValue += 1;
    addLog(s, `Royal Radiance: +1 combat value (Zelda form ability)!`);
  }
  if (defender.characterId === 'zelda' && s.zeldaCurrentForm[defender.owner] === 'zelda') {
    defValue += 1;
    addLog(s, `Royal Radiance: +1 combat value (Zelda form ability)!`);
  }

  // Tesla: Apply during-combat coil effects (already resolved via interactive choice)
  if (s.combat.teslaAtkValueReplace !== null) {
    atkValue = (atkValue - (atkCardDef?.value || 0)) + s.combat.teslaAtkValueReplace;
  }
  atkValue += s.combat.teslaAtkValueDelta;
  if (s.combat.teslaDefValueReplace !== null) {
    defValue = (defValue - (defCardDef?.value || 0)) + s.combat.teslaDefValueReplace;
  }
  defValue += s.combat.teslaDefValueDelta;

  // Polyphase Coils: ignore opponent's value (2 coils discharged)
  if (s.combat.teslaIgnoreOpponentValue) {
    // Find which side is the opponent of Tesla
    if (attacker.characterId === 'tesla') {
      defValue = 0;
      addLog(s, `Polyphase Coils: Defender's card value set to 0!`);
    } else if (defender.characterId === 'tesla') {
      atkValue = 0;
      addLog(s, `Polyphase Coils: Attacker's card value set to 0!`);
    }
  }

  // Genie: Three Wishes value lock — override final value with 4 if lock is active
  if (genieAtkLock) {
    atkValue = 4;
    addLog(s, `Three Wishes: Attacker's card value locked at 4!`);
  }
  if (genieDefLock) {
    defValue = 4;
    addLog(s, `Three Wishes: Defender's card value locked at 4!`);
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
    if (tryYennengaDamageSplit(s, defender, damage, 'afterCombat')) {
      return s;
    }
    defender.hp = Math.max(0, defender.hp - damage);
    addLog(s, `${defender.name} takes ${damage} damage! (${defender.hp} HP remaining)`);
  } else {
    addLog(s, `Attack blocked!`);
  }

  return continueAfterCombat(s);

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
        if (state.zeldaNayrusLoveActive[opponent.owner]) {
          addLog(state, `${self.name}'s additional damage prevented by Nayru's Love!`);
        } else {
          opponent.hp = Math.max(0, opponent.hp - effect.amount);
          addLog(state, `${self.name} deals ${effect.amount} additional damage to ${opponent.name}! (${opponent.hp} HP)`);
          checkHeroDeath(state);
        }
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

    case 'pushIfMoved': {
      // Whirlwind Kick: if Aang moved this turn, may push the defender up to 1 space
      const startSpace = state.turnStartSpaces[self.id];
      const hasMoved = startSpace && startSpace !== self.spaceId;
      if (hasMoved && opponent.hp > 0) {
        queue.push({
          type: 'pushFighter',
          playerIndex: selfPlayer.index,
          targetFighterId: opponent.id,
          range: effect.amount || 1,
          label: `Whirlwind Kick: Aang moved this turn — you may push ${opponent.name} up to ${effect.amount || 1} space.`,
        });
      }
      break;
    }

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
          drawCardsIfPushed: 1,
          label: `Water Whip: Push ${opponent.name} up to ${effect.amount || 2} spaces. If pushed, draw 1 card.`,
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
      // Air Shield: if you took damage, move the defending fighter 1 space
      const combat = state.combat;
      if (combat && combat.damageDealt > 0 && self.hp > 0 && effect.amount && effect.amount > 0) {
        queue.push({
          type: 'moveFighter',
          playerIndex: selfPlayer.index,
          fighterId: self.id,
          range: effect.amount,
          label: `Air Shield: Took damage — move ${self.name} up to ${effect.amount} space.`,
        });
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
      // Boomerang Bounce: if boomerang OUT, deal 1 damage to a fighter in the opposing fighter's zone
      if (!state.sokkaBoomerangReady[selfPlayer.index] && opponent.hp > 0) {
        const opponentIdx = selfPlayer.index === 0 ? 1 : 0;
        const enemiesInZone = getAliveFighters(state, opponentIdx).filter(f =>
          sameZone(state.board, f.spaceId, opponent.spaceId)
        );
        if (enemiesInZone.length === 1) {
          // Only one target — check if Yennenga player needs split
          const target = enemiesInZone[0];
          const targetOwnerChar = state.players[target.owner].characterId;
          const friendliesInZone = targetOwnerChar === 'yennenga'
            ? getAliveFighters(state, target.owner).filter(f =>
                f.id !== target.id && sameZone(state.board, f.spaceId, target.spaceId)
              )
            : [];
          if (friendliesInZone.length > 0) {
            // Queue interactive zone damage for Yennenga split
            queue.push({
              type: 'zoneDamageTarget',
              playerIndex: selfPlayer.index,
              damageAmount: effect.amount || 1,
              fighterId: opponent.id,
              label: `Boomerang Bounce: Deal ${effect.amount || 1} damage (Yennenga may split).`,
            });
          } else if (state.zeldaNayrusLoveActive[target.owner]) {
            addLog(state, `Boomerang Bounce: Damage to ${target.name} prevented by Nayru's Love!`);
          } else {
            target.hp = Math.max(0, target.hp - (effect.amount || 1));
            addLog(state, `Boomerang Bounce: Boomerang is OUT — deals ${effect.amount || 1} damage to ${target.name}! (${target.hp} HP)`);
            checkHeroDeath(state);
          }
        } else if (enemiesInZone.length > 1) {
          queue.push({
            type: 'zoneDamageTarget',
            playerIndex: selfPlayer.index,
            damageAmount: effect.amount || 1,
            fighterId: opponent.id,
            label: `Boomerang Bounce: Choose an enemy fighter in the opposing fighter's zone to deal ${effect.amount || 1} damage.`,
          });
        }
      }
      break;
    }

    case 'boomerangReadyAfterCombat': {
      // Boomerang Set-Up: always flip boomerang to READY
      state.sokkaBoomerangReady = [...state.sokkaBoomerangReady] as [boolean, boolean];
      state.sokkaBoomerangReady[selfPlayer.index] = true;
      addLog(state, `Boomerang Set-Up: Boomerang flipped to READY!`);
      break;
    }

    case 'dealDamageIfLost': {
      if (!selfWon && opponent.hp > 0) {
        if (state.zeldaNayrusLoveActive[opponent.owner]) {
          addLog(state, `Kyoshi Counter: Damage prevented by Nayru's Love!`);
        } else {
          opponent.hp = Math.max(0, opponent.hp - (effect.amount || 1));
          addLog(state, `Kyoshi Counter: Deals ${effect.amount || 1} damage to ${opponent.name}! (${opponent.hp} HP)`);
          checkHeroDeath(state);
        }
      }
      break;
    }

    // ---- Yennenga after-combat effects ----

    case 'moveHeroThroughEnemies': {
      // Stallion Charge: move hero up to N spaces, can move through enemies
      const hero = getHero(state, selfPlayer.index);
      if (hero && hero.hp > 0 && effect.amount && effect.amount > 0) {
        // Use special movement that allows passing through enemies
        const reachable = getReachableSpacesThroughEnemies(state.board, hero.spaceId, effect.amount, state.fighters, hero.id);
        if (reachable.length > 0) {
          queue.push({
            type: 'moveFighter',
            playerIndex: selfPlayer.index,
            fighterId: hero.id,
            range: effect.amount,
            label: `Stallion Charge: Move ${hero.name} up to ${effect.amount} spaces (through enemies).`,
          });
          // Store flag so resolveEffectMove uses through-enemies movement
          state.stallionChargeActive = true;
        }
      }
      break;
    }

    case 'rainOfArrowsFollowUp': {
      // Rain of Arrows: set up a follow-up attack (processed after all other effects)
      if (opponent.hp > 0) {
        state.rainOfArrowsFollowUp = {
          attackerId: self.id,
          defenderId: opponent.id,
          value: effect.amount || 3,
        };
        addLog(state, `Rain of Arrows: A follow-up attack is coming!`);
      }
      break;
    }

    case 'dealDamageAfterCombat': {
      if (opponent.hp > 0) {
        const hero = getHero(state, selfPlayer.index);
        if (hero && hero.hp > 0 && areAdjacent(state.board, hero.spaceId, opponent.spaceId)) {
          if (state.zeldaNayrusLoveActive[opponent.owner]) {
            addLog(state, `Point Blank: Damage prevented by Nayru's Love!`);
          } else {
            opponent.hp = Math.max(0, opponent.hp - (effect.amount || 1));
            addLog(state, `Point Blank: ${opponent.name} is adjacent to Yennenga — deals ${effect.amount} damage! (${opponent.hp} HP)`);
            checkHeroDeath(state);
          }
        } else {
          addLog(state, `Point Blank: ${opponent.name} is not adjacent to Yennenga — no damage dealt.`);
        }
      }
      break;
    }

    case 'pushOpponent': {
      // Pin the Prey: push opposing fighter up to N spaces
      if (opponent.hp > 0 && effect.amount && effect.amount > 0) {
        queue.push({
          type: 'pushFighter',
          playerIndex: selfPlayer.index,
          targetFighterId: opponent.id,
          range: effect.amount,
          label: `Pin the Prey: Move ${opponent.name} up to ${effect.amount} spaces.`,
        });
      }
      break;
    }

    case 'skirmishMove': {
      // Skirmish: if won, choose EITHER fighter in combat to move
      if (selfWon) {
        // Queue a choice: move self or opponent
        if (self.hp > 0) {
          queue.push({
            type: 'moveFighter',
            playerIndex: selfPlayer.index,
            fighterId: self.id,
            range: effect.amount || 2,
            label: `Skirmish: Move ${self.name} up to ${effect.amount || 2} spaces. (Skip to move ${opponent.name} instead, or skip both.)`,
          });
        }
        if (opponent.hp > 0) {
          queue.push({
            type: 'moveFighter',
            playerIndex: selfPlayer.index,
            fighterId: opponent.id,
            range: effect.amount || 2,
            label: `Skirmish: Move ${opponent.name} up to ${effect.amount || 2} spaces.`,
          });
        }
      }
      break;
    }

    // ---- Zelda/Sheik after-combat effects ----

    case 'zeldaVanishingStrike': {
      const form = state.zeldaCurrentForm[selfPlayer.index];
      if (form === 'sheik' && self.hp > 0) {
        queue.push({
          type: 'moveFighter',
          playerIndex: selfPlayer.index,
          fighterId: self.id,
          range: 2,
          label: `Vanishing Strike (Sheik): Move up to 2 spaces.`,
        });
      } else if (form === 'zelda') {
        drawCards(state, selfPlayer.index, 1);
        addLog(state, `Vanishing Strike (Zelda): Drew 1 card.`);
      }
      break;
    }

    case 'zeldaHylianGuard': {
      const form = state.zeldaCurrentForm[selfPlayer.index];
      if (form === 'zelda') {
        const hero = getHero(state, selfPlayer.index);
        if (hero && hero.hp > 0 && hero.hp < hero.maxHp) {
          hero.hp = Math.min(hero.maxHp, hero.hp + 1);
          addLog(state, `Hylian Guard (Zelda): Recovers 1 health! (${hero.hp}/${hero.maxHp} HP)`);
        }
      } else if (form === 'sheik') {
        if (opponentPlayer.hand.length > 0) {
          const randIdx = Math.floor(Math.random() * opponentPlayer.hand.length);
          const discarded = opponentPlayer.hand.splice(randIdx, 1)[0];
          opponentPlayer.discard.push(discarded);
          const charDef = getCharDef(opponentPlayer.characterId);
          const def = getCardDef(discarded, charDef);
          addLog(state, `Hylian Guard (Sheik): ${opponentPlayer.name} discards ${def?.name || 'a card'} at random!`);
        }
      }
      break;
    }

    case 'zeldaDinsFire': {
      // Deal 1 damage to ANOTHER opposing fighter in the DEFENDING fighter's zone
      const combat = state.combat;
      if (combat) {
        const defenderId = combat.defenderId;
        const defenderF = getFighter(state, defenderId);
        if (defenderF) {
          const opponentIdx = selfPlayer.index === 0 ? 1 : 0;
          const targets = getAliveFighters(state, opponentIdx).filter(f =>
            f.id !== defenderId && sameZone(state.board, f.spaceId, defenderF.spaceId)
          );
          if (targets.length === 1) {
            const t = targets[0];
            if (state.zeldaNayrusLoveActive[t.owner]) {
              addLog(state, `Din's Fire: Damage to ${t.name} prevented by Nayru's Love!`);
            } else {
              t.hp = Math.max(0, t.hp - 1);
              addLog(state, `Din's Fire: Deals 1 damage to ${t.name}! (${t.hp} HP)`);
              checkHeroDeath(state);
            }
          } else if (targets.length > 1) {
            // Need interactive target selection — use a queued effect
            queue.push({
              type: 'zoneDamageTarget',
              playerIndex: selfPlayer.index,
              damageAmount: 1,
              fighterId: defenderId,
              label: `Din's Fire: Choose another opposing fighter in the defender's zone to deal 1 damage.`,
            });
          } else {
            addLog(state, `Din's Fire: No other opposing fighters in the defender's zone.`);
          }
        }
      }
      break;
    }

    case 'zeldaNeedleStormAfter': {
      // After combat: move 1 space
      if (self.hp > 0) {
        queue.push({
          type: 'moveFighter',
          playerIndex: selfPlayer.index,
          fighterId: self.id,
          range: 1,
          label: `Needle Storm: Move up to 1 space.`,
        });
      }
      break;
    }

    case 'zeldaGoddessBlade': {
      // If won, return up to 1 card from discard to hand (interactive)
      if (selfWon && selfPlayer.discard.length > 0) {
        queue.push({
          type: 'zeldaGoddessBlade',
          playerIndex: selfPlayer.index,
          label: `Goddess Blade: Won combat! You may return 1 card from discard to hand.`,
        });
      }
      break;
    }

    // ---- Tesla after-combat effects ----

    case 'teslaCoilGainActions': {
      // 7 Hertz: queue coil choice for gaining actions
      const coils = state.teslaCoilsCharged[selfPlayer.index];
      if (coils >= 1) {
        queue.push({
          type: 'teslaCoilChoice',
          playerIndex: selfPlayer.index,
          label: `7 Hertz: Choose how many coils to discharge (${coils} available). 1 = +1 action, 2 = +2 actions.`,
          teslaEffectType: 'teslaCoilGainActions',
        });
      }
      break;
    }

    case 'teslaCoilZoneDamage': {
      // Lightning Storm: queue coil choice for zone damage
      const coils = state.teslaCoilsCharged[selfPlayer.index];
      if (coils >= 1) {
        queue.push({
          type: 'teslaCoilChoice',
          playerIndex: selfPlayer.index,
          label: `Lightning Storm: Choose how many coils to discharge (${coils} available). 1 = 1 zone damage, 2 = 2 zone damage.`,
          teslaEffectType: 'teslaCoilZoneDamage',
        });
      }
      break;
    }

    case 'teslaCoilRepulsion': {
      // Repulsion Blast: base push always happens, then coil choice for enhanced effects
      if (opponent.hp > 0) {
        queue.push({
          type: 'pushFighter',
          playerIndex: selfPlayer.index,
          targetFighterId: opponent.id,
          range: effect.amount || 2,
          label: `Repulsion Blast: Move ${opponent.name} up to ${effect.amount || 2} spaces.`,
        });
      }
      const coils = state.teslaCoilsCharged[selfPlayer.index];
      if (coils >= 1) {
        queue.push({
          type: 'teslaCoilChoice',
          playerIndex: selfPlayer.index,
          label: `Repulsion Blast: Choose how many coils to discharge (${coils} available). 1 = move Tesla 2 spaces, 2 = also opponent discards random.`,
          teslaEffectType: 'teslaCoilRepulsion',
        });
      }
      break;
    }

    case 'teslaChargeCoils': {
      // Kinetic Induction: charge 1 coil, or both if won (no discharge choice needed)
      if (selfWon) {
        teslaChargeCoils(state, selfPlayer.index, 2);
        addLog(state, `Kinetic Induction: Won combat — both coils charged!`);
      } else {
        teslaChargeCoils(state, selfPlayer.index, 1);
        addLog(state, `Kinetic Induction: Charged 1 coil.`);
      }
      break;
    }

    case 'teslaAlternatingCurrent': {
      // The Alternating Current: queue binary choice (charge or heal)
      queue.push({
        type: 'teslaAlternatingChoice',
        playerIndex: selfPlayer.index,
        label: `The Alternating Current: Choose — Charge both coils, or discharge both to heal 2.`,
        teslaEffectType: 'teslaAlternatingCurrent',
      });
      break;
    }

    case 'teslaCoilDraw': {
      // Intense Experimentation: queue coil choice for draw
      const coils = state.teslaCoilsCharged[selfPlayer.index];
      if (coils >= 1) {
        queue.push({
          type: 'teslaCoilChoice',
          playerIndex: selfPlayer.index,
          label: `Intense Experimentation: Choose how many coils to discharge (${coils} available). 0 = draw 1, 1 = draw 2, 2 = draw 3 + heal 1.`,
          teslaEffectType: 'teslaCoilDraw',
        });
      } else {
        // No coils, just draw 1
        drawCards(state, selfPlayer.index, 1);
        addLog(state, `Intense Experimentation: Drew 1 card.`);
      }
      break;
    }

    // ---- Genie after-combat effects ----

    case 'dealDamageIfLostAdjacent': {
      if (!selfWon && opponent.hp > 0) {
        if (areAdjacent(state.board, self.spaceId, opponent.spaceId)) {
          if (state.zeldaNayrusLoveActive[opponent.owner]) {
            addLog(state, `Careful What You Wish For: Damage prevented by Nayru's Love!`);
          } else {
            opponent.hp = Math.max(0, opponent.hp - (effect.amount || 1));
            addLog(state, `Careful What You Wish For: Deals ${effect.amount || 1} damage to ${opponent.name}! (${opponent.hp} HP)`);
            checkHeroDeath(state);
          }
        } else {
          addLog(state, `Careful What You Wish For: ${opponent.name} is not adjacent — no damage.`);
        }
      }
      break;
    }

    case 'genieWishCommand': {
      // Your Wish Is My Command: if won, may discard 2 cards for 1 extra action
      if (selfWon && selfPlayer.hand.length >= 2) {
        queue.push({
          type: 'genieWishCommand',
          playerIndex: selfPlayer.index,
          label: `Your Wish Is My Command: You won! Discard 2 cards to take 1 extra action?`,
        });
      }
      break;
    }

    case 'genieFreed': {
      // I Am Freed: place Genie on any empty space, then deal 1 damage to each adjacent fighter
      if (self.hp > 0) {
        queue.push({
          type: 'placeFighter',
          playerIndex: selfPlayer.index,
          fighterId: self.id,
          label: `I Am Freed: Place ${self.name} on any empty space.`,
        });
        queue.push({
          type: 'genieFreedDamage',
          playerIndex: selfPlayer.index,
          fighterId: self.id,
          label: `I Am Freed: Deal 1 damage to every fighter adjacent to ${self.name}.`,
        });
      }
      break;
    }

    case 'genieImprisonedWrath': {
      // Imprisoned Wrath: may discard 2 cards to deal 2 damage to adjacent enemy
      if (selfPlayer.hand.length >= 2) {
        queue.push({
          type: 'genieImprisonedWrath',
          playerIndex: selfPlayer.index,
          fighterId: self.id,
          label: `Imprisoned Wrath: Discard 2 cards to deal 2 damage to an adjacent enemy?`,
        });
      }
      break;
    }

    case 'drawPerDamageTaken': {
      // Prisoner's Torment: draw cards equal to combat damage taken
      const dmgTaken = state.combat?.damageDealt || 0;
      if (dmgTaken > 0) {
        drawCards(state, selfPlayer.index, dmgTaken);
        addLog(state, `Prisoner's Torment: Drew ${dmgTaken} card(s) for taking ${dmgTaken} combat damage!`);
      }
      break;
    }

    case 'genieWishingMore': {
      // Wishing for More Wishes: opponent draws 1, you draw 3
      drawCards(state, opponentPlayer.index, 1);
      addLog(state, `Wishing for More Wishes: ${opponentPlayer.name} draws 1 card.`);
      drawCards(state, selfPlayer.index, 3);
      addLog(state, `Wishing for More Wishes: ${selfPlayer.name} draws 3 cards!`);
      break;
    }

    case 'genieDealDamageAdjacent': {
      // I Grant You... Death: deal 1 damage to adjacent fighter (combat opponent if adjacent)
      if (opponent.hp > 0 && areAdjacent(state.board, self.spaceId, opponent.spaceId)) {
        if (state.zeldaNayrusLoveActive[opponent.owner]) {
          addLog(state, `I Grant You\u2026 Death: Damage prevented by Nayru's Love!`);
        } else {
          opponent.hp = Math.max(0, opponent.hp - (effect.amount || 1));
          addLog(state, `I Grant You\u2026 Death: Deals ${effect.amount || 1} damage to ${opponent.name}! (${opponent.hp} HP)`);
          checkHeroDeath(state);
        }
      } else if (opponent.hp > 0) {
        addLog(state, `I Grant You\u2026 Death: ${opponent.name} is not adjacent — no damage.`);
      }
      break;
    }

    case 'genieSultansView': {
      // I've Made Sultans Out of Less: view opponent's hand, choose card to discard
      if (opponentPlayer.hand.length > 0) {
        queue.push({
          type: 'genieSultansDiscard',
          playerIndex: selfPlayer.index,
          label: `I've Made Sultans Out of Less: Look at ${opponentPlayer.name}'s hand and choose a card to discard.`,
        });
      } else {
        addLog(state, `I've Made Sultans Out of Less: ${opponentPlayer.name} has no cards to discard.`);
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
    return checkRainOfArrowsFollowUp(state);
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
          if (state.zeldaNayrusLoveActive[enemy.owner]) {
            addLog(state, `Avatar State: Damage to ${enemy.name} prevented by Nayru's Love!`);
          } else {
            enemy.hp = Math.max(0, enemy.hp - dmg);
            addLog(state, `Avatar State deals ${dmg} damage to ${enemy.name}! (${enemy.hp} HP)`);
          }
        }
        if (enemies.length === 0) {
          addLog(state, `Avatar State: No enemy fighters in Aang's zone.`);
        }
        checkHeroDeath(state);
      }
      // Continue to next queued effect (no phase change / user input needed)
      return processNextEffect(state);
    }

    case 'zoneDamageTarget': {
      // Boomerang Bounce: player chooses a target in the zone
      const refFighter = effect.fighterId ? getFighter(state, effect.fighterId) : null;
      if (refFighter) {
        state.zoneDamageTargetZone = refFighter.spaceId;
        state.zoneDamageAmount = effect.damageAmount || 1;
        state.zoneDamagePlayerIndex = effect.playerIndex;
        state.phase = 'effect_zoneDamageTarget';
        addLog(state, effect.label);
      } else {
        return processNextEffect(state);
      }
      break;
    }

    case 'teslaCoilChoice': {
      state.teslaPendingCoilEffect = effect.teslaEffectType || null;
      state.teslaCoilChoiceContext = 'afterCombat';
      state.teslaCoilChoicePlayerIndex = effect.playerIndex;
      state.phase = 'tesla_coilChoice';
      addLog(state, effect.label);
      break;
    }

    case 'teslaAlternatingChoice': {
      state.phase = 'tesla_alternating_choice';
      addLog(state, effect.label);
      break;
    }

    case 'zeldaGoddessBlade': {
      state.phase = 'zelda_goddessBlade';
      addLog(state, effect.label);
      break;
    }

    case 'zeldaDinsFireTarget': {
      state.phase = 'zelda_dinsFireTarget';
      addLog(state, effect.label);
      break;
    }

    case 'genieFreedDamage': {
      // I Am Freed: deal 1 damage to every fighter adjacent to the Genie (auto-resolve)
      const genie = effect.fighterId ? getFighter(state, effect.fighterId) : null;
      if (genie && genie.hp > 0) {
        const allNearby = state.fighters.filter(f =>
          f.id !== genie.id && f.hp > 0 && f.spaceId !== '' &&
          areAdjacent(state.board, genie.spaceId, f.spaceId)
        );
        if (allNearby.length > 0) {
          for (const target of allNearby) {
            if (state.zeldaNayrusLoveActive[target.owner]) {
              addLog(state, `I Am Freed: Damage to ${target.name} prevented by Nayru's Love!`);
            } else {
              target.hp = Math.max(0, target.hp - 1);
              addLog(state, `I Am Freed: ${target.name} takes 1 damage! (${target.hp} HP)`);
            }
          }
          checkHeroDeath(state);
        } else {
          addLog(state, `I Am Freed: No fighters adjacent to ${genie.name}.`);
        }
      }
      if (state.phase !== 'gameOver') {
        return processNextEffect(state);
      }
      return state;
    }

    case 'genieWishCommand': {
      // Your Wish Is My Command: interactive — player chooses to pay 2 cards or skip
      state.phase = 'genie_wish_command';
      addLog(state, effect.label);
      break;
    }

    case 'genieImprisonedWrath': {
      // Imprisoned Wrath: interactive — player chooses to pay 2 cards for damage
      state.phase = 'genie_imprisoned_wrath';
      addLog(state, effect.label);
      break;
    }

    case 'genieSultansDiscard': {
      // I've Made Sultans Out of Less: reveal opponent's hand, player chooses card
      const opponentIdx = effect.playerIndex === 0 ? 1 : 0;
      const opponentPlayer = state.players[opponentIdx];
      state.genieSultansRevealedCards = [...opponentPlayer.hand];
      state.genieSultansTargetPlayer = opponentIdx;
      state.phase = 'genie_sultans_discard';
      addLog(state, effect.label);
      break;
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

  const reachable = s.stallionChargeActive
    ? getReachableSpacesThroughEnemies(s.board, fighter.spaceId, s.schemeMoveRange, s.fighters, fighter.id)
    : getReachableSpaces(s.board, fighter.spaceId, s.schemeMoveRange, s.fighters, fighter.id);
  if (reachable.includes(targetSpaceId)) {
    fighter.spaceId = targetSpaceId;
    addLog(s, `${fighter.name} moved to ${targetSpaceId}.`);
  } else {
    // Don't skip on invalid click — return unchanged state
    return s;
  }

  s.schemeMoveFighterId = null;
  s.schemeMoveRange = 0;
  s.stallionChargeActive = false;
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
  const effect = s.effectQueue[0];
  const fighterId = s.pushTargetId;
  if (!fighterId) return continueEffectQueue(s);
  const fighter = getFighter(s, fighterId);
  if (!fighter) return continueEffectQueue(s);

  const reachable = getPushSpaces(s, fighterId, s.pushRange);
  if (reachable.includes(targetSpaceId)) {
    fighter.spaceId = targetSpaceId;
    addLog(s, `${fighter.name} pushed to ${targetSpaceId}!`);
    if (effect?.drawCardsIfPushed) {
      drawCards(s, effect.playerIndex, effect.drawCardsIfPushed);
      addLog(s, `Drew ${effect.drawCardsIfPushed} card(s) from push!`);
    }
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

// ---- Zone Damage Target Selection (Boomerang Bounce) ----

export function getZoneDamageTargets(state: GameState): Fighter[] {
  const opponentIdx = state.zoneDamagePlayerIndex === 0 ? 1 : 0;
  return getAliveFighters(state, opponentIdx).filter(f =>
    sameZone(state.board, f.spaceId, state.zoneDamageTargetZone)
  );
}

export function resolveZoneDamageTarget(state: GameState, targetFighterId: string): GameState {
  const s = clone(state);
  const targets = getZoneDamageTargets(s);
  const target = targets.find(f => f.id === targetFighterId);
  if (!target) return s; // invalid target, wait for valid input
  const dmg = s.zoneDamageAmount;
  s.zoneDamageTargetZone = '';
  s.zoneDamageAmount = 0;
  addLog(s, `Boomerang Bounce: Targets ${target.name}!`);
  if (s.zeldaNayrusLoveActive[target.owner]) {
    addLog(s, `Boomerang Bounce: Damage prevented by Nayru's Love!`);
    return continueEffectQueue(s);
  }
  if (tryYennengaDamageSplit(s, target, dmg, 'effectQueue')) {
    return s;
  }
  target.hp = Math.max(0, target.hp - dmg);
  addLog(s, `${target.name} takes ${dmg} damage! (${target.hp} HP)`);
  checkHeroDeath(s);
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

/** Prophecy: player clicks a card to select/deselect it. When 2 are selected, finalize. */
export function resolveProphecyChoice(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const player = currentPlayer(s);
  const charDef = getCharDef(player.characterId);

  // Toggle selection
  if (s.prophecySelected.includes(cardId)) {
    s.prophecySelected = s.prophecySelected.filter(id => id !== cardId);
    return s;
  }
  s.prophecySelected = [...s.prophecySelected, cardId];

  // Not done yet — need 2 selected
  if (s.prophecySelected.length < 2) return s;

  // Finalize: move selected cards to hand, leave the rest on top of deck
  const kept: Card[] = [];
  const returned: Card[] = [];
  for (const card of s.searchCards) {
    if (s.prophecySelected.includes(card.id)) {
      kept.push(card);
    } else {
      returned.push(card);
    }
  }

  // Remove the revealed cards from the deck
  for (const card of s.searchCards) {
    const idx = player.deck.findIndex(c => c.id === card.id);
    if (idx >= 0) player.deck.splice(idx, 1);
  }

  // Add chosen cards to hand
  for (const card of kept) {
    player.hand.push(card);
    const def = getCardDef(card, charDef);
    addLog(s, `Prophecy: Added ${def?.name || 'a card'} to hand.`);
  }

  // Put the rest back on top of the deck
  for (const card of returned) {
    player.deck.push(card);
    const def = getCardDef(card, charDef);
    addLog(s, `Prophecy: Put ${def?.name || 'a card'} back on top of the deck.`);
  }

  s.searchCards = [];
  s.prophecySelected = [];
  s.pendingSchemeCard = null;
  s.phase = 'playing';
  useAction(s);
  return s;
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
      // Look at top 4, add 2 to hand, put the other 2 back on top
      const revealCount = Math.min(4, player.deck.length);
      if (revealCount === 0) {
        addLog(s, `Prophecy: Deck is empty, nothing to look at.`);
        break;
      }
      if (revealCount <= 2) {
        drawCards(s, s.currentPlayer, revealCount);
        addLog(s, `Prophecy: Deck has ${revealCount} card(s) — added all to hand.`);
        break;
      }
      s.searchCards = player.deck.slice(player.deck.length - revealCount);
      s.prophecySelected = [];
      s.pendingSchemeCard = card;
      s.phase = 'arthur_prophecy';
      addLog(s, `Prophecy: Revealing top ${revealCount} cards. Choose 2 to add to your hand.`);
      return s;
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

    // ---- Yennenga schemes ----
    case 'yennenga_master_of_the_hunt': {
      // Gain 2 actions (net +1 since playing scheme costs 1 action)
      player.actionsRemaining += 2;
      addLog(s, `Master of the Hunt: Gained 2 actions!`);
      break;
    }

    case 'yennenga_one_with_the_land': {
      // Move each fighter up to 2 spaces, each recovers 1 HP, draw 1 card
      const ownFighters = getAliveFighters(s, s.currentPlayer);
      // Heal all fighters 1 HP
      for (const f of ownFighters) {
        if (f.hp < f.maxHp) {
          f.hp = Math.min(f.maxHp, f.hp + 1);
        }
      }
      addLog(s, `One With the Land: All fighters recover 1 health.`);
      // Draw 1 card
      drawCards(s, s.currentPlayer, 1);
      addLog(s, `One With the Land: Drew 1 card.`);
      // Move each fighter up to 2 spaces
      if (ownFighters.length > 0) {
        s.pendingSchemeCard = card;
        s.maneuverBoost = 0;
        s.maneuverFightersToMove = ownFighters.map(f => f.id);
        s.maneuverCurrentFighter = null;
        s.schemeMoveRange = 2;
        s.phase = 'scheme_moveAll';
        addLog(s, `One With the Land: Move each of your fighters up to 2 spaces.`);
        return s;
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

    // --- Tesla schemes ---
    case 'tesla_fully_charged': {
      // Charge both coils, gain 1 action
      teslaChargeCoils(s, s.currentPlayer, 2);
      addLog(s, `Fully Charged: Both coils charged!`);
      player.actionsRemaining++;
      addLog(s, `Gained 1 action.`);
      break;
    }

    case 'tesla_remote_control': {
      // Move all opposing fighters up to 2 spaces, gain 1 action
      const opponentIndex = s.currentPlayer === 0 ? 1 : 0;
      const opponentFighters = getAliveFighters(s, opponentIndex);
      if (opponentFighters.length > 0) {
        s.pendingSchemeCard = card;
        s.maneuverBoost = 0;
        s.maneuverFightersToMove = opponentFighters.map(f => f.id);
        s.maneuverCurrentFighter = null;
        s.schemeMoveRange = 2;
        s.phase = 'tesla_remote_control';
        addLog(s, `Remote Control: Move each opposing fighter up to 2 spaces. Gain 1 action.`);
        return s;
      }
      player.actionsRemaining++;
      addLog(s, `Remote Control: No opposing fighters to move. Gained 1 action.`);
      break;
    }

    // ---- Zelda/Sheik schemes ----
    case 'zelda_impas_training': {
      // Move up to 3 spaces, then choose adjacent opponent for hand reveal
      const hero = getHero(s, s.currentPlayer);
      if (hero && hero.hp > 0) {
        s.pendingSchemeCard = card;
        s.phase = 'zelda_impasTraining_move';
        addLog(s, `Impa's Training: Move up to 3 spaces.`);
        return s;
      }
      break;
    }

    case 'zelda_song_of_time': {
      // Return up to 1 card from discard to hand
      if (player.discard.length > 0) {
        s.pendingSchemeCard = card;
        s.phase = 'zelda_songOfTime';
        addLog(s, `Song of Time: Choose a card from your discard pile to return to hand, or skip.`);
        return s;
      }
      addLog(s, `Song of Time: No cards in discard pile.`);
      break;
    }

    // ---- Genie schemes ----
    case 'genie_three_wishes': {
      // Gain 1 action, then choose one of 3 options
      player.actionsRemaining++;
      addLog(s, `Three Wishes: Gained 1 action! Now choose your wish.`);
      s.pendingSchemeCard = card;
      s.phase = 'genie_threeWishes';
      return s;
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
  if (!reachable.includes(targetSpaceId)) {
    return s; // Invalid space — don't skip, wait for valid input
  }
  fighter.spaceId = targetSpaceId;
  addLog(s, `${fighter.name} moved to ${targetSpaceId}.`);

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
    // Preserve the correct phase for Tesla's Remote Control
    const schemeCard = state.pendingSchemeCard;
    if (schemeCard) {
      const charDef = getCharDef(currentPlayer(state).characterId);
      const def = getCardDef(schemeCard, charDef);
      if (def?.id === 'tesla_remote_control') {
        state.phase = 'tesla_remote_control';
        addLog(state, `Select next opposing fighter to move, or skip all.`);
        return state;
      }
    }
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
    if (def?.id === 'tesla_remote_control') {
      // Remote Control: gain 1 action after moving opponents
      player.actionsRemaining++;
      addLog(state, `Remote Control: Gained 1 action.`);
      player.discard.push(schemeCard);
      state.pendingSchemeCard = null;
      state.schemeMoveRange = 0;
      if (state.phase !== 'gameOver') {
        useAction(state);
      }
      return state;
    }
    // Not Winged Frenzy or Remote Control (Command the Storms or similar)
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
  if (!reachable.includes(targetSpaceId)) {
    return s; // Invalid space — wait for valid input
  }
  fighter.spaceId = targetSpaceId;
  addLog(s, `${fighter.name} moved to ${targetSpaceId}.`);

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
  if (state.stallionChargeActive) {
    return getReachableSpacesThroughEnemies(state.board, fighter.spaceId, state.schemeMoveRange, state.fighters, fighter.id);
  }
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
    // Check if player can place more clones (multi-clone Clone Vats)
    const nextClone = getAvailableClone(s, playerIdx);
    const player = s.players[playerIdx];
    const adjacentSpaces = getMewtwoAdjacentSpaces(s, playerIdx);
    if (nextClone && player.hand.length > 0 && adjacentSpaces.length > 0) {
      s.phase = 'mewtwo_cloneVats';
      addLog(s, `Clone Vats: You may discard another card to place another Clone, or skip.`);
    } else {
      s.phase = 'playing';
    }
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

// ---- Genie Post-Combat Interactive Resolutions ----

export function useGenieWishCommand(state: GameState): GameState {
  const s = clone(state);
  const player = s.players[s.currentPlayer];
  if (player.hand.length < 2) return continueEffectQueue(s);
  // Discard first 2 cards from hand
  const card1 = player.hand.shift()!;
  const card2 = player.hand.shift()!;
  player.discard.push(card1, card2);
  player.actionsRemaining++;
  const charDef = getCharDef(player.characterId);
  const def1 = getCardDef(card1, charDef);
  const def2 = getCardDef(card2, charDef);
  addLog(s, `Your Wish Is My Command: Discarded ${def1?.name || 'a card'} and ${def2?.name || 'a card'} to gain 1 extra action!`);
  return continueEffectQueue(s);
}

export function skipGenieWishCommand(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Skipped Your Wish Is My Command.`);
  return continueEffectQueue(s);
}

export function useGenieImprisonedWrath(state: GameState, targetFighterId: string): GameState {
  const s = clone(state);
  const player = s.players[s.currentPlayer];
  if (player.hand.length < 2) return continueEffectQueue(s);
  const opponentIdx = s.currentPlayer === 0 ? 1 : 0;
  const target = s.fighters.find(f => f.id === targetFighterId && f.owner === opponentIdx && f.hp > 0);
  // Check that target is adjacent to Genie hero
  const hero = getHero(s, s.currentPlayer);
  if (!target || !hero || !areAdjacent(s.board, hero.spaceId, target.spaceId)) {
    addLog(s, `Imprisoned Wrath: ${target?.name || 'target'} is not adjacent — no damage.`);
    return continueEffectQueue(s);
  }
  const card1 = player.hand.shift()!;
  const card2 = player.hand.shift()!;
  player.discard.push(card1, card2);
  const charDef = getCharDef(player.characterId);
  const def1 = getCardDef(card1, charDef);
  const def2 = getCardDef(card2, charDef);
  addLog(s, `Imprisoned Wrath: Discarded ${def1?.name || 'a card'} and ${def2?.name || 'a card'}!`);
  if (s.zeldaNayrusLoveActive[target.owner]) {
    addLog(s, `Imprisoned Wrath: Damage to ${target.name} prevented by Nayru's Love!`);
  } else {
    target.hp = Math.max(0, target.hp - 2);
    addLog(s, `Imprisoned Wrath: Deals 2 damage to ${target.name}! (${target.hp} HP)`);
    checkHeroDeath(s);
  }
  if (s.phase !== 'gameOver') {
    return continueEffectQueue(s);
  }
  return s;
}

export function skipGenieImprisonedWrath(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `Skipped Imprisoned Wrath.`);
  return continueEffectQueue(s);
}

export function resolveGenieSultansDiscard(state: GameState, cardId: string): GameState {
  const s = clone(state);
  const targetPlayerIdx = s.genieSultansTargetPlayer;
  if (targetPlayerIdx === null) return continueEffectQueue(s);
  const targetPlayer = s.players[targetPlayerIdx];
  const cardIdx = targetPlayer.hand.findIndex(c => c.id === cardId);
  if (cardIdx < 0) return s; // wait for valid selection
  const card = targetPlayer.hand.splice(cardIdx, 1)[0];
  targetPlayer.discard.push(card);
  const charDef = getCharDef(targetPlayer.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `I've Made Sultans Out of Less: ${targetPlayer.name} discards ${def?.name || 'a card'}!`);
  s.genieSultansRevealedCards = [];
  s.genieSultansTargetPlayer = null;
  return continueEffectQueue(s);
}

export function resolveGenieThreeWishes(state: GameState, choice: string): GameState {
  const s = clone(state);
  const player = s.players[s.currentPlayer];

  if (choice === 'draw5') {
    drawCards(s, s.currentPlayer, 5);
    addLog(s, `Three Wishes: Drew 5 cards!`);
  } else if (choice === 'valueLock') {
    s.genieThreeWishesValueLock = [...s.genieThreeWishesValueLock] as [boolean, boolean];
    s.genieThreeWishesValueLock[s.currentPlayer] = true;
    addLog(s, `Three Wishes: Your cards have value 4 for the rest of this turn!`);
  } else if (choice === 'opponentDiscard') {
    const opponentIdx = s.currentPlayer === 0 ? 1 : 0;
    const opPlayer = s.players[opponentIdx];
    // Discard 2 cards from opponent (random)
    for (let i = 0; i < 2 && opPlayer.hand.length > 0; i++) {
      const randIdx = Math.floor(Math.random() * opPlayer.hand.length);
      const discarded = opPlayer.hand.splice(randIdx, 1)[0];
      opPlayer.discard.push(discarded);
      const charDef = getCharDef(opPlayer.characterId);
      const def = getCardDef(discarded, charDef);
      addLog(s, `Three Wishes: ${opPlayer.name} discards ${def?.name || 'a card'}.`);
    }
  }

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

// ---- Get adjacent spaces to a specific fighter (for Psychic Storm clone placement) ----

export function getAdjacentSpacesOf(state: GameState, fighterId: string): string[] {
  const fighter = getFighter(state, fighterId);
  if (!fighter) return [];
  const space = getSpace(state.board, fighter.spaceId);
  if (!space) return [];
  return space.adjacentIds.filter(adjId => !isSpaceOccupied(state, adjId));
}
