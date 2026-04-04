# Deployment Guide

## Local Development (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000 (Vite dev server, hot reload)
- Backend: http://localhost:8000 (Uvicorn, auto-reload)

Each browser tab gets an isolated workspace automatically via cookie.

---

## VPS / Production Deployment

### Prerequisites

- A VPS with Docker and Docker Compose installed
- A domain pointing to your VPS IP (optional but recommended)

### Quick Start

```bash
# 1. Clone the repo on your VPS
git clone <your-repo-url> vrl-ml-studio
cd vrl-ml-studio

# 2. Deploy
docker compose -f docker-compose.prod.yml up -d --build
```

That's it. The app is available on port 80.

### What happens under the hood

```
                    ┌──────────────────────��───────┐
  Browser ────────► │  nginx (port 80)             │
                    │                              │
                    │  /           → static files   │
                    │  /api/*      → backend:8000   │
                    │  /ws         → backend:8000   │
                    └──────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │  FastAPI backend (internal)   │
                    │  - 4 Uvicorn workers          │
                    │  - tenant isolation via cookie │
                    ��──────────────────────────────┘
```

- **Single port (80):** Nginx serves the built frontend and proxies API/WebSocket requests to the backend.
- **No CORS needed:** Everything goes through the same origin.
- **Cookies work automatically:** Nginx passes cookies between browser and backend.
- **Tenant isolation:** Each visitor gets a unique workspace. No login required.

### With HTTPS (recommended for public access)

If you have a domain, add a reverse proxy with SSL in front. The simplest options:

**Option A: Caddy (auto HTTPS)**
```bash
# Install Caddy on the VPS, then:
cat > /etc/caddy/Caddyfile << 'EOF'
demo.example.com {
    reverse_proxy localhost:80
}
EOF
sudo systemctl restart caddy
```

**Option B: Nginx + Certbot**
```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d demo.example.com
```

In both cases, the Docker setup stays unchanged — the external proxy handles SSL and forwards to port 80.

### Data Persistence

Project data is stored in a Docker named volume `vrl_projects`. It persists across container rebuilds.

```bash
# Inspect volume
docker volume inspect vrl-ml-studio_vrl_projects

# Backup
docker run --rm -v vrl-ml-studio_vrl_projects:/data -v $(pwd):/backup \
  alpine tar czf /backup/vrl-projects-backup.tar.gz -C /data .

# Restore
docker run --rm -v vrl-ml-studio_vrl_projects:/data -v $(pwd):/backup \
  alpine sh -c "cd /data && tar xzf /backup/vrl-projects-backup.tar.gz"
```

### Updating

```bash
cd vrl-ml-studio
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Multi-User Workspace Isolation

When hosted on a VPS, each visitor automatically gets an isolated workspace:

- A unique `vrl_tenant_id` cookie is set on first visit
- All projects, uploads, and execution cache are scoped per tenant
- A human-friendly workspace name (e.g. "coral-fox") is shown in the toolbar
- Returning visitors (same browser) see their previous projects
- No login, no signup, no password

Storage layout on the server:
```
/root/vrl-projects/
└── tenants/
    ├── a1b2c3d4/          ← Visitor A
    │   ├── my-project/
    │   └── iris-demo/
    ├── e5f6g7h8/          ← Visitor B
    │   └── housing-model/
    └── ...
```

### Resource Considerations

For a demo with ~10 concurrent users:
- **CPU:** 2 vCPUs minimum
- **RAM:** 2 GB minimum (4 GB recommended — ML model training uses memory)
- **Disk:** 10 GB for the app + data volumes
- **Network:** No special requirements

### Cleanup

To remove tenant data older than 7 days (optional cron job):
```bash
# Add to crontab on the VPS
0 3 * * * find /var/lib/docker/volumes/vrl-ml-studio_vrl_projects/_data/tenants \
  -maxdepth 1 -mindepth 1 -type d -mtime +7 -exec rm -rf {} \;
```

### Troubleshooting

| Issue | Fix |
|-------|-----|
| Port 80 already in use | `sudo lsof -i :80` to find what's using it |
| WebSocket not connecting | Check nginx proxy headers — ensure `Upgrade` and `Connection` are passed |
| Cookie not persisting | Ensure you're not mixing HTTP/HTTPS — use one consistently |
| Stale frontend after update | Hard refresh (Ctrl+Shift+R) or clear browser cache |
