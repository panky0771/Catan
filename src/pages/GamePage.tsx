import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGameStore } from '../store/gameStore';
import { useAuthStore } from '../store/authStore';
import { useSocketEvents } from '../hooks/useSocket';
import { socketClient } from '../socket/socketClient';
import GameBoard from '../components/game/GameBoard';
import TopBar from '../components/game/TopBar';
import DiceDisplay from '../components/game/DiceDisplay';
import ResourcePanel from '../components/game/ResourcePanel';
import DevCardPanel from '../components/game/DevCardPanel';
import TradePanel from '../components/game/TradePanel';
import ActionPanel from '../components/game/ActionPanel';
import EventLog from '../components/game/EventLog';
import VictoryScreen from '../components/game/VictoryScreen';
import { Toaster } from 'react-hot-toast';

// =============================================
// GamePage: main game layout
// =============================================

const GamePage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const gameState = useGameStore((s) => s.gameState);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Subscribe to all socket events
  useSocketEvents();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Attempt reconnect if we don't have game state
    if (roomCode && !gameState) {
      socketClient.reconnectToGame(roomCode);
    }
  }, [isAuthenticated, roomCode]);

  const handleLeave = () => {
    navigate('/');
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-catan-bg flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4 animate-spin">🎲</div>
          <div className="text-gray-400">Loading game...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-catan-bg flex flex-col overflow-hidden">
      <Toaster
        position="top-center"
        toastOptions={{
          style: {
            background: '#1A2535',
            color: '#ffffff',
            border: '1px solid #2A3A50',
          },
        }}
      />

      {/* Victory screen overlay */}
      {gameState.winner && <VictoryScreen onLeave={handleLeave} />}

      {/* Top bar: other players */}
      <TopBar />

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Game board - takes most space */}
        <div className="flex-1 relative">
          <GameBoard />
        </div>

        {/* Right sidebar */}
        <div className="w-72 flex flex-col gap-2 p-2 overflow-y-auto bg-catan-bg border-l border-catan-border">
          {/* Dice */}
          <DiceDisplay />

          {/* Action panel (roll/end turn/phase prompts) */}
          <ActionPanel />

          {/* Resources */}
          <ResourcePanel />

          {/* Dev Cards */}
          <DevCardPanel />

          {/* Trading */}
          {gameState.phase === 'playing' && <TradePanel />}

          {/* Event log */}
          <EventLog />
        </div>
      </div>

      {/* Phase indicator for setup */}
      {gameState.phase === 'setup' && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <div className="bg-catan-panel border border-yellow-600 rounded-xl px-4 py-2 text-sm">
            <span className="text-yellow-400 font-semibold">
              Setup Round {gameState.setupRound}:
            </span>
            <span className="text-gray-300 ml-2">
              {gameState.turnPhase === 'setup_settlement'
                ? 'Place your settlement'
                : 'Place your road'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default GamePage;
