import React, { useState, useEffect, useRef } from 'react';

const ROWS = 12;
const COLS = 12;

const createEmptyGrid = () => 
  Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

const createRandomGrid = () => 
  Array(ROWS).fill(null).map(() =>
    Array(COLS).fill(null).map(() => (Math.random() > 0.75 ? 1 : 0))
  );

const createInitialStates = () => {
  const g = createRandomGrid();
  const a = g.map(row => row.map(cell => (cell === 1 ? 1 : 0)));
  return { grid: g, ages: a };
};

const App: React.FC = () => {
  const [initialData] = useState(() => createInitialStates());
  const [grid, setGrid] = useState<number[][]>(initialData.grid);
  const [ages, setAges] = useState<number[][]>(initialData.ages);
  const [generation, setGeneration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ r: number | null; c: number | null }>({ r: null, c: null });
  
  const transitionTimeoutRef = useRef<any>(null);

  const toggleCell = (r: number, c: number) => {
    if (isLoading) return;
    
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    const wasAlive = grid[r][c] === 1 || grid[r][c] === 3;
    const newGrid = grid.map((row, rowIndex) =>
      row.map((val, colIndex) => {
        if (rowIndex === r && colIndex === c) {
          return wasAlive ? 0 : 1;
        }
        return val;
      })
    );
    
    setGrid(newGrid);
    setAges(prev => prev.map((row, rowIndex) =>
      row.map((val, colIndex) => {
        if (rowIndex === r && colIndex === c) {
          return wasAlive ? 0 : 1;
        }
        return val;
      })
    ));
    handleNextGen(newGrid);
  };

  const handleNextGen = async (currentGrid: number[][]) => {
    setIsLoading(true);
    setError(null);
    try {
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
        
        const transitionGrid = normalizedGrid.map((row, r) =>
          row.map((cell, c) => {
            const nextVal = newGrid[r][c];
            const isCurrentlyAlive = cell === 1;
            
            if (isCurrentlyAlive && nextVal === 0) {
              return 2; // Dying (red)
            } else if (!isCurrentlyAlive && nextVal === 1) {
              return 3; // Revived (green)
            } else if (isCurrentlyAlive && nextVal === 1) {
              return 1; // Remains alive (cyan/purple)
            } else {
              return 0; // Remains dead
            }
          })
        );

        setGrid(transitionGrid);
        setAges(prevAges => prevAges.map((row, r) =>
          row.map((ageVal, c) => {
            const nextVal = newGrid[r][c];
            const wasAlive = normalizedGrid[r][c] === 1;
            if (nextVal === 1) {
              return wasAlive ? ageVal + 1 : 1;
            } else {
              return 0;
            }
          })
        ));
        setGeneration((prev) => prev + 1);

        transitionTimeoutRef.current = setTimeout(() => {
          setGrid((prevGrid) =>
            prevGrid.map((row) =>
              row.map((cell) => {
                if (cell === 2) return 0;
                if (cell === 3) return 1;
                return cell;
              })
            )
          );
        }, 1500);

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
    setAges(createEmptyGrid());
    setGeneration(0);
    setIsPlaying(false);
    setError(null);
  };

  useEffect(() => {
    let intervalId: any = null;
    if (isPlaying) {
      intervalId = setInterval(() => {
        handleNextGen(grid);
      }, 1800);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, grid]);

  const activeCellsCount = grid.reduce((acc, row) => 
    acc + row.filter(cell => cell === 1 || cell === 3).length, 0
  );
  const density = ((activeCellsCount / (ROWS * COLS)) * 100).toFixed(1);

  const totalHeight = ages.reduce((acc, row, r) => 
    acc + row.reduce((rowAcc, age, c) => {
      const isAlive = grid[r][c] === 1 || grid[r][c] === 3;
      const heightPx = isAlive ? Math.min(76, 16 + (age - 1) * 12) : 0;
      return rowAcc + heightPx;
    }, 0), 0
  );
  const avgHeight = activeCellsCount > 0 ? (totalHeight / activeCellsCount).toFixed(0) : '0';

  let systemStatus = 'IDLE';
  if (error) systemStatus = 'FAULT';
  else if (isLoading) systemStatus = 'SYNCING';
  else if (isPlaying) systemStatus = 'AUTO-RUN';
  else if (activeCellsCount > 0) systemStatus = 'STABLE';

  return (
    <div className="min-h-screen tech-bg text-slate-100 flex flex-col items-center justify-center p-6 relative overflow-hidden select-none">
      {/* Immersive background aura effects */}
      <div className="glow-blob-1 pointer-events-none" />
      <div className="glow-blob-2 pointer-events-none" />
      
      {/* Dynamic scanline overlay effect */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.04)_0%,transparent_75%)] pointer-events-none" />
      
      <div className="z-10 w-full max-w-2xl flex flex-col items-center gap-6">
        
        {/* Futuristic Dashboard Header */}
        <div className="text-center flex flex-col items-center">
          <div className="flex items-center gap-2 mb-2 px-3 py-1 bg-purple-500/10 border border-purple-500/20 rounded-full text-[9px] font-mono tracking-widest text-purple-300">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-pulse" />
            42_NETWORK // EXAM_06 CORE
          </div>
          <h1 className="text-4xl font-extrabold tracking-[0.18em] bg-gradient-to-r from-purple-100 via-violet-300 to-fuchsia-100 bg-clip-text text-transparent uppercase font-tech">
            LIFE ENGINE
          </h1>
          <p className="text-purple-500/70 text-[10px] uppercase tracking-[0.22em] mt-1 font-semibold">
            Bi-directional Socket Simulation Console
          </p>
        </div>

        {/* Central Operations Panel */}
        <div className="w-full flex flex-col items-center relative">
          
          {/* Cybernetic Accent Decals */}
          <div className="absolute top-3 left-4 text-[7px] font-mono text-purple-600/70 tracking-widest pointer-events-none uppercase">
            loc.sys // core_matrix
          </div>
          <div className="absolute top-3 right-4 text-[7px] font-mono text-purple-600/70 tracking-widest pointer-events-none uppercase">
            [x2D // 3D_CITY]
          </div>

          {/* Telemetry Dashboard Component */}
          <div className="w-full flex flex-col gap-1.5 mb-6 mt-1.5">
            <div className="w-full grid grid-cols-3 gap-2 p-2 bg-slate-950/70 rounded-xl border border-slate-800/60 text-[10px] font-mono uppercase tracking-wider text-slate-400">
              <div className="flex flex-col items-center border-r border-slate-800/60 py-0.5">
                <span className="text-slate-600 text-[8px] font-bold">status</span>
                <span className={`font-bold font-tech mt-0.5 flex items-center gap-1.5 ${
                  systemStatus === 'FAULT' ? 'text-rose-400' :
                  systemStatus === 'SYNCING' ? 'text-amber-400' :
                  systemStatus === 'AUTO-RUN' ? 'text-emerald-400' :
                  systemStatus === 'STABLE' ? 'text-purple-400' : 'text-slate-500'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    systemStatus === 'FAULT' ? 'bg-rose-500 shadow-[0_0_8px_#f43f5e]' :
                    systemStatus === 'SYNCING' ? 'bg-amber-500 animate-ping' :
                    systemStatus === 'AUTO-RUN' ? 'bg-emerald-500 animate-ping' :
                    systemStatus === 'STABLE' ? 'bg-purple-500 shadow-[0_0_8px_#a855f7]' : 'bg-slate-600'
                  }`} />
                  {systemStatus}
                </span>
              </div>
              <div className="flex flex-col items-center border-r border-slate-800/60 py-0.5">
                <span className="text-slate-600 text-[8px] font-bold">generation</span>
                <span className="font-bold text-slate-200 mt-0.5 font-tech">{generation}</span>
              </div>
              <div className="flex flex-col items-center py-0.5">
                <span className="text-slate-600 text-[8px] font-bold">avg height</span>
                <span className="font-bold text-slate-200 mt-0.5 font-tech">
                  {avgHeight}m <span className="text-slate-500 text-[8px]">({activeCellsCount})</span>
                </span>
              </div>
            </div>
            {/* Live pop indicator bar */}
            <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-purple-950/35">
              <div 
                className="h-full bg-gradient-to-r from-violet-600 via-purple-500 to-fuchsia-500 transition-all duration-500 ease-out" 
                style={{ width: `${Math.min(100, parseFloat(density))}%` }}
              />
            </div>
          </div>

          {error && (
            <div className="w-full mb-5 p-3 rounded-xl bg-rose-950/20 border border-rose-800/40 text-rose-300 text-xs text-center flex flex-col gap-0.5">
              <span className="font-bold font-mono text-[9px] tracking-wider text-rose-400">CONSOLE OUT // FAULT:</span>
              <span className="font-mono text-[10px] text-rose-300">{error}</span>
            </div>
          )}

          {/* Interactive 3D Isometric Tactical Board */}
          <div className="flex flex-col items-center w-full mt-16 mb-8">
            <div className="isometric-grid-container w-full flex justify-center">
              <div 
                className="isometric-grid grid gap-[4px] p-4 bg-transparent"
                style={{ gridTemplateColumns: `repeat(${COLS + 1}, minmax(0, 1fr))` }}
              >
                {Array.from({ length: ROWS + 1 }).map((_, gridRow) =>
                  Array.from({ length: COLS + 1 }).map((_, gridCol) => {
                    // Empty Top-Left corner
                    if (gridRow === 0 && gridCol === 0) {
                      return (
                        <div 
                          key="coord-corner" 
                          className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center coord-label-cell"
                        />
                      );
                    }
                    
                    // Column Letters (A-L) flat on the 3D plane
                    if (gridRow === 0 && gridCol > 0) {
                      const cIndex = gridCol - 1;
                      const colChar = String.fromCharCode(65 + cIndex);
                      const isHighlighted = hoveredCell.c === cIndex;
                      return (
                        <div 
                          key={`col-label-${cIndex}`} 
                          className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-tech text-[10px] font-bold transition-all duration-200 coord-label-cell ${
                            isHighlighted ? 'text-purple-400 scale-125 font-black drop-shadow-[0_0_6px_#a855f7]' : 'text-purple-700/60'
                          }`}
                        >
                          {colChar}
                        </div>
                      );
                    }

                    // Row Numbers (01-12) flat on the 3D plane
                    if (gridRow > 0 && gridCol === 0) {
                      const rIndex = gridRow - 1;
                      const rowStr = String(gridRow).padStart(2, '0');
                      const isHighlighted = hoveredCell.r === rIndex;
                      return (
                        <div 
                          key={`row-label-${rIndex}`} 
                          className={`w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center font-tech text-[10px] font-bold transition-all duration-200 coord-label-cell ${
                            isHighlighted ? 'text-purple-400 scale-125 font-black drop-shadow-[0_0_6px_#a855f7]' : 'text-purple-700/60'
                          }`}
                        >
                          {rowStr}
                        </div>
                      );
                    }

                    // Grid Cells
                    const r = gridRow - 1;
                    const c = gridCol - 1;
                    const cell = grid[r][c];
                    const age = ages[r][c];
                    const heightPx = cell === 0 ? 0 : Math.min(76, 16 + (age - 1) * 12);

                    return (
                      <button
                        key={`${r}-${c}`}
                        onClick={() => toggleCell(r, c)}
                        onMouseEnter={() => setHoveredCell({ r, c })}
                        onMouseLeave={() => setHoveredCell({ r: null, c: null })}
                        className="group w-8 h-8 sm:w-9 sm:h-9 focus:outline-none grid-plot rounded-[4px]"
                        aria-label={`Cell plot at ${String.fromCharCode(65 + c)}${r + 1}`}
                        style={{ 
                          '--h': `${heightPx}px`,
                          zIndex: (gridRow * 100) + gridCol
                        } as React.CSSProperties}
                      >
                        {/* Dead plot: Hover hologram */}
                        {cell === 0 && (
                          <div className="hologram-sky opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <div className="holo-roof" />
                            <div className="holo-south" />
                            <div className="holo-east" />
                          </div>
                        )}

                        {/* Stable skyscraper */}
                        {cell === 1 && (
                          <div className="skyscraper">
                            <div className="sky-roof" />
                            <div className="sky-south" />
                            <div className="sky-east" />
                          </div>
                        )}

                        {/* Dying skyscraper (Collapsing) */}
                        {cell === 2 && (
                          <div className="skyscraper">
                            <div className="sky-roof dying" />
                            <div className="sky-south dying" />
                            <div className="sky-east dying" />
                          </div>
                        )}

                        {/* Revived skyscraper (Growing green construction) */}
                        {cell === 3 && (
                          <div className="skyscraper">
                            <div className="sky-roof revived" />
                            <div className="sky-south revived" />
                            <div className="sky-east revived" />
                          </div>
                        )}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Minimalist Tech Operations Control */}
          <div className="mt-4 flex gap-4 justify-center w-full z-10">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`flex-1 py-3 rounded-xl font-bold font-tech text-xs uppercase tracking-widest transition-all duration-300 border ${
                isPlaying 
                  ? 'bg-amber-500/10 border-amber-400/80 text-amber-300 hover:bg-amber-500 hover:text-slate-950 hover:shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
                  : 'bg-purple-500/10 border-purple-400/40 text-purple-400 hover:bg-[#a855f7] hover:text-slate-950 hover:shadow-[0_0_20px_rgba(168,85,247,0.45)]'
              }`}
            >
              {isPlaying ? 'PAUSE SYS' : 'RUN ENGINE'}
            </button>

            <button
              onClick={handleClear}
              className="px-8 py-3 rounded-xl font-bold font-tech text-xs uppercase tracking-widest transition-all duration-300 border border-rose-500/20 bg-rose-950/10 text-rose-400 hover:bg-rose-500 hover:text-slate-950 hover:shadow-[0_0_20px_rgba(244,63,94,0.35)]"
            >
              FLUSH
            </button>
          </div>
        </div>

        {/* Legend Panel */}
        <div className="w-full bg-slate-950/45 border border-purple-950/30 rounded-2xl p-4 text-[10px] font-mono uppercase tracking-wider text-slate-400">
          <div className="flex justify-around items-center gap-2">
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-[#c084fc] to-[#7c3aed] border border-purple-400/40 shadow-[0_0_6px_rgba(168,85,247,0.6)]" />
              <span className="text-slate-400 font-bold">Stable</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-[#34d399] to-[#059669] border border-emerald-400/40 shadow-[0_0_6px_rgba(52,211,153,0.6)]" />
              <span className="text-slate-400 font-bold">Revived</span>
            </div>
            <div className="flex items-center gap-2.5">
              <span className="h-2.5 w-2.5 rounded-sm bg-gradient-to-br from-[#f87171] to-[#dc2626] border border-rose-400/40 shadow-[0_0_6px_rgba(239,68,68,0.6)]" />
              <span className="text-slate-400 font-bold">Dying</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default App;

