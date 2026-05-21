import React, { useState, useEffect, useRef } from 'react';

const ROWS = 20;
const COLS = 20;

const createEmptyGrid = () => 
  Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

const createRandomGrid = () => 
  Array(ROWS).fill(null).map(() =>
    Array(COLS).fill(null).map(() => (Math.random() > 0.8 ? 1 : 0))
  );

const loadPresetGrid = (preset: string): number[][] => {
  const newGrid = createEmptyGrid();
  const midR = Math.floor(ROWS / 2);
  const midC = Math.floor(COLS / 2);

  switch (preset) {
    case 'glider':
      newGrid[midR - 1][midC] = 1;
      newGrid[midR][midC + 1] = 1;
      newGrid[midR + 1][midC - 1] = 1;
      newGrid[midR + 1][midC] = 1;
      newGrid[midR + 1][midC + 1] = 1;
      break;
    case 'pulsar':
      const pulsarOffsets = [2, 3, 4, 8, 9, 10];
      pulsarOffsets.forEach(offset => {
        // Horizontal lines
        newGrid[midR - 6][midC - offset] = 1;
        newGrid[midR - 6][midC + offset] = 1;
        newGrid[midR - 1][midC - offset] = 1;
        newGrid[midR - 1][midC + offset] = 1;
        newGrid[midR + 1][midC - offset] = 1;
        newGrid[midR + 1][midC + offset] = 1;
        newGrid[midR + 6][midC - offset] = 1;
        newGrid[midR + 6][midC + offset] = 1;

        // Vertical lines
        newGrid[midR - offset][midC - 6] = 1;
        newGrid[midR - offset][midC - 1] = 1;
        newGrid[midR - offset][midC + 1] = 1;
        newGrid[midR - offset][midC + 6] = 1;
        newGrid[midR + offset][midC - 6] = 1;
        newGrid[midR + offset][midC - 1] = 1;
        newGrid[midR + offset][midC + 1] = 1;
        newGrid[midR + offset][midC + 6] = 1;
      });
      break;
    case 'toad':
      newGrid[midR][midC - 1] = 1;
      newGrid[midR][midC] = 1;
      newGrid[midR][midC + 1] = 1;
      newGrid[midR + 1][midC - 2] = 1;
      newGrid[midR + 1][midC - 1] = 1;
      newGrid[midR + 1][midC] = 1;
      break;
    case 'beacon':
      newGrid[midR - 2][midC - 2] = 1;
      newGrid[midR - 2][midC - 1] = 1;
      newGrid[midR - 1][midC - 2] = 1;
      newGrid[midR - 1][midC - 1] = 1;
      newGrid[midR][midC] = 1;
      newGrid[midR][midC + 1] = 1;
      newGrid[midR + 1][midC] = 1;
      newGrid[midR + 1][midC + 1] = 1;
      break;
    case 'pentadecathlon':
      for (let c = midC - 5; c < midC + 5; c++) {
        if (c >= 0 && c < COLS) {
          newGrid[midR][c] = 1;
        }
      }
      break;
    case 'random':
      return createRandomGrid();
    default:
      break;
  }
  return newGrid;
};

const App: React.FC = () => {
  const [grid, setGrid] = useState<number[][]>(createRandomGrid());
  const [generation, setGeneration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1000); // Autoplay speed in ms
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const transitionTimeoutRef = useRef<any>(null);

  // Derive stats
  const liveCellsCount = grid.flat().filter(cell => cell === 1 || cell === 3).length;
  const boardDensity = ((liveCellsCount / (ROWS * COLS)) * 100).toFixed(1);

  const toggleCell = (r: number, c: number) => {
    if (isLoading) return;
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    const newGrid = grid.map((row, rowIndex) =>
      row.map((val, colIndex) => {
        if (rowIndex === r && colIndex === c) {
          return (val === 1 || val === 3) ? 0 : 1;
        }
        return val;
      })
    );
    
    setGrid(newGrid);
    handleNextGen(newGrid);
  };

  const handleNextGen = async (currentGrid: number[][]) => {
    setIsLoading(true);
    setError(null);
    try {
      // Clean cell states (convert visual indicators 2 and 3 back to standard 0 and 1)
      const normalizedGrid = currentGrid.map(row =>
        row.map(cell => (cell === 1 || cell === 3 ? 1 : 0))
      );

      const response = await fetch('/api/next-gen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grid: normalizedGrid }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.grid)) {
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }

        const newGrid = data.grid;
        
        // Calculate transition states
        const transitionGrid = normalizedGrid.map((row, r) =>
          row.map((cell, c) => {
            const nextVal = newGrid[r][c];
            const isCurrentlyAlive = cell === 1;
            
            if (isCurrentlyAlive && nextVal === 0) {
              return 2; // Dying (red)
            } else if (!isCurrentlyAlive && nextVal === 1) {
              return 3; // Revived (green)
            } else if (isCurrentlyAlive && nextVal === 1) {
              return 1; // Remains alive (cyan)
            } else {
              return 0; // Remains dead
            }
          })
        );

        setGrid(transitionGrid);
        setGeneration((prev) => prev + 1);

        // Adjust animation timeouts relative to speed
        const transitionDuration = Math.min(speed - 100, 800);
        transitionTimeoutRef.current = setTimeout(() => {
          setGrid((prevGrid) =>
            prevGrid.map((row) =>
              row.map((cell) => {
                if (cell === 2) return 0; // Red -> Dead
                if (cell === 3) return 1; // Green -> Stable Alive (1)
                return cell;
              })
            )
          );
        }, transitionDuration);

      } else {
        throw new Error('Invalid grid format returned by backend');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to connect to the backend engine');
      setIsPlaying(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }
    setGrid(createEmptyGrid());
    setGeneration(0);
    setIsPlaying(false);
    setError(null);
  };

  const handleLoadPreset = (presetName: string) => {
    const newGrid = loadPresetGrid(presetName);
    setGrid(newGrid);
    setGeneration(0);
    setIsPlaying(false);
    setError(null);
  };

  useEffect(() => {
    let intervalId: any = null;
    if (isPlaying) {
      intervalId = setInterval(() => {
        handleNextGen(grid);
      }, speed);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, grid, speed]);

  const cellTransitionMs = Math.min(speed - 100, 800);

  return (
    <div className="min-h-screen tech-bg text-slate-100 flex flex-col items-center p-4 md:p-8 relative">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.05)_0%,transparent_80%)] pointer-events-none" />
      
      {/* Container Dashboard Wrapper */}
      <div className="z-10 w-full max-w-7xl flex flex-col gap-6">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-5 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-cyan-400 animate-pulse glow-cyan" />
              <h1 className="text-3xl font-black font-tech uppercase tracking-widest bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
                Conway's Game of Life
              </h1>
            </div>
            <p className="text-slate-400 text-xs md:text-sm mt-1 uppercase tracking-wider font-semibold">
              Visual companion for the 42 Network Exam06 &bull; Orthodox Canonical Class Engine
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 bg-slate-900 border border-slate-800 px-3 py-1 rounded">
              Status: <span className={isPlaying ? "text-green-400" : "text-amber-500"}>{isPlaying ? "ACTIVE" : "PAUSED"}</span>
            </span>
          </div>
        </header>

        {/* 3-Column Dashboard Layout */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column 1: Controls & Config (4 cols) */}
          <section className="lg:col-span-4 flex flex-col gap-6">
            
            {/* Live Stats */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4 relative overflow-hidden">
              <div className="scanner-line" />
              <h2 className="text-xs uppercase font-bold tracking-widest text-cyan-400 border-b border-slate-800 pb-2">
                SYSTEM TELEMETRY
              </h2>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Generation</div>
                  <div className="text-xl font-black font-tech text-cyan-400 mt-1">{generation}</div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Live Cells</div>
                  <div className="text-xl font-black font-tech text-emerald-400 mt-1">{liveCellsCount}</div>
                </div>
                <div className="bg-slate-950/60 border border-slate-800/80 rounded-lg p-3 text-center">
                  <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Density</div>
                  <div className="text-xl font-black font-tech text-indigo-400 mt-1">{boardDensity}%</div>
                </div>
              </div>
            </div>

            {/* Presets & Core Controls */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-5">
              <h2 className="text-xs uppercase font-bold tracking-widest text-cyan-400 border-b border-slate-800 pb-2">
                SIMULATION CONSOLE
              </h2>
              
              {/* Presets Selector */}
              <div className="flex flex-col gap-2">
                <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Preset Templates</label>
                <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={() => handleLoadPreset('glider')}
                    className="text-xs bg-slate-950 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-300 font-semibold py-2 px-3 rounded transition-all duration-200"
                  >
                    🚀 Glider Spaceship
                  </button>
                  <button 
                    onClick={() => handleLoadPreset('pulsar')}
                    className="text-xs bg-slate-950 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-300 font-semibold py-2 px-3 rounded transition-all duration-200"
                  >
                    🌀 Pulsar Osc. (P3)
                  </button>
                  <button 
                    onClick={() => handleLoadPreset('toad')}
                    className="text-xs bg-slate-950 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-300 font-semibold py-2 px-3 rounded transition-all duration-200"
                  >
                    🐸 Toad Oscillator
                  </button>
                  <button 
                    onClick={() => handleLoadPreset('beacon')}
                    className="text-xs bg-slate-950 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-300 font-semibold py-2 px-3 rounded transition-all duration-200"
                  >
                    🚨 Beacon Osc.
                  </button>
                  <button 
                    onClick={() => handleLoadPreset('pentadecathlon')}
                    className="text-xs bg-slate-950 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-300 font-semibold py-2 px-3 rounded transition-all duration-200"
                  >
                    📏 Pentadecathlon
                  </button>
                  <button 
                    onClick={() => handleLoadPreset('random')}
                    className="text-xs bg-slate-950 hover:bg-cyan-500 hover:text-slate-950 border border-slate-800 hover:border-cyan-400 text-slate-300 font-semibold py-2 px-3 rounded transition-all duration-200"
                  >
                    🎲 Random Matrix
                  </button>
                </div>
              </div>

              {/* Speed Controller */}
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tick Rate Interval</label>
                  <span className="text-xs font-mono font-bold text-cyan-400">{speed}ms</span>
                </div>
                <input 
                  type="range"
                  min="200"
                  max="2000"
                  step="50"
                  value={speed}
                  onChange={(e) => setSpeed(Number(e.target.value))}
                  className="w-full h-1 bg-slate-950 rounded-lg appearance-none cursor-pointer accent-cyan-400 border border-slate-800"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-semibold">
                  <span>FAST (200ms)</span>
                  <span>SLOW (2000ms)</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2 border-t border-slate-800/80">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex-1 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all duration-200 border ${
                    isPlaying 
                      ? 'bg-amber-500 border-amber-500 text-slate-950 hover:bg-amber-600 hover:shadow-[0_0_15px_rgba(245,158,11,0.25)]' 
                      : 'bg-cyan-950/20 border-cyan-500/20 text-cyan-400 hover:bg-cyan-500 hover:text-slate-950 hover:shadow-[0_0_15px_rgba(34,211,238,0.25)]'
                  }`}
                >
                  {isPlaying ? '⏸️ Pause Auto' : '▶️ Autoplay'}
                </button>
                <button
                  onClick={handleClear}
                  className="px-4 py-2.5 rounded font-bold text-xs uppercase tracking-wider transition-all duration-200 border border-red-500/20 bg-red-950/15 text-red-400 hover:bg-red-500 hover:text-slate-950 hover:shadow-[0_0_15px_rgba(239,68,68,0.2)]"
                >
                  🧹 Clear
                </button>
              </div>
            </div>

          </section>

          {/* Column 2: Grid Board (5 cols) */}
          <section className="lg:col-span-5 flex flex-col items-center">
            <div className="w-full bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-2xl flex flex-col items-center relative overflow-hidden">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />
              
              {/* Telemetry calculating label */}
              <div className="w-full flex justify-between items-center mb-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <span>Viewport: {COLS}x{ROWS}</span>
                {isLoading && (
                  <span className="text-cyan-400 animate-pulse text-[10px] lowercase italic font-mono">calculating engine...</span>
                )}
              </div>

              {/* Grid Box */}
              <div className="bg-slate-950/95 p-3 rounded-lg border border-slate-800 shadow-inner w-full flex justify-center overflow-auto">
                <div 
                  className="grid gap-[1px] bg-slate-900 border border-slate-800/80 p-[1px] rounded" 
                  style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
                >
                  {grid.map((row, r) =>
                    row.map((cell, c) => (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => toggleCell(r, c)}
                        className={`
                          w-5 h-5 sm:w-[22px] sm:h-[22px] focus:outline-none rounded-sm transition-all
                          ${cell === 1 
                            ? 'bg-[#21d2ed] glow-cyan scale-[0.92]' 
                            : cell === 2
                            ? 'bg-gradient-to-br from-red-500 to-rose-600 glow-red scale-[0.88]'
                            : cell === 3
                            ? 'bg-gradient-to-br from-green-400 to-emerald-500 glow-green scale-95'
                            : 'bg-slate-950 hover:bg-slate-900 border-[0.5px] border-slate-900 hover:border-slate-800'
                          }
                        `}
                        style={{
                          transitionDuration: `${cellTransitionMs}ms`
                        }}
                        aria-label={`Cell at r${r} c${c}`}
                      />
                    ))
                  )}
                </div>
              </div>

              {error && (
                <div className="w-full mt-4 p-3 rounded bg-red-950/40 border border-red-800/50 text-red-200 text-xs text-center flex flex-col gap-1">
                  <span className="font-bold">SYSTEM FAULT DETAILS:</span>
                  <span className="font-mono">{error}</span>
                </div>
              )}
            </div>
          </section>

          {/* Column 3: Telemetry Instructions & Concepts (3 cols) */}
          <section className="lg:col-span-3 flex flex-col gap-6">
            
            {/* Visual rules */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-4">
              <h2 className="text-xs uppercase font-bold tracking-widest text-cyan-400 border-b border-slate-800 pb-2">
                CELLULAR STATES
              </h2>
              <div className="flex flex-col gap-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <div className="h-3 w-3 rounded bg-[#21d2ed] glow-cyan shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-cyan-400">Stable (#21d2ed)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Survived from the previous generation tick.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-3 w-3 rounded bg-gradient-to-br from-green-400 to-emerald-500 glow-green shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-green-400">Revived (Green)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Empty cell with exactly 3 neighbors transitioning to life.</div>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <div className="h-3 w-3 rounded bg-gradient-to-br from-red-500 to-rose-600 glow-red shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold text-red-400">Dying (Red)</div>
                    <div className="text-[10px] text-slate-400 mt-0.5">Cell decaying due to over- or under-population.</div>
                  </div>
                </div>
              </div>
            </div>

            {/* 42 Network Exam06 Info */}
            <div className="bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col gap-3">
              <h2 className="text-xs uppercase font-bold tracking-widest text-cyan-400 border-b border-slate-800 pb-2">
                42 EXAM06 COMPANION
              </h2>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                In the 42 Network curriculum, <strong>Exam06</strong> (Mini-Serv) tests mastery of multiplexed socket programming, system calls, and I/O routing under strict memory and compliance rules.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                This app showcases a visual representation of standard input/output mapping: Express spawns the OCF C++ game execution engine as a child subprocess, pipes grid states to its standard input, and displays the processed results instantly on the frontend grid.
              </p>
            </div>

          </section>

        </main>
      </div>
    </div>
  );
};

export default App;

