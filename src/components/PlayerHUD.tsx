import React, { useState } from 'react';
import type { GameState } from '../game/types';
import { getCharDef, getCardDef } from '../game/engine';

interface PlayerHUDProps {
  state: GameState;
  playerIndex: number;
  isActive: boolean;
}

export const PlayerHUD: React.FC<PlayerHUDProps> = ({ state, playerIndex, isActive }) => {
  const player = state.players[playerIndex];
  const charDef = getCharDef(player.characterId);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [discardSort, setDiscardSort] = useState<'order' | 'grouped'>('order');

  const topDiscard = player.discard.length > 0 ? player.discard[player.discard.length - 1] : null;
  const topDiscardDef = topDiscard ? getCardDef(topDiscard, charDef) : null;

  // Build sorted discard for expanded view
  const discardCards = player.discard.map(card => ({
    card,
    def: getCardDef(card, charDef)!,
  })).filter(({ def }) => !!def);

  const sortedDiscard = discardSort === 'grouped'
    ? [...discardCards].sort((a, b) => {
        // Group by card name, then by type
        const nameCompare = a.def.name.localeCompare(b.def.name);
        if (nameCompare !== 0) return nameCompare;
        return a.def.type.localeCompare(b.def.type);
      })
    : [...discardCards].reverse(); // Most recent first

  const TYPE_COLORS: Record<string, string> = {
    attack: '#c62828',
    defense: '#1565c0',
    versatile: '#6a1b9a',
    scheme: '#f9a825',
  };

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
        <span>Discard: {player.discard.length}</span>
        {isActive && <span>Actions: {player.actionsRemaining}</span>}
      </div>

      {/* Discard pile - top card preview */}
      <div className="hud-discard-section">
        <div
          className="hud-discard-header"
          onClick={() => player.discard.length > 0 && setDiscardOpen(!discardOpen)}
          style={{ cursor: player.discard.length > 0 ? 'pointer' : 'default' }}
        >
          <span className="hud-discard-label">
            Discard ({player.discard.length})
            {player.discard.length > 0 && <span className="hud-discard-arrow">{discardOpen ? ' ▼' : ' ▶'}</span>}
          </span>
        </div>

        {topDiscardDef && !discardOpen && (
          <div
            className="hud-discard-top-card"
            style={{ borderLeftColor: TYPE_COLORS[topDiscardDef.type] || '#666' }}
            onClick={() => setDiscardOpen(true)}
          >
            <span className="hud-discard-top-type" style={{ color: TYPE_COLORS[topDiscardDef.type] }}>
              {topDiscardDef.type.toUpperCase()}
            </span>
            {' '}
            <span className="hud-discard-top-name">{topDiscardDef.name}</span>
            {topDiscardDef.type !== 'scheme' && (
              <span className="hud-discard-top-val"> ({topDiscardDef.value})</span>
            )}
          </div>
        )}

        {/* Expanded discard pile */}
        {discardOpen && (
          <div className="hud-discard-expanded">
            <div className="hud-discard-sort-row">
              <button
                className={`hud-discard-sort-btn ${discardSort === 'order' ? 'active' : ''}`}
                onClick={() => setDiscardSort('order')}
              >
                Recent
              </button>
              <button
                className={`hud-discard-sort-btn ${discardSort === 'grouped' ? 'active' : ''}`}
                onClick={() => setDiscardSort('grouped')}
              >
                Grouped
              </button>
            </div>
            <div className="hud-discard-list">
              {sortedDiscard.map(({ card, def }) => (
                <div
                  key={card.id}
                  className="hud-discard-item"
                  style={{ borderLeftColor: TYPE_COLORS[def.type] || '#666' }}
                >
                  <span className="hud-discard-item-type" style={{ color: TYPE_COLORS[def.type] }}>
                    {def.type.substring(0, 3).toUpperCase()}
                  </span>
                  <span className="hud-discard-item-name">{def.name}</span>
                  {def.type !== 'scheme' && (
                    <span className="hud-discard-item-val">{def.value}</span>
                  )}
                  <span className="hud-discard-item-boost">+{def.boost}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
