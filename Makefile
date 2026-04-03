.PHONY: dev dev-be dev-fe stop test test-be test-fe test-e2e build lint format install clean

# Python interpreter — uses venv if present, falls back to system python3
PYTHON := $(shell [ -f backend/.venv/bin/python ] && echo backend/.venv/bin/python || echo python3)

# ── Development ──────────────────────────────────────────────────────────────

dev: ## Start both frontend (port 3000) and backend (port 8000) — Ctrl+C stops both
	@echo ""
	@echo "  VRL ML Studio"
	@echo "  Backend  → http://localhost:8000"
	@echo "  Frontend → http://localhost:3000"
	@echo "  Press Ctrl+C to stop both."
	@echo ""
	@trap 'kill 0' SIGINT SIGTERM; \
	  (cd backend && ../$(PYTHON) -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload) & \
	  (cd frontend && npm run dev) & \
	  wait

stop: ## Stop any running backend (uvicorn) and frontend (vite) processes
	@echo "Stopping VRL ML Studio processes..."
	@pkill -f "uvicorn main:app" 2>/dev/null && echo "  Backend stopped" || echo "  Backend was not running"
	@pkill -f "vite"             2>/dev/null && echo "  Frontend stopped" || echo "  Frontend was not running"

dev-be: ## Start backend only
	cd backend && ../$(PYTHON) -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload

dev-fe: ## Start frontend only
	cd frontend && npm run dev

# ── Testing ───────────────────────────────────────────────────────────────────

test: test-be test-fe ## Run all tests

test-be: ## Run backend tests with coverage
	cd backend && ../$(PYTHON) -m pytest --cov=. --cov-report=term-missing --cov-fail-under=80 -v

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
	cd backend && ../$(PYTHON) -m ruff check .

format: ## Format frontend (Prettier) and backend (Black)
	cd frontend && npm run format
	cd backend && ../$(PYTHON) -m black . && ../$(PYTHON) -m ruff check . --fix

# ── Setup ─────────────────────────────────────────────────────────────────────

install: ## Install all dependencies (creates backend venv if missing)
	@[ -d backend/.venv ] || python3 -m venv backend/.venv
	backend/.venv/bin/pip install -q -r backend/requirements.txt
	cd frontend && npm install

# ── Cleanup ───────────────────────────────────────────────────────────────────

clean: ## Remove build artifacts and caches
	find . -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .pytest_cache -exec rm -rf {} + 2>/dev/null || true
	find . -type d -name .ruff_cache -exec rm -rf {} + 2>/dev/null || true
	rm -rf frontend/dist frontend/.vite

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
