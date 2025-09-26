'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { socketService } from '@/lib/socket-client';
import { GuessData, GuessResult, RoundEnd, RoundInfo } from '@/types/game';
import { MessageSquare, CheckCircle, XCircle, Trophy, Users } from 'lucide-react';

interface GuessingInterfaceProps {
  roomCode: string;
  currentPlayerId: string;
  currentPlayerName: string;
  isDrawer: boolean;
  roundInfo?: RoundInfo;
}

interface Guess {
  id: string;
  playerName: string;
  guess: string;
  isCorrect: boolean;
  timestamp: number;
}

export function GuessingInterface({ 
  roomCode, 
  currentPlayerId, 
  currentPlayerName, 
  isDrawer, 
  roundInfo 
}: GuessingInterfaceProps) {
  const [guess, setGuess] = useState('');
  const [recentGuesses, setRecentGuesses] = useState<Guess[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roundEnd, setRoundEnd] = useState<RoundEnd | null>(null);
  const [lastResult, setLastResult] = useState<GuessResult | null>(null);

  useEffect(() => {
    const socket = socketService.getSocket();
    if (!socket) return;

    const handleGuessResult = (data: GuessResult) => {
      setLastResult(data);
      
      // Add to recent guesses
      const newGuess: Guess = {
        id: Date.now().toString(),
        playerName: data.playerName,
        guess: data.guess,
        isCorrect: data.isCorrect,
        timestamp: Date.now()
      };
      
      setRecentGuesses(prev => [newGuess, ...prev.slice(0, 9)]); // Keep last 10 guesses
      
      // Clear result after 3 seconds
      setTimeout(() => setLastResult(null), 3000);
    };

    const handleRoundEnd = (data: RoundEnd) => {
      setRoundEnd(data);
      setRecentGuesses([]);
    };

    socket.on('guess_result', handleGuessResult);
    socket.on('round_end', handleRoundEnd);

    return () => {
      socket.off('guess_result', handleGuessResult);
      socket.off('round_end', handleRoundEnd);
    };
  }, []);

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!guess.trim() || isSubmitting || isDrawer) return;

    setIsSubmitting(true);

    const guessData: GuessData = {
      guess: guess.trim(),
      playerId: currentPlayerId,
      playerName: currentPlayerName,
      roomCode
    };

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit('submit_guess', guessData);
    }

    setGuess('');
    setIsSubmitting(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmitGuess(e);
    }
  };

  if (isDrawer) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-900">
            <MessageSquare className="h-5 w-5" />
            You&apos;re Drawing!
          </CardTitle>
          <CardDescription className="text-green-700">
            Focus on drawing the word. Other players will guess what you&apos;re drawing.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <div className="text-2xl font-bold text-green-800 mb-2">
              {roundInfo?.word}
            </div>
            <p className="text-green-600">Draw this word for others to guess!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (roundEnd) {
    return (
      <Card className="border-yellow-200 bg-yellow-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-yellow-900">
            <Trophy className="h-5 w-5" />
            Round Complete!
          </CardTitle>
          <CardDescription className="text-yellow-700">
            The word was guessed correctly!
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-800 mb-2">
                {roundEnd.correctWord}
              </div>
              <p className="text-yellow-600">
                Winner: <span className="font-semibold">{roundEnd.winner.name}</span>
              </p>
            </div>
            
            <div className="bg-white p-3 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                <Users className="h-4 w-4" />
                Scores
              </h4>
              <div className="space-y-1">
                {Object.entries(roundEnd.scores).map(([playerId, score]) => (
                  <div key={playerId} className="flex justify-between text-sm">
                    <span className="text-gray-700">
                      {playerId === roundEnd.winner.id ? roundEnd.winner.name : 'Player'}
                    </span>
                    <span className="font-medium text-yellow-800">{score} pts</span>
                  </div>
                ))}
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
          <MessageSquare className="h-5 w-5" />
          Make Your Guess
        </CardTitle>
        <CardDescription>
          Type your guess and press Enter to submit
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Guess Input */}
        <form onSubmit={handleSubmitGuess} className="flex gap-2">
          <Input
            value={guess}
            onChange={(e) => setGuess(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Enter your guess..."
            disabled={isSubmitting}
            className="flex-1"
          />
          <Button 
            type="submit" 
            disabled={!guess.trim() || isSubmitting}
            className="px-6"
          >
            {isSubmitting ? 'Sending...' : 'Guess'}
          </Button>
        </form>

        {/* Last Result */}
        {lastResult && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            lastResult.isCorrect 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
            {lastResult.isCorrect ? (
              <CheckCircle className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            <span className="font-medium">{lastResult.message}</span>
          </div>
        )}

        {/* Recent Guesses */}
        {recentGuesses.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">Recent Guesses</h4>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {recentGuesses.map((guess) => (
                <div 
                  key={guess.id} 
                  className={`flex items-center gap-2 p-2 rounded text-sm ${
                    guess.isCorrect 
                      ? 'bg-green-50 text-green-800' 
                      : 'bg-gray-50 text-gray-600'
                  }`}
                >
                  <span className="font-medium">{guess.playerName}:</span>
                  <span className="italic">&ldquo;{guess.guess}&rdquo;</span>
                  {guess.isCorrect && (
                    <Badge variant="default" className="text-xs bg-green-600">
                      Correct!
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
          <p className="font-medium mb-1">How to play:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Watch the drawing and type your guess</li>
            <li>Press Enter or click Guess to submit</li>
            <li>First correct guess wins the round</li>
            <li>Be quick - other players are guessing too!</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
