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

/** Map fighter to its portrait SVG path */
function getPortrait(f: Fighter): string {
  if (f.characterId === 'king_arthur') {
    return f.isHero ? '/art/king_arthur.svg' : '/art/merlin.svg';
  }
  // medusa
  return f.isHero ? '/art/medusa.svg' : '/art/harpy.svg';
}

/** Player border glow color */
function getPlayerColor(owner: number): string {
  return owner === 0 ? '#4fc3f7' : '#ef5350';
}

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

            {/* Fighter portrait tokens */}
            {fOnSpace.map((f, i) => {
              const count = fOnSpace.length;
              // Size: hero gets bigger token, sidekick smaller
              const r = f.isHero ? 14 : 10;
              // Offset to avoid overlap when multiple fighters share adjacent spaces
              // (shouldn't share same space, but handle display for edge cases)
              let offsetX = 0;
              let offsetY = 0;
              if (count === 1) {
                // Centered
              } else if (count === 2) {
                offsetX = (i === 0 ? -10 : 10);
              } else {
                // 3+ fighters: spread in a triangle-ish pattern
                const angle = (i / count) * Math.PI * 2 - Math.PI / 2;
                offsetX = Math.cos(angle) * 12;
                offsetY = Math.sin(angle) * 12;
              }

              const tx = cx + offsetX;
              const ty = cy + offsetY;
              const color = getPlayerColor(f.owner);
              const portrait = getPortrait(f);

              return (
                <g key={f.id}>
                  {/* Player color ring (border) */}
                  <circle
                    cx={tx} cy={ty} r={r + 2}
                    fill="none"
                    stroke={color}
                    strokeWidth={2.5}
                  />
                  {/* Dark background behind portrait */}
                  <circle cx={tx} cy={ty} r={r} fill="#222" />
                  {/* Portrait image clipped to circle */}
                  <clipPath id={`token-${f.id}`}>
                    <circle cx={tx} cy={ty} r={r} />
                  </clipPath>
                  <image
                    href={portrait}
                    x={tx - r}
                    y={ty - r}
                    width={r * 2}
                    height={r * 2}
                    clipPath={`url(#token-${f.id})`}
                    preserveAspectRatio="xMidYMid slice"
                  />
                  {/* HP indicator (small number below token) */}
                  <text
                    x={tx}
                    y={ty + r + 10}
                    textAnchor="middle"
                    fill={color}
                    fontSize={8}
                    fontWeight="bold"
                  >
                    {f.hp}/{f.maxHp}
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
