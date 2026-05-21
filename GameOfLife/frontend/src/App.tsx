import React, { useState, useEffect, useRef } from 'react';

const ROWS = 12;
const COLS = 12;

const createEmptyGrid = () => 
  Array(ROWS).fill(null).map(() => Array(COLS).fill(0));

const createRandomGrid = () => 
  Array(ROWS).fill(null).map(() =>
    Array(COLS).fill(null).map(() => (Math.random() > 0.75 ? 1 : 0))
  );

const App: React.FC = () => {
  const [grid, setGrid] = useState<number[][]>(createRandomGrid());
  const [generation, setGeneration] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const transitionTimeoutRef = useRef<any>(null);

  const toggleCell = (r: number, c: number) => {
    // Prevent toggling during active fetch request to avoid race conditions
    if (isLoading) return;
    
    // Clear any pending transition timeouts before starting the new generation
    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    const newGrid = grid.map((row, rowIndex) =>
      row.map((val, colIndex) => {
        if (rowIndex === r && colIndex === c) {
          // Toggle cell state
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
      const response = await fetch('/api/next-gen', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ grid: currentGrid }),
      });

      if (!response.ok) {
        throw new Error(`Server returned status: ${response.status}`);
      }

      const data = await response.json();
      if (data && Array.isArray(data.grid)) {
        // Clear any previous transition timer
        if (transitionTimeoutRef.current) {
          clearTimeout(transitionTimeoutRef.current);
        }

        const newGrid = data.grid;
        
        // Calculate transition states
        const transitionGrid = currentGrid.map((row, r) =>
          row.map((cell, c) => {
            const nextVal = newGrid[r][c];
            const isCurrentlyAlive = cell === 1 || cell === 3;
            
            if (isCurrentlyAlive && nextVal === 0) {
              return 2; // Dying (red)
            } else if (!isCurrentlyAlive && nextVal === 1) {
              return 3; // Revived (green)
            } else if (isCurrentlyAlive && nextVal === 1) {
              return 1; // Remains alive (blue)
            } else {
              return 0; // Remains dead
            }
          })
        );

        setGrid(transitionGrid);
        setGeneration((prev) => prev + 1);

        // Transition red (2) cells to dead (0) and green (3) cells to blue (1) after 1.5 seconds
        transitionTimeoutRef.current = setTimeout(() => {
          setGrid((prevGrid) =>
            prevGrid.map((row) =>
              row.map((cell) => {
                if (cell === 2) return 0; // Red -> Disappears
                if (cell === 3) return 1; // Green -> Becomes stable alive (1)
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
    setGeneration(0);
    setIsPlaying(false);
    setError(null);
  };



  useEffect(() => {
    let intervalId: any = null;
    if (isPlaying) {
      intervalId = setInterval(() => {
        handleNextGen(grid);
      }, 1800); // 1.8s interval allows 1.5s transition animation to play out
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isPlaying, grid]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-4 selection:bg-cyan-500 selection:text-slate-900">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(6,182,212,0.08)_0%,transparent_70%)] pointer-events-none" />
      
      <div className="z-10 w-full max-w-4xl flex flex-col items-center">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-cyan-400 via-teal-400 to-indigo-500 bg-clip-text text-transparent drop-shadow-sm">
            Conway's Game of Life
          </h1>
          <p className="text-slate-400 mt-2 text-sm md:text-base font-medium">
            C++ Engine &bull; Node.js Backend &bull; React & Tailwind Frontend
          </p>
        </div>

        <div className="w-full max-w-2xl bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col items-center relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent" />

          <div className="w-full flex items-center justify-between mb-6 px-2 text-xs md:text-sm uppercase tracking-wider font-semibold text-slate-400">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-cyan-500 animate-pulse" />
              <span>Generation: <span className="text-cyan-400 font-bold font-mono">{generation}</span></span>
            </div>
            {isLoading && (
              <span className="text-teal-400 animate-pulse text-xs lowercase italic">calculating next state...</span>
            )}
          </div>

          {error && (
            <div className="w-full mb-6 p-4 rounded-lg bg-red-950/40 border border-red-800/60 text-red-200 text-sm text-center flex flex-col items-center gap-1 transition-all duration-300">
              <span className="font-bold">Backend Connection Issue</span>
              <span>{error}</span>
            </div>
          )}

          <div className="bg-slate-950/80 p-4 rounded-xl border border-slate-800 shadow-inner max-w-full overflow-auto">
            <div 
              className="grid gap-[2px] bg-slate-800/40 rounded overflow-hidden" 
              style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}
            >
              {grid.map((row, r) =>
                row.map((cell, c) => (
                  <button
                    key={`${r}-${c}`}
                    onClick={() => toggleCell(r, c)}
                    className={`
                      w-6 h-6 md:w-7 md:h-7 focus:outline-none rounded-sm transition-all duration-200
                      ${cell === 1 
                        ? 'bg-[#21d2ed] shadow-[0_0_8px_rgba(33,210,237,0.6)] scale-95' 
                        : cell === 2
                        ? 'bg-gradient-to-br from-red-500 to-rose-600 shadow-[0_0_8px_rgba(239,68,68,0.6)] scale-90'
                        : cell === 3
                        ? 'bg-gradient-to-br from-green-400 to-emerald-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] scale-100'
                        : 'bg-slate-900 hover:bg-slate-800'
                      }
                    `}
                    aria-label={`Cell at row ${r + 1}, column ${c + 1}. State: ${cell}`}
                  />
                ))
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 justify-center w-full">
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className={`px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 border ${
                isPlaying 
                  ? 'bg-amber-500 border-amber-500 text-slate-950 hover:bg-amber-600 hover:shadow-[0_0_15px_rgba(245,158,11,0.3)]' 
                  : 'bg-teal-950/30 border-teal-500/20 text-teal-400 hover:bg-teal-500 hover:text-slate-950 hover:shadow-[0_0_15px_rgba(20,184,166,0.3)]'
              }`}
            >
              {isPlaying ? 'Pause Simulation' : 'Autoplay'}
            </button>



            <button
              onClick={handleClear}
              className="px-6 py-2.5 rounded-lg font-semibold text-sm transition-all duration-200 border border-red-500/20 bg-red-950/10 text-red-400 hover:bg-red-500 hover:text-slate-950"
            >
              Clear
            </button>
          </div>
        </div>

        <div className="mt-8 w-full max-w-2xl bg-slate-900/40 border border-slate-800/80 rounded-xl p-5 text-sm text-slate-400 space-y-4">
          <h3 className="text-base font-bold text-slate-200 uppercase tracking-wider border-b border-slate-800 pb-2">
            Game Rules & Instructions
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-semibold text-cyan-400">How to Play:</h4>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-350">
                <li>Click any cell on the grid to toggle it and **instantly calculate the next generation**.</li>
                <li>The board starts with a random cell population automatically.</li>
                <li>Click <span className="text-teal-400 font-semibold">Autoplay</span> to watch the simulation run automatically.</li>
              </ul>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-semibold text-teal-400">Visual Rules (1.5s Transition):</h4>
              <ul className="list-disc list-inside space-y-1.5 text-xs text-slate-350">
                <li><span className="text-red-400 font-semibold">Dying cells (Red):</span> Underpopulated/Overpopulated cells turn red, then disappear.</li>
                <li><span className="text-green-400 font-semibold">Revived cells (Green):</span> Dead cells with exactly 3 neighbors turn green, then turn cyan.</li>
                <li><span className="text-[#21d2ed] font-semibold">Stable cells (#21d2ed):</span> Cells that survive from the previous tick remain cyan.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
