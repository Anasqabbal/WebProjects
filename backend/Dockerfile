# Stage 1: Build the C++ game engine
FROM gcc:latest AS builder
WORKDIR /app
COPY file.cpp .
RUN g++ -O3 -static file.cpp -o game

# Stage 2: Create the Node.js runner environment
FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY server.js .
COPY --from=builder /app/game /usr/local/bin/game
EXPOSE 5000
CMD ["npm", "start"]
