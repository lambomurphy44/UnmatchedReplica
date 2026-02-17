import type {
  GameState, Player, Fighter, Card, CardDef, CharacterDef, BoardMap,
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
        spaceId: '', // unplaced - will be placed during setup
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

  // Determine if we need sidekick placement
  const unplacedP0 = fighters0.filter(f => f.spaceId === '');
  const unplacedP1 = fighters1.filter(f => f.spaceId === '');
  const needsPlacement = unplacedP0.length > 0 || unplacedP1.length > 0;

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
  return sa && sb ? sa.zone === sb.zone : false;
}

export function isSpaceOccupied(state: GameState, spaceId: string, excludeFighterId?: string): boolean {
  return state.fighters.some(f => f.spaceId === spaceId && f.hp > 0 && f.id !== excludeFighterId);
}

// BFS for reachable spaces - occupied spaces cannot be stopped on but CAN be traversed through
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
        if (!visited.has(adjId)) {
          visited.add(adjId);
          next.push(adjId);
        }
      }
    }
    frontier = next;
  }
  visited.delete(fromId);
  // Filter out occupied spaces from the result (can't stop on them)
  return Array.from(visited).filter(sid => !occupied.has(sid));
}

export function canAttack(board: BoardMap, attacker: Fighter, defender: Fighter): boolean {
  if (attacker.hp <= 0 || defender.hp <= 0) return false;
  if (attacker.isRanged) {
    return sameZone(board, attacker.spaceId, defender.spaceId) || areAdjacent(board, attacker.spaceId, defender.spaceId);
  }
  return areAdjacent(board, attacker.spaceId, defender.spaceId);
}

export function getValidTargets(state: GameState, attackerId: string): Fighter[] {
  const attacker = getFighter(state, attackerId);
  if (!attacker) return [];
  const opponentIndex = attacker.owner === 0 ? 1 : 0;
  return getAliveFighters(state, opponentIndex).filter(d => canAttack(state.board, attacker, d));
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

// ---- Sidekick Placement (Step 5) ----

export function getValidPlacementSpaces(state: GameState, playerIndex: number): string[] {
  const heroSpaceId = playerIndex === 0
    ? state.board.startPositions.player0[0]
    : state.board.startPositions.player1[0];
  const heroSpace = getSpace(state.board, heroSpaceId);
  if (!heroSpace) return [];
  const zone = heroSpace.zone;
  return state.board.spaces
    .filter(s => s.zone === zone && !isSpaceOccupied(state, s.id))
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
    // Check if other player needs to place
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
      checkStartOfTurnAbility(s);
    }
  } else {
    const nextF = getFighter(s, s.placementFighterIds[0]);
    addLog(s, `Place ${nextF?.name} on a space in your starting zone.`);
  }

  return s;
}

// ---- Actions ----

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

function addLog(state: GameState, msg: string) {
  state.log.push(msg);
  if (state.log.length > 80) state.log.shift();
}

// Step 9: Empty deck penalty - NO reshuffle, NO hand limit check
function drawCards(state: GameState, playerIndex: number, count: number) {
  const p = state.players[playerIndex];
  for (let i = 0; i < count; i++) {
    if (p.deck.length === 0) {
      // Empty deck penalty: 2 damage to each alive fighter
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

// Step 9a: Medusa start-of-turn ability check
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

// Step 8: Hand size limit at end of turn
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

// ---- Discard Excess (Step 3) ----

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

// ---- Medusa Gaze (Step 9a) ----

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

// ---- Maneuver (Step 6: moves ALL fighters) ----

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

// ---- Attack ----

export function startAttack(state: GameState, attackerFighterId: string): GameState {
  const s = clone(state);
  s.selectedFighter = attackerFighterId;
  s.phase = 'attack_selectTarget';
  return s;
}

export function selectAttackTarget(state: GameState, defenderId: string): GameState {
  const s = clone(state);
  s.combat = {
    attackerId: s.selectedFighter!,
    defenderId,
    attackCard: null,
    defenseCard: null,
    attackBoostCard: null,
  };
  s.phase = 'attack_selectCard';
  const attacker = getFighter(s, s.selectedFighter!)!;
  const defender = getFighter(s, defenderId)!;
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

  // Step 9b: Arthur attack boost
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
      addLog(s, `King Arthur plays ${def?.name} as a boost (+${def?.boost || 0}).`);
    }
  } else {
    addLog(s, `King Arthur skips the boost.`);
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

  let atkValue = atkCardDef?.value || 0;
  const defValue = defCardDef?.value || 0;

  // Step 9b: Arthur's attack boost
  if (s.combat.attackBoostCard) {
    const boostDef = getCardDef(s.combat.attackBoostCard, atkCharDef);
    const boostVal = boostDef?.boost || 0;
    atkValue += boostVal;
  }

  // Check for Feint (cancel effects)
  const atkCancelled = defCardDef?.effect?.type === 'cancelEffects';
  const defCancelled = atkCardDef?.effect?.type === 'cancelEffects';

  const damage = Math.max(0, atkValue - defValue);

  addLog(s, `Attack: ${atkValue} vs Defense: ${defValue}`);

  if (damage > 0) {
    defender.hp = Math.max(0, defender.hp - damage);
    addLog(s, `${defender.name} takes ${damage} damage! (${defender.hp} HP remaining)`);
  } else {
    addLog(s, `Attack blocked!`);
  }

  // After-combat effects
  if (atkCardDef?.effect && !atkCancelled) {
    applyEffect(s, atkCardDef.effect, attacker, defender, atkPlayer);
  }
  if (defCardDef?.effect && !defCancelled) {
    applyEffect(s, defCardDef.effect, defender, attacker, defPlayer);
  }

  // Discard all combat cards
  if (s.combat.attackCard) atkPlayer.discard.push(s.combat.attackCard);
  if (s.combat.attackBoostCard) atkPlayer.discard.push(s.combat.attackBoostCard);
  if (s.combat.defenseCard) defPlayer.discard.push(s.combat.defenseCard);

  s.combat = null;
  checkHeroDeath(s);

  if (s.phase !== 'gameOver') {
    useAction(s);
  }

  return s;
}

function applyEffect(state: GameState, effect: { type: string; amount?: number }, self: Fighter, opponent: Fighter, player: Player) {
  switch (effect.type) {
    case 'afterCombatDamage':
      if (effect.amount) {
        opponent.hp = Math.max(0, opponent.hp - effect.amount);
        addLog(state, `${self.name} deals ${effect.amount} extra damage to ${opponent.name}!`);
        checkHeroDeath(state);
      }
      break;
    case 'draw':
      if (effect.amount) {
        drawCards(state, player.index, effect.amount);
        addLog(state, `${player.name} draws ${effect.amount} card(s).`);
      }
      break;
    case 'heal':
      if (effect.amount) {
        self.hp = Math.min(self.maxHp, self.hp + effect.amount);
        addLog(state, `${self.name} recovers ${effect.amount} HP.`);
      }
      break;
    case 'cancelEffects':
      break;
  }
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

  if (def.effect) {
    const hero = getHero(s, s.currentPlayer)!;
    switch (def.effect.type) {
      case 'draw':
        drawCards(s, s.currentPlayer, def.effect.amount || 0);
        addLog(s, `Drew ${def.effect.amount} card(s).`);
        break;
      case 'heal':
        hero.hp = Math.min(hero.maxHp, hero.hp + (def.effect.amount || 0));
        addLog(s, `${hero.name} recovers ${def.effect.amount} HP.`);
        break;
      case 'dealDamage': {
        // Step 7: Deferred - enter target selection phase
        s.pendingSchemeCard = card;
        s.phase = 'scheme_selectTarget';
        addLog(s, `Select an enemy fighter in your hero's zone to deal ${def.effect.amount} damage.`);
        return s; // Don't discard or useAction yet
      }
      case 'moveSidekick': {
        // Step 8: Deferred - enter sidekick movement phase
        const sidekicks = s.fighters.filter(f => f.owner === s.currentPlayer && !f.isHero && f.hp > 0);
        if (sidekicks.length === 0) {
          addLog(s, 'No alive sidekick to move.');
          break;
        }
        s.pendingSchemeCard = card;
        s.schemeMoveFighterId = sidekicks[0].id;
        s.schemeMoveRange = def.effect.amount || 0;
        s.phase = 'scheme_moveSidekick';
        addLog(s, `Move ${sidekicks[0].name} up to ${def.effect.amount} spaces.`);
        return s; // Don't discard or useAction yet
      }
      case 'reviveSidekick': {
        const deadSidekicks = s.fighters.filter(f => f.owner === s.currentPlayer && !f.isHero && f.hp <= 0);
        if (deadSidekicks.length > 0) {
          const revived = deadSidekicks[0];
          revived.hp = revived.maxHp;
          // Find an unoccupied adjacent space to hero, or unoccupied space in hero's zone
          const heroSpace = hero.spaceId;
          const space = getSpace(s.board, heroSpace);
          let placedSpace = '';
          if (space) {
            // Try adjacent spaces first
            for (const adjId of space.adjacentIds) {
              if (!isSpaceOccupied(s, adjId)) {
                placedSpace = adjId;
                break;
              }
            }
            // Fallback: any unoccupied space in the same zone
            if (!placedSpace) {
              const zoneSpaces = s.board.spaces.filter(sp => sp.zone === space.zone && !isSpaceOccupied(s, sp.id));
              if (zoneSpaces.length > 0) {
                placedSpace = zoneSpaces[0].id;
              }
            }
          }
          if (placedSpace) {
            revived.spaceId = placedSpace;
            addLog(s, `${revived.name} returns to the battlefield on ${placedSpace}!`);
          } else {
            addLog(s, `No available space to place ${revived.name}.`);
            revived.hp = 0; // Can't place, stays dead
          }
        } else {
          addLog(s, `No defeated sidekicks to revive.`);
        }
        break;
      }
    }
  }

  player.discard.push(card);

  if (s.phase !== 'gameOver') {
    useAction(s);
  }

  return s;
}

// ---- Scheme Target Selection (Step 7: Petrify) ----

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
  if (target && def?.effect?.amount) {
    target.hp = Math.max(0, target.hp - def.effect.amount);
    addLog(s, `${def.name} deals ${def.effect.amount} damage to ${target.name}! (${target.hp} HP)`);
    checkHeroDeath(s);
  }

  player.discard.push(s.pendingSchemeCard);
  s.pendingSchemeCard = null;

  if (s.phase !== 'gameOver') {
    useAction(s);
  }
  return s;
}

// ---- Scheme Sidekick Movement (Step 8: Royal Command) ----

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
