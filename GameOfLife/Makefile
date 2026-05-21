.PHONY: up down build logs status restart clean re

# Build and start the containers in the background
up:
	docker-compose up --build -d

# Stop and remove the containers
down:
	docker-compose down

# Rebuild the Docker images
build:
	docker-compose build

# View and follow container logs
logs:
	docker-compose logs -f

# Show status of the running containers
status:
	docker-compose ps

# Restart the containers
restart:
	docker-compose restart

# Quick restart alias
re:
	docker-compose restart

# Stop containers and remove volumes
clean:
	docker-compose down -v
