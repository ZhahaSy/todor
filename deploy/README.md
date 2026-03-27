# ECS Deployment (GitHub Actions + Docker Compose)

## 1) Required GitHub Secrets

Configure these repository secrets:

- `ECS_HOST`: ECS public IP or domain
- `ECS_USER`: SSH user
- `ECS_SSH_KEY`: private key (PEM content)
- `ECS_PORT`: SSH port, usually `22`
- `GHCR_USERNAME`: GitHub username (or org machine user)
- `GHCR_TOKEN`: GitHub token with package read permission

## 2) Prepare ECS once

Install Docker and Docker Compose plugin, then create deployment directories:

```bash
sudo mkdir -p /opt/my-turborepo/deploy
sudo mkdir -p /opt/my-turborepo/data/chat-service
```

Create `/opt/my-turborepo/deploy/chat-service.env` based on `apps/chat-service/.env.example`.
Use production values, for example:

```env
NODE_ENV=production
PORT=3000
DB_TYPE=sqlite
DB_DATABASE=/var/data/chat-service/chat.db
JWT_SECRET=replace_me
DEEPSEEK_API_KEY=replace_me
DEEPSEEK_BASE_URL=https://api.deepseek.com
AI_MODEL=deepseek-chat
AI_REQUEST_TIMEOUT_MS=60000
```

## 3) Deploy

Push to `main` branch. The workflow will:

1. Build and push `chat-service` image to GHCR
2. Build and push `chat-ui` image to GHCR
3. Upload `deploy/docker-compose.prod.yml` to ECS
4. Pull and restart containers on ECS

## 4) Optional HTTPS

This setup exposes HTTP on port `80`. For HTTPS, put an SLB/Nginx/Caddy in front or update compose to terminate TLS directly.
