import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../store/authStore';
import { useLobbyStore } from '../store/lobbyStore';
import { useNavigate } from 'react-router-dom';

// =============================================
// LandingPage: auth + create/join room
// =============================================

type View = 'home' | 'login' | 'register' | 'guest' | 'play';

const LandingPage: React.FC = () => {
  const [view, setView] = useState<View>('home');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const { login, register, loginAsGuest, isLoading, error, clearError, isAuthenticated, user } =
    useAuthStore();
  const { createRoom, joinRoom, isLoading: lobbyLoading, error: lobbyError, clearError: clearLobbyError } =
    useLobbyStore();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await login(email, password);
      setView('play');
    } catch {}
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await register(username, email, password);
      setView('play');
    } catch {}
  };

  const handleGuest = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await loginAsGuest(username);
      setView('play');
    } catch {}
  };

  const handleCreateRoom = async () => {
    try {
      const code = await createRoom();
      navigate(`/lobby/${code}`);
    } catch {}
  };

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    try {
      await joinRoom(roomCode.trim().toUpperCase());
      navigate(`/lobby/${roomCode.trim().toUpperCase()}`);
    } catch {}
  };

  React.useEffect(() => {
    if (isAuthenticated && view === 'home') setView('play');
  }, [isAuthenticated]);

  return (
    <div className="min-h-screen bg-catan-bg flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute opacity-5"
            style={{
              fontSize: '120px',
              top: `${15 + i * 15}%`,
              left: `${i % 2 === 0 ? -5 : 80}%`,
            }}
            animate={{ rotate: [0, 360] }}
            transition={{ duration: 60 + i * 10, repeat: Infinity, ease: 'linear' }}
          >
            ⬡
          </motion.div>
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: -30 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8 z-10"
      >
        <h1 className="text-6xl font-bold font-display text-yellow-400 mb-2 drop-shadow-lg">
          Catan
        </h1>
        <p className="text-gray-400 text-lg">Online Multiplayer Strategy Game</p>
        <div className="flex justify-center gap-4 mt-3 text-sm text-gray-500">
          <span>🌲 Collect</span>
          <span>🏠 Build</span>
          <span>🤝 Trade</span>
          <span>🏆 Win</span>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {view === 'home' && (
          <motion.div
            key="home"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="w-full max-w-sm space-y-3 z-10"
          >
            <button
              onClick={() => setView('login')}
              className="w-full py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500 font-bold text-gray-900
                         shadow-lg shadow-yellow-900/50 transition-all"
            >
              Login
            </button>
            <button
              onClick={() => setView('register')}
              className="w-full py-3 rounded-xl border border-yellow-600 text-yellow-400
                         hover:bg-yellow-900/20 font-bold transition-all"
            >
              Create Account
            </button>
            <button
              onClick={() => setView('guest')}
              className="w-full py-3 rounded-xl border border-catan-border text-gray-400
                         hover:bg-catan-panel font-medium transition-all"
            >
              Play as Guest
            </button>
          </motion.div>
        )}

        {(view === 'login' || view === 'register' || view === 'guest') && (
          <motion.div
            key={view}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="w-full max-w-sm bg-catan-panel rounded-2xl border border-catan-border p-6 z-10"
          >
            <h2 className="text-xl font-bold mb-4 text-center">
              {view === 'login' ? 'Login' : view === 'register' ? 'Create Account' : 'Play as Guest'}
            </h2>

            {(error || lobbyError) && (
              <div className="mb-4 p-3 rounded-lg bg-red-900/30 border border-red-600 text-red-300 text-sm">
                {error || lobbyError}
              </div>
            )}

            <form onSubmit={view === 'login' ? handleLogin : view === 'register' ? handleRegister : handleGuest}
                  className="space-y-3">
              {(view === 'register' || view === 'guest') && (
                <input
                  type="text"
                  placeholder="Username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl bg-catan-bg border border-catan-border
                             focus:outline-none focus:border-yellow-600 text-white"
                  required
                  minLength={3}
                  maxLength={20}
                />
              )}
              {view !== 'guest' && (
                <>
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-catan-bg border border-catan-border
                               focus:outline-none focus:border-yellow-600 text-white"
                    required
                  />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl bg-catan-bg border border-catan-border
                               focus:outline-none focus:border-yellow-600 text-white"
                    required
                    minLength={8}
                  />
                </>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-yellow-600 hover:bg-yellow-500
                           font-bold text-gray-900 disabled:opacity-50 transition-all"
              >
                {isLoading ? '...' : view === 'login' ? 'Login' : view === 'register' ? 'Create Account' : 'Play as Guest'}
              </button>
            </form>

            <button
              onClick={() => { clearError(); clearLobbyError(); setView('home'); }}
              className="w-full mt-3 text-gray-400 hover:text-white text-sm"
            >
              ← Back
            </button>
          </motion.div>
        )}

        {view === 'play' && (
          <motion.div
            key="play"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-sm z-10 space-y-4"
          >
            <div className="text-center text-gray-300 text-sm mb-2">
              Welcome, <span className="text-yellow-400 font-semibold">{user?.username}</span>!
            </div>

            <button
              onClick={handleCreateRoom}
              disabled={lobbyLoading}
              className="w-full py-4 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500
                         hover:from-yellow-500 hover:to-yellow-400 font-bold text-gray-900
                         shadow-lg shadow-yellow-900/50 transition-all text-lg disabled:opacity-50"
            >
              🚀 Create New Game
            </button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-catan-border" />
              </div>
              <div className="relative flex justify-center text-xs text-gray-500">
                <span className="bg-catan-bg px-2">or join existing</span>
              </div>
            </div>

            <form onSubmit={handleJoinRoom} className="flex gap-2">
              <input
                type="text"
                placeholder="Room Code (e.g. ABC123)"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={8}
                className="flex-1 px-4 py-3 rounded-xl bg-catan-panel border border-catan-border
                           focus:outline-none focus:border-yellow-600 text-white font-mono tracking-widest uppercase"
              />
              <button
                type="submit"
                disabled={lobbyLoading || !roomCode}
                className="px-4 py-3 rounded-xl bg-blue-700 hover:bg-blue-600 font-bold
                           disabled:opacity-50 transition-all"
              >
                Join
              </button>
            </form>

            {lobbyError && (
              <div className="p-3 rounded-lg bg-red-900/30 border border-red-600 text-red-300 text-sm">
                {lobbyError}
              </div>
            )}

            <button
              onClick={() => useAuthStore.getState().logout()}
              className="w-full text-gray-500 hover:text-gray-300 text-sm py-2"
            >
              Logout
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Version */}
      <div className="absolute bottom-4 text-xs text-gray-700">
        Catan Online v1.0.0 — Open Source
      </div>
    </div>
  );
};

export default LandingPage;
