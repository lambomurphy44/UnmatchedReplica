import React, { useRef, useState, useCallback, useEffect } from 'react';
import type { GameState, Fighter, Space } from '../game/types';

interface BoardProps {
  state: GameState;
  reachableSpaces: string[];
  onSpaceClick: (spaceId: string) => void;
}

// Colorblind-friendly zone colors (Wong palette — distinguishable by deuteranopia/protanopia)
const ZONE_COLORS: Record<string, string> = {
  A: '#0077BB', // Blue   — Foyer
  B: '#EE7733', // Orange — Library
  C: '#CCBB44', // Yellow — Sanctum
  D: '#882288', // Purple — Observatory
  E: '#33BBEE', // Cyan   — Balcony
};

const ZONE_NAMES: Record<string, string> = {
  A: 'Foyer',
  B: 'Library',
  C: 'Sanctum',
  D: 'Observatory',
  E: 'Balcony',
};

const CELL_SIZE = 80;
const PADDING = 50;
const SPACE_R = 26;

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 3;

/** Map fighter to its portrait SVG path */
function getPortrait(f: Fighter): string {
  if (f.characterId === 'king_arthur') {
    return f.isHero ? '/art/king_arthur.svg' : '/art/merlin.svg';
  }
  if (f.characterId === 'aang') {
    return f.isHero ? '/art/aang.svg' : '/art/appa.svg';
  }
  return f.isHero ? '/art/medusa.svg' : '/art/harpy.svg';
}

/** Player border glow color */
function getPlayerColor(owner: number): string {
  return owner === 0 ? '#4fc3f7' : '#ef5350';
}

/** Render a multi-zone space as pie slices for each zone */
function renderZoneCircle(space: Space, cx: number, cy: number, r: number): React.ReactNode[] {
  const { zones } = space;
  if (zones.length === 1) {
    return [
      <circle key="fill" cx={cx} cy={cy} r={r} fill={ZONE_COLORS[zones[0]] || '#444'} />,
    ];
  }

  // For 2-3 zones, draw equal pie slices
  const slices: React.ReactNode[] = [];
  const n = zones.length;
  const startAngle = -Math.PI / 2; // start from top
  for (let i = 0; i < n; i++) {
    const a1 = startAngle + (i / n) * Math.PI * 2;
    const a2 = startAngle + ((i + 1) / n) * Math.PI * 2;
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const largeArc = (a2 - a1) > Math.PI ? 1 : 0;
    const d = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;
    slices.push(
      <path key={`slice-${i}`} d={d} fill={ZONE_COLORS[zones[i]] || '#444'} />
    );
  }
  return slices;
}

export const Board: React.FC<BoardProps> = ({ state, reachableSpaces, onSpaceClick }) => {
  const { board, fighters } = state;
  const maxX = Math.max(...board.spaces.map(s => s.x));
  const maxY = Math.max(...board.spaces.map(s => s.y));
  const svgW = (maxX + 1) * CELL_SIZE + PADDING * 2;
  const svgH = (maxY + 1) * CELL_SIZE + PADDING * 2;

  // Zoom/pan state
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });
  const didDrag = useRef(false);

  // Scroll wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(z => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z * delta)));
  }, []);

  // Mouse drag to pan
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Only left button
    if (e.button !== 0) return;
    setDragging(true);
    didDrag.current = false;
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
      didDrag.current = true;
    }
    setPan({
      x: dragStart.current.panX + dx,
      y: dragStart.current.panY + dy,
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
  }, []);

  useEffect(() => {
    if (dragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, handleMouseMove, handleMouseUp]);

  // Reset zoom/pan
  const handleReset = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const spacePos = (s: Space) => ({
    cx: s.x * CELL_SIZE + PADDING + CELL_SIZE / 2,
    cy: s.y * CELL_SIZE + PADDING + CELL_SIZE / 2,
  });

  const fightersOnSpace = (spaceId: string): Fighter[] =>
    fighters.filter(f => f.spaceId === spaceId && f.hp > 0);

  // Collect all unique zone letters for legend
  const allZones = Array.from(new Set(board.spaces.flatMap(s => s.zones))).sort();

  // Wrap space click to prevent click after drag
  const handleSpaceClickWrapped = useCallback((spaceId: string) => {
    if (didDrag.current) return;
    onSpaceClick(spaceId);
  }, [onSpaceClick]);

  return (
    <div
      ref={containerRef}
      className="board-zoom-container"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      style={{ cursor: dragging ? 'grabbing' : 'grab' }}
    >
      {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
        <button className="board-reset-btn" onClick={handleReset}>Reset View</button>
      )}
      <svg
        viewBox={`0 0 ${svgW} ${svgH}`}
        className="board-svg"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: 'center center',
        }}
      >
        {/* Zone legend */}
        {allZones.map((z, i) => (
          <g key={`legend-${z}`} transform={`translate(${10 + i * 110}, ${svgH - 20})`}>
            <rect x={0} y={-10} width={14} height={14} rx={3} fill={ZONE_COLORS[z] || '#444'} />
            <text x={18} y={2} fill="#ccc" fontSize={11} fontWeight="bold">
              {ZONE_NAMES[z] || z}
            </text>
          </g>
        ))}

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
                stroke="#666" strokeWidth={2.5} opacity={0.4}
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
            <g key={space.id} onClick={() => handleSpaceClickWrapped(space.id)} style={{ cursor: isReachable ? 'pointer' : 'default' }}>
              {/* Zone-colored fill (pie slices for multi-zone) */}
              <g opacity={isReachable ? 1 : 0.75}>
                {renderZoneCircle(space, cx, cy, SPACE_R)}
              </g>

              {/* Outline */}
              <circle
                cx={cx} cy={cy} r={SPACE_R}
                fill="none"
                stroke={isReachable ? '#ffeb3b' : '#999'}
                strokeWidth={isReachable ? 3 : 1.5}
              />

              {/* Space ID label */}
              <text x={cx} y={cy - SPACE_R - 4} textAnchor="middle" fill="#999" fontSize={8}>
                {space.id}
              </text>

              {/* Fighter portrait tokens */}
              {fOnSpace.map((f, i) => {
                const count = fOnSpace.length;
                const r = f.isHero ? 14 : 10;
                let offsetX = 0;
                let offsetY = 0;
                if (count === 2) {
                  offsetX = (i === 0 ? -10 : 10);
                } else if (count > 2) {
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
                    <circle cx={tx} cy={ty} r={r + 2} fill="none" stroke={color} strokeWidth={2.5} />
                    <circle cx={tx} cy={ty} r={r} fill="#222" />
                    <clipPath id={`token-${f.id}`}>
                      <circle cx={tx} cy={ty} r={r} />
                    </clipPath>
                    <image
                      href={portrait}
                      x={tx - r} y={ty - r}
                      width={r * 2} height={r * 2}
                      clipPath={`url(#token-${f.id})`}
                      preserveAspectRatio="xMidYMid slice"
                    />
                    <text
                      x={tx} y={ty + r + 10}
                      textAnchor="middle" fill={color} fontSize={8} fontWeight="bold"
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
    </div>
  );
};
