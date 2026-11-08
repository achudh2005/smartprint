// ============================================================
// SmartPrint — PM2 Process Manager Configuration
// Optimized for AWS EC2 (t2.micro / t3.micro Free Tier)
// ============================================================

module.exports = {
  apps: [
    {
      name: 'smartprint-api',
      script: 'backend/src/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '450M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 5000,
      },
      env_development: {
        NODE_ENV: 'development',
        PORT: 5000,
      },
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,
      time: true,
      restart_delay: 3000,
      max_restarts: 10,
      min_uptime: '10s',
    },
  ],
};
