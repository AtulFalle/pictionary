'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { socketService } from '@/lib/socket-client';
import { ScoreUpdate } from '@/types/game';
import { TrendingUp, Clock } from 'lucide-react';

interface ScoreHistoryProps {
  roomCode: string;
}

export function ScoreHistory({ roomCode }: ScoreHistoryProps) {
  const [scoreHistory, setScoreHistory] = useState<ScoreUpdate[]>([]);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleScoreUpdate = (data: ScoreUpdate) => {
      if (data.roomCode === roomCode) {
        setScoreHistory(prev => [data, ...prev.slice(0, 9)]); // Keep last 10 updates
      }
    };

    socket.on('score_update', handleScoreUpdate);

    return () => {
      socket.off('score_update', handleScoreUpdate);
    };
  }, [roomCode]);

  if (scoreHistory.length === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Recent Score Updates
        </CardTitle>
        <CardDescription>
          Live score changes in the room
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {scoreHistory.map((update, index) => (
            <div
              key={`${update.playerId}-${update.newScore}-${index}`}
              className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-green-600" />
                <span className="text-sm font-medium">{update.playerName}</span>
                <Badge variant="outline" className="text-xs">
                  +{update.pointsEarned}
                </Badge>
              </div>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Clock className="h-3 w-3" />
                <span>{update.reason}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
