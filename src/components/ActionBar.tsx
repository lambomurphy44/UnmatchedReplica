import React from 'react';
import type { GameState } from '../game/types';
import { getAliveFighters, getValidTargets, getPlayableCards, currentPlayer } from '../game/engine';

interface ActionBarProps {
  state: GameState;
  onManeuver: () => void;
  onStartAttack: (fighterId: string) => void;
  onStartScheme: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({ state, onManeuver, onStartAttack, onStartScheme }) => {
  const player = currentPlayer(state);
  const alive = getAliveFighters(state, state.currentPlayer);
  const hasSchemes = getPlayableCards(state, 'scheme').length > 0;

  // Check if any fighter can attack anyone
  const canAnyAttack = alive.some(f => getValidTargets(state, f.id).length > 0);

  if (state.phase !== 'playing') return null;

  return (
    <div className="action-bar">
      <div className="action-label">
        {player.name}'s turn - {player.actionsRemaining} action(s) remaining. Choose:
      </div>
      <div className="action-buttons">
        <button className="action-btn maneuver" onClick={onManeuver}>
          Maneuver
          <small>Draw a card, then move</small>
        </button>

        {canAnyAttack && alive.map(f => (
          getValidTargets(state, f.id).length > 0 && (
            <button
              key={f.id}
              className="action-btn attack"
              onClick={() => onStartAttack(f.id)}
            >
              Attack with {f.name}
              <small>{f.isRanged ? 'Ranged' : 'Melee'}</small>
            </button>
          )
        ))}

        {hasSchemes && (
          <button className="action-btn scheme" onClick={onStartScheme}>
            Play Scheme
            <small>Play a scheme card</small>
          </button>
        )}
      </div>
    </div>
  );
};
