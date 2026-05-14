import React, { useEffect, useRef, useCallback } from 'react';
import { PhaserGame } from '../../game/board/PhaserGame';
import { useGameStore } from '../../store/gameStore';

// =============================================
// GameBoard: Phaser canvas wrapper
// =============================================

const GameBoard: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const phaserRef = useRef<PhaserGame | null>(null);
  const gameState = useGameStore((s) => s.gameState);
  const buildMode = useGameStore((s) => s.buildMode);
  const { buildSettlement, buildRoad, buildCity, moveRobber, setBuildMode } = useGameStore();

  const handleVertexClick = useCallback(
    (vertexId: string) => {
      if (buildMode.type === 'settlement') {
        buildSettlement(vertexId);
      } else if (buildMode.type === 'city') {
        buildCity(vertexId);
      }
    },
    [buildMode, buildSettlement, buildCity]
  );

  const handleEdgeClick = useCallback(
    (edgeId: string) => {
      if (buildMode.type === 'road') {
        buildRoad(edgeId);
      }
    },
    [buildMode, buildRoad]
  );

  const handleHexClick = useCallback(
    (hexId: string) => {
      if (buildMode.type === 'robber') {
        moveRobber(hexId);
      }
    },
    [buildMode, moveRobber]
  );

  // Initialize Phaser once
  useEffect(() => {
    if (!containerRef.current) return;

    phaserRef.current = new PhaserGame({
      onVertexClick: handleVertexClick,
      onEdgeClick: handleEdgeClick,
      onHexClick: handleHexClick,
    });
    phaserRef.current.init(containerRef.current);

    const observer = new ResizeObserver(() => phaserRef.current?.resize());
    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
      phaserRef.current?.destroy();
      phaserRef.current = null;
    };
  }, []); // eslint-disable-line

  // Update callbacks when buildMode changes
  useEffect(() => {
    if (!phaserRef.current) return;
    // Re-create phaser game with new callbacks would be expensive; instead
    // store callbacks in refs so the scene can call the latest version
  }, [handleVertexClick, handleEdgeClick, handleHexClick]);

  // Update board when game state changes
  useEffect(() => {
    if (!phaserRef.current || !gameState?.board) return;
    phaserRef.current.updateBoard(gameState.board);
  }, [gameState?.board]);

  // Update highlights based on build mode
  useEffect(() => {
    if (!phaserRef.current || !gameState?.board) return;

    switch (buildMode.type) {
      case 'settlement': {
        // Get valid settlement positions from game state
        // For now highlight all empty vertices; server validates
        const validVerts = gameState.board.vertices
          .filter((v) => !v.building)
          .map((v) => v.id);
        phaserRef.current.setHighlightMode('vertex', validVerts);
        break;
      }
      case 'road': {
        const validEdges = gameState.board.edges
          .filter((e) => !e.road)
          .map((e) => e.id);
        phaserRef.current.setHighlightMode('edge', validEdges);
        break;
      }
      case 'city': {
        const myId = gameState.myPlayer?.id;
        const validCities = gameState.board.vertices
          .filter((v) => v.building?.type === 'settlement' && v.building.playerId === myId)
          .map((v) => v.id);
        phaserRef.current.setHighlightMode('vertex', validCities);
        break;
      }
      case 'robber': {
        const validHexes = gameState.board.hexes
          .filter((h) => h.id !== gameState.robberHexId)
          .map((h) => h.id);
        phaserRef.current.setHighlightMode('hex', validHexes);
        break;
      }
      default:
        phaserRef.current.setHighlightMode(null);
    }
  }, [buildMode, gameState]);

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative"
      style={{ minHeight: '500px' }}
    />
  );
};

export default GameBoard;
