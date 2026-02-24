import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import type { GameState } from '../game/types';

const API_BASE = import.meta.env.PROD ? '' : 'http://localhost:3001';

interface OnlineState {
  connected: boolean;
  roomCode: string | null;
  playerId: string | null;
  playerIndex: number | null; // 0 or 1
  gameState: GameState | null;
  error: string | null;
  waiting: boolean; // waiting for opponent to join
}

export function useOnlineGame() {
  const [state, setState] = useState<OnlineState>({
    connected: false,
    roomCode: null,
    playerId: null,
    playerIndex: null,
    gameState: null,
    error: null,
    waiting: false,
  });

  const socketRef = useRef<Socket | null>(null);

  // Connect socket
  useEffect(() => {
    const socket = io(API_BASE, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      setState(s => ({ ...s, connected: true }));
    });
    socket.on('disconnect', () => {
      setState(s => ({ ...s, connected: false }));
    });

    socket.on('gameStarted', (gameState: GameState) => {
      setState(s => ({ ...s, gameState, waiting: false }));
    });

    socket.on('stateUpdate', (gameState: GameState) => {
      setState(s => ({ ...s, gameState }));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const createRoom = useCallback(async (characterId: string, playerName: string) => {
    setState(s => ({ ...s, error: null }));
    try {
      const res = await fetch(`${API_BASE}/api/rooms`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, playerName }),
      });
      const data = await res.json();
      if (data.error) {
        setState(s => ({ ...s, error: data.error }));
        return;
      }
      const code = data.code as string;
      socketRef.current?.emit('joinRoom', code);
      setState(s => ({
        ...s,
        roomCode: code,
        playerId: data.playerId,
        playerIndex: 0,
        waiting: true,
        error: null,
      }));
    } catch {
      setState(s => ({ ...s, error: 'Failed to connect to server.' }));
    }
  }, []);

  const joinRoom = useCallback(async (code: string, characterId: string, playerName: string) => {
    setState(s => ({ ...s, error: null }));
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${code.toUpperCase()}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, playerName }),
      });
      const data = await res.json();
      if (data.error) {
        setState(s => ({ ...s, error: data.error }));
        return;
      }
      const upperCode = code.toUpperCase();
      socketRef.current?.emit('joinRoom', upperCode);
      setState(s => ({
        ...s,
        roomCode: upperCode,
        playerId: data.playerId,
        playerIndex: 1,
        gameState: data.gameState,
        waiting: false,
        error: null,
      }));
    } catch {
      setState(s => ({ ...s, error: 'Failed to connect to server.' }));
    }
  }, []);

  const reconnectRoom = useCallback(async (code: string, playerId: string) => {
    setState(s => ({ ...s, error: null }));
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${code.toUpperCase()}`);
      const data = await res.json();
      if (data.error) {
        setState(s => ({ ...s, error: data.error }));
        return;
      }
      const upperCode = code.toUpperCase();
      socketRef.current?.emit('joinRoom', upperCode);
      const playerIndex = playerId === data.gameState?.players?.[0] ? 0 : 1;
      setState(s => ({
        ...s,
        roomCode: upperCode,
        playerId,
        playerIndex,
        gameState: data.gameState,
        waiting: !data.started,
        error: null,
      }));
    } catch {
      setState(s => ({ ...s, error: 'Failed to reconnect.' }));
    }
  }, []);

  const sendAction = useCallback(async (actionType: string, args: Record<string, unknown> = {}) => {
    if (!state.roomCode || !state.playerId) return;
    try {
      const res = await fetch(`${API_BASE}/api/rooms/${state.roomCode}/action`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: state.playerId, actionType, args }),
      });
      const data = await res.json();
      if (data.error) {
        console.error('Action error:', data.error);
      }
      // State will be updated via socket 'stateUpdate' event
    } catch (e) {
      console.error('Failed to send action:', e);
    }
  }, [state.roomCode, state.playerId]);

  const disconnect = useCallback(() => {
    setState({
      connected: state.connected,
      roomCode: null,
      playerId: null,
      playerIndex: null,
      gameState: null,
      error: null,
      waiting: false,
    });
  }, [state.connected]);

  return {
    ...state,
    createRoom,
    joinRoom,
    reconnectRoom,
    sendAction,
    disconnect,
  };
}
