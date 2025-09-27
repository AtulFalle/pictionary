'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { socketService } from '@/lib/socket-client';
import { GameRoom, Player } from '@/types/game';

interface CreateRoomFormProps {
  onRoomCreated: (room: GameRoom, player: Player) => void;
}

export function CreateRoomForm({ onRoomCreated }: CreateRoomFormProps) {
  const [playerName, setPlayerName] = useState('');
  const [maxPlayers, setMaxPlayers] = useState(8);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerName.trim()) {
      setError('Please enter your name');
      return;
    }

    setIsCreating(true);
    setError('');

    const socket = socketService.connect();
    
    // Set up one-time listeners
    const handleRoomCreated = (data: { room: GameRoom; player: Player }) => {
      console.log('Room created response:', data);
      socket.off('room_created', handleRoomCreated);
      socket.off('error', handleError);
      setIsCreating(false);
      onRoomCreated(data.room, data.player);
    };

    const handleError = (data: { message: string }) => {
      socket.off('room_created', handleRoomCreated);
      socket.off('error', handleError);
      setIsCreating(false);
      setError(data.message);
    };

    socket.on('room_created', handleRoomCreated);
    socket.on('error', handleError);

    // Add timeout
    const timeout = setTimeout(() => {
      socket.off('room_created', handleRoomCreated);
      socket.off('error', handleError);
      setIsCreating(false);
      setError('Connection timeout. Please try again.');
    }, 10000);

    socket.on('room_created', () => clearTimeout(timeout));
    socket.on('error', () => clearTimeout(timeout));

    socket.emit('create_room', {
      playerName: playerName.trim(),
      maxPlayers,
    });
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Create New Room</CardTitle>
        <CardDescription>
          Start a new Pictionary game and invite friends to join
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="playerName">Your Name</Label>
            <Input
              id="playerName"
              type="text"
              placeholder="Enter your name"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={isCreating}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="maxPlayers">Max Players</Label>
            <Input
              id="maxPlayers"
              type="number"
              max="12"
              value={maxPlayers}
              onChange={(e) => setMaxPlayers(Number(e.target.value))}
              disabled={isCreating}
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
            disabled={isCreating || !playerName.trim()}
          >
            {isCreating ? 'Creating Room...' : 'Create Room'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
