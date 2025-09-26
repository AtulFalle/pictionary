'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { socketService } from '@/lib/socket-client';
import { GameRoom, Player } from '@/types/game';

interface JoinRoomFormProps {
  onRoomJoined: (room: GameRoom, player: Player) => void;
}

export function JoinRoomForm({ onRoomJoined }: JoinRoomFormProps) {
  const [roomCode, setRoomCode] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isJoining, setIsJoining] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (!roomCode.trim()) {
      setError('Please enter room code');
      return;
    }

    setIsJoining(true);
    setError('');

    const socket = socketService.connect();
    
    // Set up one-time listeners
    const handleRoomJoined = (data: { room: GameRoom; player: Player }) => {
      console.log('Room joined response:', data);
      socket.off('room_joined', handleRoomJoined);
      socket.off('error', handleError);
      setIsJoining(false);
      onRoomJoined(data.room, data.player);
    };

    const handleError = (data: { message: string }) => {
      socket.off('room_joined', handleRoomJoined);
      socket.off('error', handleError);
      setIsJoining(false);
      setError(data.message);
    };

    socket.on('room_joined', handleRoomJoined);
    socket.on('error', handleError);

    // Add timeout
    const timeout = setTimeout(() => {
      socket.off('room_joined', handleRoomJoined);
      socket.off('error', handleError);
      setIsJoining(false);
      setError('Connection timeout. Please try again.');
    }, 10000);

    socket.on('room_joined', () => clearTimeout(timeout));
    socket.on('error', () => clearTimeout(timeout));

    socket.emit('join_room', {
      roomCode: roomCode.trim().toUpperCase(),
      playerName: playerName.trim(),
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Join Existing Room</CardTitle>
        <CardDescription>
          Enter the room code to join a game
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="roomCode">Room Code</Label>
            <Input
              id="roomCode"
              type="text"
              placeholder="Enter 6-digit room code"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              disabled={isJoining}
              maxLength={6}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="playerName">Your Name</Label>
            <Input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={isJoining}
              required
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded">
              {error}
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isJoining || !playerName.trim() || !roomCode.trim()}
          >
            {isJoining ? 'Joining Room...' : 'Join Room'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
