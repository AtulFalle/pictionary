'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { socketService } from '@/lib/socket-client';
import { GameRoom as GameRoomType, Player, RoundInfo } from '@/types/game';
import { Copy, Users, Crown, Play, Clock, Eye, EyeOff } from 'lucide-react';
import { DrawingCanvas } from './DrawingCanvas';
import { GuessingInterface } from './GuessingInterface';
import { Scoreboard } from './Scoreboard';
import { ScoreHistory } from './ScoreHistory';
import { GameProgress } from './GameProgress';
import { GameSettings } from './GameSettings';

interface GameRoomProps {
  room: GameRoomType;
  currentPlayer: Player;
  onLeaveRoom: () => void;
}

export function GameRoom({ room, currentPlayer, onLeaveRoom }: GameRoomProps) {
  const [copied, setCopied] = useState(false);
  const [roundInfo, setRoundInfo] = useState<RoundInfo | null>(null);
  const [isDrawer, setIsDrawer] = useState(false);
  const [showWord, setShowWord] = useState(false);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

        const handleRoomUpdate = (data: { room: GameRoomType }) => {
          // Room state is managed by parent component
          console.log('Room updated:', data.room);
          console.log('Room status:', data.room.status);
          console.log('Players count:', data.room.players.length);
        };

    const handleRoundInfo = (data: { roundInfo: RoundInfo; isDrawer: boolean }) => {
      setRoundInfo(data.roundInfo);
      setIsDrawer(data.isDrawer);
      setShowWord(data.isDrawer); // Show word only to drawer
    };

    socket.on('room_updated', handleRoomUpdate);
    socket.on('round_info', handleRoundInfo);

    return () => {
      socket.off('room_updated', handleRoomUpdate);
      socket.off('round_info', handleRoundInfo);
    };
  }, []);

  const handleStartRound = () => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('start_round');
    }
  };

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(room.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy room code:', err);
    }
  };

  const handleLeaveRoom = () => {
    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('leave_room');
    }
    onLeaveRoom();
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Room Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Room {room.code}
              </CardTitle>
              <CardDescription>
                Share this code with friends to join the game
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-lg font-mono">
                {room.code}
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={copyRoomCode}
                className="flex items-center gap-1"
              >
                <Copy className="h-4 w-4" />
                {copied ? 'Copied!' : 'Copy'}
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Players List */}
      <Card>
        <CardHeader>
          <CardTitle>Players ({room.players.length}/{room.maxPlayers})</CardTitle>
          <CardDescription>
            {room.status === 'waiting' 
              ? 'Waiting for players to join...' 
              : `Game status: ${room.status}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {room.players.map((player) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 p-3 rounded-lg border ${
                  player.id === currentPlayer.id 
                    ? 'bg-blue-50 border-blue-200' 
                    : player.isDrawer
                      ? 'bg-green-50 border-green-200'
                      : 'bg-gray-50 border-gray-200'
                }`}
              >
                {player.isHost && <Crown className="h-4 w-4 text-yellow-500" />}
                <span className="font-medium">{player.name}</span>
                {player.id === currentPlayer.id && (
                  <Badge variant="secondary" className="text-xs">You</Badge>
                )}
                {player.isHost && (
                  <Badge variant="outline" className="text-xs">Host</Badge>
                )}
                {player.isDrawer && (
                  <Badge variant="default" className="text-xs bg-green-600">Drawing</Badge>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Scoreboard */}
      <Scoreboard 
        players={room.players} 
        currentPlayerId={currentPlayer.id}
        roomCode={room.code}
      />

      {/* Score History */}
      <ScoreHistory roomCode={room.code} />

      {/* Game Progress */}
      <GameProgress room={room} currentPlayerId={currentPlayer.id} />

      {/* Game Settings */}
      <GameSettings room={room} currentPlayer={currentPlayer} />

      {/* Start Game Section */}
      {currentPlayer.isHost && room.players.length >= 2 && room.status === 'waiting' && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Play className="h-5 w-5" />
              Ready to Start!
            </CardTitle>
            <CardDescription className="text-green-700">
              All players have joined. Click below to begin the game.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleStartRound}
              className="w-full bg-green-600 hover:bg-green-700 text-white text-lg py-3"
            >
              <Play className="h-5 w-5 mr-2" />
              Start Game
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Round Information */}
      {roundInfo && (
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <Play className="h-5 w-5" />
              Round {roundInfo.roundNumber} - {roundInfo.drawer.name} is drawing!
            </CardTitle>
            <CardDescription className="text-blue-700">
              {isDrawer ? 'You are the drawer. Draw the word below!' : 'Guess what the drawer is drawing!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-800">
                    {roundInfo.timeLimit}s remaining
                  </span>
                </div>
                {isDrawer && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowWord(!showWord)}
                      className="flex items-center gap-1"
                    >
                      {showWord ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showWord ? 'Hide Word' : 'Show Word'}
                    </Button>
                  </div>
                )}
              </div>
              {isDrawer && showWord && (
                <div className="bg-white p-3 rounded-lg border-2 border-blue-300">
                  <span className="text-2xl font-bold text-blue-900">
                    {roundInfo.word}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Drawing Canvas */}
      {roundInfo && room.status === 'playing' && (
        <DrawingCanvas
          roomCode={room.code}
          isDrawer={isDrawer}
          roundInfo={roundInfo}
        />
      )}

      {/* Guessing Interface */}
      {roundInfo && room.status === 'playing' && (
        <GuessingInterface
          roomCode={room.code}
          currentPlayerId={currentPlayer.id}
          currentPlayerName={currentPlayer.name}
          isDrawer={isDrawer}
          roundInfo={roundInfo}
        />
      )}


      {/* Room Actions */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
            <div className="text-sm text-gray-600">
              {room.players.length < 2 
                ? 'Need at least 2 players to start' 
                : room.status === 'waiting' 
                  ? 'Ready to start the game!'
                  : 'Game in progress'
              }
            </div>
            <div className="flex gap-2">
              {currentPlayer.isHost && room.players.length >= 2 && room.status === 'waiting' && (
                <Button 
                  onClick={handleStartRound}
                  className="bg-green-600 hover:bg-green-700 flex items-center gap-2"
                >
                  <Play className="h-4 w-4" />
                  Start Game
                </Button>
              )}
              <Button variant="outline" onClick={handleLeaveRoom}>
                Leave Room
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
