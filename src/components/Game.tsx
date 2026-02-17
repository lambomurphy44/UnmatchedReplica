import React, { useState, useCallback } from 'react';
import type { GameState } from '../game/types';
import {
  createGame, currentPlayer, getCharDef, getFighter,
  getValidTargets, getReachableSpaces,
  startManeuver, applyManeuverBoost, selectManeuverFighter,
  executeManeuverMove, skipFighterMove, skipAllManeuverMoves,
  startAttack, selectAttackTarget, selectAttackCard, selectDefenseCard,
  selectArthurBoostCard,
  playScheme, getSchemeTargets, resolveSchemeTarget,
  resolveSchemeSidekickMove, skipSchemeSidekickMove,
  discardExcessCard,
  useMedusaGaze, skipMedusaGaze, getMedusaGazeTargets,
  placeSidekick, getValidPlacementSpaces,
} from '../game/engine';
import { Board } from './Board';
import { CardHand } from './CardHand';
import { PlayerHUD } from './PlayerHUD';
import { ActionBar } from './ActionBar';
import { GameLog } from './GameLog';
import { ALL_CHARACTERS } from '../game/characters';

const MAX_HISTORY = 50;

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [stateHistory, setStateHistory] = useState<GameState[]>([]);

  // Character select
  const [p0Char, setP0Char] = useState('king_arthur');
  const [p1Char, setP1Char] = useState('medusa');
  const [p0Name, setP0Name] = useState('Player 1');
  const [p1Name, setP1Name] = useState('Player 2');

  // Undo-aware state updater
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

  const startGame = () => {
    setStateHistory([]);
    setGameState(createGame(p0Char, p1Char, p0Name, p1Name));
  };

  // ---- Handlers ----

  const handleManeuver = useCallback(() => {
    if (!gameState) return;
    pushState(startManeuver(gameState));
  }, [gameState, pushState]);

  const handleStartAttack = useCallback((fighterId: string) => {
    if (!gameState) return;
    pushState(startAttack(gameState, fighterId));
  }, [gameState, pushState]);

  const handleStartScheme = useCallback(() => {
    if (!gameState) return;
    pushState({ ...JSON.parse(JSON.stringify(gameState)), phase: 'scheme_selectCard' });
  }, [gameState, pushState]);

  const handleSpaceClick = useCallback((spaceId: string) => {
    if (!gameState) return;

    // Sidekick placement
    if (gameState.phase === 'place_sidekick') {
      pushState(placeSidekick(gameState, spaceId));
      return;
    }

    // Maneuver movement
    if (gameState.phase === 'maneuver_moveFighter') {
      pushState(executeManeuverMove(gameState, spaceId));
      return;
    }

    // Attack target selection
    if (gameState.phase === 'attack_selectTarget') {
      const targets = getValidTargets(gameState, gameState.selectedFighter!);
      const targetOnSpace = targets.find(t => t.spaceId === spaceId);
      if (targetOnSpace) {
        pushState(selectAttackTarget(gameState, targetOnSpace.id));
      }
      return;
    }

    // Scheme target selection (Petrify)
    if (gameState.phase === 'scheme_selectTarget') {
      const targets = getSchemeTargets(gameState);
      const targetOnSpace = targets.find(t => t.spaceId === spaceId);
      if (targetOnSpace) {
        pushState(resolveSchemeTarget(gameState, targetOnSpace.id));
      }
      return;
    }

    // Scheme sidekick movement (Royal Command)
    if (gameState.phase === 'scheme_moveSidekick') {
      pushState(resolveSchemeSidekickMove(gameState, spaceId));
      return;
    }

    // Medusa gaze target
    if (gameState.phase === 'medusa_startAbility') {
      const targets = getMedusaGazeTargets(gameState);
      const targetOnSpace = targets.find(t => t.spaceId === spaceId);
      if (targetOnSpace) {
        pushState(useMedusaGaze(gameState, targetOnSpace.id));
      }
      return;
    }
  }, [gameState, pushState]);

  const handleCardClick = useCallback((cardId: string) => {
    if (!gameState) return;

    // Maneuver boost
    if (gameState.phase === 'maneuver_boost') {
      pushState(applyManeuverBoost(gameState, cardId));
      return;
    }

    // Attack card selection
    if (gameState.phase === 'attack_selectCard') {
      pushState(selectAttackCard(gameState, cardId));
      return;
    }

    // Arthur boost card
    if (gameState.phase === 'arthur_attackBoost') {
      pushState(selectArthurBoostCard(gameState, cardId));
      return;
    }

    // Defense card selection
    if (gameState.phase === 'attack_defenderCard') {
      pushState(selectDefenseCard(gameState, cardId));
      return;
    }

    // Scheme card selection
    if (gameState.phase === 'scheme_selectCard') {
      pushState(playScheme(gameState, cardId));
      return;
    }

    // Discard excess
    if (gameState.phase === 'discard_excess') {
      pushState(discardExcessCard(gameState, cardId));
      return;
    }
  }, [gameState, pushState]);

  const handleSkipDefense = useCallback(() => {
    if (!gameState) return;
    pushState(selectDefenseCard(gameState, null));
  }, [gameState, pushState]);

  // ---- Computed highlights ----

  const highlightedSpaces = (() => {
    if (!gameState) return [];

    // Sidekick placement
    if (gameState.phase === 'place_sidekick' && gameState.placementPlayer !== null) {
      return getValidPlacementSpaces(gameState, gameState.placementPlayer);
    }

    // Maneuver movement
    if (gameState.phase === 'maneuver_moveFighter' && gameState.maneuverCurrentFighter) {
      const f = getFighter(gameState, gameState.maneuverCurrentFighter);
      if (f) {
        const range = f.moveValue + gameState.maneuverBoost;
        return getReachableSpaces(gameState.board, f.spaceId, range, gameState.fighters, f.id);
      }
    }

    // Attack target
    if (gameState.phase === 'attack_selectTarget' && gameState.selectedFighter) {
      return getValidTargets(gameState, gameState.selectedFighter).map(t => t.spaceId);
    }

    // Scheme target (Petrify)
    if (gameState.phase === 'scheme_selectTarget') {
      return getSchemeTargets(gameState).map(t => t.spaceId);
    }

    // Scheme sidekick movement
    if (gameState.phase === 'scheme_moveSidekick' && gameState.schemeMoveFighterId) {
      const f = getFighter(gameState, gameState.schemeMoveFighterId);
      if (f) {
        return getReachableSpaces(gameState.board, f.spaceId, gameState.schemeMoveRange, gameState.fighters, f.id);
      }
    }

    // Medusa gaze
    if (gameState.phase === 'medusa_startAbility') {
      return getMedusaGazeTargets(gameState).map(t => t.spaceId);
    }

    return [];
  })();

  // ---- Render ----

  if (!gameState) {
    return (
      <div className="setup-screen">
        <h1>Unmatched</h1>
        <h2>Battle of Legends</h2>
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
        <button className="start-btn" onClick={startGame}>Start Game</button>
      </div>
    );
  }

  const cp = currentPlayer(gameState);
  const charDef = getCharDef(cp.characterId);
  const opponentIndex = gameState.currentPlayer === 0 ? 1 : 0;
  const opponentPlayer = gameState.players[opponentIndex];
  const opponentCharDef = getCharDef(opponentPlayer.characterId);
  const placingPlayerName = gameState.placementPlayer !== null
    ? gameState.players[gameState.placementPlayer].name : '';
  const nextPlacementFighter = gameState.placementFighterIds.length > 0
    ? getFighter(gameState, gameState.placementFighterIds[0]) : null;

  return (
    <div className="game-container">
      {/* Undo button */}
      {stateHistory.length > 0 && gameState.phase !== 'gameOver' && (
        <button className="undo-btn" onClick={handleUndo}>Undo</button>
      )}

      {/* Top: player HUDs */}
      <div className="huds-row">
        <PlayerHUD state={gameState} playerIndex={0} isActive={gameState.currentPlayer === 0} />
        <PlayerHUD state={gameState} playerIndex={1} isActive={gameState.currentPlayer === 1} />
      </div>

      {/* Main area */}
      <div className="main-area">
        <div className="board-area">
          <Board
            state={gameState}
            reachableSpaces={highlightedSpaces}
            onSpaceClick={handleSpaceClick}
          />
        </div>
        <div className="right-panel">
          <GameLog log={gameState.log} />
        </div>
      </div>

      {/* Phase-specific UI */}

      {gameState.phase === 'place_sidekick' && (
        <div className="phase-prompt">
          <div className="phase-text">
            {placingPlayerName}: Place {nextPlacementFighter?.name} on a highlighted space in your starting zone.
          </div>
        </div>
      )}

      {gameState.phase === 'medusa_startAbility' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Medusa's Gaze: Click an enemy fighter in Medusa's zone to deal 1 damage, or skip.
          </div>
          <button className="skip-btn" onClick={() => pushState(skipMedusaGaze(gameState))}>
            Skip Gaze
          </button>
        </div>
      )}

      {gameState.phase === 'playing' && (
        <ActionBar
          state={gameState}
          onManeuver={handleManeuver}
          onStartAttack={handleStartAttack}
          onStartScheme={handleStartScheme}
        />
      )}

      {gameState.phase === 'maneuver_boost' && (
        <div className="phase-prompt">
          <div className="phase-text">
            Discard a card for movement boost? Click a card below, or skip.
          </div>
          <button className="skip-btn" onClick={() => pushState(applyManeuverBoost(gameState, null))}>
            Skip Boost
          </button>
        </div>
      )}

      {gameState.phase === 'maneuver_selectFighter' && (
        <div className="phase-prompt">
          <div className="phase-text">Select a fighter to move{gameState.maneuverBoost > 0 ? ` (+${gameState.maneuverBoost} boost)` : ''}:</div>
          <div className="fighter-select-buttons">
            {gameState.maneuverFightersToMove.map(fid => {
              const f = getFighter(gameState, fid);
              if (!f) return null;
              return (
                <button key={fid} className="fighter-btn"
                  onClick={() => pushState(selectManeuverFighter(gameState, fid))}>
                  {f.isHero ? '★' : '●'} {f.name} (move: {f.moveValue + gameState.maneuverBoost})
                </button>
              );
            })}
          </div>
          <button className="skip-btn" onClick={() => pushState(skipAllManeuverMoves(gameState))}>
            Skip All Movement
          </button>
        </div>
      )}

      {gameState.phase === 'maneuver_moveFighter' && (() => {
        const f = gameState.maneuverCurrentFighter ? getFighter(gameState, gameState.maneuverCurrentFighter) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Moving {f?.name} - click a highlighted space, or skip.
            </div>
            <button className="skip-btn" onClick={() => pushState(skipFighterMove(gameState))}>
              Skip This Fighter
            </button>
          </div>
        );
      })()}

      {gameState.phase === 'attack_selectTarget' && (
        <div className="phase-prompt">
          <div className="phase-text">Click a highlighted space to select attack target.</div>
          <button className="skip-btn" onClick={() => pushState({ ...JSON.parse(JSON.stringify(gameState)), phase: 'playing', selectedFighter: null })}>Cancel</button>
        </div>
      )}

      {gameState.phase === 'attack_selectCard' && (
        <div className="phase-prompt">
          <div className="phase-text">Select an attack card from your hand:</div>
        </div>
      )}

      {gameState.phase === 'arthur_attackBoost' && (
        <div className="phase-prompt">
          <div className="phase-text">
            King Arthur: Play an additional card as a boost (its BOOST value is added to attack), or skip.
          </div>
          <button className="skip-btn" onClick={() => pushState(selectArthurBoostCard(gameState, null))}>
            Skip Boost
          </button>
        </div>
      )}

      {gameState.phase === 'attack_defenderCard' && (
        <div className="phase-prompt defender-prompt">
          <div className="phase-text">
            {opponentPlayer.name}: Select a defense card or skip.
            <span className="warning"> (Hand the device to the defender!)</span>
          </div>
          <button className="skip-btn" onClick={handleSkipDefense}>Take the hit (no defense)</button>
        </div>
      )}

      {gameState.phase === 'scheme_selectCard' && (
        <div className="phase-prompt">
          <div className="phase-text">Select a scheme card to play:</div>
          <button className="skip-btn" onClick={() => pushState({ ...JSON.parse(JSON.stringify(gameState)), phase: 'playing' })}>Cancel</button>
        </div>
      )}

      {gameState.phase === 'scheme_selectTarget' && (
        <div className="phase-prompt">
          <div className="phase-text">Select an enemy fighter in your hero's zone to target:</div>
        </div>
      )}

      {gameState.phase === 'scheme_moveSidekick' && (() => {
        const f = gameState.schemeMoveFighterId ? getFighter(gameState, gameState.schemeMoveFighterId) : null;
        return (
          <div className="phase-prompt">
            <div className="phase-text">
              Move {f?.name} up to {gameState.schemeMoveRange} spaces - click a highlighted space, or skip.
            </div>
            <button className="skip-btn" onClick={() => pushState(skipSchemeSidekickMove(gameState))}>
              Skip Movement
            </button>
          </div>
        );
      })()}

      {gameState.phase === 'discard_excess' && (
        <div className="phase-prompt">
          <div className="phase-text">
            {cp.name}: Discard down to 7 cards ({cp.hand.length - 7} more to discard).
          </div>
        </div>
      )}

      {gameState.phase === 'gameOver' && (
        <div className="game-over-overlay">
          <div className="game-over-box">
            <h2>{gameState.players[gameState.winner!].name} Wins!</h2>
            <button onClick={() => { setGameState(null); setStateHistory([]); }}>Play Again</button>
          </div>
        </div>
      )}

      {/* Card hands */}
      <div className="hands-area">
        {gameState.phase === 'attack_defenderCard' ? (
          <CardHand
            hand={opponentPlayer.hand}
            charDef={opponentCharDef}
            onCardClick={handleCardClick}
            filter="defense"
            label={`${opponentPlayer.name}'s Hand (Defense)`}
          />
        ) : (
          <CardHand
            hand={cp.hand}
            charDef={charDef}
            onCardClick={handleCardClick}
            filter={
              gameState.phase === 'attack_selectCard' ? 'attack' :
              gameState.phase === 'scheme_selectCard' ? 'scheme' :
              undefined
            }
            label={`${cp.name}'s Hand`}
          />
        )}
      </div>
    </div>
  );
};
