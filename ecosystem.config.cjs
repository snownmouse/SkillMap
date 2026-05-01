module.exports = {
  apps: [{
    name: 'skillmap-odyssey',
    script: 'server.ts',
    interpreter: 'npx',
    interpreter_args: 'tsx',
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '512M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3002,
    },
    env_development: {
      NODE_ENV: 'development',
      PORT: 3002,
    },
    max_restarts: 10,
    restart_delay: 3000,
    watch: false,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
  }],
};
