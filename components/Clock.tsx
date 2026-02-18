import React, { useState, useEffect } from 'react';

export const Clock: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-4xl md:text-5xl font-mono font-black text-gray-800 bg-blue-100 px-6 py-3 rounded-lg shadow-inner border-2 border-blue-300 tracking-wider">
      {time.toLocaleTimeString('en-GB', { hour12: false })}
    </div>
  );
};