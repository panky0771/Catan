import React, { useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '../../store/gameStore';

// =============================================
// EventLog: scrollable game event feed
// =============================================

const EventLog: React.FC = () => {
  const events = useGameStore((s) => s.events);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  const getEventColor = (type: string) => {
    if (type.includes('WIN') || type.includes('VICTORY')) return 'text-yellow-300';
    if (type.includes('ROBBER') || type.includes('DISCARD')) return 'text-red-300';
    if (type.includes('TRADE')) return 'text-blue-300';
    if (type.includes('BUILD') || type.includes('ROAD')) return 'text-green-300';
    if (type.includes('CARD') || type.includes('KNIGHT')) return 'text-purple-300';
    if (type.includes('ROLL')) return 'text-yellow-200';
    return 'text-gray-300';
  };

  return (
    <div className="flex flex-col bg-catan-panel rounded-xl border border-catan-border overflow-hidden">
      <div className="text-xs font-semibold text-gray-400 px-3 py-2 border-b border-catan-border">
        📋 Game Log
      </div>
      <div className="overflow-y-auto h-48 px-2 py-1 space-y-0.5">
        <AnimatePresence initial={false}>
          {events.map((event, i) => (
            <motion.div
              key={`${event.timestamp}-${i}`}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`text-xs py-0.5 px-1 rounded ${getEventColor(event.type)}`}
            >
              <span className="text-gray-600 text-xs mr-1">
                {new Date(event.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </span>
              {event.message}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default EventLog;
