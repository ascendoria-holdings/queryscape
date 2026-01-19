import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: __dirname,
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      "@queryscape/core": resolve(__dirname, "../../packages/core/src"),
      "@queryscape/connectors": resolve(__dirname, "../../packages/connectors/src"),
      "@queryscape/renderer-cytoscape": resolve(__dirname, "../../packages/renderer-cytoscape/src"),
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});
