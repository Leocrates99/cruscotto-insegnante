import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Rispecchia gli alias di vite.config.ts così i test possono importare il modello condiviso.
export default defineConfig({
  resolve: {
    alias: {
      "@model": fileURLToPath(new URL("./src/model/index.ts", import.meta.url)),
      "@root-src": fileURLToPath(new URL("../src", import.meta.url)),
      "@root-config": fileURLToPath(new URL("../config", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
