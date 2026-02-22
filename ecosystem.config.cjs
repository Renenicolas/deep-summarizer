/** PM2 config for VPS: ensures cwd, PORT, and env. Use: pm2 start ecosystem.config.cjs */
module.exports = {
  apps: [
    {
      name: "reno-times",
      cwd: __dirname,
      script: "npm",
      args: "run start",
      env: { NODE_ENV: "production", PORT: "3000" },
      interpreter: "none",
      autorestart: true,
      max_restarts: 10,
      min_uptime: "10s",
    },
  ],
};
