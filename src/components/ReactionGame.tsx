import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Play, RotateCcw, Trophy, Zap, AlertCircle } from 'lucide-react';

type InstructionType = 'click' | 'avoid' | 'press' | 'dont-press';
type ColorType = 'red' | 'blue' | 'green' | 'yellow';

interface GameState {
  isPlaying: boolean;
  score: number;
  highScore: number;
  timeLeft: number;
  maxTime: number;
  currentInstruction: {
    type: InstructionType;
    color?: ColorType;
    text: string;
  };
  gameOver: boolean;
  streak: number;
}

const COLORS: Record<ColorType, { bg: string; text: string; name: string }> = {
  red: { bg: 'bg-red-500', text: 'text-red-500', name: 'RED' },
  blue: { bg: 'bg-blue-500', text: 'text-blue-500', name: 'BLUE' },
  green: { bg: 'bg-green-500', text: 'text-green-500', name: 'GREEN' },
  yellow: { bg: 'bg-yellow-500', text: 'text-yellow-500', name: 'YELLOW' },
};

const INSTRUCTIONS = [
  { type: 'click' as InstructionType, template: 'CLICK {color}!' },
  { type: 'avoid' as InstructionType, template: 'AVOID {color}!' },
  { type: 'press' as InstructionType, template: 'PRESS SPACE!' },
  { type: 'dont-press' as InstructionType, template: 'DON\'T PRESS SPACE!' },
];

export function ReactionGame() {
  const [gameState, setGameState] = useState<GameState>({
    isPlaying: false,
    score: 0,
    highScore: 0,
    timeLeft: 3000,
    maxTime: 3000,
    currentInstruction: {
      type: 'click',
      color: 'red',
      text: 'CLICK RED!',
    },
    gameOver: false,
    streak: 0,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const spacePressedRef = useRef(false);

  // Generate new instruction
  const generateInstruction = useCallback((): GameState['currentInstruction'] => {
    const instruction = INSTRUCTIONS[Math.floor(Math.random() * INSTRUCTIONS.length)];
    const colorKeys = Object.keys(COLORS) as ColorType[];
    const randomColor = colorKeys[Math.floor(Math.random() * colorKeys.length)];
    
    let text = instruction.template;
    if (instruction.template.includes('{color}')) {
      text = text.replace('{color}', COLORS[randomColor].name);
    }

    return {
      type: instruction.type,
      color: randomColor,
      text,
    };
  }, []);

  // Calculate time based on score (gets faster)
  const calculateTime = useCallback((score: number) => {
    const baseTime = 3000;
    const minTime = 800;
    const reduction = Math.min(score * 50, baseTime - minTime);
    return baseTime - reduction;
  }, []);

  // Start timer
  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    timerRef.current = setInterval(() => {
      setGameState(prev => {
        if (prev.timeLeft <= 100) {
          clearInterval(timerRef.current!);
          return {
            ...prev,
            gameOver: true,
            isPlaying: false,
            highScore: Math.max(prev.score, prev.highScore),
          };
        }
        return {
          ...prev,
          timeLeft: prev.timeLeft - 100,
        };
      });
    }, 100);
  }, []);

  // Handle correct action
  const handleCorrectAction = useCallback(() => {
    const newScore = gameState.score + 1;
    const newTime = calculateTime(newScore);
    const newInstruction = generateInstruction();
    
    setGameState(prev => ({
      ...prev,
      score: newScore,
      timeLeft: newTime,
      maxTime: newTime,
      currentInstruction: newInstruction,
      streak: prev.streak + 1,
    }));
    
    startTimer();
  }, [gameState.score, calculateTime, generateInstruction, startTimer]);

  // Handle wrong action
  const handleWrongAction = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setGameState(prev => ({
      ...prev,
      gameOver: true,
      isPlaying: false,
      highScore: Math.max(prev.score, prev.highScore),
    }));
  }, []);

  // Handle color button click
  const handleColorClick = useCallback((color: ColorType) => {
    if (!gameState.isPlaying || gameState.gameOver) return;

    const { type, color: targetColor } = gameState.currentInstruction;

    if (type === 'click' && color === targetColor) {
      handleCorrectAction();
    } else if (type === 'avoid' && color !== targetColor) {
      handleCorrectAction();
    } else {
      handleWrongAction();
    }
  }, [gameState, handleCorrectAction, handleWrongAction]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        
        if (!gameState.isPlaying || gameState.gameOver) {
          if (!gameState.isPlaying && !gameState.gameOver) {
            startGame();
          }
          return;
        }

        const { type } = gameState.currentInstruction;
        
        if (type === 'press') {
          handleCorrectAction();
        } else if (type === 'dont-press') {
          handleWrongAction();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleCorrectAction, handleWrongAction]);

  // Start game
  const startGame = useCallback(() => {
    const initialTime = calculateTime(0);
    const instruction = generateInstruction();
    
    setGameState({
      isPlaying: true,
      score: 0,
      highScore: gameState.highScore,
      timeLeft: initialTime,
      maxTime: initialTime,
      currentInstruction: instruction,
      gameOver: false,
      streak: 0,
    });
    
    startTimer();
  }, [gameState.highScore, calculateTime, generateInstruction, startTimer]);

  // Reset game
  const resetGame = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    
    setGameState({
      isPlaying: false,
      score: 0,
      highScore: gameState.highScore,
      timeLeft: 3000,
      maxTime: 3000,
      currentInstruction: {
        type: 'click',
        color: 'red',
        text: 'CLICK RED!',
      },
      gameOver: false,
      streak: 0,
    });
  }, [gameState.highScore]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const progressPercent = (gameState.timeLeft / gameState.maxTime) * 100;
  const speedMultiplier = ((3000 - gameState.maxTime) / 2200 * 100).toFixed(0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl border-2 border-purple-500/30 shadow-2xl shadow-purple-500/20">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
            ⚡ Speed Reaction ⚡
          </CardTitle>
          <p className="text-slate-400">Follow instructions quickly!</p>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Score and Stats */}
          <div className="flex justify-between items-center">
            <div className="text-center">
              <p className="text-sm text-slate-400">Score</p>
              <p className="text-3xl font-bold text-white">{gameState.score}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400">High Score</p>
              <p className="text-3xl font-bold text-yellow-400">{gameState.highScore}</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-400">Streak</p>
              <p className="text-3xl font-bold text-green-400">{gameState.streak}</p>
            </div>
          </div>

          {/* Speed Indicator */}
          {gameState.isPlaying && (
            <div className="flex items-center justify-center gap-2">
              <Zap className="w-5 h-5 text-yellow-400" />
              <Badge variant="outline" className="border-yellow-400/50 text-yellow-400">
                Speed: +{speedMultiplier}%
              </Badge>
            </div>
          )}

          {/* Timer Bar */}
          <div className="space-y-2">
            <Progress 
              value={progressPercent} 
              className="h-4 bg-slate-700"
              // @ts-ignore
              indicatorClassName={progressPercent < 30 ? 'bg-red-500' : progressPercent < 60 ? 'bg-yellow-500' : 'bg-green-500'}
            />
            <p className="text-center text-sm text-slate-400">
              {(gameState.timeLeft / 1000).toFixed(1)}s remaining
            </p>
          </div>

          {/* Instruction Display */}
          <div className="bg-slate-800/50 rounded-lg p-6 text-center border border-slate-700">
            {!gameState.isPlaying && !gameState.gameOver && (
              <div className="space-y-4">
                <p className="text-xl text-slate-300">Ready to test your reflexes?</p>
                <Button onClick={startGame} size="lg" className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                  <Play className="w-5 h-5 mr-2" />
                  Start Game
                </Button>
              </div>
            )}

            {gameState.isPlaying && (
              <div className="space-y-4 animate-pulse">
                <p className="text-4xl font-bold text-white">
                  {gameState.currentInstruction.text}
                </p>
                {gameState.currentInstruction.type === 'press' && (
                  <p className="text-slate-400">Press SPACEBAR</p>
                )}
                {gameState.currentInstruction.type === 'dont-press' && (
                  <p className="text-slate-400">Wait for timer!</p>
                )}
              </div>
            )}

            {gameState.gameOver && (
              <div className="space-y-4">
                <AlertCircle className="w-16 h-16 text-red-500 mx-auto" />
                <p className="text-2xl font-bold text-red-400">Game Over!</p>
                <p className="text-xl text-white">Final Score: {gameState.score}</p>
                {gameState.score === gameState.highScore && gameState.score > 0 && (
                  <p className="text-yellow-400 font-semibold">🏆 New High Score!</p>
                )}
                <div className="flex gap-2 justify-center">
                  <Button onClick={startGame} className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600">
                    <Play className="w-4 h-4 mr-2" />
                    Play Again
                  </Button>
                  <Button onClick={resetGame} variant="outline">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Reset
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Color Buttons */}
          {gameState.isPlaying && (
            <div className="grid grid-cols-2 gap-4">
              {(Object.keys(COLORS) as ColorType[]).map((color) => (
                <Button
                  key={color}
                  onClick={() => handleColorClick(color)}
                  className={`h-24 text-xl font-bold text-white transition-all hover:scale-105 active:scale-95 ${COLORS[color].bg} hover:opacity-90`}
                  disabled={gameState.gameOver}
                >
                  {COLORS[color].name}
                </Button>
              ))}
            </div>
          )}

          {/* Instructions */}
          {!gameState.isPlaying && !gameState.gameOver && (
            <div className="bg-slate-800/30 rounded-lg p-4 space-y-2 text-sm text-slate-400">
              <p className="font-semibold text-slate-300 mb-2">How to Play:</p>
              <p>• <span className="text-red-400">CLICK</span> the specified color</p>
              <p>• <span className="text-blue-400">AVOID</span> the specified color (click others)</p>
              <p>• <span className="text-green-400">PRESS SPACE</span> when instructed</p>
              <p>• <span className="text-yellow-400">DON'T PRESS SPACE</span> - just wait!</p>
              <p className="pt-2 text-slate-500">Speed increases with each correct answer!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}