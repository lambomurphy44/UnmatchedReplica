import React from 'react';
import type { GameState, Fighter, Space } from '../game/types';

interface BoardProps {
  state: GameState;
  reachableSpaces: string[];
  onSpaceClick: (spaceId: string) => void;
}

const ZONE_COLORS: Record<string, string> = {
  A: '#4a6741',
  B: '#5c4a6d',
  C: '#6d5a3a',
  D: '#3a5a6d',
};

const CELL_SIZE = 80;
const PADDING = 40;

export const Board: React.FC<BoardProps> = ({ state, reachableSpaces, onSpaceClick }) => {
  const { board, fighters } = state;
  const maxX = Math.max(...board.spaces.map(s => s.x));
  const maxY = Math.max(...board.spaces.map(s => s.y));
  const svgW = (maxX + 1) * CELL_SIZE + PADDING * 2;
  const svgH = (maxY + 1) * CELL_SIZE + PADDING * 2;

  const spacePos = (s: Space) => ({
    cx: s.x * CELL_SIZE + PADDING + CELL_SIZE / 2,
    cy: s.y * CELL_SIZE + PADDING + CELL_SIZE / 2,
  });

  const fightersOnSpace = (spaceId: string): Fighter[] =>
    fighters.filter(f => f.spaceId === spaceId && f.hp > 0);

  return (
    <svg width={svgW} height={svgH} className="board-svg">
      {/* Edges */}
      {board.spaces.map(space =>
        space.adjacentIds.map(adjId => {
          const adj = board.spaces.find(s => s.id === adjId);
          if (!adj || adj.id < space.id) return null;
          const a = spacePos(space);
          const b = spacePos(adj);
          return (
            <line
              key={`${space.id}-${adjId}`}
              x1={a.cx} y1={a.cy} x2={b.cx} y2={b.cy}
              stroke="#555" strokeWidth={2} opacity={0.5}
            />
          );
        })
      )}

      {/* Spaces */}
      {board.spaces.map(space => {
        const { cx, cy } = spacePos(space);
        const isReachable = reachableSpaces.includes(space.id);
        const fOnSpace = fightersOnSpace(space.id);

        return (
          <g key={space.id} onClick={() => onSpaceClick(space.id)} style={{ cursor: isReachable ? 'pointer' : 'default' }}>
            {/* Space circle */}
            <circle
              cx={cx} cy={cy} r={30}
              fill={ZONE_COLORS[space.zone] || '#444'}
              stroke={isReachable ? '#ffeb3b' : '#888'}
              strokeWidth={isReachable ? 3 : 1.5}
              opacity={isReachable ? 1 : 0.8}
            />
            {/* Zone label */}
            <text x={cx} y={cy - 18} textAnchor="middle" fill="#aaa" fontSize={9}>
              {space.id}
            </text>

            {/* Fighter tokens */}
            {fOnSpace.map((f, i) => {
              const offsetX = (i - (fOnSpace.length - 1) / 2) * 14;
              const color = f.owner === 0 ? '#4fc3f7' : '#ef5350';
              const symbol = f.isHero ? '★' : '●';
              return (
                <g key={f.id}>
                  <text
                    x={cx + offsetX}
                    y={cy + 5}
                    textAnchor="middle"
                    fill={color}
                    fontSize={f.isHero ? 18 : 12}
                    fontWeight="bold"
                  >
                    {symbol}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};
