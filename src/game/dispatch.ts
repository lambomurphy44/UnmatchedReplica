import type { GameState } from './types';
import {
  startManeuver, applyManeuverBoost, selectManeuverFighter,
  executeManeuverMove, skipFighterMove, skipAllManeuverMoves,
  startAttack, selectAttackTarget, selectAttackCard, selectDefenseCard,
  selectArthurBoostCard, selectDuringCombatBoost,
  resolveEffectMove, skipEffectMove, resolveEffectDiscard, resolveEffectPlace,
  resolveEffectPush, skipEffectPush,
  resolveSearchChoice,
  playScheme, resolveSchemeTarget,
  resolveSchemeSidekickMove, skipSchemeSidekickMove,
  selectSchemeMoveAllFighter, executeSchemeMoveAllMove,
  skipSchemeMoveAllFighter, skipAllSchemeMoveAll,
  resolveReviveHarpy,
  discardExcessCard,
  useMedusaGaze, skipMedusaGaze,
  placeSidekick,
} from './engine';

/**
 * Dispatch a named action to the game engine.
 * Used by both the local client and the server.
 */
export function dispatchAction(state: GameState, actionType: string, args: Record<string, unknown>): GameState | null {
  try {
    switch (actionType) {
      case 'placeSidekick':
        return placeSidekick(state, args.spaceId as string);
      case 'useMedusaGaze':
        return useMedusaGaze(state, args.targetFighterId as string);
      case 'skipMedusaGaze':
        return skipMedusaGaze(state);
      case 'startManeuver':
        return startManeuver(state);
      case 'applyManeuverBoost':
        return applyManeuverBoost(state, (args.cardId as string) || null);
      case 'selectManeuverFighter':
        return selectManeuverFighter(state, args.fighterId as string);
      case 'executeManeuverMove':
        return executeManeuverMove(state, args.spaceId as string);
      case 'skipFighterMove':
        return skipFighterMove(state);
      case 'skipAllManeuverMoves':
        return skipAllManeuverMoves(state);
      case 'startAttack':
        return startAttack(state, args.fighterId as string);
      case 'selectAttackTarget':
        return selectAttackTarget(state, args.defenderId as string);
      case 'selectAttackCard':
        return selectAttackCard(state, args.cardId as string);
      case 'selectArthurBoostCard':
        return selectArthurBoostCard(state, (args.cardId as string) || null);
      case 'selectDefenseCard':
        return selectDefenseCard(state, (args.cardId as string) || null);
      case 'selectDuringCombatBoost':
        return selectDuringCombatBoost(state, (args.cardId as string) || null);
      case 'cancelAttack':
        return { ...JSON.parse(JSON.stringify(state)), phase: 'playing', selectedFighter: null, combat: null } as GameState;
      case 'cancelAttackTarget':
        return { ...JSON.parse(JSON.stringify(state)), phase: 'playing', selectedFighter: null } as GameState;
      case 'startScheme':
        return { ...JSON.parse(JSON.stringify(state)), phase: 'scheme_selectCard' } as GameState;
      case 'playScheme':
        return playScheme(state, args.cardId as string);
      case 'cancelScheme':
        return { ...JSON.parse(JSON.stringify(state)), phase: 'playing' } as GameState;
      case 'resolveSchemeTarget':
        return resolveSchemeTarget(state, args.targetFighterId as string);
      case 'resolveSchemeSidekickMove':
        return resolveSchemeSidekickMove(state, args.spaceId as string);
      case 'skipSchemeSidekickMove':
        return skipSchemeSidekickMove(state);
      case 'selectSchemeMoveAllFighter':
        return selectSchemeMoveAllFighter(state, args.fighterId as string);
      case 'executeSchemeMoveAllMove':
        return executeSchemeMoveAllMove(state, args.spaceId as string);
      case 'skipSchemeMoveAllFighter':
        return skipSchemeMoveAllFighter(state);
      case 'skipAllSchemeMoveAll':
        return skipAllSchemeMoveAll(state);
      case 'resolveReviveHarpy':
        return resolveReviveHarpy(state, args.spaceId as string);
      case 'resolveEffectMove':
        return resolveEffectMove(state, args.spaceId as string);
      case 'skipEffectMove':
        return skipEffectMove(state);
      case 'resolveEffectDiscard':
        return resolveEffectDiscard(state, args.cardId as string);
      case 'resolveEffectPlace':
        return resolveEffectPlace(state, args.spaceId as string);
      case 'resolveEffectPush':
        return resolveEffectPush(state, args.spaceId as string);
      case 'skipEffectPush':
        return skipEffectPush(state);
      case 'resolveSearchChoice':
        return resolveSearchChoice(state, args.cardId as string);
      case 'discardExcessCard':
        return discardExcessCard(state, args.cardId as string);
      default:
        return null;
    }
  } catch (e) {
    console.error(`Error dispatching action ${actionType}:`, e);
    return null;
  }
}
