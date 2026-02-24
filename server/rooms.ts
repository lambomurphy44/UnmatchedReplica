import fs from 'fs';
import path from 'path';
import type { GameState } from '../src/game/types.js';
import { createGame } from '../src/game/engine.js';

export interface Room {
  code: string;
  player0Id: string;
  player0Name: string;
  player0Char: string;
  player1Id: string | null;
  player1Name: string | null;
  player1Char: string | null;
  gameState: GameState | null;
  createdAt: number;
}

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I/O/0/1 to avoid confusion
  let code = '';
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function generatePlayerId(): string {
  return 'p_' + Math.random().toString(36).substring(2, 10);
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
    this.load();
  }

  private load() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      if (fs.existsSync(this.filePath)) {
        const data = JSON.parse(fs.readFileSync(this.filePath, 'utf-8'));
        for (const room of data) {
          this.rooms.set(room.code, room);
        }
        console.log(`Loaded ${this.rooms.size} room(s) from disk.`);
      }
    } catch {
      console.log('No saved rooms found, starting fresh.');
    }
  }

  save() {
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = Array.from(this.rooms.values());
      fs.writeFileSync(this.filePath, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save rooms:', e);
    }
  }

  create(characterId: string, playerName: string): Room {
    let code = generateCode();
    while (this.rooms.has(code)) {
      code = generateCode();
    }

    const room: Room = {
      code,
      player0Id: generatePlayerId(),
      player0Name: playerName,
      player0Char: characterId,
      player1Id: null,
      player1Name: null,
      player1Char: null,
      gameState: null,
      createdAt: Date.now(),
    };

    this.rooms.set(code, room);
    this.save();
    return room;
  }

  join(code: string, characterId: string, playerName: string): { playerId: string; gameState: GameState } | { error: string } {
    const room = this.rooms.get(code);
    if (!room) {
      return { error: 'Room not found. Check the code and try again.' };
    }
    if (room.player1Id) {
      return { error: 'Room is already full.' };
    }

    room.player1Id = generatePlayerId();
    room.player1Name = playerName;
    room.player1Char = characterId;

    // Start the game
    room.gameState = createGame(
      room.player0Char,
      room.player1Char!,
      room.player0Name,
      room.player1Name!
    );

    this.save();
    return { playerId: room.player1Id, gameState: room.gameState };
  }

  get(code: string): Room | undefined {
    return this.rooms.get(code);
  }
}
