import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { GameState } from '../game/types';
import {
  createGame, currentPlayer, getCharDef, getFighter,
  getValidTargets, getReachableSpaces,
  getEffectMoveSpaces, getPlaceFighterSpaces,
  getPushSpaces,
  getMedusaGazeTargets,
  getSchemeTargets,
  getReviveHarpySpaces,
  getValidPlacementSpaces,
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
    if (gs.phase === 'attack_defenderCard' || gs.phase === 'effect_opponentDiscard') {
      return gs.currentPlayer !== myIndex; // defender = opponent of current player
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
    if (gs.phase === 'effect_moveFighter') {
      return getEffectMoveSpaces(gs);
    }
    if (gs.phase === 'effect_placeFighter') {
      return getPlaceFighterSpaces(gs);
    }
    if (gs.phase === 'scheme_reviveHarpy') {
      return getReviveHarpySpaces(gs);
    }
    if (gs.phase === 'effect_pushFighter' && gs.pushTargetId) {
      return getPushSpaces(gs, gs.pushTargetId, gs.pushRange);
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
      if (gs.phase === 'attack_defenderCard' && gs.currentPlayer !== myIndex) {
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
    if (gs.phase === 'attack_defenderCard') {
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
      {/* Undo button - local mode only */}
      {mode === 'local' && stateHistory.length > 0 && gs.phase !== 'gameOver' && (
        <button className="undo-btn" onClick={handleUndo}>Undo</button>
      )}

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

      {canInteract && gs.phase === 'playing' && (
        <ActionBar
          state={gs}
          onManeuver={handleManeuver}
          onStartAttack={handleStartAttack}
          onStartScheme={handleStartScheme}
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

      {canInteract && gs.phase === 'attack_defenderCard' && (
        <div className="phase-prompt defender-prompt">
          <div className="phase-text">
            {opponentPlayer.name}: Select a defense card or skip.
            {mode === 'local' && <span className="warning"> (Hand the device to the defender!)</span>}
          </div>
          <button className="skip-btn" onClick={handleSkipDefense}>Take the hit (no defense)</button>
        </div>
      )}

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

      {canInteract && gs.phase === 'effect_chooseSearch' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Meditate: Choose a card from your deck to add to your hand.
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
