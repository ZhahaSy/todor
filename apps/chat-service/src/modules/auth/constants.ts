// JWT 签名密钥来自环境变量，不再提供任何兜底默认值。
// 过去这里有 'fallback-secret-change-in-production' 兜底，一旦线上漏配 JWT_SECRET，
// 就会用这个公开写在代码里的字符串签名 token —— 任何人都能伪造登录任意账号。
//
// 真正的「缺失即启动失败」强校验放在 main.ts 的 bootstrap 内（dotenv 加载之后），
// 那是唯一能可靠读到环境变量的时机；这里不在模块顶层 throw，避免 import 时机早于
// dotenv.config() 时在本地开发误报。
export const jwtConstants = {
  secret: process.env.JWT_SECRET,
};
