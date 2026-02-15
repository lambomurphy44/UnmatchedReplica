import React from 'react';
import type { Card, CharacterDef } from '../game/types';
import { getCardDef } from '../game/engine';

interface CardHandProps {
  hand: Card[];
  charDef: CharacterDef;
  onCardClick: (cardId: string) => void;
  filter?: 'attack' | 'defense' | 'scheme' | 'boost';
  label: string;
  hidden?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  attack: '#c62828',
  defense: '#1565c0',
  versatile: '#6a1b9a',
  scheme: '#f9a825',
};

export const CardHand: React.FC<CardHandProps> = ({ hand, charDef, onCardClick, filter, label, hidden }) => {
  const filteredCards = hand.map(card => ({
    card,
    def: getCardDef(card, charDef)!,
  })).filter(({ def }) => {
    if (!def) return false;
    if (!filter) return true;
    if (filter === 'attack') return def.type === 'attack' || def.type === 'versatile';
    if (filter === 'defense') return def.type === 'defense' || def.type === 'versatile';
    if (filter === 'scheme') return def.type === 'scheme';
    if (filter === 'boost') return true; // all cards can boost
    return true;
  });

  return (
    <div className="card-hand">
      <div className="card-hand-label">{label} ({hand.length} cards)</div>
      <div className="card-hand-cards">
        {hidden ? (
          <div className="card-hidden">{hand.length} cards (hidden)</div>
        ) : (
          filteredCards.map(({ card, def }) => (
            <div
              key={card.id}
              className="game-card"
              style={{ borderColor: TYPE_COLORS[def.type] || '#666' }}
              onClick={() => onCardClick(card.id)}
            >
              <div className="card-type" style={{ background: TYPE_COLORS[def.type] }}>
                {def.type.toUpperCase()}
              </div>
              <div className="card-name">{def.name}</div>
              <div className="card-value">
                {def.type !== 'scheme' && <span className="card-val-num">{def.value}</span>}
              </div>
              <div className="card-boost">Boost: +{def.boost}</div>
              {def.effect && (
                <div className="card-effect">{def.effect.description}</div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
