import React, { useEffect, useRef } from 'react';

interface GameLogProps {
  log: string[];
}

export const GameLog: React.FC<GameLogProps> = ({ log }) => {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [log.length]);

  return (
    <div className="game-log">
      <div className="log-header">Game Log</div>
      <div className="log-entries">
        {log.map((entry, i) => (
          <div key={i} className="log-entry">{entry}</div>
        ))}
        <div ref={endRef} />
      </div>
    </div>
  );
};
