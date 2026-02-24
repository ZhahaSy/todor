module.exports = {
  apps: [
    {
      name: 'chat-service',
      script: 'dist/main.js',
      cwd: __dirname, // 动态指向 ecosystem.config.js 所在目录
      instances: 1,
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
      },
      // 日志配置
      out_file: `${__dirname}/logs/out.log`,
      error_file: `${__dirname}/logs/error.log`,
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      merge_logs: true,
      // 进程监控
      watch: false,
      max_memory_restart: '500M',
      // 异常重启策略
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
      autorestart: true,
    },
  ],
};
