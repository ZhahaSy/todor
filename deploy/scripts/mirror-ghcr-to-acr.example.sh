#!/usr/bin/env bash
# 在国内节点手工同步：从 ghcr 拉 → 打 tag → 推 ACR（ECS 随后只拉 ACR）。
# 适用：GitHub Actions 往 ACR 推送因跨境上传超时/极慢，但能在境内某台机器稳定访问 ghcr 时。
#
# 使用前复制为 mirror-ghcr-to-acr.sh，填变量，在装有 Docker 的机器上执行：
#   chmod +x mirror-ghcr-to-acr.sh && ./mirror-ghcr-to-acr.sh
#
# 危险：不要在仓库中保存真实密码；可用环境变量传入。

set -euo pipefail

: "${GHCR_USER:?设置为 GitHub 用户名}"
: "${GHCR_TOKEN:?设置为 read:packages（+repo 若私有）的 PAT}"
: "${GHCR_OWNER:?小写 owner，与镜像路径一致}"
: "${IMAGE_TAG:?例如某次发布的 commit SHA}"

ACR_REGISTRY="${ACR_REGISTRY:-registry.cn-hangzhou.aliyuncs.com}"
ACR_NAMESPACE="${ACR_NAMESPACE:?ACR 命名空间}"
ACR_USER="${ACR_USER:?ACR 用户名}"
ACR_PASS="${ACR_PASS:?ACR 密码}"

SRC_SVC="ghcr.io/${GHCR_OWNER}/chat-service:${IMAGE_TAG}"
SRC_UI="ghcr.io/${GHCR_OWNER}/chat-ui:${IMAGE_TAG}"
DST_SVC="${ACR_REGISTRY}/${ACR_NAMESPACE}/chat-service:${IMAGE_TAG}"
DST_UI="${ACR_REGISTRY}/${ACR_NAMESPACE}/chat-ui:${IMAGE_TAG}"

echo "${GHCR_TOKEN}" | docker login ghcr.io -u "${GHCR_USER}" --password-stdin
echo "${ACR_PASS}" | docker login "${ACR_REGISTRY}" -u "${ACR_USER}" --password-stdin

docker pull "${SRC_SVC}"
docker pull "${SRC_UI}"
docker tag "${SRC_SVC}" "${DST_SVC}"
docker tag "${SRC_UI}" "${DST_UI}"
docker push "${DST_SVC}"
docker push "${DST_UI}"

echo "Done. ECS 部署的 IMAGE_TAG 与本次 ${IMAGE_TAG} 一致即可从 ACR 拉。"
