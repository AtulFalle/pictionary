const { Server } = require('socket.io');
const { createServer } = require('http');

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002', 'http://localhost:3003'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// In-memory storage for game rooms
const gameRooms = new Map();

// Word bank for Pictionary
const WORD_BANK = [
  'cat', 'dog', 'elephant', 'lion', 'tiger', 'bear', 'rabbit', 'mouse', 'bird', 'fish',
  'car', 'house', 'tree', 'book', 'phone', 'computer', 'chair', 'table', 'bed', 'door',
  'pizza', 'hamburger', 'sandwich', 'cake', 'cookie', 'apple', 'banana', 'orange', 'grape', 'strawberry',
  'dancing', 'singing', 'reading', 'writing', 'drawing', 'painting', 'swimming', 'running', 'jumping', 'sleeping',
  'beach', 'mountain', 'forest', 'city', 'school', 'hospital', 'restaurant', 'store', 'library', 'park',
  'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'fire', 'water', 'earth',
  'head', 'eye', 'nose', 'mouth', 'ear', 'hand', 'foot', 'leg', 'arm', 'finger',
  'happy', 'sad', 'angry', 'excited', 'scared', 'surprised', 'confused', 'worried', 'proud', 'embarrassed'
];

// Get a random word from the word bank
function getRandomWord() {
  const randomIndex = Math.floor(Math.random() * WORD_BANK.length);
  return WORD_BANK[randomIndex];
}

// Generate a unique room code
function generateRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate unique player ID
function generatePlayerId() {
  return Math.random().toString(36).substr(2, 9);
}

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);
  console.log('Socket origin:', socket.handshake.headers.origin);
  
  // Handle room creation
  socket.on('create_room', (data) => {
    try {
      const roomCode = generateRoomCode();
      const playerId = generatePlayerId();
      
      const newPlayer = {
        id: playerId,
        name: data.playerName,
        socketId: socket.id,
        isHost: true,
        score: 0,
      };

      const newRoom = {
        id: roomCode,
        code: roomCode,
        players: [newPlayer],
        status: 'waiting',
        createdAt: new Date(),
        maxPlayers: data.maxPlayers || 8,
        totalRounds: 5,
        drawerRotation: [],
        gameEnded: false,
      };

      gameRooms.set(roomCode, newRoom);
      socket.join(roomCode);

      socket.emit('room_created', { room: newRoom, player: newPlayer });
      console.log(`Room created: ${roomCode} by ${data.playerName}`);
      console.log('Room data:', JSON.stringify(newRoom, null, 2));
    } catch (error) {
      socket.emit('error', { message: 'Failed to create room' });
      console.error('Error creating room:', error);
    }
  });

  // Handle room joining
  socket.on('join_room', (data) => {
    try {
      const room = gameRooms.get(data.roomCode);
      
      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      if (room.players.length >= room.maxPlayers) {
        socket.emit('error', { message: 'Room is full' });
        return;
      }

      if (room.status !== 'waiting') {
        socket.emit('error', { message: 'Room is not accepting new players' });
        return;
      }

      const playerId = generatePlayerId();
      const newPlayer = {
        id: playerId,
        name: data.playerName,
        socketId: socket.id,
        isHost: false,
        score: 0,
      };

      room.players.push(newPlayer);
      gameRooms.set(data.roomCode, room);
      socket.join(data.roomCode);

      // Notify all players in the room
      io.to(data.roomCode).emit('room_updated', { room });
      socket.emit('room_joined', { room, player: newPlayer });
      
      console.log(`${data.playerName} joined room ${data.roomCode}`);
      console.log(`Room status: ${room.status}, Players: ${room.players.length}`);
      console.log('Updated room data:', JSON.stringify(room, null, 2));
    } catch (error) {
      socket.emit('error', { message: 'Failed to join room' });
      console.error('Error joining room:', error);
    }
  });

  // Handle starting a round
  socket.on('start_round', () => {
    try {
      let targetRoom = null;
      let targetRoomCode = null;

      // Find the room this socket is in
      for (const [roomCode, room] of gameRooms.entries()) {
        const player = room.players.find(p => p.socketId === socket.id);
        if (player) {
          targetRoom = room;
          targetRoomCode = roomCode;
          break;
        }
      }

      if (!targetRoom) {
        socket.emit('error', { message: 'You are not in a room' });
        return;
      }

      const player = targetRoom.players.find(p => p.socketId === socket.id);
      if (!player || !player.isHost) {
        socket.emit('error', { message: 'Only the host can start a round' });
        return;
      }

      if (targetRoom.players.length < 2) {
        socket.emit('error', { message: 'Need at least 2 players to start a round' });
        return;
      }

      if (targetRoom.status !== 'waiting') {
        socket.emit('error', { message: 'Round is already in progress' });
        return;
      }

      // Select a random drawer (excluding the host for first round)
      const nonHostPlayers = targetRoom.players.filter(p => !p.isHost);
      const randomDrawer = nonHostPlayers[Math.floor(Math.random() * nonHostPlayers.length)];
      
      // Get a random word
      const selectedWord = getRandomWord();
      
      // Update room state
      targetRoom.status = 'playing';
      targetRoom.currentRound = (targetRoom.currentRound || 0) + 1;
      targetRoom.currentWord = selectedWord;
      targetRoom.currentDrawer = randomDrawer.id;
      targetRoom.roundTime = 60; // 60 seconds per round
      
      // Update drawer status and preserve scores
      targetRoom.players.forEach(p => {
        p.isDrawer = p.id === randomDrawer.id;
        // Preserve existing scores across rounds
        if (p.score === undefined) p.score = 0;
      });
      
      gameRooms.set(targetRoomCode, targetRoom);
      
      // Send round info to all players
      const roundInfo = {
        roundNumber: targetRoom.currentRound,
        drawer: randomDrawer,
        timeLimit: targetRoom.roundTime
      };
      
      // Send to drawer with the word
      socket.to(randomDrawer.socketId).emit('round_info', { 
        roundInfo: { ...roundInfo, word: selectedWord }, 
        isDrawer: true 
      });
      
      // Send to all other players without the word
      targetRoom.players.forEach(player => {
        if (player.id !== randomDrawer.id) {
          socket.to(player.socketId).emit('round_info', { 
            roundInfo, 
            isDrawer: false 
          });
        }
      });
      
      // Broadcast room update
      io.to(targetRoomCode).emit('room_updated', { room: targetRoom });
      
      console.log(`Round ${targetRoom.currentRound} started in room ${targetRoomCode}. Drawer: ${randomDrawer.name}, Word: ${selectedWord}`);
    } catch (error) {
      socket.emit('error', { message: 'Failed to start round' });
      console.error('Error starting round:', error);
    }
  });

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    
    // Remove player from all rooms
    for (const [roomCode, room] of gameRooms.entries()) {
      const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
      if (playerIndex !== -1) {
        const player = room.players[playerIndex];
        room.players.splice(playerIndex, 1);
        
        if (room.players.length === 0) {
          gameRooms.delete(roomCode);
        } else {
          if (player.isHost && room.players.length > 0) {
            room.players[0].isHost = true;
          }
          gameRooms.set(roomCode, room);
          io.to(roomCode).emit('room_updated', { room });
        }
        
        console.log(`${player.name} disconnected from room ${roomCode}`);
        break;
      }
    }
  });
});

const PORT = process.env.SOCKET_PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`Socket.IO server running on port ${PORT}`);
});
