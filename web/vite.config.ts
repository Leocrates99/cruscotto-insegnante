import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";

// In sviluppo serve da "/" (anteprima). In build usa un base RELATIVO ("./"): così il
// sito funziona su GitHub Pages sotto qualunque nome di repo, senza cablarne uno.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "./" : "/",
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
