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

function buildFighters(charDef: CharacterDef, playerIndex: number, startPositions: string[]): Fighter[] {
  const fighters: Fighter[] = [];
  // Hero
  fighters.push({
    id: uid('fighter'),
    name: charDef.name,
    characterId: charDef.id,
    isHero: true,
    hp: charDef.hp,
    maxHp: charDef.hp,
    isRanged: charDef.isRanged,
    moveValue: charDef.moveValue,
    spaceId: startPositions[0],
    owner: playerIndex,
  });
  // Sidekicks
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
        spaceId: startPositions[Math.min(i + 1, startPositions.length - 1)],
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

  const fighters0 = buildFighters(char0, 0, board.startPositions.player0);
  const fighters1 = buildFighters(char1, 1, board.startPositions.player1);
  const allFighters = [...fighters0, ...fighters1];

  const deck0 = buildDeck(char0);
  const deck1 = buildDeck(char1);

  const hand0 = deck0.splice(0, 5);
  const hand1 = deck1.splice(0, 5);

  const players: [Player, Player] = [
    {
      index: 0,
      name: p0Name,
      characterId: char0Id,
      hand: hand0,
      deck: deck0,
      discard: [],
      fighters: fighters0.map(f => f.id),
      actionsRemaining: 2,
    },
    {
      index: 1,
      name: p1Name,
      characterId: char1Id,
      hand: hand1,
      deck: deck1,
      discard: [],
      fighters: fighters1.map(f => f.id),
      actionsRemaining: 2,
    },
  ];

  return {
    players,
    fighters: allFighters,
    board,
    currentPlayer: 0,
    phase: 'playing',
    combat: null,
    winner: null,
    log: [`Game started! ${p0Name} (${char0.name}) vs ${p1Name} (${char1.name})`],
    selectedFighter: null,
    maneuverMoved: false,
    maneuverDrawn: false,
  };
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

// BFS for reachable spaces within moveValue steps
export function getReachableSpaces(board: BoardMap, fromId: string, steps: number, _fighters: Fighter[], _movingFighterId: string): string[] {
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
  visited.delete(fromId); // don't include starting space
  return Array.from(visited);
}

// Can attacker reach defender?
export function canAttack(board: BoardMap, attacker: Fighter, defender: Fighter): boolean {
  if (attacker.hp <= 0 || defender.hp <= 0) return false;
  if (attacker.isRanged) {
    return sameZone(board, attacker.spaceId, defender.spaceId) || areAdjacent(board, attacker.spaceId, defender.spaceId);
  }
  return areAdjacent(board, attacker.spaceId, defender.spaceId) || attacker.spaceId === defender.spaceId;
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

// ---- Actions ---- (return new GameState, immutable-ish)

function clone(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state));
}

function addLog(state: GameState, msg: string) {
  state.log.push(msg);
  if (state.log.length > 50) state.log.shift();
}

function drawCards(state: GameState, playerIndex: number, count: number) {
  const p = state.players[playerIndex];
  for (let i = 0; i < count; i++) {
    if (p.deck.length === 0) {
      // Reshuffle discard into deck
      if (p.discard.length === 0) break;
      p.deck = shuffle(p.discard);
      p.discard = [];
      addLog(state, `${p.name} reshuffles their discard pile.`);
    }
    if (p.hand.length >= 7) break; // hand limit
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

function endTurn(state: GameState) {
  state.currentPlayer = state.currentPlayer === 0 ? 1 : 0;
  state.players[state.currentPlayer].actionsRemaining = 2;
  state.selectedFighter = null;
  state.maneuverMoved = false;
  state.maneuverDrawn = false;
  state.phase = 'playing';
  addLog(state, `--- ${state.players[state.currentPlayer].name}'s turn ---`);
}

function useAction(state: GameState) {
  state.players[state.currentPlayer].actionsRemaining--;
  if (state.players[state.currentPlayer].actionsRemaining <= 0) {
    endTurn(state);
  } else {
    state.phase = 'playing';
    state.selectedFighter = null;
    state.maneuverMoved = false;
    state.maneuverDrawn = false;
  }
}

// ---- Maneuver ----

export function startManeuver(state: GameState): GameState {
  const s = clone(state);
  // Draw 1 card
  drawCards(s, s.currentPlayer, 1);
  s.maneuverDrawn = true;
  s.phase = 'maneuver_move';
  addLog(s, `${currentPlayer(s).name} maneuvers (drew a card). Select a fighter to move or skip.`);
  return s;
}

export function maneuverMove(state: GameState, fighterId: string, targetSpaceId: string, boostCardId?: string): GameState {
  const s = clone(state);
  const fighter = getFighter(s, fighterId);
  if (!fighter || fighter.owner !== s.currentPlayer) return s;

  let moveRange = fighter.moveValue;
  const player = currentPlayer(s);

  // Boost with a card
  if (boostCardId) {
    const cardIdx = player.hand.findIndex(c => c.id === boostCardId);
    if (cardIdx >= 0) {
      const card = player.hand[cardIdx];
      const charDef = getCharDef(player.characterId);
      const def = getCardDef(card, charDef);
      if (def) {
        moveRange += def.boost;
        player.hand.splice(cardIdx, 1);
        player.discard.push(card);
        addLog(s, `Discarded ${def.name} for +${def.boost} movement.`);
      }
    }
  }

  const reachable = getReachableSpaces(s.board, fighter.spaceId, moveRange, s.fighters, fighter.id);
  if (reachable.includes(targetSpaceId)) {
    fighter.spaceId = targetSpaceId;
    addLog(s, `${fighter.name} moved to ${targetSpaceId}.`);
  }

  useAction(s);
  return s;
}

export function skipManeuverMove(state: GameState): GameState {
  const s = clone(state);
  addLog(s, `${currentPlayer(s).name} skips movement.`);
  useAction(s);
  return s;
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

  // Switch to defender choosing
  s.phase = 'attack_defenderCard';
  const charDef = getCharDef(player.characterId);
  const def = getCardDef(card, charDef);
  addLog(s, `Attacker plays ${def?.name || 'a card'}. Defender: choose a defense card or skip.`);
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

  const atkValue = atkCardDef?.value || 0;
  const defValue = defCardDef?.value || 0;

  // Check for Feint (cancel effects)
  const atkCancelled = defCardDef?.effect?.type === 'cancelEffects';
  const defCancelled = atkCardDef?.effect?.type === 'cancelEffects';

  let damage = Math.max(0, atkValue - defValue);

  addLog(s, `Attack: ${atkValue} vs Defense: ${defValue}`);

  // Apply damage
  if (damage > 0) {
    defender.hp = Math.max(0, defender.hp - damage);
    addLog(s, `${defender.name} takes ${damage} damage! (${defender.hp} HP remaining)`);
  } else {
    addLog(s, `Attack blocked!`);
  }

  // After-combat effects (if not cancelled)
  if (atkCardDef?.effect && !atkCancelled) {
    applyEffect(s, atkCardDef.effect, attacker, defender, atkPlayer);
  }
  if (defCardDef?.effect && !defCancelled) {
    applyEffect(s, defCardDef.effect, defender, attacker, defPlayer);
  }

  // Discard used cards
  if (s.combat.attackCard) atkPlayer.discard.push(s.combat.attackCard);
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
      // Handled in resolveCombat
      break;
  }
}

// ---- Scheme ----

export function playScheme(state: GameState, cardId: string, targetFighterId?: string): GameState {
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
      case 'dealDamage':
        if (targetFighterId) {
          const target = getFighter(s, targetFighterId);
          if (target && target.owner !== s.currentPlayer) {
            const dmg = def.effect.amount || 0;
            target.hp = Math.max(0, target.hp - dmg);
            addLog(s, `${def.name} deals ${dmg} damage to ${target.name}!`);
            checkHeroDeath(s);
          }
        }
        break;
      case 'moveSidekick':
        // We'll let the player handle sidekick movement in the UI separately
        addLog(s, `${def.effect.description}`);
        break;
      case 'reviveSidekick': {
        const deadSidekicks = s.fighters.filter(f => f.owner === s.currentPlayer && !f.isHero && f.hp <= 0);
        if (deadSidekicks.length > 0) {
          const revived = deadSidekicks[0];
          revived.hp = revived.maxHp;
          revived.spaceId = hero.spaceId;
          addLog(s, `${revived.name} returns to the battlefield!`);
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
