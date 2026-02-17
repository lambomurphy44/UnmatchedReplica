import React from 'react';
import type { GameState } from '../game/types';
import { getCharDef } from '../game/engine';

interface PlayerHUDProps {
  state: GameState;
  playerIndex: number;
  isActive: boolean;
}

export const PlayerHUD: React.FC<PlayerHUDProps> = ({ state, playerIndex, isActive }) => {
  const player = state.players[playerIndex];
  const charDef = getCharDef(player.characterId);

  return (
    <div className={`player-hud ${isActive ? 'active' : ''}`}>
      <div className="hud-header">
        <span className="hud-name">{player.name}</span>
        <span className="hud-char">{charDef.name}</span>
        {isActive && <span className="hud-turn">YOUR TURN</span>}
      </div>
      <div className="hud-fighters">
        {state.fighters.filter(f => f.owner === playerIndex).map(f => (
          <div key={f.id} className={`hud-fighter ${f.hp <= 0 ? 'dead' : ''}`}>
            <span>{f.isHero ? '★' : '●'} {f.name}</span>
            <span className="hud-hp">
              {f.hp > 0 ? `${f.hp}/${f.maxHp} HP` : 'DEFEATED'}
            </span>
          </div>
        ))}
      </div>
      {charDef.ability && (
        <div className="hud-ability">
          <span className="ability-name">{charDef.ability.name}:</span>{' '}
          {charDef.ability.description}
        </div>
      )}
      <div className="hud-stats">
        <span>Hand: {player.hand.length}</span>
        <span>Deck: {player.deck.length}</span>
        {isActive && <span>Actions: {player.actionsRemaining}</span>}
      </div>
    </div>
  );
};
