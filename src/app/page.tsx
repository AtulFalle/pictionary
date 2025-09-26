'use client';

import { useState, useEffect } from 'react';
import { CreateRoomForm } from '@/components/game/CreateRoomForm';
import { JoinRoomForm } from '@/components/game/JoinRoomForm';
import { GameRoom } from '@/components/game/GameRoom';
import { GameRoom as GameRoomType, Player } from '@/types/game';
import { socketService } from '@/lib/socket-client';
import { Palette, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [currentRoom, setCurrentRoom] = useState<GameRoomType | null>(null);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [showJoinForm, setShowJoinForm] = useState(false);

  useEffect(() => {
    // Initialize socket connection
    const socket = socketService.connect();
    
    // Listen for room updates
    const handleRoomUpdate = (data: { room: GameRoomType }) => {
      console.log('Room update received:', data.room);
      console.log('Current room:', currentRoom);
      if (currentRoom && data.room.id === currentRoom.id) {
        setCurrentRoom(data.room);
        console.log('Room updated in main page:', data.room);
      } else if (!currentRoom) {
        // If no current room, this might be the initial room data
        console.log('No current room, setting room:', data.room);
        setCurrentRoom(data.room);
      }
    };
    
    socket.on('room_updated', handleRoomUpdate);
    
    // Cleanup on unmount
    return () => {
      socket.off('room_updated', handleRoomUpdate);
      socket.disconnect();
    };
  }, [currentRoom]);

  const handleRoomCreated = (room: GameRoomType, player: Player) => {
    setCurrentRoom(room);
    setCurrentPlayer(player);
  };

  const handleRoomJoined = (room: GameRoomType, player: Player) => {
    setCurrentRoom(room);
    setCurrentPlayer(player);
  };

  const handleLeaveRoom = () => {
    setCurrentRoom(null);
    setCurrentPlayer(null);
    setShowJoinForm(false);
  };

  // If user is in a room, show the game room
  if (currentRoom && currentPlayer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <div className="container mx-auto">
          <GameRoom 
            room={currentRoom} 
            currentPlayer={currentPlayer} 
            onLeaveRoom={handleLeaveRoom}
          />
        </div>
      </div>
    );
  }

  // Show home page with create/join options
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Palette className="h-12 w-12 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">Pictionary</h1>
          </div>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Draw, guess, and have fun with friends in this real-time drawing game!
          </p>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto">
          {!showJoinForm ? (
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Create Room */}
              <div className="flex justify-center">
                <CreateRoomForm onRoomCreated={handleRoomCreated} />
              </div>

              {/* Join Room */}
              <div className="flex justify-center">
                <div className="w-full max-w-md">
                  <div className="text-center mb-6">
                    <Users className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                      Join a Game
                    </h2>
                    <p className="text-gray-600">
                      Have a room code? Join an existing game
                    </p>
                  </div>
                  <Button 
                    onClick={() => setShowJoinForm(true)}
                    className="w-full"
                    variant="outline"
                  >
                    Join Room
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <JoinRoomForm onRoomJoined={handleRoomJoined} />
              <div className="text-center mt-4">
                <Button 
                  variant="ghost" 
                  onClick={() => setShowJoinForm(false)}
                >
                  ← Back to Home
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Features */}
        <div className="max-w-4xl mx-auto mt-16">
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-8">
            How to Play
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-600 font-bold">1</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Create or Join</h3>
              <p className="text-gray-600 text-sm">
                Create a new room or join an existing one with a room code
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-green-600 font-bold">2</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Wait for Players</h3>
              <p className="text-gray-600 text-sm">
                Invite friends to join your room and wait for everyone to be ready
              </p>
            </div>
            <div className="text-center p-6 bg-white rounded-lg shadow-sm">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-purple-600 font-bold">3</span>
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Start Drawing</h3>
              <p className="text-gray-600 text-sm">
                Take turns drawing and guessing words in this fun drawing game
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
