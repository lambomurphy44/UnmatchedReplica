import type { BoardMap, Space } from './types';

// =============================================
// Sanctum Sanctorum — from Unmatched: Brains and Brawn
// 24 spaces, 5 zones, spaces can belong to up to 3 zones
// =============================================

// Zone names:
//   F = "Foyer"       (lower-left wing)
//   L = "Library"      (upper-left wing)
//   S = "Sanctum"      (central mystical room)
//   O = "Observatory"  (upper-right wing)
//   B = "Balcony"      (lower-right wing)
//
// 2 tri-zone spaces: s10[L,S,O], s20[B,F,S]

function s(id: string, zones: string[], x: number, y: number, adj: string[]): Space {
  return { id, zones, x, y, adjacentIds: adj };
}

function buildSpaces(): Space[] {
  return [
    // === Upper area — Library (L) and Observatory (O) ===
    // Row 0: top corners
    s('s1',  ['L'],        2.1,  0.15, ['s2', 's3', 's4']),             // Library top (P1 start)
    s('s2',  ['O'],        5.9,  0.1,  ['s1', 's6', 's7']),             // Observatory top

    // Row 1: upper corridor
    s('s3',  ['L'],        0.8,  1.6,  ['s1', 's4', 's8', 's9']),       // Library alcove
    s('s4',  ['L'],        2.9,  1.35, ['s1', 's3', 's5', 's9', 's10']),// Library center
    s('s5',  ['L','O'],    4.1,  1.55, ['s4', 's6']),                   // Upper hall (L/O bridge)
    s('s6',  ['O'],        5.1,  1.4,  ['s2', 's5', 's7', 's10', 's11']),// Observatory landing
    s('s7',  ['O'],        7.1,  1.6,  ['s2', 's6', 's12']),            // Observatory alcove

    // === Central area — Main floor ===
    // Row 2: upper main
    s('s8',  ['L','F'],    0.15, 3.1,  ['s3', 's9', 's14']),            // Library/Foyer junction
    s('s9',  ['L','F'],    1.6,  2.85, ['s3', 's4', 's8', 's10', 's15']),// Library/Foyer lower
    s('s10', ['L','S','O'], 3.9, 3.05, ['s4', 's6', 's9', 's11']),      // TRI: upper crossroads
    s('s11', ['S','O'],    5.15, 3.1,  ['s6', 's10', 's12', 's17']),    // Sanctum/Observatory
    s('s12', ['O'],        6.6,  2.9,  ['s7', 's11', 's13', 's18']),    // Observatory

    // Row 3: lower main
    s('s13', ['O'],        7.9,  4.55, ['s12', 's18', 's22']),          // Observatory lower
    s('s14', ['F'],        0.1,  4.6,  ['s8', 's15', 's19']),           // Foyer inner
    s('s15', ['F'],        1.65, 4.4,  ['s9', 's14', 's16', 's19']),    // Foyer mid
    s('s16', ['F','S'],    3.1,  4.55, ['s15', 's20']),                 // Foyer/Sanctum
    s('s17', ['S'],        4.9,  4.45, ['s11', 's18', 's21']),          // Sanctum center
    s('s18', ['S','O'],    6.6,  4.5,  ['s12', 's13', 's17', 's22']),   // Sanctum/Observatory

    // === Lower area — Foyer (F) and Balcony (B) ===
    // Row 4: lower corridor
    s('s19', ['F'],        0.9,  6.1,  ['s14', 's15', 's23']),          // Foyer passage
    s('s20', ['B','F','S'], 3.4, 6.15, ['s16', 's21', 's23']),          // TRI: lower crossroads
    s('s21', ['S','B'],    5.1,  5.9,  ['s17', 's20', 's22', 's24']),   // Sanctum/Balcony junction
    s('s22', ['B'],        6.65, 6.1,  ['s13', 's18', 's21', 's24']),   // Balcony passage

    // Row 5: bottom corners
    s('s23', ['F','B'],    1.6,  7.55, ['s19', 's20', 's24']),          // Foyer/Balcony entrance
    s('s24', ['B'],        5.4,  7.45, ['s21', 's22', 's23']),          // Balcony exit (P2 start)
  ];
}

export const DEFAULT_MAP: BoardMap = {
  id: 'sanctum_sanctorum',
  name: 'Sanctum Sanctorum',
  spaces: buildSpaces(),
  startPositions: {
    player0: ['s1'],   // Library top (hero start)
    player1: ['s24'],  // Balcony exit (hero start)
  },
};
