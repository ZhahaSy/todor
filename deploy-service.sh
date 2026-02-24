#!/bin/bash

# chat-service 服务器本地部署脚本（在服务器上直接执行）
# 使用方式: ./deploy-service.sh [选项]
# 选项:
#   --port         <port>  服务监听端口 (默认: 3000)
#   --skip-pull          跳过 git pull
#   --skip-build         跳过构建
#   --restart-only       仅重启 PM2 进程

set -e

# ─── 默认参数 ────────────────────────────────────────────────────────────────
PORT=3000
SKIP_PULL=false
SKIP_BUILD=false
RESTART_ONLY=false
PM2_APP_NAME="chat-service"

# ─── 解析参数 ────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)          PORT="$2"; shift 2 ;;
    --skip-pull)     SKIP_PULL=true; shift ;;
    --skip-build)    SKIP_BUILD=true; shift ;;
    --restart-only)  RESTART_ONLY=true; shift ;;
    *) echo "未知参数: $1"; exit 1 ;;
  esac
done

# ─── 工具函数 ────────────────────────────────────────────────────────────────
info()  { echo -e "\033[32m[INFO]\033[0m  $*"; }
warn()  { echo -e "\033[33m[WARN]\033[0m  $*"; }
error() { echo -e "\033[31m[ERROR]\033[0m $*"; exit 1; }
step()  { echo -e "\n\033[34m━━━ $* ━━━\033[0m"; }

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$SCRIPT_DIR/apps/chat-service"

# ─── 仅重启模式 ──────────────────────────────────────────────────────────────
if $RESTART_ONLY; then
  step "重启 PM2 进程"
  pm2 restart "$PM2_APP_NAME" && pm2 save
  pm2 status "$PM2_APP_NAME"
  exit 0
fi

# ─── Step 1: git pull ────────────────────────────────────────────────────────
if ! $SKIP_PULL; then
  step "Step 1/4  拉取最新代码"
  cd "$SCRIPT_DIR"
  git pull
  info "代码已更新"
else
  warn "跳过 git pull"
fi

# ─── Step 2: 构建 ────────────────────────────────────────────────────────────
if ! $SKIP_BUILD; then
  step "Step 2/4  构建 chat-service"
  cd "$SCRIPT_DIR"
  if ! command -v pnpm &>/dev/null; then
    error "未找到 pnpm，请先安装: npm install -g pnpm"
  fi
  pnpm install                        # 安装全部依赖（含 devDependencies，构建需要）
  cd "$SERVICE_DIR"
  pnpm build
  info "构建完成"
else
  warn "跳过构建"
fi

# ─── Step 3: 检查构建产物 ────────────────────────────────────────────────────
step "Step 3/4  检查构建产物"
if [[ ! -f "$SERVICE_DIR/dist/main.js" ]]; then
  error "未找到 dist/main.js，请检查构建是否成功"
fi
if [[ ! -f "$SERVICE_DIR/.env" ]]; then
  error "未找到 .env 文件，请在 $SERVICE_DIR 下创建 .env"
fi
mkdir -p /var/data/chat-service
mkdir -p /var/data/chat-service/backups
mkdir -p "$SERVICE_DIR/logs"

# 备份数据库（若存在）
DB_FILE="/var/data/chat-service/chat.db"
if [[ -f "$DB_FILE" ]]; then
  BACKUP_FILE="/var/data/chat-service/backups/chat_$(date +%Y%m%d_%H%M%S).db"
  cp "$DB_FILE" "$BACKUP_FILE"
  info "数据库已备份: $BACKUP_FILE"
  # 只保留最近 7 份备份
  ls -t /var/data/chat-service/backups/chat_*.db 2>/dev/null | tail -n +8 | xargs rm -f
fi

info "检查通过"

# ─── Step 4: PM2 启动/重载 ───────────────────────────────────────────────────
step "Step 4/4  PM2 管理进程"
cd "$SERVICE_DIR"

if ! command -v pm2 &>/dev/null; then
  error "未找到 pm2，请先安装: npm install -g pm2"
fi

if pm2 describe "$PM2_APP_NAME" &>/dev/null; then
  info "检测到已有进程，执行 reload（零停机）..."
  pm2 reload "$PM2_APP_NAME" --update-env
else
  info "首次启动..."
  pm2 start ecosystem.config.js
fi

pm2 save
echo ""
pm2 status "$PM2_APP_NAME"

# ─── 完成 ────────────────────────────────────────────────────────────────────
echo ""
info "部署完成！"
info "服务端口:    $PORT"
info "Swagger文档: http://localhost:$PORT/swagger"
info "查看日志:    pm2 logs $PM2_APP_NAME"
info "查看状态:    pm2 status"
