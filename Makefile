.PHONY: setup dev migrate seed stop clean

# First-time setup
setup:
	cd server && npm install
	cd frontend && npm install --legacy-peer-deps
	cd server && cp .env.example .env
	cd frontend && cp .env.example .env.local
	@echo "✅ Done. Fill in server/.env and frontend/.env.local then run: make migrate"

# Run DB migrations
migrate:
	cd server && npx prisma migrate dev --name init
	cd server && npx prisma generate
	@echo "✅ Database tables created"

# Start dev servers
dev:
	@echo "Starting PostgreSQL, server, and frontend..."
	docker-compose up postgres -d
	@sleep 2
	cd server && npm run dev &
	cd frontend && npm run dev

# Docker full stack
docker:
	docker-compose up --build

stop:
	docker-compose down

# Reset DB (caution!)
reset-db:
	cd server && npx prisma migrate reset --force

# View DB in browser
studio:
	cd server && npx prisma studio

clean:
	docker-compose down -v
	rm -rf server/node_modules frontend/node_modules server/dist
