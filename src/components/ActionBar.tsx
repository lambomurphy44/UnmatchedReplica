import React from 'react';
import type { GameState } from '../game/types';
import { getAliveFighters, getValidTargets, getPlayableCards, currentPlayer, getCharDef, canFighterPlayCard } from '../game/engine';

interface ActionBarProps {
  state: GameState;
  onManeuver: () => void;
  onStartAttack: (fighterId: string) => void;
  onStartScheme: () => void;
}

export const ActionBar: React.FC<ActionBarProps> = ({ state, onManeuver, onStartAttack, onStartScheme }) => {
  const player = currentPlayer(state);
  const alive = getAliveFighters(state, state.currentPlayer);
  const charDef = getCharDef(player.characterId);
  // Check if any alive fighter can play a scheme card
  const hasSchemes = getPlayableCards(state, 'scheme').some(({ def }) =>
    alive.some(f => canFighterPlayCard(f, def))
  );

  // For each fighter, check if they have valid targets AND playable attack/versatile cards
  const attackableFighters = alive.filter(f => {
    if (getValidTargets(state, f.id).length === 0) return false;
    // Check that the player has at least one attack/versatile card this fighter can play
    const hasPlayableAttackCards = player.hand.some(card => {
      const def = charDef.deckCards.find(d => d.id === card.defId);
      if (!def) return false;
      if (def.type !== 'attack' && def.type !== 'versatile') return false;
      return canFighterPlayCard(f, def);
    });
    return hasPlayableAttackCards;
  });

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

        {attackableFighters.map(f => (
          <button
            key={f.id}
            className="action-btn attack"
            onClick={() => onStartAttack(f.id)}
          >
            Attack with {f.name}
            <small>{f.isRanged ? 'Ranged' : 'Melee'}</small>
          </button>
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
