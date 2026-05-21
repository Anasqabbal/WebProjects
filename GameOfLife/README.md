# Conway's Game of Life

![Score](https://img.shields.io/badge/score-125%2F100-success)
![C++](https://img.shields.io/badge/language-C++-blue)
![TypeScript](https://img.shields.io/badge/language-TypeScript-blue)
![Node.js](https://img.shields.io/badge/tech-Node.js-green)
![Express](https://img.shields.io/badge/tech-Express-green)
![React](https://img.shields.io/badge/tech-React-blueviolet)
![Tailwind CSS](https://img.shields.io/badge/tech-Tailwind_CSS-orange)
![Docker](https://img.shields.io/badge/tech-Docker-cyan)
![Orchestration](https://img.shields.io/badge/concept-Orchestration-success)
![Proxy](https://img.shields.io/badge/concept-Reverse--Proxy-success)

---

## 📺 Game Demo

![Conway's Game of Life Demo](assets/GameOfLife.gif)

---

## 📖 Project Summary

This project is a full-stack, containerized implementation of **Conway's Game of Life**, designed as a visual companion and representation of the core concepts in **Exam06** (Mini-Serv / Sockets / I/O routing) which is a requirement of the **42 Network** curriculum.

It runs on a multi-container Docker environment:
* A **C++ game logic executable** compiled from OOP code.
* A **Node.js/Express backend** acting as a lightweight wrapper that communicates with the C++ executable.
* A **React & TypeScript frontend** styled with **Tailwind CSS** that presents the cell grid with smooth, responsive color transitions (newborn cells are **green**, dying cells are **red**, and stable cells are **cyan**).


---

## ⚙️ Technologies Used and Why

* **C++**: Used **purely to recall and practice C++ coding skills** (built in Orthodox Canonical Class Form). Since this is a simple grid-based simulation game, we do not need extreme high-speed execution or micro-optimizations; it was written in C++ for personal skill practice and coding recall.
* **Node.js & Express**: Serves as a simple web server to wrap the C++ console executable. It manages incoming requests and handles subprocess child spawning.
* **React & TypeScript**: Used for managing the interactive cell grid state, tracking generation clicks, and providing compile-time safety.
* **Tailwind CSS**: Simple utility framework to design a clean, responsive slate layout with glowing grid styles.
* **Docker & Docker Compose**: Used to run both services in a single command, ensuring local setups are isolated and uniform.
* **Vite**: Provides a fast dev server and handles the internal reverse proxy.

---

## 🔄 Backend to Frontend Communication

The system communicates across three layers:

1. **Client to Frontend Container (HTTP)**:
   * The React browser client sends HTTP requests to the relative URL path `/api/next-gen`.
   
2. **Reverse Proxy (Vite server to Node server)**:
   * The backend port (5000) is **not exposed** to the host machine for isolation.
   * Vite acts as a reverse proxy inside the frontend container. When the browser makes a call to `/api/next-gen`, Vite proxies it internally to `http://backend:5000/api/next-gen` within the Docker `game_network`.

3. **Node.js Server to C++ Binary (Stdio Streams)**:
   * When the Express server receives the request, it uses `child_process.spawn` to run the compiled `./game` executable.
   * The server writes the JSON grid state to the child process's `stdin` as a raw string.
   * The C++ engine parses it, computes the next generation, writes the output JSON back to `stdout`, and terminates.
   * Express reads the stdout stream, parses the JSON, and sends the response back to the client.

---

## 🛠️ Project Structure & Container Architecture

```text
Browser --(port 8000)--> [ Frontend Container ] --(internal port 5000)--> [ Backend Container ]
(External World)        (Exposed Gateway)                                (Private/Isolated)
```

* **Frontend Container**: Represents the public entrypoint, exposed to the external world on port `8000`. It serves the UI and proxies API requests.
* **Backend Container**: Completely isolated from the external world with zero exposed ports. It communicates only with the frontend container internally on port `5000`.


## 🚀 How to Install and Run

### 1. Build and Start Services
Compile the C++ binary and start both containers:
```bash
make up
```

### 2. Play the Game
Open your web browser and navigate to:
* [http://localhost:8000](http://localhost:8000)

### 3. Quick Restart
To restart the Docker containers to load configuration updates:
```bash
make re
```

### 4. Clean Up
To stop the application and remove containers:
```bash
make down
```
To clean up container volumes (e.g. node_modules):
```bash
make clean
```

---

## 🔮 Upcoming Features (Roadmap)

We plan to implement the following expansions in the future:
1. **User Accounts & Database Integration**:
   * Add a secure login system to store player accounts.
   * Implement database saves so players can save their custom board layouts.
2. **Interactive Dashboard**:
   * Add dashboard charts showing historical population logs, generation counts, and grid patterns.
3. **Live Multiplayer Chat**:
   * A chat window to let active players communicate and share board codes in real-time.
   * Connect with new players directly on the platform.
4. **AI for Fun Interactions**:
   * A fun interactive mini-game where the AI tries to predict the user's next cell click/placement.
   * If the AI predicts correctly, it scores 1 point; if the user's placement is opposite to the AI's prediction, the user gets 1 point.
   * Scores are tracked live on a session dashboard (without persistent database storage).

