// pm2 start ecosystem.config.cjs — harness (TigrimOS headless) + MorDoo backend (serves web/dist on :8790).
const fs = require("fs")
const path = require("path")
const env = Object.fromEntries(
  fs.readFileSync(path.join(__dirname, "harness/.env"), "utf8").split("\n")
    .filter(l => /^[A-Z_]+=/.test(l)).map(l => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)])
)
module.exports = {
  apps: [
    { name: "mordoo-harness", cwd: path.join(__dirname, "harness"), script: "./run.sh", interpreter: "bash" },
    {
      name: "mordoo-backend", cwd: path.join(__dirname, "engine"), script: "dist/server.js",
      env: {
        MORDOO_DATA_DIR: path.join(__dirname, "engine/data"),
        TIGRIMOS_URL: `http://127.0.0.1:${env.PORT || 3001}`,
        TIGRIMOS_TOKEN: env.ACCESS_TOKEN,
      },
    },
  ],
}
