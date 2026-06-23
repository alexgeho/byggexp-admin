module.exports = {
  apps: [
    {
      name: 'byggexp-admin',
      script: './server.js',
      cwd: '/opt/byggexp-admin/current',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      kill_timeout: 10000,
      listen_timeout: 30000,
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
        PORT: '5174',
      },
    },
  ],
};
