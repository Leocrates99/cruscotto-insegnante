import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// In sviluppo serve da "/" (anteprima); in build usa il base path di GitHub Pages.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/notion-cruscotto-docente/" : "/",
  plugins: [react()],
  resolve: {
    alias: {
      "@model": fileURLToPath(new URL("./src/model/index.ts", import.meta.url)),
      "@root-src": fileURLToPath(new URL("../src", import.meta.url)),
      "@root-config": fileURLToPath(new URL("../config", import.meta.url)),
    },
  },
  // Permette di importare il modello condiviso che vive fuori da web/.
  server: { fs: { allow: [".."] }, port: 5173, strictPort: true },
}));
