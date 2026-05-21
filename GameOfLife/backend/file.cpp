#include <iostream>
#include <vector>
#include <string>
#include <utility>

class GameOfLife {
private:
    std::vector<std::vector<int>> grid;
    int rows;
    int cols;

    // Helper function to count live neighbors
    int countLiveNeighbors(int r, int c) const {
        int liveNeighbors = 0;
        for (int dr = -1; dr <= 1; ++dr) {
            for (int dc = -1; dc <= 1; ++dc) {
                if (dr == 0 && dc == 0) continue;
                int nr = r + dr;
                int nc = c + dc;
                if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
                    if (grid[nr][nc] == 1) {
                        liveNeighbors++;
                    }
                }
            }
        }
        return liveNeighbors;
    }

public:
    // 1. Default constructor
    GameOfLife() : rows(0), cols(0) {}

    // Parameterized constructor
    GameOfLife(const std::vector<std::vector<int>>& initialGrid) 
        : grid(initialGrid), 
          rows(static_cast<int>(initialGrid.size())), 
          cols(initialGrid.empty() ? 0 : static_cast<int>(initialGrid[0].size())) {}

    // 2. Copy constructor
    GameOfLife(const GameOfLife& other) 
        : grid(other.grid), rows(other.rows), cols(other.cols) {}

    // 3. Copy assignment operator
    GameOfLife& operator=(const GameOfLife& other) {
        if (this != &other) {
            grid = other.grid;
            rows = other.rows;
            cols = other.cols;
        }
        return *this;
    }

    // 4. Destructor
    ~GameOfLife() {}

    // 5. Move constructor (C++11 standard addition)
    GameOfLife(GameOfLife&& other) noexcept 
        : grid(std::move(other.grid)), rows(other.rows), cols(other.cols) {
        other.rows = 0;
        other.cols = 0;
    }

    // 6. Move assignment operator (C++11 standard addition)
    GameOfLife& operator=(GameOfLife&& other) noexcept {
        if (this != &other) {
            grid = std::move(other.grid);
            rows = other.rows;
            cols = other.cols;
            other.rows = 0;
            other.cols = 0;
        }
        return *this;
    }

    // Parse JSON-like grid representation from standard input
    void parseJSON(const std::string& input) {
        grid.clear();
        std::vector<int> currentRow;
        bool inRow = false;
        for (char c : input) {
            if (c == '[') {
                inRow = true;
            } else if (c == ']') {
                if (inRow && !currentRow.empty()) {
                    grid.push_back(currentRow);
                    currentRow.clear();
                }
                inRow = false;
            } else if (c == '0' || c == '1') {
                currentRow.push_back(c - '0');
            }
        }
        rows = static_cast<int>(grid.size());
        cols = grid.empty() ? 0 : static_cast<int>(grid[0].size());
    }

    // Compute next generation based on Conway's Game of Life rules
    void computeNextGeneration() {
        if (rows == 0 || cols == 0) return;
        std::vector<std::vector<int>> nextGrid(rows, std::vector<int>(cols, 0));
        
        for (int r = 0; r < rows; ++r) {
            for (int c = 0; c < cols; ++c) {
                int liveNeighbors = countLiveNeighbors(r, c);
                
                if (grid[r][c] == 1) {
                    if (liveNeighbors == 2 || liveNeighbors == 3) {
                        nextGrid[r][c] = 1;
                    } else {
                        nextGrid[r][c] = 0;
                    }
                } else {
                    if (liveNeighbors == 3) {
                        nextGrid[r][c] = 1;
                    } else {
                        nextGrid[r][c] = 0;
                    }
                }
            }
        }
        grid = nextGrid;
    }

    // Output the internal grid state as a JSON string
    std::string toJSON() const {
        if (grid.empty()) return "[]";
        std::string out = "[";
        for (int r = 0; r < rows; ++r) {
            out += "[";
            for (int c = 0; c < cols; ++c) {
                out += std::to_string(grid[r][c]);
                if (c < cols - 1) out += ",";
            }
            out += "]";
            if (r < rows - 1) out += ",";
        }
        out += "]";
        return out;
    }
};

int main() {
    // Read all of stdin input
    std::string input;
    char ch;
    while (std::cin.get(ch)) {
        input += ch;
    }
    
    // Create class instance and execute logic
    GameOfLife game;
    game.parseJSON(input);
    game.computeNextGeneration();
    std::cout << game.toJSON() << std::endl;
    
    return 0;
}
