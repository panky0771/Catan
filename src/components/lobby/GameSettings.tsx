import React from 'react';
import { useLobbyStore } from '../../store/lobbyStore';

// =============================================
// GameSettings: host-only settings editor
// =============================================

const GameSettings: React.FC = () => {
  const lobby = useLobbyStore((s) => s.lobby);
  const updateSettings = useLobbyStore((s) => s.updateSettings);

  if (!lobby) return null;
  const { settings } = lobby;

  return (
    <div className="space-y-3">
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Max Players: {settings.maxPlayers}
        </label>
        <input
          type="range"
          min={3}
          max={5}
          value={settings.maxPlayers}
          onChange={(e) => updateSettings({ maxPlayers: parseInt(e.target.value) })}
          className="w-full accent-yellow-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>3</span><span>4</span><span>5</span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Victory Points to Win: {settings.victoryPointsToWin}
        </label>
        <input
          type="range"
          min={8}
          max={15}
          value={settings.victoryPointsToWin}
          onChange={(e) => updateSettings({ victoryPointsToWin: parseInt(e.target.value) })}
          className="w-full accent-yellow-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>8</span><span>10</span><span>12</span><span>15</span>
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Turn Timer: {settings.turnTimerSeconds === 0 ? 'Disabled' : `${settings.turnTimerSeconds}s`}
        </label>
        <input
          type="range"
          min={0}
          max={300}
          step={30}
          value={settings.turnTimerSeconds}
          onChange={(e) => updateSettings({ turnTimerSeconds: parseInt(e.target.value) })}
          className="w-full accent-yellow-500"
        />
        <div className="flex justify-between text-xs text-gray-500">
          <span>Off</span><span>60s</span><span>120s</span><span>300s</span>
        </div>
      </div>
    </div>
  );
};

export default GameSettings;
