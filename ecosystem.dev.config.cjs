// DEV admin (https://dev-admin.byggexp.se), deployed from branch `dev`.
module.exports = {
  apps: [
    {
      name: 'byggexp-admin-dev',
      script: './server.js',
      cwd: '/opt/byggexp-admin-dev/current',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      kill_timeout: 10000,
      listen_timeout: 30000,
      env: {
        NODE_ENV: 'production',
        HOSTNAME: '127.0.0.1',
        PORT: '5176',
      },
    },
  ],
};
