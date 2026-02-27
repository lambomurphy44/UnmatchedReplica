import React from 'react';
import type { Card, CharacterDef, Fighter } from '../game/types';
import { getCardDef, canFighterPlayCard } from '../game/engine';

interface CardHandProps {
  hand: Card[];
  charDef: CharacterDef;
  onCardClick: (cardId: string) => void;
  filter?: 'attack' | 'defense' | 'scheme' | 'boost';
  fighter?: Fighter;
  aliveFighters?: Fighter[];
  label: string;
  hidden?: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  attack: '#c62828',
  defense: '#1565c0',
  versatile: '#6a1b9a',
  scheme: '#f9a825',
};

export const CardHand: React.FC<CardHandProps> = ({ hand, charDef, onCardClick, filter, fighter, aliveFighters, label, hidden }) => {
  // Build quantity map from deck definition
  const quantityMap: Record<string, number> = {};
  for (const dc of charDef.deckCards) {
    quantityMap[dc.id] = dc.quantity;
  }

  // Map all cards to their defs
  const allCards = hand.map(card => ({
    card,
    def: getCardDef(card, charDef)!,
  })).filter(({ def }) => !!def);

  // Determine which cards are playable (when a filter is active)
  const isPlayable = (def: typeof allCards[0]['def']): boolean => {
    if (!filter) return true;
    // Check fighter restriction
    if (fighter && !canFighterPlayCard(fighter, def)) return false;
    if (aliveFighters && !aliveFighters.some(f => canFighterPlayCard(f, def))) return false;
    // Check type filter
    if (filter === 'attack') return def.type === 'attack' || def.type === 'versatile';
    if (filter === 'defense') return def.type === 'defense' || def.type === 'versatile';
    if (filter === 'scheme') return def.type === 'scheme';
    if (filter === 'boost') return true;
    return true;
  };

  return (
    <div className="card-hand">
      <div className="card-hand-label">{label} ({hand.length} cards)</div>
      <div className="card-hand-cards">
        {hidden ? (
          <div className="card-hidden">{hand.length} cards (hidden)</div>
        ) : (
          allCards.map(({ card, def }) => {
            const playable = isPlayable(def);
            return (
              <div
                key={card.id}
                className={`game-card ${!playable && filter ? 'card-dimmed' : ''}`}
                style={{ borderColor: TYPE_COLORS[def.type] || '#666' }}
                onClick={() => {
                  if (playable || !filter) {
                    onCardClick(card.id);
                  }
                }}
              >
                <div className="card-type" style={{ background: TYPE_COLORS[def.type] }}>
                  {def.type.toUpperCase()}
                </div>
                <div className="card-name">{def.name}</div>
                <div className="card-value">
                  {def.type !== 'scheme' && <span className="card-val-num">{def.value}</span>}
                </div>
                <div className="card-boost">Boost: +{def.boost}</div>
                <div className="card-qty">x{quantityMap[def.id] ?? '?'} in deck</div>
                {def.effectText && (
                  <div className="card-effect">{def.effectText}</div>
                )}
                {def.restriction !== 'any' && (
                  <div className="card-restriction">{def.restriction === 'hero' ? 'Hero only' : 'Sidekick only'}</div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
