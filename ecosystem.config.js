module.exports = {
  apps: [
    {
      name: "bayut-monitor",
      script: "app.js",
      autorestart: true,
      env_dev: {
        NODE_ENV: "dev",
        PORT: 3000,
      },
    },
  ],
};
