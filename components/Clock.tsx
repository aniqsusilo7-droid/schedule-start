
import React, { useState, useEffect } from 'react';

interface ClockProps {
  isCompact?: boolean;
}

export const Clock: React.FC<ClockProps> = ({ isCompact = false }) => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (isCompact) {
    return (
      <div className="font-mono font-black text-xl text-slate-800 dark:text-white tracking-widest">
        {time.toLocaleTimeString('en-GB', { hour12: false })}
      </div>
    );
  }

  return (
    <div className="text-4xl md:text-5xl font-mono font-black text-gray-800 bg-blue-100 px-6 py-3 rounded-lg shadow-inner border-2 border-blue-300 tracking-wider">
      {time.toLocaleTimeString('en-GB', { hour12: false })}
    </div>
  );
};
