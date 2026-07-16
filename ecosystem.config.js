/**
 * PM2 — chạy 3 service production trên VPS (tự restart khi crash/reboot).
 * Khởi động: pm2 startOrReload ecosystem.config.js && pm2 save && pm2 startup
 * Log: pm2 logs vhd-be|vhd-fe|vhd-agent
 */
module.exports = {
  apps: [
    {
      name: 'vhd-be',
      cwd: './be',
      script: 'dist/main.js',
      env: { NODE_ENV: 'production', PORT: 8080 },
      max_memory_restart: '600M',
      time: true,
    },
    {
      name: 'vhd-fe',
      cwd: './fe',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3001',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '700M',
      time: true,
    },
    {
      name: 'vhd-agent',
      cwd: './agent',
      script: '.venv/bin/uvicorn',
      args: 'app.main:app --host 0.0.0.0 --port 8001 --workers 1',
      interpreter: 'none',
      max_memory_restart: '500M',
      time: true,
    },
  ],
};
