import type { BoardMap, Space } from './types';

// A simplified Unmatched-style map with zones and connected spaces
// Layout: roughly a rectangular arena with 4 zones

function makeSpace(id: string, zone: string, x: number, y: number, adjacentIds: string[]): Space {
  return { id, zone, x, y, adjacentIds };
}

// Create adjacency bidirectionally
function buildSpaces(): Space[] {
  // Zone layout:
  //  Zone A (top-left)    | Zone B (top-right)
  //  Zone C (bottom-left) | Zone D (bottom-right)
  // Each zone ~5 spaces, connected internally and bridging to adjacent zones.

  const raw: Array<{ id: string; zone: string; x: number; y: number; adj: string[] }> = [
    // Zone A - Castle (top-left)
    { id: 'a1', zone: 'A', x: 1, y: 1, adj: ['a2', 'a3'] },
    { id: 'a2', zone: 'A', x: 2, y: 0, adj: ['a1', 'a4', 'b1'] },
    { id: 'a3', zone: 'A', x: 0, y: 2, adj: ['a1', 'a5', 'c1'] },
    { id: 'a4', zone: 'A', x: 2, y: 1, adj: ['a2', 'a5'] },
    { id: 'a5', zone: 'A', x: 1, y: 2, adj: ['a3', 'a4', 'c2'] },

    // Zone B - Forest (top-right)
    { id: 'b1', zone: 'B', x: 4, y: 0, adj: ['a2', 'b2', 'b3'] },
    { id: 'b2', zone: 'B', x: 5, y: 0, adj: ['b1', 'b4'] },
    { id: 'b3', zone: 'B', x: 4, y: 1, adj: ['b1', 'b5'] },
    { id: 'b4', zone: 'B', x: 5, y: 1, adj: ['b2', 'b5', 'd2'] },
    { id: 'b5', zone: 'B', x: 5, y: 2, adj: ['b3', 'b4', 'd1'] },

    // Zone C - Ruins (bottom-left)
    { id: 'c1', zone: 'C', x: 0, y: 3, adj: ['a3', 'c2', 'c3'] },
    { id: 'c2', zone: 'C', x: 1, y: 3, adj: ['a5', 'c1', 'c4'] },
    { id: 'c3', zone: 'C', x: 0, y: 4, adj: ['c1', 'c5'] },
    { id: 'c4', zone: 'C', x: 1, y: 4, adj: ['c2', 'c5', 'd3'] },
    { id: 'c5', zone: 'C', x: 1, y: 5, adj: ['c3', 'c4'] },

    // Zone D - Temple (bottom-right)
    { id: 'd1', zone: 'D', x: 4, y: 2, adj: ['b5', 'd2', 'd3'] },
    { id: 'd2', zone: 'D', x: 5, y: 3, adj: ['b4', 'd1', 'd4'] },
    { id: 'd3', zone: 'D', x: 4, y: 4, adj: ['c4', 'd1', 'd5'] },
    { id: 'd4', zone: 'D', x: 5, y: 4, adj: ['d2', 'd5'] },
    { id: 'd5', zone: 'D', x: 5, y: 5, adj: ['d3', 'd4'] },
  ];

  return raw.map(s => makeSpace(s.id, s.zone, s.x, s.y, s.adj));
}

export const DEFAULT_MAP: BoardMap = {
  id: 'default',
  name: 'Battle Arena',
  spaces: buildSpaces(),
  startPositions: {
    player0: ['a1', 'a3'],  // hero + sidekick start
    player1: ['d5', 'd4'],
  },
};
