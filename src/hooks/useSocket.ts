import { useEffect, useCallback } from 'react';
import { socketClient } from '../socket/socketClient';
import { useGameStore } from '../store/gameStore';
import { useLobbyStore } from '../store/lobbyStore';
import { useUIStore } from '../store/uiStore';
import { ClientGameState } from '../types/game.types';
import { LobbyState, GameEventPayload, SOCKET_EVENTS } from '../types/socket.types';
import toast from 'react-hot-toast';

// =============================================
// useSocket: subscribe to all socket events
// =============================================

export function useSocketEvents() {
  const setGameState = useGameStore((s) => s.setGameState);
  const addEvent = useGameStore((s) => s.addEvent);
  const setLobby = useLobbyStore((s) => s.setLobby);
  const { triggerDiceAnimation } = useUIStore();

  useEffect(() => {
    // Game state updates
    const offState = socketClient.on<ClientGameState>(SOCKET_EVENTS.GAME_STATE, (state) => {
      setGameState(state);

      // Trigger dice animation on new roll
      if (state.lastDiceRoll) {
        triggerDiceAnimation(state.lastDiceRoll);
      }
    });

    // Game events (log messages)
    const offEvent = socketClient.on<GameEventPayload>(SOCKET_EVENTS.GAME_EVENT, (event) => {
      addEvent(event);

      // Show toast for important events
      if (
        event.type.includes('WIN') ||
        event.type === 'PLAYER_DISCONNECTED' ||
        event.type === 'PLAYER_RECONNECTED'
      ) {
        toast(event.message, {
          icon: event.type.includes('WIN') ? '🏆' : '🔌',
          duration: 4000,
        });
      }
    });

    // Lobby state updates
    const offLobby = socketClient.on<LobbyState>(SOCKET_EVENTS.LOBBY_UPDATE, (state) => {
      setLobby(state);

      // If game started, redirect handled by game:state event
    });

    // Action errors
    const offError = socketClient.on<{ message: string; actionType: string }>(
      SOCKET_EVENTS.GAME_ACTION_ERROR,
      ({ message }) => {
        toast.error(message, { duration: 3000 });
      }
    );

    // Game ended
    const offEnded = socketClient.on<{ winner: string; finalState: ClientGameState }>(
      SOCKET_EVENTS.GAME_ENDED,
      ({ winner, finalState }) => {
        setGameState(finalState);
        toast.success(`Game ended! Winner: ${winner}`, { duration: 5000 });
      }
    );

    // Generic errors
    const offGenericError = socketClient.on<{ message: string }>(SOCKET_EVENTS.ERROR, ({ message }) => {
      toast.error(message, { duration: 4000 });
    });

    return () => {
      offState();
      offEvent();
      offLobby();
      offError();
      offEnded();
      offGenericError();
    };
  }, [setGameState, addEvent, setLobby, triggerDiceAnimation]);
}
