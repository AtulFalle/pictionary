const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = process.env.PORT || 3000;

// Create Next.js app
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// In-memory storage for game rooms
const gameRooms = new Map();

// Word bank for Pictionary
const WORD_BANK = [
  // Animals
  'cat', 'dog', 'elephant', 'lion', 'tiger', 'bear', 'rabbit', 'mouse', 'bird', 'fish',
  'cow', 'pig', 'sheep', 'horse', 'chicken', 'duck', 'goose', 'owl', 'eagle', 'shark',
  
  // Objects
  'car', 'house', 'tree', 'book', 'phone', 'computer', 'chair', 'table', 'bed', 'door',
  'window', 'clock', 'camera', 'bicycle', 'airplane', 'boat', 'train', 'bus', 'truck', 'motorcycle',
  
  // Food
  'pizza', 'hamburger', 'sandwich', 'cake', 'cookie', 'apple', 'banana', 'orange', 'grape', 'strawberry',
  'bread', 'cheese', 'milk', 'coffee', 'tea', 'soup', 'salad', 'ice cream', 'chocolate', 'candy',
  
  // Activities
  'dancing', 'singing', 'reading', 'writing', 'drawing', 'painting', 'swimming', 'running', 'jumping', 'sleeping',
  'cooking', 'eating', 'drinking', 'laughing', 'crying', 'thinking', 'talking', 'listening', 'watching', 'playing',
  
  // Places
  'beach', 'mountain', 'forest', 'city', 'school', 'hospital', 'restaurant', 'store', 'library', 'park',
  'zoo', 'museum', 'theater', 'church', 'office', 'kitchen', 'bedroom', 'bathroom', 'garden', 'farm',
  
  // Weather & Nature
  'sun', 'moon', 'star', 'cloud', 'rain', 'snow', 'wind', 'fire', 'water', 'earth',
  'flower', 'grass', 'leaf', 'rock', 'sand', 'ice', 'rainbow', 'lightning', 'thunder', 'storm',
  
  // Body Parts
  'head', 'eye', 'nose', 'mouth', 'ear', 'hand', 'foot', 'leg', 'arm', 'finger',
  'toe', 'hair', 'tooth', 'tongue', 'chest', 'back', 'stomach', 'knee', 'elbow', 'shoulder',
  
  // Emotions
  'happy', 'sad', 'angry', 'excited', 'scared', 'surprised', 'confused', 'worried', 'proud', 'embarrassed',
  'jealous', 'nervous', 'calm', 'frustrated', 'disappointed', 'grateful', 'hopeful', 'lonely', 'confident', 'shy'
];

// Get a random word from the word bank
function getRandomWord() {
  const randomIndex = Math.floor(Math.random() * WORD_BANK.length);
  return WORD_BANK[randomIndex];
}

// Create drawer rotation for the game
function createDrawerRotation(players) {
  const playerIds = players.map(p => p.id);
  // Shuffle the array to randomize order
  for (let i = playerIds.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [playerIds[i], playerIds[j]] = [playerIds[j], playerIds[i]];
  }
  return playerIds;
}

// Get next drawer from rotation
function getNextDrawer(room) {
  // Create or update rotation if needed
  if (!room.drawerRotation || room.drawerRotation.length !== room.players.length) {
    room.drawerRotation = createDrawerRotation(room.players);
    console.log('Created new drawer rotation:', room.drawerRotation);
  }
  
  const currentRound = room.currentRound || 0;
  const drawerIndex = currentRound % room.drawerRotation.length;
  const drawerId = room.drawerRotation[drawerIndex];
  
  console.log(`Round ${currentRound}: drawerIndex=${drawerIndex}, drawerId=${drawerId}, rotation=${room.drawerRotation}`);
  
  return room.players.find(p => p.id === drawerId);
}

// Start the next round automatically
function startNextRound(roomCode, room, io) {
  try {
    // Get next drawer
    const nextDrawer = getNextDrawer(room);
    const selectedWord = getRandomWord();
    
    // Update room state
    room.status = 'playing';
    room.currentRound = (room.currentRound || 0) + 1;
    room.currentWord = selectedWord;
    room.currentDrawer = nextDrawer.id;
    room.roundTime = 60;
    
    // Update drawer status
    room.players.forEach(p => {
      p.isDrawer = p.id === nextDrawer.id;
    });
    
    gameRooms.set(roomCode, room);
    
    // Send round info to all players
    const roundInfo = {
      roundNumber: room.currentRound,
      drawer: nextDrawer,
      timeLimit: room.roundTime
    };
    
    // Send to drawer with the word
    io.to(nextDrawer.socketId).emit('round_info', { 
      roundInfo: { ...roundInfo, word: selectedWord }, 
      isDrawer: true 
    });
    
    // Send to all other players without the word
    room.players.forEach(player => {
      if (player.id !== nextDrawer.id) {
        io.to(player.socketId).emit('round_info', { 
          roundInfo, 
          isDrawer: false 
        });
      }
    });
    
    // Broadcast room update
    io.to(roomCode).emit('room_updated', { room });
    
    console.log(`Round ${room.currentRound} started automatically in room ${roomCode}. Drawer: ${nextDrawer.name}, Word: ${selectedWord}`);
  } catch (error) {
    console.error('Error starting next round:', error);
  }
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

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  });

  // Create Socket.IO server
  const io = new Server(httpServer, {
    cors: {
      origin: dev ? ['http://localhost:3000'] : false,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);
    
    // Handle connection errors
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });

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
          totalRounds: 5, // Default 5 rounds
          drawerRotation: [],
          gameEnded: false,
        };

        gameRooms.set(roomCode, newRoom);
        socket.join(roomCode);

        socket.emit('room_created', { room: newRoom, player: newPlayer });
        console.log(`Room created: ${roomCode} by ${data.playerName}`);
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
      } catch (error) {
        socket.emit('error', { message: 'Failed to join room' });
        console.error('Error joining room:', error);
      }
    });

    // Handle guess submission
    socket.on('submit_guess', (data) => {
      try {
        // Find the room this socket belongs to
        let targetRoom = null;
        let targetRoomCode = null;
        
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
        
        // Check if the room is in playing status
        if (targetRoom.status !== 'playing') {
          socket.emit('error', { message: 'No active round to guess in' });
          return;
        }
        
        // Check if the player is the drawer (drawer can't guess)
        const player = targetRoom.players.find(p => p.socketId === socket.id);
        if (player && player.isDrawer) {
          socket.emit('error', { message: 'The drawer cannot guess' });
          return;
        }
        
        // Check if guess is correct (case-insensitive)
        const isCorrect = data.guess.toLowerCase().trim() === targetRoom.currentWord.toLowerCase();
        
        if (isCorrect) {
          // Award points to the guesser
          const oldScore = player.score || 0;
          player.score = oldScore + 10; // 10 points for correct guess
          
          // Update room state
          targetRoom.status = 'waiting';
          gameRooms.set(targetRoomCode, targetRoom);
          
          // Send score update to all players
          const scoreUpdate = {
            playerId: player.id,
            playerName: player.name,
            newScore: player.score,
            pointsEarned: 10,
            reason: 'Correct guess',
            roomCode: targetRoomCode
          };
          
          io.to(targetRoomCode).emit('score_update', scoreUpdate);
          
          // Check if game is over
          const isGameOver = targetRoom.currentRound >= targetRoom.totalRounds;
          const nextDrawer = isGameOver ? null : getNextDrawer(targetRoom);
          
          // Send round end event to all players
          const roundEnd = {
            correctWord: targetRoom.currentWord,
            winner: player,
            roundNumber: targetRoom.currentRound,
            scores: targetRoom.players.reduce((acc, p) => {
              acc[p.id] = p.score || 0;
              return acc;
            }, {}),
            isGameOver,
            totalRounds: targetRoom.totalRounds,
            nextDrawer
          };
          
          io.to(targetRoomCode).emit('round_end', roundEnd);
          
          // If game is not over, automatically start next round after 3 seconds
          if (!isGameOver) {
            setTimeout(() => {
              startNextRound(targetRoomCode, targetRoom, io);
            }, 3000);
          } else {
            // Game is over, mark room as finished
            targetRoom.status = 'finished';
            targetRoom.gameEnded = true;
            gameRooms.set(targetRoomCode, targetRoom);
            
            // Send game over event
            const gameWinner = targetRoom.players.reduce((winner, player) => 
              (player.score || 0) > (winner.score || 0) ? player : winner
            );
            
            const nextRound = {
              roundNumber: targetRoom.currentRound,
              drawer: nextDrawer,
              word: '',
              timeLimit: 0,
              isGameOver: true,
              finalScores: targetRoom.players.reduce((acc, p) => {
                acc[p.id] = p.score || 0;
                return acc;
              }, {}),
              gameWinner
            };
            
            io.to(targetRoomCode).emit('next_round', nextRound);
          }
          
          // Send success result to the guesser
          socket.emit('guess_result', {
            isCorrect: true,
            guess: data.guess,
            playerName: data.playerName,
            message: `🎉 Correct! You guessed "${data.guess}" and earned 10 points!`
          });
          
          console.log(`${data.playerName} correctly guessed "${data.guess}" in room ${targetRoomCode} - Score: ${oldScore} → ${player.score}`);
        } else {
          // Send incorrect result to the guesser
          socket.emit('guess_result', {
            isCorrect: false,
            guess: data.guess,
            playerName: data.playerName,
            message: `❌ "${data.guess}" is not correct. Keep guessing!`
          });
          
          console.log(`${data.playerName} guessed "${data.guess}" (incorrect) in room ${targetRoomCode}`);
        }
      } catch (error) {
        socket.emit('error', { message: 'Failed to process guess' });
        console.error('Error processing guess:', error);
      }
    });

    // Handle drawing updates
    socket.on('draw_update', (data) => {
      try {
        // Find the room this socket belongs to
        let targetRoom = null;
        let targetRoomCode = null;
        
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
        
        // Check if the player is the current drawer
        const player = targetRoom.players.find(p => p.socketId === socket.id);
        if (!player || !player.isDrawer) {
          socket.emit('error', { message: 'Only the current drawer can draw' });
          return;
        }
        
        // Check if the room is in playing status
        if (targetRoom.status !== 'playing') {
          socket.emit('error', { message: 'No active round to draw in' });
          return;
        }
        
        // Broadcast the drawing update to all other players in the room
        socket.to(targetRoomCode).emit('draw_broadcast', data);
        
        console.log(`Drawing update from ${player.name} in room ${targetRoomCode}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to process drawing update' });
        console.error('Error processing drawing update:', error);
      }
    });

    // Handle starting a new round
    socket.on('start_round', () => {
      try {
        // Find the room this socket belongs to
        let targetRoom = null;
        let targetRoomCode = null;
        
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
        
        // Check if the player is the host
        const player = targetRoom.players.find(p => p.socketId === socket.id);
        if (!player || !player.isHost) {
          socket.emit('error', { message: 'Only the host can start a round' });
          return;
        }
        
        // Check if there are enough players
        if (targetRoom.players.length < 2) {
          socket.emit('error', { message: 'Need at least 2 players to start a round' });
          return;
        }
        
        // Check if room is in waiting status
        if (targetRoom.status !== 'waiting') {
          socket.emit('error', { message: 'Round is already in progress' });
          return;
        }
        
        // Get next drawer from rotation
        const nextDrawer = getNextDrawer(targetRoom);
        
        // Get a random word
        const selectedWord = getRandomWord();
        
        // Update room state
        targetRoom.status = 'playing';
        targetRoom.currentRound = (targetRoom.currentRound || 0) + 1;
        targetRoom.currentWord = selectedWord;
        targetRoom.currentDrawer = nextDrawer.id;
        targetRoom.roundTime = 60; // 60 seconds per round
        
        // Update drawer status and preserve scores
        targetRoom.players.forEach(p => {
          p.isDrawer = p.id === nextDrawer.id;
          // Preserve existing scores across rounds
          if (p.score === undefined) p.score = 0;
        });
        
        gameRooms.set(targetRoomCode, targetRoom);
        
        // Send round info to all players
        const roundInfo = {
          roundNumber: targetRoom.currentRound,
          drawer: nextDrawer,
          timeLimit: targetRoom.roundTime
        };
        
        // Send to drawer with the word
        io.to(nextDrawer.socketId).emit('round_info', { 
          roundInfo: { ...roundInfo, word: selectedWord }, 
          isDrawer: true 
        });
        
        // Send to all other players without the word
        targetRoom.players.forEach(player => {
          if (player.id !== nextDrawer.id) {
            io.to(player.socketId).emit('round_info', { 
              roundInfo, 
              isDrawer: false 
            });
          }
        });
        
        // Broadcast room update
        io.to(targetRoomCode).emit('room_updated', { room: targetRoom });
        
        console.log(`Round ${targetRoom.currentRound} started in room ${targetRoomCode}. Drawer: ${nextDrawer.name}, Word: ${selectedWord}`);
      } catch (error) {
        socket.emit('error', { message: 'Failed to start round' });
        console.error('Error starting round:', error);
      }
    });

    // Handle leaving room
    socket.on('leave_room', () => {
      // Find and remove player from all rooms
      for (const [roomCode, room] of gameRooms.entries()) {
        const playerIndex = room.players.findIndex(p => p.socketId === socket.id);
        if (playerIndex !== -1) {
          const player = room.players[playerIndex];
          room.players.splice(playerIndex, 1);
          
          // If no players left, delete the room
          if (room.players.length === 0) {
            gameRooms.delete(roomCode);
          } else {
            // If host left, make the first remaining player the new host
            if (player.isHost && room.players.length > 0) {
              room.players[0].isHost = true;
            }
            gameRooms.set(roomCode, room);
            io.to(roomCode).emit('room_updated', { room });
          }
          
          socket.leave(roomCode);
          socket.emit('room_left', { room, player });
          console.log(`${player.name} left room ${roomCode}`);
          break;
        }
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

  httpServer.listen(port, (err) => {
    if (err) throw err;
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
