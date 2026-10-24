import { defineConfig } from "vite"
import react from "@vitejs/plugin-react"

// Served at https://<host>/mordoo/ — nginx strips the prefix before proxying to the backend on :8790.
export default defineConfig({
  base: "/mordoo/",
  plugins: [react()],
  server: { port: 5173, proxy: { "/mordoo/api": { target: "http://127.0.0.1:8790", rewrite: p => p.replace(/^\/mordoo/, "") } } },
})
