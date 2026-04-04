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
- A domain or subdomain pointing to your VPS IP

### Quick Start

```bash
# 1. Clone the repo on your VPS
git clone <your-repo-url> vrl-ml-studio
cd vrl-ml-studio

# 2. Deploy (app listens on port 3080 internally)
docker compose -f docker-compose.prod.yml up -d --build

# 3. Point your VPS reverse proxy to port 3080 (see below)
```

To use a different port:
```bash
APP_PORT=8080 docker compose -f docker-compose.prod.yml up -d --build
```

### Architecture

The app runs on an internal port (default 3080). Your VPS's main
reverse proxy (nginx, Apache, Caddy, or Hostinger's built-in proxy)
routes your domain/subdomain to it.

```
  Browser
    │
    ▼
┌───────────────────────────────┐
│  VPS reverse proxy (port 80)  │  ← your existing nginx/Apache/Caddy
│  demo.example.com ──────────────► localhost:3080
└───────────────────────────────┘
    │
    ▼
┌───────────────────────────────┐
│  App nginx (port 3080)        │  ← inside Docker
│                               │
│  /          → static files    │
│  /api/*     → backend:8000    │
│  /ws        → backend:8000    │
└───────────────────────────────┘
    │
    ▼
┌───────────────────────────────┐
│  FastAPI backend (internal)   │
│  - 4 Uvicorn workers          │
│  - tenant isolation via cookie │
└───────────────────────────────┘
```

### VPS Reverse Proxy Configuration

Your VPS likely already has a reverse proxy serving other projects on
port 80/443. Add the VRL ML Studio site to it.

**Hostinger VPS (via hPanel)**

If Hostinger provides a Docker Manager or reverse proxy UI, point your
domain/subdomain to `localhost:3080`. If you manage nginx manually:

**nginx (most common on VPS)**

```nginx
server {
    listen 80;
    server_name mlstudio.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:3080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Upload size (match app's 100MB limit)
        client_max_body_size 100M;

        # Longer timeout for ML pipeline execution
        proxy_read_timeout 300s;
    }
}
```

Then add HTTPS:
```bash
sudo certbot --nginx -d mlstudio.yourdomain.com
```

**Caddy (auto HTTPS, zero config)**

```
mlstudio.yourdomain.com {
    reverse_proxy localhost:3080
}
```

**Apache**

```apache
<VirtualHost *:80>
    ServerName mlstudio.yourdomain.com

    ProxyPreserveHost On
    ProxyPass / http://127.0.0.1:3080/
    ProxyPassReverse / http://127.0.0.1:3080/

    # WebSocket
    RewriteEngine On
    RewriteCond %{HTTP:Upgrade} =websocket [NC]
    RewriteRule /(.*) ws://127.0.0.1:3080/$1 [P,L]
</VirtualHost>
```

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
    ├── a1b2c3d4/          <- Visitor A
    │   ├── my-project/
    │   └── iris-demo/
    ├── e5f6g7h8/          <- Visitor B
    │   └── housing-model/
    └── ...
```

### Resource Considerations

For a demo with ~10 concurrent users:
- **CPU:** 2 vCPUs minimum
- **RAM:** 2 GB minimum (4 GB recommended -- ML model training uses memory)
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
| Port 3080 already in use | Change via `APP_PORT=9090 docker compose -f docker-compose.prod.yml up -d --build` |
| WebSocket not connecting | Ensure your VPS reverse proxy passes `Upgrade` and `Connection` headers (see nginx config above) |
| Cookie not persisting | Ensure you're not mixing HTTP/HTTPS -- use one consistently |
| Stale frontend after update | Hard refresh (Ctrl+Shift+R) or clear browser cache |
| 502 Bad Gateway | Backend may still be starting -- wait for healthcheck (`docker compose -f docker-compose.prod.yml logs backend`) |
