# ECS 部署说明（GitHub Actions + Docker Compose）

## 你要做的优化（按优先级）

| 优先级 | 你要做的事 | 效果 |
|--------|------------|------|
| **1（强烈建议）** | 国内 ECS：在阿里云 **ACR** 与 ECS 选 **同一地域**，并在 GitHub 配齐 4 个 `ACR_*` Secret（见下文） | **`docker pull` 从跨境 ghcr 改为同地域 ACR，通常快一个数量级** |
| 2 | `GHCR_TOKEN` 使用 Classic PAT，私有仓库勾选 **`read:packages` + `repo`**；`GHCR_USERNAME` 与 PAT 所属账号一致 | 避免 ECS 仅 ghcr 拉取时 `denied` |
| 3 | ECS 安全组放行 **80**、**22**；首次部署后确认镜像层被缓存，二次部署只拉变更层 | 减少「每次都像第一次」的体感 |
| 4 | 可选：**HTTPS** 用 SLB / 反代证书（见文末） | 生产访问更安全 |

已写在 workflow 里、你无需再做的项：**镜像 tag 小写**、`deploy` job **sparse-checkout `deploy/`**、`build-and-push` **120min** / `deploy` **90min** 上限、SSH **`command_timeout: 60m`**、远程 **`COMPOSE_HTTP_TIMEOUT` / `DOCKER_CLIENT_TIMEOUT`**、**`docker compose pull` 最多 5 次重试**。

---

## 完整优化方案（pull 慢 / 直接超时）

### 原因简述

| 环节 | 典型问题 |
|------|----------|
| ECS `pull` **ghcr.io** | 跨境链路抖动、带宽受限 → 慢或超时 |
| GitHub Action 远程脚本 | 默认 **`command_timeout` 10m**，大层未拉完就被掐断 |
| GitHub Runner **推 ACR**（境外 → 国内） | 上传层也可能极慢/超时（与 ECS pull 是不同方向） |

目标：**让运行 `docker compose pull` 的那台 ECS，只对「同地域 ACR」拉镜像**；超时再靠 **拉长 SSH/Compose 超时 + 重试**；仍不行再用 **境内镜像或自建 Runner**。

### 推荐组合（按顺序做）

1. **必做（架构）**  
   - 创建与 ECS **同一地域** 的 **ACR** 命名空间。  
   - GitHub 配齐 **`ACR_*` 四个 Secret**，使部署时 `IMAGE_BASE` 指向 `registry.../命名空间`，ECS **只从 ACR pull**。  
   - 这是从根本上避开「ECS ← 跨境 ← ghcr」。

2. **必做（你已合并进 workflow）**  
   - 拉长 `appleboy/ssh-action` 的 `command_timeout`、整 job `timeout-minutes`。  
   - 远程导出 `COMPOSE_HTTP_TIMEOUT`、`DOCKER_CLIENT_TIMEOUT`，并对 `docker compose pull` **重试**。  
   - 避免「还在下 layer 就被 CI 判死」。

3. **若 `build-and-push` 里「推 ACR」也超时或极慢**  
   - **方案 A**：换 **阿里云内** 的 **GitHub 自建 Runner**（或小规格 ECS 当 Runner），同一构建推 ACR，走境内上传。  
   - **方案 B**：CI **只推 ghcr**（临时可在 workflow 里去掉 ACR 的 login/多 tag，需自改）；在境内任意一台能连 ghcr 的机器跑 **`deploy/scripts/mirror-ghcr-to-acr.example.sh`**（复制改名后填环境变量），把该次 **`IMAGE_TAG`（commit SHA）** 同步进 ACR，再让 Actions **只做 deploy** 或你手动在 ECS `compose pull`（与 workflow 写入的 `IMAGE_TAG` 一致）。  
   - **方案 C**：阿里云 **按流量计费的公网带宽** / **弹性公网** 配足（仅缓解，不替代 ACR）。

4. **镜像与长期**  
   - 控制单镜像体积（多阶段 build、少装无用依赖），层越小越不易超时。  
   - 后续可为 `build-push-action` 加 **GHA cache**（`cache-to/from: type=gha`），主要缩短 **构建** 时间。

### 现象：第一张镜像很快，Pulled 之后下一张或下一层极慢甚至超时

常见原因一是 **`docker compose pull` 并行拉多个服务**，第二条连接质量差；二是 **Compose 与本机 Docker 守护进程之间的 HTTP 超时**（默认往往只有 60s～600s），层还在下但长时间无“进度汇报”会被 CLI 判死。

当前 workflow 已改为：**顺序执行** `pull chat-service` → `pull chat-ui`，并把 **`COMPOSE_HTTP_TIMEOUT` / `DOCKER_CLIENT_TIMEOUT` 提到 86400s**，SSH **`command_timeout: 120m`**。

若仍极慢，可在 ECS 上（自行评估后）调整 Docker daemon，例如 `/etc/docker/daemon.json` 中略降低并发下载，有时对弱网更稳：

```json
{ "max-concurrent-downloads": 2 }
```

修改后 `sudo systemctl restart docker`。

### 自检命令

在 ECS：

```bash
cd /opt/my-turborepo/deploy
cat .env
# IMAGE_BASE 应为 ACR 时：registry.cn-xxx.aliyuncs.com/你的命名空间

docker compose -f docker-compose.prod.yml pull chat-service
docker compose -f docker-compose.prod.yml pull chat-ui
```

在 GitHub Actions 日志里看 **`Build and push`** 是否出现 **push 到 ACR** 报错；若有而 ECS 拉流正常，优先按上面第 3 步处理 **推送侧**。

---

## 1) GitHub Secrets 清单

在仓库 **Settings → Secrets and variables → Actions** 中配置。

### 必选（ECS + 仅用 ghcr 拉取时）

| Secret | 说明 |
|--------|------|
| `ECS_HOST` | ECS 公网 IP 或域名 |
| `ECS_USER` | SSH 登录用户（与 `~/.ssh/authorized_keys` 一致） |
| `ECS_SSH_KEY` | 私钥全文（含 BEGIN/END 行） |
| `ECS_PORT` | SSH 端口，一般为 `22` |
| `GHCR_USERNAME` | 生成 PAT 的 GitHub 用户名 |
| `GHCR_TOKEN` | PAT：私有包建议 **`read:packages` + `repo`** |

### 可选（国内拉取加速 — 推荐四个一起配）

若 **`ACR_REGISTRY` 非空**：Actions 会把同一镜像 **同时推到 ghcr + ACR**；ECS 上会根据 `deploy/.env` 里的 `IMAGE_BASE` **从 ACR 拉**（并 `docker login` ACR）。

| Secret | 示例 |
|--------|------|
| `ACR_REGISTRY` | `registry.cn-hangzhou.aliyuncs.com`（与 ECS **同地域**） |
| `ACR_NAMESPACE` | ACR 控制台中的命名空间，如 `myapp` |
| `ACR_USERNAME` | ACR 登录用户名 |
| `ACR_PASSWORD` | ACR 登录密码 |

在阿里云：**容器镜像服务 ACR** → 创建实例/命名空间 → 按控制台「登录指令」核对 registry 与账号。

---

## 2) ECS 一次性准备

安装 **Docker** 与 **Docker Compose 插件**，然后：

```bash
sudo mkdir -p /opt/my-turborepo/deploy
sudo mkdir -p /opt/my-turborepo/data/chat-service
```

创建 **`/opt/my-turborepo/deploy/chat-service.env`**（勿提交到 Git），可参考 `apps/chat-service/.env.example`，生产示例：

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
# 与 deploy/docker-compose.prod.yml 中的 Redis 服务名一致（勿写 localhost）
REDIS_HOST=redis
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
```

**`POST /api/ai/message` 远程 500**：多数是 **Redis 连不上**。Compose 里 `chat-service` 的 `localhost` 指向容器自身，必须把 `REDIS_HOST` 设为 **`redis`**（与 compose 中的 Redis 服务名一致），并确保已用包含 `redis` 服务的最新 `docker-compose.prod.yml` 执行 `up -d`。其次再查 **`DEEPSEEK_API_KEY`** 是否已写入、ECS  outbound 能否访问 `DEEPSEEK_BASE_URL`（见容器日志中 `[recognizeIntent]` / `Redis connection error`）。

**部署时 `redis` 镜像拉取超时**（`registry-1.docker.io` / `Client.Timeout exceeded`）：国内 ECS 访问 Docker Hub 经常如此。仓库里的 compose **默认**使用 `REDIS_IMAGE=docker.m.daocloud.io/library/redis:7-alpine`（DaoCloud 对官方 library 的代理）。若仍失败，可任选其一：**(1)** 在 ECS 配置 Docker **`registry-mirrors`**（见阿里云「镜像加速器」文档）后设 `REDIS_IMAGE=redis:7-alpine`；**(2)** 在能拉通 Hub 的机器上 `docker pull redis:7-alpine`，`tag` 到你自己的 **ACR** 再 `push`，然后把 **`/opt/my-turborepo/deploy/.env`** 里写成 `REDIS_IMAGE=<你的ACR>/redis:7-alpine`；**(3)** 海外机器可直接 `REDIS_IMAGE=redis:7-alpine`。

**注意**：`deploy/docker-compose.prod.yml` 使用 **`IMAGE_BASE`** / **`IMAGE_TAG`**；**`CHAT_UI_HOST_PORT` 默认可理解为 `8080`**（compose 内 `${CHAT_UI_HOST_PORT:-8080}`），与常见「宿主机 Nginx 占 80」场景一致。若 `.env` 里没有该项，部署脚本会**自动补上 `CHAT_UI_HOST_PORT=8080`**。只有你确定要让容器占用宿主 **80**（且无 Nginx 冲突）时，再在 `.env` 写 `CHAT_UI_HOST_PORT=80`。GitHub Action 会**保留**你已有的该项。

### 宿主机已有 Nginx 占 80：方案 B（推荐）

目标：**保留** 系统里的 Nginx 监听 **80**，Docker 里的 `chat-ui` 只监听本机 **8080**，由 Nginx 反代到 `127.0.0.1:8080`。对外仍用 **http://域名或IP/**，无需在浏览器里写 `:8080`（也可不配反代、直接访问 `:8080`，见下）。

1. **在 ECS 上编辑** `/opt/my-turborepo/deploy/.env`，增加或修改一行（没有该文件就先有 `IMAGE_*` 再手动补这行，部署一次后会被合并保留）：

   ```env
   CHAT_UI_HOST_PORT=8080
   ```

2. **确保 compose 为仓库最新**（含 `ports: "${CHAT_UI_HOST_PORT:-8080}:80"`），然后启动容器：

   ```bash
   cd /opt/my-turborepo/deploy
   docker compose -f docker-compose.prod.yml up -d
   ```

3. **本机自检**（应在 ECS 上返回 HTML 或 200）：

   ```bash
   curl -sI http://127.0.0.1:8080/ | head -3
   ```

4. **配置宿主机 Nginx**（示例见仓库 `deploy/nginx-host-reverse-proxy.example.conf`）：

   - 把其中 `server_name` 改成你的域名，或暂时 `_`。  
   - 放入 `conf.d` / `sites-enabled`，执行 `sudo nginx -t && sudo systemctl reload nginx`。  
   - `location /` 已带 **WebSocket** 头，便于 `/socket.io/` 与 Ant Design X 等长连接。

5. **安全组**：若用户**只通过 80（及后续 HTTPS）访问**，可不开放 **8080** 公网（8080 仅本机 Nginx 访问更安全）。若你需要**临时直连调试**，再单独放行 8080。

**不配反代时**：浏览器访问 `http://<ECS公网IP>:8080`，安全组需放行 **8080**。

若启动 `chat-ui` 仍报 **`address already in use`**：确认 `.env` 里已是 `CHAT_UI_HOST_PORT=8080` 且 `ss -tlnp | grep 8080` 无其它冲突后再 `compose up`。

---

## 3) 触发部署

- 推送到 **`main`**，或  
- Actions 里手动运行 **Deploy To ECS**（`workflow_dispatch`）

流程概要：

1. 构建并推送 `chat-service`、`chat-ui` 到 **GHCR**（始终）  
2. 若配置了 ACR，**额外推送到 ACR**  
3. 将 `deploy/docker-compose.prod.yml` 传到 ECS  
4. SSH 登录 ECS：写入 `IMAGE_BASE`/`IMAGE_TAG`，`docker login`（ACR 或 ghcr），`compose pull && up`

---

## 4) 在 ECS 上自检

```bash
cd /opt/my-turborepo/deploy
cat .env
docker compose -f docker-compose.prod.yml ps
```

`cat .env` 中应看到 `IMAGE_BASE=...`（配了 ACR 时为 `registry.../命名空间`，否则为 `ghcr.io/小写owner`）。

---

## 5) 可选：HTTPS

若使用 **方案 B**：在**宿主机 Nginx** 上为 `server_name` 配置 **443 + 证书**，`proxy_pass` 仍指向 **`http://127.0.0.1:8080`** 即可。

未做反代时，Compose 可把宿主端口改为 **8080**；生产仍建议在 ECS 前加 **SLB** 或 **Nginx TLS**。

---

## 6) 更远期优化（可选）

- **GitHub Actions 构建缓存**：给 `build-push-action` 接 `cache-from` / `cache-to`（如 `type=gha`），缩短 CI 构建时间。  
- **仅 ACR、不推 ghcr**：需改 workflow（当前默认双推送，便于境外或备份）。  
- **自建 Runner**：在阿里云 VPC 内跑 runner，**推 ACR** 与 **pull** 都走境内，适合长期。  
- **境内同步脚本**：见 `deploy/scripts/mirror-ghcr-to-acr.example.sh`（勿把密码写进仓库）。
