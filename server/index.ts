import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { RoomManager } from './rooms.js';
import { dispatchAction } from './dispatch.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.env.PORT || '3001', 10);
const IS_PROD = process.env.NODE_ENV === 'production';

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const rooms = new RoomManager(path.join(__dirname, '..', 'data', 'rooms.json'));

// ---- REST API ----

// Create a room
app.post('/api/rooms', (req, res) => {
  const { characterId, playerName } = req.body;
  if (!characterId || !playerName) {
    res.status(400).json({ error: 'characterId and playerName required' });
    return;
  }
  const room = rooms.create(characterId, playerName);
  res.json({ code: room.code, playerId: room.player0Id });
});

// Join a room
app.post('/api/rooms/:code/join', (req, res) => {
  const { characterId, playerName } = req.body;
  const { code } = req.params;
  if (!characterId || !playerName) {
    res.status(400).json({ error: 'characterId and playerName required' });
    return;
  }
  const result = rooms.join(code.toUpperCase(), characterId, playerName);
  if ('error' in result) {
    res.status(400).json(result);
    return;
  }
  // Notify player 0 that someone joined
  io.to(code.toUpperCase()).emit('gameStarted', result.gameState);
  res.json({ playerId: result.playerId, gameState: result.gameState });
});

// Get room state (for reconnection / polling)
app.get('/api/rooms/:code', (req, res) => {
  const room = rooms.get(req.params.code.toUpperCase());
  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  res.json({
    code: room.code,
    player0Name: room.player0Name,
    player1Name: room.player1Name,
    player0Char: room.player0Char,
    player1Char: room.player1Char,
    gameState: room.gameState,
    started: !!room.gameState,
  });
});

// Send an action
app.post('/api/rooms/:code/action', (req, res) => {
  const { playerId, actionType, args } = req.body;
  const code = req.params.code.toUpperCase();
  const room = rooms.get(code);

  if (!room) {
    res.status(404).json({ error: 'Room not found' });
    return;
  }
  if (!room.gameState) {
    res.status(400).json({ error: 'Game not started yet' });
    return;
  }
  if (playerId !== room.player0Id && playerId !== room.player1Id) {
    res.status(403).json({ error: 'Not a player in this room' });
    return;
  }

  const newState = dispatchAction(room.gameState, actionType, args || {});
  if (!newState) {
    res.status(400).json({ error: 'Invalid action' });
    return;
  }

  room.gameState = newState;
  rooms.save();

  // Broadcast to all players in the room
  io.to(code).emit('stateUpdate', newState);
  res.json({ gameState: newState });
});

// ---- Socket.io ----

io.on('connection', (socket) => {
  socket.on('joinRoom', (code: string) => {
    const upperCode = code.toUpperCase();
    socket.join(upperCode);
  });

  socket.on('disconnect', () => {
    // No cleanup needed — rooms persist
  });
});

// ---- Serve static files in production ----
if (IS_PROD) {
  const distPath = path.join(__dirname, '..', 'dist');
  app.use(express.static(distPath));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (!IS_PROD) {
    console.log(`API at http://localhost:${PORT}/api`);
  }
});
