'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { GameRoom as GameRoomType, Player } from '@/types/game';
import { Settings } from 'lucide-react';

interface GameSettingsProps {
  room: GameRoomType;
  currentPlayer: Player;
  onUpdateSettings?: (settings: { totalRounds: number }) => void;
}

export function GameSettings({ room, currentPlayer, onUpdateSettings }: GameSettingsProps) {
  const [totalRounds, setTotalRounds] = useState(room.totalRounds || 5);

  const handleSaveSettings = () => {
    if (onUpdateSettings) {
      onUpdateSettings({ totalRounds });
    }
  };

  if (!currentPlayer.isHost) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Game Settings
          </CardTitle>
          <CardDescription>
            Only the host can modify game settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Total Rounds</span>
              <Badge variant="outline">{room.totalRounds || 5}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Current Round</span>
              <Badge variant="secondary">{room.currentRound || 0}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Players</span>
              <Badge variant="outline">{room.players.length}/{room.maxPlayers}</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Game Settings
        </CardTitle>
        <CardDescription>
          Configure game parameters (only visible to host)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="totalRounds">Total Rounds</Label>
          <div className="flex items-center gap-2">
            <Input
              id="totalRounds"
              type="number"
              min="1"
              max="20"
              value={totalRounds}
              onChange={(e) => setTotalRounds(parseInt(e.target.value) || 5)}
              className="w-20"
            />
            <span className="text-sm text-gray-600">rounds</span>
          </div>
          <p className="text-xs text-gray-500">
            Each player will draw {Math.ceil(totalRounds / room.players.length)} times
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Current Round</span>
            <Badge variant="secondary">{room.currentRound || 0}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Players</span>
            <Badge variant="outline">{room.players.length}/{room.maxPlayers}</Badge>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">Status</span>
            <Badge variant={room.status === 'waiting' ? 'outline' : room.status === 'playing' ? 'default' : 'destructive'}>
              {room.status}
            </Badge>
          </div>
        </div>

        <Button 
          onClick={handleSaveSettings}
          disabled={room.status === 'playing' || room.status === 'finished'}
          className="w-full"
        >
          <Settings className="h-4 w-4 mr-2" />
          Update Settings
        </Button>

        {room.status === 'playing' && (
          <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⚠️ Settings cannot be changed during an active game
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
