.PHONY: dev dev-be dev-fe test test-be test-fe test-e2e build lint format install clean

# ── Development ──────────────────────────────────────────────────────────────

dev: ## Start both frontend and backend with hot reload
	@echo "Starting VRL ML Studio..."
	@trap 'kill 0' SIGINT; \
	  cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload & \
	  cd frontend && npm run dev & \
	  wait

dev-be: ## Start backend only
	cd backend && python -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

dev-fe: ## Start frontend only
	cd frontend && npm run dev

# ── Testing ───────────────────────────────────────────────────────────────────

test: test-be test-fe ## Run all tests

test-be: ## Run backend tests with coverage
	cd backend && python -m pytest --cov=. --cov-report=term-missing --cov-fail-under=80 -v

test-fe: ## Run frontend unit tests
	cd frontend && npm run test

test-e2e: ## Run Playwright E2E tests
	cd frontend && npx playwright test

# ── Build ─────────────────────────────────────────────────────────────────────

build: ## Production build (frontend)
	cd frontend && npm run build

# ── Code Quality ──────────────────────────────────────────────────────────────

lint: ## Lint frontend (ESLint) and backend (Ruff)
	cd frontend && npm run lint
	cd backend && python -m ruff check .

format: ## Format frontend (Prettier) and backend (Black)
	cd frontend && npm run format
	cd backend && python -m black . && python -m ruff check . --fix

# ── Setup ─────────────────────────────────────────────────────────────────────

install: ## Install all dependencies
	cd backend && pip install -r requirements.txt
	cd frontend && npm install

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/dist frontend/.vite

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
