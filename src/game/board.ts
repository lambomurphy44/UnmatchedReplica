import type { BoardMap, Space } from './types';

// =============================================
// Sanctum Sanctorum — from Unmatched: Brains and Brawn
// 25 spaces, 5 zones, spaces can belong to up to 3 zones
// =============================================

// Zone names:
//   A = "Foyer"       (lower-left wing)
//   B = "Library"      (upper-left wing)
//   C = "Sanctum"      (central mystical room)
//   D = "Observatory"  (upper-right wing)
//   E = "Balcony"      (lower-right wing)
//
// 3 tri-zone spaces: s11[B,C,D], s17[B,C,E], s19[C,D,E]
//   These cover zones B,C,D,E (all except Foyer)

function s(id: string, zones: string[], x: number, y: number, adj: string[]): Space {
  return { id, zones, x, y, adjacentIds: adj };
}

function buildSpaces(): Space[] {
  return [
    // === Upper area — Library (B) and Observatory (D) ===
    // Row 0: top corners
    s('s1',  ['B'],      2,   0,   ['s2', 's3', 's4']),             // Library top (P1 start)
    s('s2',  ['D'],      6,   0,   ['s1', 's6', 's7']),             // Observatory top

    // Row 1: upper corridor
    s('s3',  ['B'],      1,   1.5, ['s1', 's4', 's8']),             // Library alcove
    s('s4',  ['B'],      3,   1.5, ['s1', 's3', 's5', 's10', 's11']),// Library center
    s('s5',  ['B','D'],  4,   1.5, ['s4', 's6']),                   // Upper hall (B/D bridge)
    s('s6',  ['D'],      5,   1.5, ['s2', 's5', 's7', 's11', 's12']),// Observatory landing
    s('s7',  ['D'],      7,   1.5, ['s2', 's6', 's13']),            // Observatory alcove

    // === Central area — Main floor ===
    // Row 2: upper main
    s('s8',  ['A','B'],  0,   3,   ['s3', 's9', 's15']),            // Foyer/Library junction
    s('s9',  ['B'],      1.5, 3,   ['s8', 's10', 's16']),           // Library lower
    s('s10', ['B','C'],  3,   3,   ['s4', 's9', 's11', 's17']),     // Library/Sanctum border
    s('s11', ['B','C','D'], 4, 3,  ['s4', 's6', 's10', 's12']),     // TRI: upper crossroads
    s('s12', ['C','D'],  5,   3,   ['s6', 's11', 's13', 's19']),    // Sanctum/Observatory
    s('s13', ['D','E'],  6.5, 3,   ['s7', 's12', 's14', 's20']),    // Observatory/Balcony

    // Row 3: lower main
    s('s14', ['E'],      8,   3,   ['s13', 's20', 's25']),          // Balcony upper
    s('s15', ['A'],      0,   4.5, ['s8', 's16', 's21']),           // Foyer inner
    s('s16', ['A','C'],  1.5, 4.5, ['s9', 's15', 's17']),           // Foyer/Sanctum
    s('s17', ['B','C','E'], 3, 4.5,['s10', 's16']),                 // TRI: left crossroads
    s('s19', ['C','D','E'], 5, 4.5,['s12', 's20', 's24']),          // TRI: right crossroads
    s('s20', ['E'],      6.5, 4.5, ['s13', 's14', 's19', 's25']),   // Balcony inner

    // === Lower area — Foyer (A) and Balcony (E) ===
    // Row 4: lower corridor
    s('s21', ['A'],      1,   6,   ['s15', 's26']),                  // Foyer passage
    s('s23', ['C','E'],  3.5, 6,   ['s24', 's26']),                  // Sanctum/Balcony
    s('s24', ['A','E'],  5,   6,   ['s19', 's23', 's25', 's27']),   // Foyer/Balcony junction
    s('s25', ['E'],      6.5, 6,   ['s14', 's20', 's24', 's27']),   // Balcony passage

    // Row 5: bottom corners
    s('s26', ['A'],      1.5, 7.5, ['s21', 's23', 's27']),          // Foyer entrance
    s('s27', ['E'],      5.5, 7.5, ['s24', 's25', 's26']),          // Balcony exit (P2 start)
  ];
}

export const DEFAULT_MAP: BoardMap = {
  id: 'sanctum_sanctorum',
  name: 'Sanctum Sanctorum',
  spaces: buildSpaces(),
  startPositions: {
    player0: ['s1'],   // Library top (hero start)
    player1: ['s27'],  // Balcony exit (hero start)
  },
};
