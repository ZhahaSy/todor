export const mailConfig = {
  host: process.env.MAIL_HOST || 'smtp.qq.com',
  port: parseInt(process.env.MAIL_PORT || '465', 10),
  authUser: process.env.MAIL_USER || '',
  authPass: process.env.MAIL_PASS || '',
};
