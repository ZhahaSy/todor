#!/bin/bash

# chat-service 云端部署脚本
# 使用方式: ./deploy-service.sh [选项]
# 选项:
#   --host   <user@ip>   服务器地址 (必填，如: root@1.2.3.4)
#   --dir    <path>      服务器部署目录 (默认: /home/app/chat-service)
#   --port   <port>      服务监听端口 (默认: 3000)
#   --skip-build         跳过本地构建，直接上传
#   --restart-only       仅重启 PM2 进程，不上传文件

set -e

# ─── 默认参数 ────────────────────────────────────────────────────────────────
REMOTE_HOST=""
REMOTE_DIR="/home/app/chat-service"
LOG_DIR="/home/app/logs"
PORT=3000
SKIP_BUILD=false
RESTART_ONLY=false
PM2_APP_NAME="chat-service"

# ─── 解析参数 ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --host)        REMOTE_HOST="$2"; shift 2 ;;
    --dir)         REMOTE_DIR="$2"; shift 2 ;;
    --port)        PORT="$2"; shift 2 ;;
    --skip-build)  SKIP_BUILD=true; shift ;;
    --restart-only) RESTART_ONLY=true; shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

# ─── 参数校验 ────────────────────────────────────────────────────────────────
if [[ -z "$REMOTE_HOST" ]]; then
  echo "错误: 必须指定 --host 参数，例如: --host root@1.2.3.4"
  exit 1
fi

# ─── 工具函数 ────────────────────────────────────────────────────────────────
info()    { echo -e "\033[32m[INFO]\033[0m  $*"; }
warn()    { echo -e "\033[33m[WARN]\033[0m  $*"; }
error()   { echo -e "\033[31m[ERROR]\033[0m $*"; exit 1; }
step()    { echo -e "\n\033[34m━━━ $* ━━━\033[0m"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$SCRIPT_DIR/apps/chat-service"

# ─── 仅重启模式 ──────────────────────────────────────────────────────────────
if $RESTART_ONLY; then
  step "重启远程 PM2 进程"
  ssh "$REMOTE_HOST" "pm2 restart $PM2_APP_NAME && pm2 save"
  info "进程已重启"
  ssh "$REMOTE_HOST" "pm2 status $PM2_APP_NAME"
  exit 0
fi

# ─── Step 1: 本地构建 ────────────────────────────────────────────────────────
if ! $SKIP_BUILD; then
  step "Step 1/5  本地构建 chat-service"
  cd "$SERVICE_DIR"
  if ! command -v pnpm &>/dev/null; then
    error "未找到 pnpm，请先安装: npm install -g pnpm"
  fi
  pnpm build
  info "构建完成: $SERVICE_DIR/dist"
else
  warn "跳过本地构建"
  step "Step 1/5  [已跳过]"
fi

# ─── Step 2: 检查 dist 目录 ──────────────────────────────────────────────────
step "Step 2/5  检查构建产物"
if [[ ! -f "$SERVICE_DIR/dist/main.js" ]]; then
  error "未找到 dist/main.js，请先执行构建或去掉 --skip-build"
fi
info "dist/main.js 存在，继续..."

# ─── Step 3: 准备远程目录 ────────────────────────────────────────────────────
step "Step 3/5  初始化远程服务器目录"
ssh "$REMOTE_HOST" bash <<REMOTE_INIT
  set -e
  mkdir -p "$REMOTE_DIR"
  mkdir -p "$LOG_DIR"
  # 安装 Node (若未安装)
  if ! command -v node &>/dev/null; then
    echo "[远程] 正在安装 Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
  fi
  # 安装 PM2 (若未安装)
  if ! command -v pm2 &>/dev/null; then
    echo "[远程] 正在安装 PM2..."
    npm install -g pm2
    pm2 startup systemd -u root --hp /root
  fi
  echo "[远程] 环境检查完成 — Node: \$(node -v), PM2: \$(pm2 -v)"
REMOTE_INIT

# ─── Step 4: 上传文件 ────────────────────────────────────────────────────────
step "Step 4/5  上传文件到 $REMOTE_HOST:$REMOTE_DIR"

# 上传 dist、package.json、ecosystem 配置
rsync -avz --progress \
  --exclude 'node_modules' \
  --exclude 'src' \
  --exclude 'test' \
  --exclude '.env' \
  --exclude '*.log' \
  "$SERVICE_DIR/dist/" \
  "$REMOTE_HOST:$REMOTE_DIR/dist/"

rsync -avz \
  "$SERVICE_DIR/package.json" \
  "$SERVICE_DIR/ecosystem.config.js" \
  "$REMOTE_HOST:$REMOTE_DIR/"

# 若服务器还没有 .env 文件则上传示例 (不覆盖已有的)
ssh "$REMOTE_HOST" "[[ -f '$REMOTE_DIR/.env' ]]" || \
  rsync -avz "$SERVICE_DIR/.env.example" "$REMOTE_HOST:$REMOTE_DIR/.env" && \
  warn ".env 不存在，已上传 .env.example，请登录服务器填写真实配置: ssh $REMOTE_HOST 'nano $REMOTE_DIR/.env'"

# ─── 远程安装生产依赖 & 创建数据库目录 ──────────────────────────────────────
ssh "$REMOTE_HOST" bash <<REMOTE_SETUP
  set -e
  cd "$REMOTE_DIR"
  # 安装生产依赖
  if ! command -v pnpm &>/dev/null; then
    npm install -g pnpm
  fi
  pnpm install --prod --frozen-lockfile 2>/dev/null || pnpm install --prod
  # SQLite 数据库目录
  mkdir -p /home/dbs
  echo "[远程] 依赖安装完成"
REMOTE_SETUP

# ─── Step 5: PM2 启动/重启 ───────────────────────────────────────────────────
step "Step 5/5  PM2 管理进程"
ssh "$REMOTE_HOST" bash <<REMOTE_PM2
  set -e
  cd "$REMOTE_DIR"
  # 更新 ecosystem 中的端口（通过环境变量注入）
  export PORT=$PORT

  if pm2 describe "$PM2_APP_NAME" &>/dev/null; then
    echo "[远程] 检测到已有进程，执行 reload..."
    pm2 reload "$PM2_APP_NAME" --update-env
  else
    echo "[远程] 首次启动..."
    pm2 start ecosystem.config.js
  fi

  pm2 save
  echo ""
  pm2 status "$PM2_APP_NAME"
REMOTE_PM2

# ─── 完成 ────────────────────────────────────────────────────────────────────
echo ""
info "部署完成！"
info "服务地址:    http://<服务器IP>:$PORT"
info "Swagger文档: http://<服务器IP>:$PORT/swagger"
info "查看日志:    ssh $REMOTE_HOST 'pm2 logs $PM2_APP_NAME'"
info "查看状态:    ssh $REMOTE_HOST 'pm2 status'"
