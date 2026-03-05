# Deployment Guide

## Production Deployment

### 1. Frontend (Cloudflare Pages)

#### Build Configuration

```bash
# Build command
npm run build

# Output directory
dist
```

#### Environment Variables

```bash
# Optional: override default API URL
VITE_API_BASE_URL=https://api.adangarcia.com/backend
```

The API URL can also be configured at runtime via the app's **Settings > API Configuration** panel.

---

### 2. Backend (Docker)

The backend runs as a Docker container using the `node:20-alpine` base image.

#### Docker Compose (Production)

```yaml
services:
  planner-backend:
    image: ghcr.io/adan-garcia/planner-backend:latest
    ports:
      - "443:3001"
      - "81:3001"
    restart: always
    volumes:
      - /planner/backend:/app/data          # Persistent SQLite DB
      - /path/to/ssl/key.pem:/app/ssl/key.pem:ro
      - /path/to/ssl/cert.pem:/app/ssl/cert.pem:ro
    environment:
      NODE_ENV: production
      PORT: 3001
      USE_HTTPS: "true"
      SSL_KEY_PATH: /app/ssl/key.pem
      SSL_CERT_PATH: /app/ssl/cert.pem
      DB_PATH: /app/data/planner.db
      SESSION_TTL_MS: "86400000"            # 24 hours
      MAX_META_SIZE: "2048"
      ORIGINS: "https://planner.adangarcia.com,https://homework.adangarcia.com,https://api.adangarcia.com"
```

#### Environment Variables Reference

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server listen port |
| `USE_HTTPS` | `false` | Enable HTTPS with SSL certs |
| `SSL_KEY_PATH` | — | Path to SSL private key |
| `SSL_CERT_PATH` | — | Path to SSL certificate |
| `DB_PATH` | `./planner.db` | SQLite database file path |
| `ORIGINS` | See server.js | Comma-separated allowed CORS origins |
| `SESSION_TTL_MS` | `86400000` (24h) | Session token lifetime in ms |
| `MAX_META_SIZE` | `2048` | Max meta JSON size in bytes |
| `SOCKET_MAX_CONN_PER_WINDOW` | `30` | Max socket connections per 60s per IP |
| `SOCKET_MAX_SOCKETS_PER_IP` | `20` | Max concurrent sockets per IP |
| `SOCKET_MAX_EVENTS_PER_WINDOW` | `80` | Max socket events per 10s per socket |

#### Building the Docker Image

```bash
cd Backend
docker build -t planner-backend .
docker run -d -p 3001:3001 \
  -v $(pwd)/data:/app/data \
  -e NODE_ENV=production \
  planner-backend
```

---

### 3. CORS Configuration

The backend supports multiple origins via the `ORIGINS` environment variable. The current defaults are:

```
https://planner.adangarcia.com
http://localhost:3000
http://127.0.0.1:3000
https://api.adangarcia.com
https://homework.adangarcia.com
```

CORS is enforced on both HTTP routes (via `cors()` middleware) and Socket.io connections.

#### Nginx Reverse Proxy (if applicable)

```nginx
location /backend {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Note: The backend reads `cf-connecting-ip`, `x-forwarded-for`, and `trust proxy` for accurate client IP detection behind proxies.

---

### 4. Security Headers

#### Backend (Helmet.js)

The server sets strict security headers via Helmet:

- **Content-Security-Policy:** `default-src 'self'` with restrictive directives
- **Cross-Origin-Resource-Policy:** `same-origin`
- **Cross-Origin-Embedder-Policy:** `require-corp`
- **Cross-Origin-Opener-Policy:** `same-origin`
- **Permissions-Policy:** Restrictive (no camera, microphone, geolocation, etc.)
- Plus all Helmet defaults (X-Content-Type-Options, X-Frame-Options, etc.)

#### Frontend (Cloudflare Pages `_headers`)

```
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.adangarcia.com https://*.adangarcia.com wss://api.adangarcia.com; font-src 'self' data:; worker-src 'self' blob:; manifest-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests;
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: geolocation=(), microphone=(), camera=()
```

> **Note:** `frame-ancestors` only works via HTTP headers, not `<meta>` tags.

---

### 5. SSL / HTTPS

The backend supports native HTTPS via `USE_HTTPS=true` with `SSL_KEY_PATH` and `SSL_CERT_PATH`. If certificate loading fails, it automatically falls back to HTTP.

For production, SSL is typically handled at the Docker container level or via a reverse proxy (Nginx, Cloudflare, etc.).

---

### 6. Database Maintenance

The server runs automatic maintenance every ~66 minutes:

1. **WAL Checkpoint** — merges write-ahead log into main database file
2. **Room Cleanup** — deletes rooms inactive for >48 hours (cascade deletes events + sessions)
3. **Session Purge** — removes expired sessions (>24h by default)

No manual database maintenance is required.

#### Database Migrations

The server automatically handles schema migrations on startup:
- Ensures composite primary key on `events` table (`room_id`, `id`)
- Adds `version` column if missing (for OCC support)

---

### 7. Testing Deployment

#### Check Health

```bash
curl https://api.adangarcia.com/backend/api/health
# {"status":"ok","timestamp":"..."}
```

#### Check CORS

```bash
curl -X OPTIONS https://api.adangarcia.com/backend/api/auth/init \
  -H "Origin: https://planner.adangarcia.com" \
  -H "Access-Control-Request-Method: POST" \
  -v
# Should see: Access-Control-Allow-Origin: https://planner.adangarcia.com
```

#### Test Authentication

1. Open browser DevTools → Network tab
2. Create or join a room
3. Verify:
   - No CORS errors in console
   - No CSP violations
   - Successful `/api/auth/init` and `/api/auth/login` responses
   - WebSocket connection established at `/backend/socket.io`

---

### 8. Performance

#### Enable Compression (Nginx)

```nginx
gzip on;
gzip_types text/plain text/css application/json application/javascript text/xml;
```

#### Cache Static Assets (Cloudflare Pages `_headers`)

```
/assets/*
  Cache-Control: public, max-age=31536000, immutable

/*.js
  Cache-Control: public, max-age=31536000, immutable

/*.css
  Cache-Control: public, max-age=31536000, immutable
```

#### Monitoring

- Backend logs all requests with timestamps and origin info
- Web Vitals tracking available in `src/utils/webVitals.js`

---

## Pre-Deployment Checklist

- [ ] Backend CORS origins configured (`ORIGINS` env var)
- [ ] CSP headers set via hosting platform
- [ ] Environment variables set for backend container
- [ ] SSL certificates mounted (if using native HTTPS)
- [ ] Database volume mounted for persistence
- [ ] Health check passing (`/backend/api/health`)
- [ ] Authentication flow working (init → login → socket connect)
- [ ] Real-time sync tested across two devices
- [ ] PWA offline functionality verified
- [ ] Service worker registering correctly

---

## Resources

- [MDN CSP Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [CORS Explained](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)
- [Cloudflare Pages Headers](https://developers.cloudflare.com/pages/platform/headers/)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Socket.io Deployment](https://socket.io/docs/v4/using-multiple-nodes/)
