import React, { useEffect, useState } from 'react';

function Stopwatch({ projectId, onStart, onStop }) {
  const [isRunning, setIsRunning] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const storageKey = `ff_timer_${projectId}`;

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && saved.isRunning) {
      setIsRunning(true);
      setStartTime(new Date(saved.startTime));
    }
  }, [projectId, storageKey]);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      setElapsedSeconds(elapsed);
    }, 100);
    return () => clearInterval(interval);
  }, [isRunning, startTime]);

  const handleStart = () => {
    const now = new Date();
    setStartTime(now);
    setIsRunning(true);
    localStorage.setItem(storageKey, JSON.stringify({ isRunning: true, startTime: now.toISOString() }));
    if (onStart) onStart(now);
  };

  const handleStop = () => {
    setIsRunning(false);
    localStorage.removeItem(storageKey);
    if (onStop) onStop(startTime, new Date(), elapsedSeconds);
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="rounded-3xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-xl font-semibold mb-4">Time Tracker for Project {projectId}</h2>
      <div className="flex items-center gap-4">
        <div className="text-4xl font-bold text-emerald-600 font-mono">{formatTime(elapsedSeconds)}</div>
        {!isRunning ? (
          <button onClick={handleStart} className="rounded-2xl bg-emerald-500 px-6 py-3 text-white font-semibold transition hover:bg-emerald-400">
            Start
          </button>
        ) : (
          <button onClick={handleStop} className="rounded-2xl bg-rose-500 px-6 py-3 text-white font-semibold transition hover:bg-rose-400">
            Stop
          </button>
        )}
      </div>
    </div>
  );
}

export default Stopwatch;
