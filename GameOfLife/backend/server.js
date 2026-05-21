const express = require('express');
const cors = require('cors');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.post('/api/next-gen', (req, res) => {
    const gridData = Array.isArray(req.body) ? req.body : req.body.grid;
    
    if (!gridData || !Array.isArray(gridData)) {
        return res.status(400).json({ error: 'Invalid grid state. Must be a 2D array.' });
    }
    
    console.log(`[Backend] Received grid of size ${gridData.length}x${gridData[0] ? gridData[0].length : 0}`);
    
    const gamePath = process.env.GAME_PATH || path.join(__dirname, 'game');
    const gameProcess = spawn(gamePath);
    
    let stdoutData = '';
    let stderrData = '';
    
    gameProcess.stdout.on('data', (data) => {
        stdoutData += data.toString();
    });
    
    gameProcess.stderr.on('data', (data) => {
        stderrData += data.toString();
    });
    
    gameProcess.on('close', (code) => {
        if (code !== 0) {
            console.error(`Game engine process exited with code ${code}. Error: ${stderrData}`);
            return res.status(500).json({ error: 'Game engine execution failed', details: stderrData });
        }
        
        try {
            const nextGenGrid = JSON.parse(stdoutData.trim());
            console.log(`[Backend] Returning next-gen grid of size ${nextGenGrid.length}x${nextGenGrid[0] ? nextGenGrid[0].length : 0}`);
            return res.json({ grid: nextGenGrid });
        } catch (e) {
            console.error('Failed to parse grid state from engine:', stdoutData);
            return res.status(500).json({ error: 'Invalid response from game engine' });
        }
    });
    
    gameProcess.stdin.write(JSON.stringify(gridData));
    gameProcess.stdin.end();
});

app.listen(PORT, () => {
    console.log(`Backend server running on port ${PORT}`);
});
