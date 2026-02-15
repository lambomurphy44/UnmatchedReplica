import React, { useState, useCallback } from 'react';
import type { GameState } from '../game/types';
import {
  createGame, currentPlayer, getCharDef, getFighter,
  getAliveFighters, getValidTargets, getReachableSpaces,
  startManeuver, maneuverMove, skipManeuverMove,
  startAttack, selectAttackTarget, selectAttackCard, selectDefenseCard,
  playScheme,
} from '../game/engine';
import { Board } from './Board';
import { CardHand } from './CardHand';
import { PlayerHUD } from './PlayerHUD';
import { ActionBar } from './ActionBar';
import { GameLog } from './GameLog';
import { ALL_CHARACTERS } from '../game/characters';

export const Game: React.FC = () => {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [selectedMoveFighter, setSelectedMoveFighter] = useState<string | null>(null);
  const [boostCardId, setBoostCardId] = useState<string | null>(null);
  const [showBoostPrompt, setShowBoostPrompt] = useState(false);
  const [pendingMoveTarget, setPendingMoveTarget] = useState<string | null>(null);

  // Character select
  const [p0Char, setP0Char] = useState('king_arthur');
  const [p1Char, setP1Char] = useState('medusa');
  const [p0Name, setP0Name] = useState('Player 1');
  const [p1Name, setP1Name] = useState('Player 2');

  const startGame = () => {
    setGameState(createGame(p0Char, p1Char, p0Name, p1Name));
  };

  // ---- Phase handlers ----

  const handleManeuver = useCallback(() => {
    if (!gameState) return;
    setGameState(startManeuver(gameState));
  }, [gameState]);

  const handleStartAttack = useCallback((fighterId: string) => {
    if (!gameState) return;
    setGameState(startAttack(gameState, fighterId));
  }, [gameState]);

  const handleStartScheme = useCallback(() => {
    if (!gameState) return;
    setGameState(prev => prev ? { ...prev, phase: 'scheme_selectCard' } : null);
  }, [gameState]);

  const handleSpaceClick = useCallback((spaceId: string) => {
    if (!gameState) return;

    if (gameState.phase === 'maneuver_move') {
      if (!selectedMoveFighter) return;
      // Ask for boost?
      setPendingMoveTarget(spaceId);
      setShowBoostPrompt(true);
    }

    if (gameState.phase === 'attack_selectTarget') {
      const targets = getValidTargets(gameState, gameState.selectedFighter!);
      const targetOnSpace = targets.find(t => t.spaceId === spaceId);
      if (targetOnSpace) {
        setGameState(selectAttackTarget(gameState, targetOnSpace.id));
      }
    }
  }, [gameState, selectedMoveFighter]);

  const executeMove = useCallback((withBoost: boolean) => {
    if (!gameState || !selectedMoveFighter || !pendingMoveTarget) return;
    if (withBoost && boostCardId) {
      setGameState(maneuverMove(gameState, selectedMoveFighter, pendingMoveTarget, boostCardId));
    } else {
      setGameState(maneuverMove(gameState, selectedMoveFighter, pendingMoveTarget));
    }
    setSelectedMoveFighter(null);
    setBoostCardId(null);
    setShowBoostPrompt(false);
    setPendingMoveTarget(null);
  }, [gameState, selectedMoveFighter, pendingMoveTarget, boostCardId]);

  const handleCardClick = useCallback((cardId: string) => {
    if (!gameState) return;

    if (gameState.phase === 'attack_selectCard') {
      setGameState(selectAttackCard(gameState, cardId));
      return;
    }

    if (gameState.phase === 'attack_defenderCard') {
      setGameState(selectDefenseCard(gameState, cardId));
      return;
    }

    if (gameState.phase === 'scheme_selectCard') {
      setGameState(playScheme(gameState, cardId));
      return;
    }

    if (showBoostPrompt) {
      setBoostCardId(cardId);
      return;
    }
  }, [gameState, showBoostPrompt]);

  const handleSkipDefense = useCallback(() => {
    if (!gameState) return;
    setGameState(selectDefenseCard(gameState, null));
  }, [gameState]);

  const handleSkipManeuverMove = useCallback(() => {
    if (!gameState) return;
    setGameState(skipManeuverMove(gameState));
    setSelectedMoveFighter(null);
  }, [gameState]);

  const handleSelectFighterForMove = useCallback((fighterId: string) => {
    setSelectedMoveFighter(fighterId);
  }, []);

  // ---- Computed ----

  const reachableSpaces = (() => {
    if (!gameState || gameState.phase !== 'maneuver_move' || !selectedMoveFighter) return [];
    const f = getFighter(gameState, selectedMoveFighter);
    if (!f) return [];
    return getReachableSpaces(gameState.board, f.spaceId, f.moveValue, gameState.fighters, f.id);
  })();

  const targetSpaces = (() => {
    if (!gameState || gameState.phase !== 'attack_selectTarget' || !gameState.selectedFighter) return [];
    const targets = getValidTargets(gameState, gameState.selectedFighter);
    return targets.map(t => t.spaceId);
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

  return (
    <div className="game-container">
      {/* Top: player HUDs */}
      <div className="huds-row">
        <PlayerHUD state={gameState} playerIndex={0} isActive={gameState.currentPlayer === 0} />
        <PlayerHUD state={gameState} playerIndex={1} isActive={gameState.currentPlayer === 1} />
      </div>

      {/* Main area */}
      <div className="main-area">
        {/* Board */}
        <div className="board-area">
          <Board
            state={gameState}
            reachableSpaces={gameState.phase === 'maneuver_move' ? reachableSpaces : targetSpaces}
            onSpaceClick={handleSpaceClick}
          />
        </div>

        {/* Right panel */}
        <div className="right-panel">
          <GameLog log={gameState.log} />
        </div>
      </div>

      {/* Phase-specific UI */}
      {gameState.phase === 'playing' && (
        <ActionBar
          state={gameState}
          onManeuver={handleManeuver}
          onStartAttack={handleStartAttack}
          onStartScheme={handleStartScheme}
        />
      )}

      {gameState.phase === 'maneuver_move' && (
        <div className="phase-prompt">
          <div className="phase-text">Select a fighter to move, then click a highlighted space:</div>
          <div className="fighter-select-buttons">
            {getAliveFighters(gameState, gameState.currentPlayer).map(f => (
              <button
                key={f.id}
                className={`fighter-btn ${selectedMoveFighter === f.id ? 'selected' : ''}`}
                onClick={() => handleSelectFighterForMove(f.id)}
              >
                {f.isHero ? '★' : '●'} {f.name} (move: {f.moveValue})
              </button>
            ))}
          </div>

          {showBoostPrompt && (
            <div className="boost-prompt">
              <div>Boost movement? Click a card below to discard for its boost value, or:</div>
              <button onClick={() => executeMove(false)}>Move without boost</button>
              {boostCardId && <button onClick={() => executeMove(true)}>Move with boost</button>}
            </div>
          )}

          <button className="skip-btn" onClick={handleSkipManeuverMove}>Skip movement</button>
        </div>
      )}

      {gameState.phase === 'attack_selectTarget' && (
        <div className="phase-prompt">
          <div className="phase-text">Click a highlighted space to select attack target.</div>
          <button className="skip-btn" onClick={() => setGameState(prev => prev ? { ...prev, phase: 'playing', selectedFighter: null } : null)}>Cancel</button>
        </div>
      )}

      {gameState.phase === 'attack_selectCard' && (
        <div className="phase-prompt">
          <div className="phase-text">Select an attack card from your hand:</div>
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
          <button className="skip-btn" onClick={() => setGameState(prev => prev ? { ...prev, phase: 'playing' } : null)}>Cancel</button>
        </div>
      )}

      {gameState.phase === 'gameOver' && (
        <div className="game-over-overlay">
          <div className="game-over-box">
            <h2>{gameState.players[gameState.winner!].name} Wins!</h2>
            <button onClick={() => setGameState(null)}>Play Again</button>
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
