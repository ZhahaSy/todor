import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";

const host = process.env.TAURI_DEV_HOST;

// https://vite.dev/config/
export default defineConfig(async () => ({
  plugins: [react(), basicSsl()],

  // Vite options tailored for Tauri development and only applied in `tauri dev` or `tauri build`
  //
  // 1. prevent Vite from obscuring rust errors
  clearScreen: false,
  resolve: {
    alias: {
      '@': '/src',
    },
  },
  // 2. tauri expects a fixed port, fail if that port is not available
  server: {
    host: true,
    port: 5174,
    // host: host || false,
    // hmr: host
    //   ? {
    //       protocol: "ws",
    //       host,
    //       port: 1421,
    //     }
    //   : undefined,
    // watch: {
    //   // 3. tell Vite to ignore watching `src-tauri`
    //   ignored: ["**/src-tauri/**"],
    // },
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
}));
