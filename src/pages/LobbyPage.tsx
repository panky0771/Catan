import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useLobbyStore } from '../store/lobbyStore';
import { useAuthStore } from '../store/authStore';
import LobbyRoom from '../components/lobby/LobbyRoom';
import { useSocketEvents } from '../hooks/useSocket';

// =============================================
// LobbyPage: wraps LobbyRoom with routing
// =============================================

const LobbyPage: React.FC = () => {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const lobby = useLobbyStore((s) => s.lobby);
  const { joinRoom, clearError } = useLobbyStore();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Subscribe to socket events
  useSocketEvents();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
      return;
    }

    // Join the room if we don't already have the lobby state
    if (roomCode && !lobby) {
      joinRoom(roomCode).catch(() => navigate('/'));
    }
  }, [isAuthenticated, roomCode, lobby]);

  // If game started (lobby status = active), go to game page
  useEffect(() => {
    if (lobby?.status === 'active') {
      navigate(`/game/${lobby.roomCode}`);
    }
  }, [lobby?.status]);

  if (!lobby) {
    return (
      <div className="min-h-screen bg-catan-bg flex items-center justify-center">
        <div className="text-gray-400 animate-pulse">Joining room...</div>
      </div>
    );
  }

  return (
    <LobbyRoom
      onGameStart={(code) => navigate(`/game/${code}`)}
      onLeave={() => navigate('/')}
    />
  );
};

export default LobbyPage;
