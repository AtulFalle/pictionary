'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Player, ScoreUpdate } from '@/types/game';
import { socketService } from '@/lib/socket-client';
import { Trophy, Medal, Award, TrendingUp } from 'lucide-react';

interface ScoreboardProps {
  players: Player[];
  currentPlayerId: string;
  roomCode: string;
}

export function Scoreboard({ players, currentPlayerId, roomCode }: ScoreboardProps) {
  const [localPlayers, setLocalPlayers] = useState<Player[]>(players);
  const [recentScoreUpdate, setRecentScoreUpdate] = useState<ScoreUpdate | null>(null);

  // Update local players when props change
  useEffect(() => {
    setLocalPlayers(players);
  }, [players]);

  // Listen for score updates
  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleScoreUpdate = (data: ScoreUpdate) => {
      if (data.roomCode === roomCode) {
        setLocalPlayers(prev => 
          prev.map(player => 
            player.id === data.playerId 
              ? { ...player, score: data.newScore }
              : player
          )
        );
        
        // Show score update notification
        setRecentScoreUpdate(data);
        setTimeout(() => setRecentScoreUpdate(null), 3000);
      }
    };

    socket.on('score_update', handleScoreUpdate);

    return () => {
      socket.off('score_update', handleScoreUpdate);
    };
  }, [roomCode]);

  // Sort players by score (highest first)
  const sortedPlayers = [...localPlayers].sort((a, b) => (b.score || 0) - (a.score || 0));

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0:
        return <Trophy className="h-4 w-4 text-yellow-500" />;
      case 1:
        return <Medal className="h-4 w-4 text-gray-400" />;
      case 2:
        return <Award className="h-4 w-4 text-amber-600" />;
      default:
        return <span className="text-sm font-medium text-gray-500">#{index + 1}</span>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="h-5 w-5" />
          Scoreboard
        </CardTitle>
        <CardDescription>
          Live scores across all rounds
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Score Update Notification */}
        {recentScoreUpdate && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-800">
              {recentScoreUpdate.playerName} earned {recentScoreUpdate.pointsEarned} points!
            </span>
          </div>
        )}

        <div className="space-y-2">
          {sortedPlayers.map((player, index) => (
            <div
              key={player.id}
              className={`flex items-center justify-between p-3 rounded-lg ${
                player.id === currentPlayerId
                  ? 'bg-blue-50 border border-blue-200'
                  : 'bg-gray-50 border border-gray-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {getRankIcon(index)}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{player.name}</span>
                    {player.id === currentPlayerId && (
                      <Badge variant="secondary" className="text-xs">You</Badge>
                    )}
                    {player.isHost && (
                      <Badge variant="outline" className="text-xs">Host</Badge>
                    )}
                    {player.isDrawer && (
                      <Badge variant="default" className="text-xs bg-green-600">Drawing</Badge>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">
                  {player.score || 0}
                </div>
                <div className="text-xs text-gray-500">points</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
