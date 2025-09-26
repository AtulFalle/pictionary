'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { socketService } from '@/lib/socket-client';
import { GameRoom as GameRoomType, RoundInfo, RoundEnd, NextRound } from '@/types/game';
import { Play, Users, Trophy, Clock, RotateCcw } from 'lucide-react';

interface GameProgressProps {
  room: GameRoomType;
  currentPlayerId: string;
}

export function GameProgress({ room, currentPlayerId }: GameProgressProps) {
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null);
  const [gameEnd, setGameEnd] = useState<NextRound | null>(null);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleRoundStart = (data: { roundInfo: RoundInfo; isDrawer: boolean }) => {
      setRoundInfo(data.roundInfo);
      setGameEnd(null);
    };

    const handleRoundEnd = (data: RoundEnd) => {
      if (data.isGameOver) {
        setGameEnd({
          roundNumber: data.roundNumber,
          drawer: data.nextDrawer || room.players[0],
          word: '',
          timeLimit: 0,
          isGameOver: true,
          finalScores: data.scores,
          gameWinner: room.players.reduce((winner, player) => 
            (player.score || 0) > (winner.score || 0) ? player : winner
          )
        });
      }
    };

    const handleNextRound = (data: NextRound) => {
      if (data.isGameOver) {
        setGameEnd(data);
      }
    };

    socket.on('round_start', handleRoundStart);
    socket.on('round_end', handleRoundEnd);
    socket.on('next_round', handleNextRound);

    return () => {
      socket.off('round_start', handleRoundStart);
      socket.off('round_end', handleRoundEnd);
      socket.off('next_round', handleNextRound);
    };
  }, [room.players]);

  const currentRound = room.currentRound || 0;
  const totalRounds = room.totalRounds || 5;
  const progressPercentage = (currentRound / totalRounds) * 100;

  if (gameEnd) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <Trophy className="h-5 w-5" />
            Game Complete!
          </CardTitle>
          <CardDescription className="text-yellow-700">
            All rounds finished. Here are the final results!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-800 mb-2">
                🏆 {gameEnd.gameWinner?.name} Wins!
              </div>
              <p className="text-yellow-600">
                Final Score: {gameEnd.gameWinner?.score || 0} points
              </p>
            </div>
            
            <div className="bg-white p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-3">Final Leaderboard</h4>
              <div className="space-y-2">
                {Object.entries(gameEnd.finalScores || {})
                  .sort(([,a], [,b]) => b - a)
                  .map(([playerId, score], index) => {
                    const player = room.players.find(p => p.id === playerId);
                    return (
                      <div key={playerId} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                          <span className="font-medium">{player?.name}</span>
                          {playerId === currentPlayerId && (
                            <Badge variant="secondary" className="text-xs">You</Badge>
                          )}
                        </div>
                        <span className="font-bold text-gray-900">{score} pts</span>
                      </div>
                    );
                  })}
              </div>
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
          <Play className="h-5 w-5" />
          Game Progress
        </CardTitle>
        <CardDescription>
          Round {currentRound} of {totalRounds}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>

        {/* Round Information */}
        {roundInfo && (
          <div className="p-3 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-900">
                Round {roundInfo.roundNumber}
              </span>
            </div>
            <div className="text-sm text-blue-700">
              <p>
                <strong>Drawer:</strong> {roundInfo.drawer.name}
                {roundInfo.drawer.id === currentPlayerId && (
                  <Badge variant="secondary" className="ml-2 text-xs">You</Badge>
                )}
              </p>
              <p>
                <strong>Time Limit:</strong> {roundInfo.timeLimit} seconds
              </p>
            </div>
          </div>
        )}

        {/* Turn Rotation Info */}
        {room.drawerRotation && room.drawerRotation.length > 0 && (
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <RotateCcw className="h-4 w-4 text-gray-600" />
              <span className="font-medium text-gray-900">Turn Order</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {room.drawerRotation.map((playerId, index) => {
                const player = room.players.find(p => p.id === playerId);
                const isCurrentDrawer = player?.isDrawer;
                const isUpcoming = index === (currentRound % (room.drawerRotation?.length || 1));
                
                return (
                  <Badge
                    key={playerId}
                    variant={isCurrentDrawer ? "default" : isUpcoming ? "secondary" : "outline"}
                    className={`text-xs ${
                      isCurrentDrawer ? 'bg-green-600' : 
                      isUpcoming ? 'bg-blue-100 text-blue-800' : ''
                    }`}
                  >
                    {player?.name}
                    {isCurrentDrawer && ' (Drawing)'}
                    {isUpcoming && !isCurrentDrawer && ' (Next)'}
                  </Badge>
                );
              })}
            </div>
          </div>
        )}

        {/* Game Status */}
        <div className="text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span>
              {room.players.length} player{room.players.length !== 1 ? 's' : ''} in game
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Play className="h-4 w-4" />
            <span>
              Status: {room.status === 'waiting' ? 'Waiting to start' : 
                      room.status === 'playing' ? 'Round in progress' : 
                      'Game finished'}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
