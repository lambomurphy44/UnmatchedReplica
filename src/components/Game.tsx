import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { GameState } from '../game/types';
import {
  createGame, currentPlayer, getCharDef, getFighter,
  getValidTargets, getReachableSpaces,
  getEffectMoveSpaces, getPlaceFighterSpaces,
  getPushSpaces,
  getMedusaGazeTargets,
  getSokkaBoomerangTargets,
  getZoneDamageTargets,
  getSchemeTargets,
  getReviveHarpySpaces,
  getValidPlacementSpaces,
  getMewtwoAdjacentSpaces,
  getTeleportSpaces,
  getZeldaZoneSpaces,
  getZeldaImpasTargets,
  getCardDef,
  getHero,
  getAliveFighters,
  sameZone,
} from '../game/engine';
import { dispatchAction } from '../game/dispatch';
import { Board } from './Board';
import { CardHand } from './CardHand';
import { PlayerHUD } from './PlayerHUD';
import { ActionBar } from './ActionBar';
import { ALL_CHARACTERS } from '../game/characters';
import { useOnlineGame } from '../hooks/useOnlineGame';

type AppMode = 'menu' | 'local' | 'online_lobby' | 'online_game';

const MAX_HISTORY = 50;

export const Game: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('menu');

  // ---- Local game state ----
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [stateHistory, setStateHistory] = useState<GameState[]>([]);

  const [p0Char, setP0Char] = useState('king_arthur');
  const [p1Char, setP1Char] = useState('medusa');
  const [p0Name, setP0Name] = useState('Player 1');
  const [p1Name, setP1Name] = useState('Player 2');

  // ---- Online game state ----
  const online = useOnlineGame();
  const [lobbyChar, setLobbyChar] = useState('king_arthur');
  const [lobbyName, setLobbyName] = useState('');
  const [joinCode, setJoinCode] = useState('');

  // Game log toggle
  const [logOpen, setLogOpen] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // Resizable side panels
  const [leftWidth, setLeftWidth] = useState(220);
  const [rightWidth, setRightWidth] = useState(220);
  const resizingRef = useRef<{ side: 'left' | 'right'; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = useCallback((side: 'left' | 'right', e: React.MouseEvent) => {
    e.preventDefault();
    const startWidth = side === 'left' ? leftWidth : rightWidth;
    resizingRef.current = { side, startX: e.clientX, startWidth };

    const onMove = (ev: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = side === 'left'
        ? ev.clientX - resizingRef.current.startX
        : resizingRef.current.startX - ev.clientX;
      const newW = Math.max(120, Math.min(400, resizingRef.current.startWidth + delta));
      if (side === 'left') setLeftWidth(newW);
      else setRightWidth(newW);
    };

    const onUp = () => {
      resizingRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [leftWidth, rightWidth]);

  // Resizable bottom panel
  const [bottomHeight, setBottomHeight] = useState(160);
  const bottomResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  const handleBottomResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    bottomResizeRef.current = { startY: e.clientY, startHeight: bottomHeight };

    const onMove = (ev: MouseEvent) => {
      if (!bottomResizeRef.current) return;
      const delta = bottomResizeRef.current.startY - ev.clientY;
      const newH = Math.max(60, Math.min(400, bottomResizeRef.current.startHeight + delta));
      setBottomHeight(newH);
    };

    const onUp = () => {
      bottomResizeRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [bottomHeight]);

  // Effective game state (local or online)
  const gs: GameState | null = mode === 'online_game' ? online.gameState : gameState;

  // Auto-scroll log when new entries appear
  const logLen = gs?.log.length ?? 0;
  useEffect(() => {
    if (logOpen && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logLen, logOpen]);

  // ---- Local state management ----
  const pushState = useCallback((newState: GameState) => {
    setGameState(prev => {
      if (prev) {
        setStateHistory(h => {
          const next = [...h, prev];
          return next.length > MAX_HISTORY ? next.slice(next.length - MAX_HISTORY) : next;
        });
      }
      return newState;
    });
  }, []);

  const handleUndo = useCallback(() => {
    if (stateHistory.length === 0) return;
    const prev = stateHistory[stateHistory.length - 1];
    setStateHistory(h => h.slice(0, -1));
    setGameState(prev);
  }, [stateHistory]);

  const startLocalGame = () => {
    setStateHistory([]);
    setGameState(createGame(p0Char, p1Char, p0Name, p1Name));
    setMode('local');
  };

  // ---- Unified dispatch ----
  // In local mode, applies directly. In online mode, sends to server.
  const act = useCallback((actionType: string, args: Record<string, unknown> = {}) => {
    if (mode === 'online_game') {
      online.sendAction(actionType, args);
    } else {
      if (!gameState) return;
      const newState = dispatchAction(gameState, actionType, args);
      if (newState) pushState(newState);
    }
  }, [mode, gameState, pushState, online]);

  // ---- Online interaction control ----
  // Determines if the local player can interact in the current phase
  const canInteract = (() => {
    if (mode !== 'online_game') return true; // local mode: always interactive
    if (!gs || online.playerIndex === null) return false;

    const myIndex = online.playerIndex;

    // Placement phase: only the placing player can interact
    if (gs.phase === 'place_sidekick') {
      return gs.placementPlayer === myIndex;
    }

    // Defender phases: the opponent of the current player interacts
    if (gs.phase === 'attack_defenderCard' || gs.phase === 'effect_opponentDiscard' || gs.phase === 'sokka_improvised_shield' || gs.phase === 'yennenga_damage_split' || gs.phase === 'rain_of_arrows_followup') {
      return gs.currentPlayer !== myIndex; // defender = opponent of current player
    }

    // Combat immediately push: the player who played the push card controls
    if (gs.phase === 'combat_immediately_push' && gs.combat && gs.pushTargetId) {
      // If the attacker is being pushed, the defender (opponent) controls
      if (gs.pushTargetId === gs.combat.attackerId) return gs.currentPlayer !== myIndex;
      // If the defender is being pushed, the attacker (current player) controls
      return gs.currentPlayer === myIndex;
    }

    // Zelda combat phases: the Zelda player controls (may be defender)
    if ((gs.phase === 'zelda_faroresWind' || gs.phase === 'zelda_smokeBomb_move') && gs.combat) {
      const atk = getFighter(gs, gs.combat.attackerId);
      const def = getFighter(gs, gs.combat.defenderId);
      if (atk?.characterId === 'zelda') return atk.owner === myIndex;
      if (def?.characterId === 'zelda') return def.owner === myIndex;
    }

    // Tesla coil choice: the Tesla player controls (may be defender)
    if (gs.phase === 'tesla_coilChoice' && gs.combat) {
      const atk = getFighter(gs, gs.combat.attackerId);
      const def = getFighter(gs, gs.combat.defenderId);
      if (atk?.characterId === 'tesla') return atk.owner === myIndex;
      if (def?.characterId === 'tesla') return def.owner === myIndex;
    }

    // All other phases: the current player interacts
    return gs.currentPlayer === myIndex;
  })();

  // ---- Handlers (unified) ----

  const handleManeuver = useCallback(() => {
    act('startManeuver');
  }, [act]);

  const handleStartAttack = useCallback((fighterId: string) => {
    act('startAttack', { fighterId });
  }, [act]);

  const handleStartScheme = useCallback(() => {
    act('startScheme');
  }, [act]);

  const handleSpaceClick = useCallback((spaceId: string) => {
    if (!gs || !canInteract) return;

    if (gs.phase === 'place_sidekick') {
      act('placeSidekick', { spaceId });
      return;
    }
    if (gs.phase === 'maneuver_moveFighter') {
      if (gs.pendingSchemeCard) {
        act('executeSchemeMoveAllMove', { spaceId });
      } else {
        act('executeManeuverMove', { spaceId });
      }
      return;
    }
    if (gs.phase === 'attack_selectTarget') {
      const targets = getValidTargets(gs, gs.selectedFighter!);
      const targetOnSpace = targets.find(t => t.spaceId === spaceId);
      if (targetOnSpace) {
        act('selectAttackTarget', { defenderId: targetOnSpace.id });
      }
      return;
    }
    if (gs.phase === 'scheme_selectTarget') {
      const targets = getSchemeTargets(gs);
      const targetOnSpace = targets.find(t => t.spaceId === spaceId);
      if (targetOnSpace) {
        act('resolveSchemeTarget', { targetFighterId: targetOnSpace.id });
      }
      return;
    }
    if (gs.phase === 'scheme_moveSidekick') {
      act('resolveSchemeSidekickMove', { spaceId });
      return;
    }
    if (gs.phase === 'medusa_startAbility') {
      const targets = getMedusaGazeTargets(gs);
      const targetOnSpace = targets.find(t => t.spaceId === spaceId);
      if (targetOnSpace) {
        act('useMedusaGaze', { targetFighterId: targetOnSpace.id });
      }
      return;
    }
    if (gs.phase === 'sokka_boomerang') {
      const targets = getSokkaBoomerangTargets(gs);
      const targetOnSpace = targets.find(t => t.spaceId === spaceId);
      if (targetOnSpace) {
        act('useSokkaBoomerang', { targetFighterId: targetOnSpace.id });
      }
      return;
    }
    if (gs.phase === 'tesla_remote_control') {
      if (gs.maneuverCurrentFighter) {
        act('executeSchemeMoveAllMove', { spaceId });
      } else {
        // Select fighter by clicking their space
        const opponentIndex = gs.currentPlayer === 0 ? 1 : 0;
        const fighters = gs.fighters.filter(f => f.owner === opponentIndex && f.hp > 0 && gs.maneuverFightersToMove.includes(f.id));
        const targetOnSpace = fighters.find(f => f.spaceId === spaceId);
        if (targetOnSpace) {
          act('selectSchemeMoveAllFighter', { fighterId: targetOnSpace.id });
        }
      }
      return;
    }
    if (gs.phase === 'effect_zoneDamageTarget') {
      const targets = getZoneDamageTargets(gs);
      const targetOnSpace = targets.find(t => t.spaceId === spaceId);
      if (targetOnSpace) {
        act('resolveZoneDamageTarget', { targetFighterId: targetOnSpace.id });
      }
      return;
    }
    if (gs.phase === 'aang_air_scooter_choice') {
      act('resolveAirScooterChoice', { spaceId });
      return;
    }
    if (gs.phase === 'aang_flying_bison_zone') {
      act('resolveAangFlyingBisonZone', { spaceId });
      return;
    }
    if (gs.phase === 'effect_moveFighter') {
      act('resolveEffectMove', { spaceId });
      return;
    }
    if (gs.phase === 'effect_placeFighter') {
      act('resolveEffectPlace', { spaceId });
      return;
    }
    if (gs.phase === 'scheme_reviveHarpy') {
      act('resolveReviveHarpy', { spaceId });
      return;
    }
    if (gs.phase === 'effect_pushFighter') {
      act('resolveEffectPush', { spaceId });
      return;
    }
    if (gs.phase === 'combat_immediately_push') {
      act('resolveCombatImmediatelyPush', { spaceId });
      return;
    }
    if (gs.phase === 'tesla_overflow_push') {
      act('resolveTeslaOverflowPush', { spaceId });
      return;
    }
    // Zelda phases
    if (gs.phase === 'zelda_faroresWind') {
      act('resolveZeldaFaroresWind', { spaceId });
      return;
    }
    if (gs.phase === 'zelda_smokeBomb_move') {
      act('resolveZeldaSmokeBombMove', { spaceId });
      return;
    }
    if (gs.phase === 'zelda_impasTraining_move') {
      act('resolveZeldaImpasMove', { spaceId });
      return;
    }
    if (gs.phase === 'zelda_impasTraining_target') {
      const targets = getZeldaImpasTargets(gs);
      const targetOnSpace = targets.find(t => t.spaceId === spaceId);
      if (targetOnSpace) {
        act('resolveZeldaImpasTarget', { targetFighterId: targetOnSpace.id });
      }
      return;
    }
    if (gs.phase === 'zelda_dinsFireTarget') {
      // Find valid targets: opponent fighters in defender's zone, excluding the defender
      const fighters = gs.fighters.filter(f => f.spaceId === spaceId && f.hp > 0);
      if (fighters.length > 0) {
        act('resolveZeldaDinsFireTarget', { targetFighterId: fighters[0].id });
      }
      return;
    }
    // Genie: Imprisoned Wrath — click adjacent enemy to deal damage
    if (gs.phase === 'genie_imprisoned_wrath') {
      const opponentIdx = gs.currentPlayer === 0 ? 1 : 0;
      const target = gs.fighters.find(f => f.spaceId === spaceId && f.owner === opponentIdx && f.hp > 0);
      if (target) {
        act('useGenieImprisonedWrath', { targetFighterId: target.id });
      }
      return;
    }
    // Mewtwo phases
    if (gs.phase === 'mewtwo_placeClone' || gs.phase === 'mewtwo_cloneBatch_place') {
      act('placeClone', { spaceId });
      return;
    }
    if (gs.phase === 'mewtwo_teleport_move') {
      act('resolveTeleport', { spaceId });
      return;
    }
  }, [gs, canInteract, act]);

  const handleCardClick = useCallback((cardId: string) => {
    if (!gs || !canInteract) return;

    if (gs.phase === 'maneuver_boost') {
      act('applyManeuverBoost', { cardId });
      return;
    }
    if (gs.phase === 'attack_selectCard') {
      act('selectAttackCard', { cardId });
      return;
    }
    if (gs.phase === 'arthur_attackBoost') {
      act('selectArthurBoostCard', { cardId });
      return;
    }
    if (gs.phase === 'combat_duringBoost') {
      act('selectDuringCombatBoost', { cardId });
      return;
    }
    if (gs.phase === 'attack_defenderCard') {
      act('selectDefenseCard', { cardId });
      return;
    }
    if (gs.phase === 'rain_of_arrows_followup') {
      act('resolveRainOfArrowsDefense', { cardId });
      return;
    }
    if (gs.phase === 'scheme_selectCard') {
      act('playScheme', { cardId });
      return;
    }
    if (gs.phase === 'discard_excess') {
      act('discardExcessCard', { cardId });
      return;
    }
    if (gs.phase === 'effect_opponentDiscard') {
      act('resolveEffectDiscard', { cardId });
      return;
    }
    if (gs.phase === 'effect_chooseSearch') {
      act('resolveSearchChoice', { cardId });
      return;
    }
    // Mewtwo: Clone Vats discard
    if (gs.phase === 'mewtwo_cloneVats') {
      act('useCloneVats', { cardId });
      return;
    }
    // Mewtwo: Clone Rush — choose card from opponent's hand
    if (gs.phase === 'mewtwo_cloneRush_discard') {
      act('resolveCloneRushDiscard', { cardId });
      return;
    }
    // Zelda: Song of Time — choose card from discard
    if (gs.phase === 'zelda_songOfTime') {
      act('resolveZeldaSongOfTime', { cardId });
      return;
    }
    // Zelda: Goddess Blade — choose card from discard
    if (gs.phase === 'zelda_goddessBlade') {
      act('resolveZeldaGoddessBlade', { cardId });
      return;
    }
    // Zelda: Impa's Training — choose card from revealed hand
    if (gs.phase === 'zelda_impasTraining_discard') {
      act('resolveZeldaImpasDiscard', { cardId });
      return;
    }
    // Genie: Three Rules (start of turn) — click card to discard for extra action
    if (gs.phase === 'genie_startAbility') {
      act('useGenieAbility', { cardId });
      return;
    }
    // Genie: Sultans — choose card from revealed opponent hand to discard
    if (gs.phase === 'genie_sultans_discard') {
      act('resolveGenieSultansDiscard', { cardId });
      return;
    }
  }, [gs, canInteract, act]);

  const handleSkipDefense = useCallback(() => {
    act('selectDefenseCard', { cardId: null });
  }, [act]);

  // ---- Computed highlights ----

  const highlightedSpaces = (() => {
    if (!gs) return [];
    if (!canInteract) return []; // Don't show highlights when it's not your turn

    if (gs.phase === 'place_sidekick' && gs.placementPlayer !== null) {
      return getValidPlacementSpaces(gs, gs.placementPlayer);
    }
    if (gs.phase === 'maneuver_moveFighter' && gs.maneuverCurrentFighter) {
      const f = getFighter(gs, gs.maneuverCurrentFighter);
      if (f) {
        const range = gs.pendingSchemeCard
          ? gs.schemeMoveRange
          : f.moveValue + gs.maneuverBoost;
        return getReachableSpaces(gs.board, f.spaceId, range, gs.fighters, f.id);
      }
    }
    if (gs.phase === 'aang_air_scooter_choice' || gs.phase === 'aang_flying_bison_zone') {
      return gs.airScooterSpaces;
    }
    if (gs.phase === 'attack_selectTarget' && gs.selectedFighter) {
      return getValidTargets(gs, gs.selectedFighter).map(t => t.spaceId);
    }
    if (gs.phase === 'scheme_selectTarget') {
      return getSchemeTargets(gs).map(t => t.spaceId);
    }
    if (gs.phase === 'scheme_moveSidekick' && gs.schemeMoveFighterId) {
      const f = getFighter(gs, gs.schemeMoveFighterId);
      if (f) {
        return getReachableSpaces(gs.board, f.spaceId, gs.schemeMoveRange, gs.fighters, f.id);
      }
    }
    if (gs.phase === 'medusa_startAbility') {
      return getMedusaGazeTargets(gs).map(t => t.spaceId);
    }
    if (gs.phase === 'sokka_boomerang') {
      return getSokkaBoomerangTargets(gs).map(t => t.spaceId);
    }
    if (gs.phase === 'tesla_overflow_push' && gs.pushTargetId) {
      return getPushSpaces(gs, gs.pushTargetId, gs.pushRange);
    }
    if (gs.phase === 'tesla_remote_control' && gs.maneuverCurrentFighter) {
      const f = getFighter(gs, gs.maneuverCurrentFighter);
      if (f) {
        return getReachableSpaces(gs.board, f.spaceId, gs.schemeMoveRange, gs.fighters, f.id);
      }
    }
    if (gs.phase === 'tesla_remote_control' && !gs.maneuverCurrentFighter) {
      return gs.maneuverFightersToMove.map(id => {
        const f = getFighter(gs, id);
        return f ? f.spaceId : '';
      }).filter(Boolean);
    }
    if (gs.phase === 'effect_zoneDamageTarget') {
      return getZoneDamageTargets(gs).map(t => t.spaceId);
    }
    if (gs.phase === 'effect_moveFighter') {
      return getEffectMoveSpaces(gs);
    }
    if (gs.phase === 'effect_placeFighter') {
      return getPlaceFighterSpaces(gs);
    }
    if (gs.phase === 'scheme_reviveHarpy') {
      return getReviveHarpySpaces(gs);
    }
    if ((gs.phase === 'effect_pushFighter' || gs.phase === 'combat_immediately_push') && gs.pushTargetId) {
      return getPushSpaces(gs, gs.pushTargetId, gs.pushRange);
    }
    // Mewtwo phases
    if (gs.phase === 'mewtwo_placeClone' || gs.phase === 'mewtwo_cloneBatch_place') {
      return getMewtwoAdjacentSpaces(gs, gs.currentPlayer);
    }
    if (gs.phase === 'mewtwo_teleport_move') {
      return getTeleportSpaces(gs);
    }
    // Zelda phases
    if (gs.phase === 'zelda_faroresWind') {
      return getZeldaZoneSpaces(gs);
    }
    if (gs.phase === 'zelda_smokeBomb_move' && gs.combat) {
      const atk = getFighter(gs, gs.combat.attackerId);
      const def = getFighter(gs, gs.combat.defenderId);
      const self = atk?.characterId === 'zelda' ? atk : def;
      if (self) return getReachableSpaces(gs.board, self.spaceId, 2, gs.fighters, self.id);
    }
    if (gs.phase === 'zelda_impasTraining_move') {
      const hero = getHero(gs, gs.currentPlayer);
      if (hero) return getReachableSpaces(gs.board, hero.spaceId, 3, gs.fighters, hero.id);
    }
    if (gs.phase === 'zelda_impasTraining_target') {
      return getZeldaImpasTargets(gs).map(t => t.spaceId);
    }
    if (gs.phase === 'zelda_dinsFireTarget' && gs.combat) {
      const defender = getFighter(gs, gs.combat.defenderId);
      if (defender) {
        const opponentIdx = gs.currentPlayer === 0 ? 1 : 0;
        return getAliveFighters(gs, opponentIdx)
          .filter(f => f.id !== gs.combat!.defenderId && sameZone(gs.board, f.spaceId, defender.spaceId))
          .map(f => f.spaceId);
      }
    }
    // Genie: Imprisoned Wrath — highlight adjacent enemy spaces
    if (gs.phase === 'genie_imprisoned_wrath') {
      const hero = getHero(gs, gs.currentPlayer);
      if (hero) {
        const opponentIdx = gs.currentPlayer === 0 ? 1 : 0;
        return getAliveFighters(gs, opponentIdx)
          .filter(f => gs.board.spaces.find(s => s.id === hero.spaceId)?.adjacentIds.includes(f.spaceId))
          .map(f => f.spaceId);
      }
    }
    return [];
  })();

  // ---- Which hand to show ----

  const showMyHand = () => {
    if (!gs) return null;

    const cp = currentPlayer(gs);
    const charDef = getCharDef(cp.characterId);
    const opponentIndex = gs.currentPlayer === 0 ? 1 : 0;
    const opponentPlayer = gs.players[opponentIndex];
    const opponentCharDef = getCharDef(opponentPlayer.characterId);
    const aliveFightersCurrent = gs.fighters.filter(f => f.owner === gs.currentPlayer && f.hp > 0);

    // In online mode, show only the local player's hand normally.
    // For defender phases that require opponent's hand, show it only if we are the defender.
    if (mode === 'online_game' && online.playerIndex !== null) {
      const myIndex = online.playerIndex;
      const myPlayer = gs.players[myIndex];
      const myCharDef = getCharDef(myPlayer.characterId);

      // Defender card selection: show defender's hand (only the defender sees this)
      if ((gs.phase === 'attack_defenderCard' || gs.phase === 'rain_of_arrows_followup') && gs.currentPlayer !== myIndex) {
        const defender = gs.combat ? getFighter(gs, gs.combat.defenderId) : undefined;
        return (
          <CardHand
            hand={myPlayer.hand}
            charDef={myCharDef}
            onCardClick={handleCardClick}
            filter="defense"
            fighter={defender}
            label={`${myPlayer.name}'s Hand (Defense)`}
          />
        );
      }

      // Opponent discard: show the opponent's hand (only the discarding player sees this)
      if (gs.phase === 'effect_opponentDiscard' && gs.currentPlayer !== myIndex) {
        return (
          <CardHand
            hand={myPlayer.hand}
            charDef={myCharDef}
            onCardClick={handleCardClick}
            label={`${myPlayer.name}'s Hand (Choose to discard)`}
          />
        );
      }

      // Search deck
      if (gs.phase === 'effect_chooseSearch' && gs.currentPlayer === myIndex) {
        return (
          <CardHand
            hand={gs.searchCards}
            charDef={myCharDef}
            onCardClick={handleCardClick}
            label={`${myPlayer.name}'s Deck (Choose a card)`}
          />
        );
      }

      // Genie: Sultans — show opponent's hand to the Genie player
      if (gs.phase === 'genie_sultans_discard' && gs.genieSultansTargetPlayer !== null && gs.currentPlayer === myIndex) {
        const sultansTargetPlayer = gs.players[gs.genieSultansTargetPlayer];
        const sultansCharDef = getCharDef(sultansTargetPlayer.characterId);
        return (
          <CardHand
            hand={gs.genieSultansRevealedCards}
            charDef={sultansCharDef}
            onCardClick={handleCardClick}
            label={`${sultansTargetPlayer.name}'s Hand (Choose a card for them to discard)`}
          />
        );
      }

      // Default: show my hand
      const myAliveFighters = gs.fighters.filter(f => f.owner === myIndex && f.hp > 0);
      const attackerFighter = gs.combat && gs.phase === 'attack_selectCard' && gs.currentPlayer === myIndex
        ? getFighter(gs, gs.combat.attackerId) : undefined;
      return (
        <CardHand
          hand={myPlayer.hand}
          charDef={myCharDef}
          onCardClick={canInteract ? handleCardClick : () => {}}
          filter={
            gs.phase === 'attack_selectCard' && canInteract ? 'attack' :
            gs.phase === 'scheme_selectCard' && canInteract ? 'scheme' :
            undefined
          }
          fighter={attackerFighter}
          aliveFighters={gs.phase === 'scheme_selectCard' && canInteract ? myAliveFighters : undefined}
          label={`${myPlayer.name}'s Hand`}
        />
      );
    }

    // Local/hot-seat mode: show hands as before
    if (gs.phase === 'attack_defenderCard' || gs.phase === 'rain_of_arrows_followup') {
      const defender = gs.combat ? getFighter(gs, gs.combat.defenderId) : undefined;
      return (
        <CardHand
          hand={opponentPlayer.hand}
          charDef={opponentCharDef}
          onCardClick={handleCardClick}
          filter="defense"
          fighter={defender}
          label={`${opponentPlayer.name}'s Hand (Defense)`}
        />
      );
    }
    if (gs.phase === 'effect_opponentDiscard') {
      return (
        <CardHand
          hand={opponentPlayer.hand}
          charDef={opponentCharDef}
          onCardClick={handleCardClick}
          label={`${opponentPlayer.name}'s Hand (Choose to discard)`}
        />
      );
    }
    // Mewtwo: Clone Rush — show opponent's hand to current player for choosing
    if (gs.phase === 'mewtwo_cloneRush_discard') {
      return (
        <CardHand
          hand={opponentPlayer.hand}
          charDef={opponentCharDef}
          onCardClick={handleCardClick}
          label={`${opponentPlayer.name}'s Hand (Choose a card to discard)`}
        />
      );
    }
    // Genie: Sultans — show opponent's revealed hand for current player to choose a card to discard
    if (gs.phase === 'genie_sultans_discard' && gs.genieSultansTargetPlayer !== null) {
      const sultansTargetPlayer = gs.players[gs.genieSultansTargetPlayer];
      const sultansCharDef = getCharDef(sultansTargetPlayer.characterId);
      return (
        <CardHand
          hand={gs.genieSultansRevealedCards}
          charDef={sultansCharDef}
          onCardClick={handleCardClick}
          label={`${sultansTargetPlayer.name}'s Hand (Choose a card for them to discard)`}
        />
      );
    }
    if (gs.phase === 'effect_chooseSearch') {
      return (
        <CardHand
          hand={gs.searchCards}
          charDef={charDef}
          onCardClick={handleCardClick}
          label={`${cp.name}'s Deck (Choose a card)`}
        />
      );
    }

    const attackerFighter = gs.combat && gs.phase === 'attack_selectCard'
      ? getFighter(gs, gs.combat.attackerId) : undefined;
    return (
      <CardHand
        hand={cp.hand}
        charDef={charDef}
        onCardClick={handleCardClick}
        filter={
          gs.phase === 'attack_selectCard' ? 'attack' :
          gs.phase === 'scheme_selectCard' ? 'scheme' :
          undefined
        }
        fighter={attackerFighter}
        aliveFighters={gs.phase === 'scheme_selectCard' ? aliveFightersCurrent : undefined}
        label={`${cp.name}'s Hand`}
      />
    );
  };

  // ======== RENDER ========

  // ---- Main menu ----
  if (mode === 'menu') {
    return (
      <div className="setup-screen">
        <h1>Unmatched</h1>
        <h2>Battle of Legends</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginTop: '32px' }}>
          <button className="start-btn" onClick={() => setMode('local')}>
            Local Game (Hot-seat)
          </button>
          <button className="start-btn" onClick={() => setMode('online_lobby')}>
            Online Game
          </button>
        </div>
      </div>
    );
  }

  // ---- Local setup ----
  if (mode === 'local' && !gameState) {
    return (
      <div className="setup-screen">
        <h1>Unmatched</h1>
        <h2>Local Game</h2>
        <div className="setup-form">
          <div className="setup-player">
            <label>Player 1 Name:</label>
            <input value={p0Name} onChange={e => setP0Name(e.target.value)} />
            <label>Character:</label>
            <select value={p0Char} onChange={e => setP0Char(e.target.value)}>
              {ALL_CHARACTERS.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.hp} HP, {c.isRanged ? 'Ranged' : 'Melee'})</option>
              ))}
            </select>
          </div>
          <div className="setup-vs">VS</div>
          <div className="setup-player">
            <label>Player 2 Name:</label>
            <input value={p1Name} onChange={e => setP1Name(e.target.value)} />
            <label>Character:</label>
            <select value={p1Char} onChange={e => setP1Char(e.target.value)}>
              {ALL_CHARACTERS.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.hp} HP, {c.isRanged ? 'Ranged' : 'Melee'})</option>
              ))}
            </select>
          </div>
        </div>
        <button className="start-btn" onClick={startLocalGame}>Start Game</button>
        <button className="skip-btn" style={{ marginTop: '12px' }} onClick={() => { setMode('menu'); }}>Back</button>
      </div>
    );
  }

  // ---- Online lobby ----
  if (mode === 'online_lobby') {
    return (
      <div className="setup-screen">
        <h1>Unmatched</h1>
        <h2>Online Game</h2>

        {online.waiting && online.roomCode && (
          <div style={{ textAlign: 'center', margin: '24px 0' }}>
            <div style={{ fontSize: '18px', marginBottom: '8px' }}>Room Code:</div>
            <div style={{ fontSize: '48px', fontWeight: 'bold', letterSpacing: '8px', fontFamily: 'monospace' }}>
              {online.roomCode}
            </div>
            <div style={{ color: '#aaa', marginTop: '8px' }}>Waiting for opponent to join...</div>
            <button className="skip-btn" style={{ marginTop: '16px' }} onClick={() => { online.disconnect(); }}>Cancel</button>
          </div>
        )}

        {online.gameState && !online.waiting && (
          // Game started! Switch to online game mode
          (() => { if (mode === 'online_lobby') { setTimeout(() => setMode('online_game'), 0); } return null; })()
        )}

        {!online.waiting && !online.roomCode && (
          <>
            <div className="setup-form" style={{ flexDirection: 'column', alignItems: 'center' }}>
              <div className="setup-player">
                <label>Your Name:</label>
                <input value={lobbyName} onChange={e => setLobbyName(e.target.value)} placeholder="Enter your name" />
                <label>Character:</label>
                <select value={lobbyChar} onChange={e => setLobbyChar(e.target.value)}>
                  {ALL_CHARACTERS.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.hp} HP, {c.isRanged ? 'Ranged' : 'Melee'})</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', alignItems: 'center', marginTop: '24px' }}>
              <button
                className="start-btn"
                onClick={() => online.createRoom(lobbyChar, lobbyName || 'Player')}
                disabled={!online.connected}
              >
                Create Room
              </button>

              <div style={{ color: '#aaa', fontSize: '14px' }}>— or —</div>

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="ROOM CODE"
                  maxLength={4}
                  style={{ width: '120px', textAlign: 'center', fontSize: '20px', fontFamily: 'monospace', letterSpacing: '4px' }}
                />
                <button
                  className="start-btn"
                  onClick={() => online.joinRoom(joinCode, lobbyChar, lobbyName || 'Player')}
                  disabled={!online.connected || joinCode.length < 4}
                >
                  Join
                </button>
              </div>
            </div>

            {!online.connected && (
              <div style={{ color: '#ff6666', textAlign: 'center', marginTop: '12px' }}>
                Connecting to server...
              </div>
            )}

            {online.error && (
              <div style={{ color: '#ff6666', textAlign: 'center', marginTop: '12px' }}>
                {online.error}
              </div>
            )}

            <button className="skip-btn" style={{ marginTop: '16px' }} onClick={() => { setMode('menu'); online.disconnect(); }}>Back</button>
          </>
        )}
      </div>
    );
  }

  // ---- Game view (local or online) ----

  if (!gs) {
    return (
      <div className="setup-screen">
        <h1>Loading...</h1>
        <button className="skip-btn" onClick={() => { setMode('menu'); online.disconnect(); }}>Back to Menu</button>
      </div>
    );
  }

  const cp = currentPlayer(gs);
  const opponentIndex = gs.currentPlayer === 0 ? 1 : 0;
  const opponentPlayer = gs.players[opponentIndex];
  const placingPlayerName = gs.placementPlayer !== null
    ? gs.players[gs.placementPlayer].name : '';
  const nextPlacementFighter = gs.placementFighterIds.length > 0
    ? getFighter(gs, gs.placementFighterIds[0]) : null;

  // For online mode, who are we waiting for?
  const waitingForName = (() => {
    if (mode !== 'online_game' || canInteract) return null;
    if (!gs || online.playerIndex === null) return null;
    // Figure out who needs to act
    if (gs.phase === 'place_sidekick' && gs.placementPlayer !== null) {
      return gs.players[gs.placementPlayer].name;
    }
    if (gs.phase === 'attack_defenderCard' || gs.phase === 'effect_opponentDiscard') {
      const defIdx = gs.currentPlayer === 0 ? 1 : 0;
      return gs.players[defIdx].name;
    }
    return gs.players[gs.currentPlayer].name;
  })();

  return (
    <div className="game-container">
      {/* Log toggle button */}
      <button className="log-toggle-btn" onClick={() => setLogOpen(o => !o)}>
        {logOpen ? 'Hide Log' : 'Log'}
      </button>

      {/* Waiting banner for online mode */}
      {waitingForName && (
        <div className="phase-prompt waiting-banner">
          <div className="phase-text">Waiting for {waitingForName}...</div>
        </div>
      )}

      <div className="main-area">
        <div className="hud-side hud-left" style={{ width: leftWidth }}>
          <PlayerHUD state={gs} playerIndex={0} isActive={gs.currentPlayer === 0} />
        </div>
        <div className="resize-handle" onMouseDown={e => handleResizeStart('left', e)} />

        <div className="board-area">
          <Board
            state={gs}
            reachableSpaces={highlightedSpaces}
            onSpaceClick={handleSpaceClick}
            combatAttackerId={gs.combat?.attackerId ?? null}
            combatDefenderId={gs.combat?.defenderId ?? null}
          />
        </div>

        <div className="resize-handle" onMouseDown={e => handleResizeStart('right', e)} />
        <div className="hud-side hud-right" style={{ width: rightWidth }}>
          <PlayerHUD state={gs} playerIndex={1} isActive={gs.currentPlayer === 1} />
        </div>
      </div>

      {/* Collapsible game log overlay */}
      {logOpen && (
        <div className="log-overlay">
          <div className="log-overlay-header">
            <span>Game Log</span>
            <button className="log-close-btn" onClick={() => setLogOpen(false)}>X</button>
          </div>
          <div className="log-overlay-entries">
            {gs.log.map((entry, i) => (
              <div key={i} className="log-entry">{entry}</div>
            ))}
            <div ref={logEndRef} />
          </div>
        </div>
      )}

      {/* Phase-specific UI - only show when canInteract */}

      {canInteract && gs.phase === 'place_sidekick' && (
        <div className="phase-prompt">
          <div className="phase-text">
            {placingPlayerName}: Place {nextPlacementFighter?.name} on a highlighted space in your starting zone.
          </div>
        </div>
      )}

      {canInteract && gs.phase === 'medusa_startAbility' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Medusa's Gaze: Click an enemy fighter in Medusa's zone to deal 1 damage, or skip.
          </div>
          <button className="skip-btn" onClick={() => act('skipMedusaGaze')}>
            Skip Gaze
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'genie_startAbility' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Three Rules: Click a card in your hand to discard it and gain 1 extra action this turn, or skip.
          </div>
          <button className="skip-btn" onClick={() => act('skipGenieAbility')}>
            Skip
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'genie_threeWishes' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Three Wishes: Choose one wish.
          </div>
          <button className="action-btn" onClick={() => act('resolveGenieThreeWishes', { choice: 'draw5' })}>
            Draw 5 Cards
          </button>
          <button className="action-btn" onClick={() => act('resolveGenieThreeWishes', { choice: 'valueLock' })}>
            Cards Have Value 4 This Turn
          </button>
          <button className="action-btn" onClick={() => act('resolveGenieThreeWishes', { choice: 'opponentDiscard' })}>
            Opponent Discards 2 Cards
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'genie_wish_command' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Your Wish Is My Command: You won! Discard 2 cards to take 1 extra action?
          </div>
          <button className="action-btn" onClick={() => act('useGenieWishCommand')}>
            Discard 2 Cards for +1 Action
          </button>
          <button className="skip-btn" onClick={() => act('skipGenieWishCommand')}>
            Skip
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'genie_imprisoned_wrath' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Imprisoned Wrath: Click an adjacent enemy, or skip. Costs 2 cards to deal 2 damage.
          </div>
          <button className="skip-btn" onClick={() => act('skipGenieImprisonedWrath')}>
            Skip
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'genie_sultans_discard' && (
        <div className="phase-prompt">
          <div className="phase-text">
            I've Made Sultans Out of Less: Click a card from the revealed hand to force your opponent to discard it.
          </div>
        </div>
      )}

      {canInteract && gs.phase === 'sokka_boomerang' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Boomerang! Click an enemy fighter in Sokka's zone to deal 1 damage (flips to OUT), or cancel.
          </div>
          <button className="skip-btn" onClick={() => act('skipSokkaBoomerang')}>
            Cancel
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'tesla_overflow_push' && (() => {
        const f = gs.pushTargetId ? getFighter(gs, gs.pushTargetId) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Electrical Overflow: Move {f?.name} up to 1 space — click a highlighted space, or skip.
            </div>
            <button className="skip-btn" onClick={() => act('skipTeslaOverflowPush')}>
              Skip (don't move)
            </button>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'tesla_coilChoice' && (() => {
        // Find the Tesla player index — use stored index (needed when combat is null for after-combat effects)
        let teslaPlayerIdx = gs.teslaCoilChoicePlayerIndex ?? gs.currentPlayer;
        if (gs.combat) {
          const atk = getFighter(gs, gs.combat.attackerId);
          const def = getFighter(gs, gs.combat.defenderId);
          if (atk?.characterId === 'tesla') teslaPlayerIdx = atk.owner;
          else if (def?.characterId === 'tesla') teslaPlayerIdx = def.owner;
        }
        const coils = gs.teslaCoilsCharged[teslaPlayerIdx];
        const effectType = gs.teslaPendingCoilEffect;
        let effectName = 'Tesla Effect';
        if (effectType === 'teslaCoilCancel') effectName = 'Polyphase Coils';
        else if (effectType === 'teslaCoilValue') effectName = 'Death Ray';
        else if (effectType === 'teslaCoilRevealDiscard') effectName = 'X-Ray Radiation';
        else if (effectType === 'teslaCoilGainActions') effectName = '7 Hertz';
        else if (effectType === 'teslaCoilZoneDamage') effectName = 'Lightning Storm';
        else if (effectType === 'teslaCoilRepulsion') effectName = 'Repulsion Blast';
        else if (effectType === 'teslaCoilDraw') effectName = 'Intense Experimentation';

        return (
          <div className="phase-prompt">
            <div className="phase-text">
              {effectName}: Choose how many coils to discharge ({coils} available).
            </div>
            <button className="skip-btn" onClick={() => act('resolveTeslaCoilChoice', { coilCount: 0 })}>
              Skip (0 coils)
            </button>
            {coils >= 1 && (
              <button className="action-btn" onClick={() => act('resolveTeslaCoilChoice', { coilCount: 1 })}>
                Discharge 1 Coil
              </button>
            )}
            {coils >= 2 && (
              <button className="action-btn" onClick={() => act('resolveTeslaCoilChoice', { coilCount: 2 })}>
                Discharge 2 Coils
              </button>
            )}
          </div>
        );
      })()}

      {canInteract && gs.phase === 'tesla_alternating_choice' && (() => {
        const coils = gs.teslaCoilsCharged[gs.currentPlayer];
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              The Alternating Current: Choose one.
            </div>
            <button className="action-btn" onClick={() => act('resolveTeslaAlternatingChoice', { choice: 'charge' })}>
              Charge Both Coils
            </button>
            {coils >= 2 && (
              <button className="action-btn" onClick={() => act('resolveTeslaAlternatingChoice', { choice: 'heal' })}>
                Discharge Both to Heal 2
              </button>
            )}
          </div>
        );
      })()}

      {canInteract && gs.phase === 'tesla_remote_control' && !gs.maneuverCurrentFighter && (
        <div className="phase-prompt">
          <div className="phase-text">
            Remote Control: Select an opposing fighter to move (up to 2 spaces), or skip all.
          </div>
          <button className="skip-btn" onClick={() => act('skipAllSchemeMoveAll')}>
            Skip All
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'tesla_remote_control' && gs.maneuverCurrentFighter && (
        <div className="phase-prompt">
          <div className="phase-text">
            Move {getFighter(gs, gs.maneuverCurrentFighter)?.name} up to {gs.schemeMoveRange} spaces.
          </div>
          <button className="skip-btn" onClick={() => act('skipSchemeMoveAllFighter')}>
            Skip Move
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'zelda_formChoice' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Veil of Two Fates: Choose your form for this turn.
          </div>
          <button className="action-btn" onClick={() => act('resolveZeldaFormChoice', { form: 'zelda' })}>
            Zelda (Ranged, Move 2, +1 Value)
          </button>
          <button className="action-btn" onClick={() => act('resolveZeldaFormChoice', { form: 'sheik' })}>
            Sheik (Melee, Move 3, +1 Action)
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'zelda_faroresWind' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Farore's Wind: Click a space in your zone to teleport, or skip.
          </div>
          <button className="skip-btn" onClick={() => act('skipZeldaFaroresWind')}>
            Skip
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'zelda_smokeBomb_move' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Smoke Bomb: Move up to 2 spaces, or skip.
          </div>
          <button className="skip-btn" onClick={() => act('skipZeldaSmokeBombMove')}>
            Skip Move
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'zelda_impasTraining_move' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Impa's Training: Move up to 3 spaces, or skip.
          </div>
          <button className="skip-btn" onClick={() => act('skipZeldaImpasMove')}>
            Skip Move
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'zelda_impasTraining_target' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Impa's Training: Click an adjacent opponent to reveal their hand.
          </div>
        </div>
      )}

      {canInteract && gs.phase === 'zelda_impasTraining_discard' && (() => {
        const revealed = gs.zeldaImpasRevealedCards;
        const targetPlayer = gs.zeldaImpasTargetPlayer !== null ? gs.players[gs.zeldaImpasTargetPlayer] : null;
        const targetCharDef = targetPlayer ? getCharDef(targetPlayer.characterId) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              {targetPlayer?.name}'s hand revealed! Choose 1 card for them to discard.
            </div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {revealed.map(card => {
                const def = targetCharDef ? getCardDef(card, targetCharDef) : null;
                return (
                  <button key={card.id} className="action-btn" onClick={() => act('resolveZeldaImpasDiscard', { cardId: card.id })}>
                    {def?.name || 'Unknown'} ({def?.type})
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'zelda_songOfTime' && (() => {
        const cp = currentPlayer(gs);
        const charDef = getCharDef(cp.characterId);
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Song of Time: Choose a card from your discard to return to hand, or skip.
            </div>
            <button className="skip-btn" onClick={() => act('skipZeldaSongOfTime')}>
              Skip
            </button>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {cp.discard.map(card => {
                const def = getCardDef(card, charDef);
                return (
                  <button key={card.id} className="action-btn" onClick={() => act('resolveZeldaSongOfTime', { cardId: card.id })}>
                    {def?.name || 'Unknown'}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'zelda_goddessBlade' && (() => {
        const cp = gs.players[gs.currentPlayer];
        const charDef = getCharDef(cp.characterId);
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Goddess Blade: Return 1 card from discard to hand, or skip.
            </div>
            <button className="skip-btn" onClick={() => act('skipZeldaGoddessBlade')}>
              Skip
            </button>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '8px' }}>
              {cp.discard.map(card => {
                const def = getCardDef(card, charDef);
                return (
                  <button key={card.id} className="action-btn" onClick={() => act('resolveZeldaGoddessBlade', { cardId: card.id })}>
                    {def?.name || 'Unknown'}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'zelda_dinsFireTarget' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Din's Fire: Click another opposing fighter in the defender's zone to deal 1 damage.
          </div>
          <button className="skip-btn" onClick={() => act('skipZeldaDinsFire')}>
            Skip
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'playing' && (
        <ActionBar
          state={gs}
          onManeuver={handleManeuver}
          onStartAttack={handleStartAttack}
          onStartScheme={handleStartScheme}
          onUseBoomerang={gs.players[gs.currentPlayer].characterId === 'sokka' && gs.sokkaBoomerangReady[gs.currentPlayer] ? () => {
            const targets = getSokkaBoomerangTargets(gs);
            if (targets.length > 0) {
              act('enterBoomerangTargeting', {});
            }
          } : undefined}
          boomerangReady={gs.players[gs.currentPlayer].characterId === 'sokka' && gs.sokkaBoomerangReady[gs.currentPlayer]}
          undoAvailable={mode === 'local' && stateHistory.length > 0}
          onUndo={handleUndo}
        />
      )}

      {canInteract && gs.phase === 'maneuver_boost' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Discard a card for movement boost? Click a card below, or skip.
          </div>
          <button className="skip-btn" onClick={() => act('applyManeuverBoost', { cardId: null })}>
            Skip Boost
          </button>
        </div>
      )}

      {canInteract && (gs.phase === 'maneuver_selectFighter' || gs.phase === 'scheme_moveAll') && (
        <div className="phase-prompt">
          <div className="phase-text">Select a fighter to move{gs.maneuverBoost > 0 ? ` (+${gs.maneuverBoost} boost)` : ''}:</div>
          <div className="fighter-select-buttons">
            {gs.maneuverFightersToMove.map(fid => {
              const f = getFighter(gs, fid);
              if (!f) return null;
              const moveRange = gs.phase === 'scheme_moveAll'
                ? gs.schemeMoveRange
                : f.moveValue + gs.maneuverBoost;
              return (
                <button key={fid} className="fighter-btn"
                  onClick={() => act(
                    gs.phase === 'scheme_moveAll'
                      ? 'selectSchemeMoveAllFighter'
                      : 'selectManeuverFighter',
                    { fighterId: fid }
                  )}>
                  {f.isHero ? '★' : '●'} {f.name} (move: {moveRange})
                </button>
              );
            })}
          </div>
          <button className="skip-btn" onClick={() => act(
            gs.phase === 'scheme_moveAll'
              ? 'skipAllSchemeMoveAll'
              : 'skipAllManeuverMoves'
          )}>
            Skip All Movement
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'maneuver_moveFighter' && (() => {
        const f = gs.maneuverCurrentFighter ? getFighter(gs, gs.maneuverCurrentFighter) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Moving {f?.name} - click a highlighted space, or skip.
            </div>
            <button className="skip-btn" onClick={() => act(
              gs.pendingSchemeCard
                ? 'skipSchemeMoveAllFighter'
                : 'skipFighterMove'
            )}>
              Skip This Fighter
            </button>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'attack_selectTarget' && (
        <div className="phase-prompt">
          <div className="phase-text">Click a highlighted space to select attack target.</div>
          <button className="skip-btn" onClick={() => act('cancelAttackTarget')}>Cancel</button>
        </div>
      )}

      {canInteract && gs.phase === 'aang_air_scooter_choice' && (
        <div className="phase-prompt">
          <div className="phase-text">Air Scooter: Choose which space Aang moves into.</div>
        </div>
      )}

      {canInteract && gs.phase === 'aang_flying_bison_zone' && (
        <div className="phase-prompt">
          <div className="phase-text">Choose a destination space for Appa.</div>
        </div>
      )}

      {canInteract && gs.phase === 'aang_charge_choice' && (
        <div className="phase-prompt">
          <div className="phase-text">Sky Bison Charge: Choose one —</div>
          <button className="action-btn" onClick={() => act('resolveAangChargeChoice', { choice: 'move' })}>
            Move Appa up to 3 spaces
          </button>
          <button className="action-btn" onClick={() => act('resolveAangChargeChoice', { choice: 'damage' })}>
            Deal 1 damage to opposing fighter
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'attack_selectCard' && (
        <div className="phase-prompt">
          <div className="phase-text">Select an attack card from your hand:</div>
          <button className="skip-btn" onClick={() => act('cancelAttack')}>Cancel</button>
        </div>
      )}

      {canInteract && gs.phase === 'arthur_attackBoost' && (
        <div className="phase-prompt">
          <div className="phase-text">
            King Arthur: Play an additional card as a boost (its BOOST value is added to attack), or skip.
          </div>
          <button className="skip-btn" onClick={() => act('selectArthurBoostCard', { cardId: null })}>
            Skip Boost
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'sokka_improvised_shield' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Improvised Shield: Flip Boomerang to OUT for value 4 and cancel attacker's effects?
          </div>
          <button className="action-btn" onClick={() => act('resolveImprovisedShield', {})}>
            Flip Boomerang (value 4 + cancel)
          </button>
          <button className="skip-btn" onClick={() => act('skipImprovisedShield', {})}>
            Keep Boomerang READY
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'sokka_precision_throw' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Precision Throw: Flip Boomerang to OUT for value 6?
          </div>
          <button className="action-btn" onClick={() => act('resolvePrecisionThrow', {})}>
            Flip Boomerang (value 6)
          </button>
          <button className="skip-btn" onClick={() => act('skipPrecisionThrow', {})}>
            Keep Boomerang READY
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'combat_duringBoost' && (
        <div className="phase-prompt">
          <div className="phase-text">
            During Combat: You may play a card as a boost (its BOOST value is added to your attack), or skip.
          </div>
          <button className="skip-btn" onClick={() => act('selectDuringCombatBoost', { cardId: null })}>
            Skip Boost
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'yennenga_damage_split' && gs.yennengaDamageSplit && (() => {
        const split = gs.yennengaDamageSplit;
        const assigned = Object.values(split.assignments).reduce((a, b) => a + b, 0);
        const remaining = split.totalDamage - assigned;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Distribute {split.totalDamage} damage among your fighters ({remaining} remaining):
              {mode === 'local' && <span className="warning"> (Yennenga player distributes)</span>}
            </div>
            <div className="damage-split-controls">
              {split.eligibleFighterIds.map(fid => {
                const f = getFighter(gs, fid);
                if (!f) return null;
                const dmg = split.assignments[fid] || 0;
                return (
                  <div key={fid} className="damage-split-row">
                    <span>{f.name} ({f.hp} HP): <strong>{dmg}</strong> damage</span>
                    <button
                      className="action-btn"
                      style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                      disabled={remaining <= 0 || dmg >= f.hp}
                      onClick={() => act('assignYennengaDamage', { fighterId: fid })}
                    >+1</button>
                    <button
                      className="action-btn"
                      style={{ padding: '2px 8px', fontSize: '0.8rem' }}
                      disabled={dmg <= 0}
                      onClick={() => act('unassignYennengaDamage', { fighterId: fid })}
                    >-1</button>
                  </div>
                );
              })}
            </div>
            <button
              className="action-btn"
              disabled={remaining !== 0}
              onClick={() => act('confirmYennengaDamageSplit', {})}
            >
              Confirm Split
            </button>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'rain_of_arrows_followup' && (
        <div className="phase-prompt defender-prompt">
          <div className="phase-text">
            Rain of Arrows follow-up attack (value {gs.rainOfArrowsFollowUp?.value || 3})! Select a defense card or take the hit.
            {mode === 'local' && <span className="warning"> (Hand the device to the defender!)</span>}
          </div>
          <button className="skip-btn" onClick={() => act('resolveRainOfArrowsDefense', { cardId: null })}>
            Take the hit (no defense)
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'attack_defenderCard' && (
        <div className="phase-prompt defender-prompt">
          <div className="phase-text">
            {opponentPlayer.name}: Select a defense card or skip.
            {mode === 'local' && <span className="warning"> (Hand the device to the defender!)</span>}
          </div>
          <button className="skip-btn" onClick={handleSkipDefense}>Take the hit (no defense)</button>
        </div>
      )}

      {gs.phase === 'attack_resolve' && gs.combat && (() => {
        const atkFighter = getFighter(gs, gs.combat.attackerId);
        const defFighter = getFighter(gs, gs.combat.defenderId);
        const atkPlayer = atkFighter ? gs.players[atkFighter.owner] : null;
        const defPlayer = defFighter ? gs.players[defFighter.owner] : null;
        const atkCharDef = atkPlayer ? getCharDef(atkPlayer.characterId) : null;
        const defCharDef = defPlayer ? getCharDef(defPlayer.characterId) : null;
        const atkCardDef = gs.combat.attackCard && atkCharDef ? getCardDef(gs.combat.attackCard, atkCharDef) : null;
        const defCardDef = gs.combat.defenseCard && defCharDef ? getCardDef(gs.combat.defenseCard, defCharDef) : null;

        const TYPE_COLORS: Record<string, string> = {
          attack: '#c62828',
          defense: '#1565c0',
          versatile: '#6a1b9a',
          scheme: '#f9a825',
        };

        return (
          <div className="combat-resolve-overlay">
            <div className="combat-resolve-box">
              <h3 className="combat-resolve-title">Combat!</h3>
              <div className="combat-resolve-subtitle">
                {atkFighter?.name} <span style={{ color: '#ff1744' }}>attacks</span> {defFighter?.name}
              </div>
              <div className="combat-resolve-cards">
                <div className="combat-resolve-card-slot">
                  <div className="combat-resolve-role" style={{ color: '#ff1744' }}>Attacker</div>
                  {atkCardDef ? (
                    <div className="game-card combat-resolve-card" style={{ borderColor: TYPE_COLORS[atkCardDef.type] || '#666' }}>
                      <div className="card-type" style={{ background: TYPE_COLORS[atkCardDef.type] }}>
                        {atkCardDef.type.toUpperCase()}
                      </div>
                      <div className="card-name">{atkCardDef.name}</div>
                      <div className="card-value">
                        {atkCardDef.type !== 'scheme' && <span className="card-val-num">{atkCardDef.value}</span>}
                      </div>
                      <div className="card-boost">Boost: +{atkCardDef.boost}</div>
                      {atkCardDef.effectText && (
                        <div className="card-effect">{atkCardDef.effectText}</div>
                      )}
                    </div>
                  ) : (
                    <div className="combat-resolve-no-card">No card</div>
                  )}
                </div>
                <div className="combat-resolve-vs">VS</div>
                <div className="combat-resolve-card-slot">
                  <div className="combat-resolve-role" style={{ color: '#2979ff' }}>Defender</div>
                  {defCardDef ? (
                    <div className="game-card combat-resolve-card" style={{ borderColor: TYPE_COLORS[defCardDef.type] || '#666' }}>
                      <div className="card-type" style={{ background: TYPE_COLORS[defCardDef.type] }}>
                        {defCardDef.type.toUpperCase()}
                      </div>
                      <div className="card-name">{defCardDef.name}</div>
                      <div className="card-value">
                        {defCardDef.type !== 'scheme' && <span className="card-val-num">{defCardDef.value}</span>}
                      </div>
                      <div className="card-boost">Boost: +{defCardDef.boost}</div>
                      {defCardDef.effectText && (
                        <div className="card-effect">{defCardDef.effectText}</div>
                      )}
                    </div>
                  ) : (
                    <div className="combat-resolve-no-card">No card played</div>
                  )}
                </div>
              </div>
              {canInteract && (
                <button className="action-btn" onClick={() => act('confirmCombatResolve')}>
                  Resolve Combat
                </button>
              )}
              {!canInteract && (
                <div style={{ color: '#aaa', fontSize: '0.9rem', marginTop: '8px' }}>
                  Waiting for attacker to continue...
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'scheme_selectCard' && (
        <div className="phase-prompt">
          <div className="phase-text">Select a scheme card to play:</div>
          <button className="skip-btn" onClick={() => act('cancelScheme')}>Cancel</button>
        </div>
      )}

      {canInteract && gs.phase === 'scheme_selectTarget' && (
        <div className="phase-prompt">
          <div className="phase-text">Select an enemy fighter in your hero's zone to target:</div>
        </div>
      )}

      {canInteract && gs.phase === 'scheme_moveSidekick' && (() => {
        const f = gs.schemeMoveFighterId ? getFighter(gs, gs.schemeMoveFighterId) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Move {f?.name} up to {gs.schemeMoveRange} spaces - click a highlighted space, or skip.
            </div>
            <button className="skip-btn" onClick={() => act('skipSchemeSidekickMove')}>
              Skip Movement
            </button>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'scheme_reviveHarpy' && (() => {
        const f = gs.schemeMoveFighterId ? getFighter(gs, gs.schemeMoveFighterId) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Place {f?.name} on a highlighted space in Medusa's zone.
            </div>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'effect_moveFighter' && (() => {
        const f = gs.schemeMoveFighterId ? getFighter(gs, gs.schemeMoveFighterId) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Move {f?.name} up to {gs.schemeMoveRange} spaces - click a highlighted space, or skip.
            </div>
            <button className="skip-btn" onClick={() => act('skipEffectMove')}>
              Skip Movement
            </button>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'effect_opponentDiscard' && (
        <div className="phase-prompt defender-prompt">
          <div className="phase-text">
            {opponentPlayer.name}: Choose a card to discard.
            {mode === 'local' && <span className="warning"> (Hand the device to {opponentPlayer.name}!)</span>}
          </div>
        </div>
      )}

      {canInteract && gs.phase === 'effect_placeFighter' && (() => {
        const f = gs.schemeMoveFighterId ? getFighter(gs, gs.schemeMoveFighterId) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Place {f?.name} on any highlighted space.
            </div>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'effect_pushFighter' && (() => {
        const f = gs.pushTargetId ? getFighter(gs, gs.pushTargetId) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Push {f?.name} up to {gs.pushRange} space(s) - click a highlighted space, or skip.
            </div>
            <button className="skip-btn" onClick={() => act('skipEffectPush')}>
              Skip Push
            </button>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'combat_immediately_push' && (() => {
        const f = gs.pushTargetId ? getFighter(gs, gs.pushTargetId) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Move {f?.name} up to {gs.pushRange} space(s) - click a highlighted space, or skip.
            </div>
            <button className="skip-btn" onClick={() => act('skipCombatImmediatelyPush')}>
              Skip
            </button>
          </div>
        );
      })()}

      {canInteract && gs.phase === 'effect_zoneDamageTarget' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Boomerang Bounce: Click an enemy fighter in the zone to deal {gs.zoneDamageAmount} damage.
          </div>
        </div>
      )}

      {canInteract && gs.phase === 'effect_chooseSearch' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Meditate: Choose a card from your deck to add to your hand.
          </div>
        </div>
      )}

      {canInteract && gs.phase === 'mewtwo_cloneVats' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Clone Vats: Discard a card to place a Clone adjacent to Mewtwo. Click a card, or skip.
          </div>
          <button className="skip-btn" onClick={() => act('skipCloneVats')}>
            Skip Clone Vats
          </button>
        </div>
      )}

      {canInteract && (gs.phase === 'mewtwo_placeClone' || gs.phase === 'mewtwo_cloneBatch_place') && (
        <div className="phase-prompt">
          <div className="phase-text">
            Place a Clone on a highlighted space adjacent to Mewtwo.
          </div>
          {gs.phase === 'mewtwo_cloneBatch_place' && (
            <button className="skip-btn" onClick={() => act('skipClonePlacement')}>
              Skip Remaining Clones
            </button>
          )}
        </div>
      )}

      {canInteract && gs.phase === 'mewtwo_teleport_move' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Teleport: Click a highlighted space to move Mewtwo (may pass through fighters), or skip.
          </div>
          <button className="skip-btn" onClick={() => act('skipTeleport')}>
            Skip Movement
          </button>
        </div>
      )}

      {canInteract && gs.phase === 'mewtwo_cloneRush_discard' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Clone Rush: Choose a card from the opponent's hand to discard.
          </div>
        </div>
      )}

      {canInteract && gs.phase === 'discard_excess' && (
        <div className="phase-prompt">
          <div className="phase-text">
            {cp.name}: Discard down to 7 cards ({cp.hand.length - 7} more to discard).
          </div>
        </div>
      )}

      {gs.phase === 'gameOver' && (
        <div className="game-over-overlay">
          <div className="game-over-box">
            <h2>{gs.players[gs.winner!].name} Wins!</h2>
            <button onClick={() => {
              setGameState(null);
              setStateHistory([]);
              online.disconnect();
              setMode('menu');
            }}>Play Again</button>
          </div>
        </div>
      )}

      {/* Bottom resize handle */}
      <div className="resize-handle-h" onMouseDown={handleBottomResizeStart} />

      {/* Card hands */}
      <div className="hands-area" style={{ height: bottomHeight }}>
        {showMyHand()}
      </div>
    </div>
  );
};
