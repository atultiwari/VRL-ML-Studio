# Deployment Guide

## Local Development (Docker)

```bash
docker compose up --build
```

- Frontend: http://localhost:3000 (Vite dev server, hot reload)
- Backend: http://localhost:8000 (Uvicorn, auto-reload)

Each browser tab gets an isolated workspace automatically via cookie.

---

## VPS / Production Deployment (Traefik + Docker)

This project is configured for deployment behind **Traefik** as a reverse
proxy with automatic HTTPS via Let's Encrypt.

### Prerequisites

1. A VPS with Docker and Docker Compose installed
2. Traefik running as a Docker container with:
   - A Docker network named `traefik-proxy`
   - A certificate resolver named `letsencrypt`
   - An entrypoint named `websecure` (port 443)
3. A DNS **A record** for your subdomain pointing to the VPS IP:
   - `mlstudio.vedantresearchlabs.com` -> `<VPS_IP>`

### Deploy

```bash
# 1. Clone the repo on your VPS
git clone <your-repo-url> vrl-ml-studio
cd vrl-ml-studio

# 2. Build and start
docker compose -f docker-compose.prod.yml up -d --build
```

The app will be live at `https://mlstudio.vedantresearchlabs.com/` with
a valid SSL certificate.

### How it works

```
  Browser (https://mlstudio.vedantresearchlabs.com)
    |
    v
+-------------------------------+
|  Traefik (port 443)           |  <- your existing Traefik instance
|  TLS termination              |
|  Host rule match              |
+-------------------------------+
    |
    v
+-------------------------------+
|  App nginx (port 80, internal)|  <- frontend container
|                               |
|  /          -> static files   |
|  /api/*     -> backend:8000   |
|  /ws        -> backend:8000   |
+-------------------------------+
    |
    v
+-------------------------------+
|  FastAPI backend (internal)   |  <- backend container
|  - 4 Uvicorn workers          |
|  - tenant isolation via cookie |
+-------------------------------+
```

**Network isolation:**
- `traefik-proxy` (external) -- connects Traefik to the frontend container
- `internal` (internal) -- connects frontend nginx to the backend; backend is not exposed to the internet

### Changing the domain

Edit the Traefik labels in `docker-compose.prod.yml`:

```yaml
labels:
  - traefik.http.routers.vrl-ml-studio.rule=Host(`your-subdomain.yourdomain.com`)
```

Then redeploy:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Updating

```bash
cd vrl-ml-studio
git pull
docker compose -f docker-compose.prod.yml up -d --build
```

### Data Persistence

Project data is stored in a Docker named volume `vrl_projects`. It persists
across container rebuilds.

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
  tenants/
    a1b2c3d4/          <- Visitor A
      my-project/
      iris-demo/
    e5f6g7h8/          <- Visitor B
      housing-model/
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
| 404 from Traefik | Check that `traefik-proxy` network exists (`docker network ls`) and frontend is on it |
| WebSocket not connecting | Traefik v2+ handles WS automatically; check browser console for the URL it's connecting to |
| Cookie not persisting | Ensure HTTPS is working (cookies are `SameSite=lax`; mixed HTTP/HTTPS can break them) |
| Stale frontend after update | Hard refresh (Ctrl+Shift+R) or clear browser cache |
| 502 Bad Gateway | Backend may still be starting -- check with `docker compose -f docker-compose.prod.yml logs backend` |
| SSL certificate not issued | Verify DNS A record resolves to VPS IP: `dig mlstudio.vedantresearchlabs.com` |
