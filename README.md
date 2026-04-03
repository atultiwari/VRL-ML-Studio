# VRL ML Studio

A visual, drag-and-drop machine learning workflow platform for tabular data.

> Build ML pipelines like flowcharts. Export them as Python. Version them like code.

---

## Prerequisites

- Python 3.10+
- Node.js 18+
- pip / npm

---

## Quick Start

```bash
# Install all dependencies
make install

# Start both frontend (port 3000) and backend (port 8000)
make dev
```

Then open http://localhost:3000

---

## Commands

| Command | Description |
|---|---|
| `make dev` | Start frontend + backend with hot reload |
| `make dev-be` | Backend only |
| `make dev-fe` | Frontend only |
| `make test` | Run all tests |
| `make test-be` | Backend tests + coverage |
| `make test-fe` | Frontend unit tests |
| `make test-e2e` | Playwright E2E tests |
| `make build` | Production frontend build |
| `make lint` | ESLint + Ruff |
| `make format` | Prettier + Black |
| `make install` | Install all dependencies |
| `make clean` | Remove build artifacts |

---

## Project Structure

```
vrl-ml-studio/
├── frontend/          # React 18 + TypeScript + Vite
├── backend/           # FastAPI + Python
│   └── node_packages/ # Built-in and custom ML node packages
├── docker-compose.yml
├── Makefile
└── CLAUDE.md          # Full project spec and development guide
```

---

## Development Stages

This project is built in 12 stages. See `CLAUDE.md` for the full specification.

| Stage | Description | Status |
|---|---|---|
| 1 | Scaffolding + Node Package Foundation | ✅ In Progress |
| 2 | Canvas Core | Pending |
| 3 | Parameter Panel | Pending |
| 4 | Data Input & EDA Nodes | Pending |
| 5 | Preprocessing Nodes | Pending |
| 6 | Classification Models | Pending |
| 7 | Regression Models | Pending |
| 8 | Unsupervised Models | Pending |
| 9 | Git Project Management | Pending |
| 10 | Code Export | Pending |
| 11 | Node Package Import/Export UI | Pending |
| 12 | Polish, Testing & Docs | Pending |

---

## Developer

Dr. Atul Tiwari
