import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
          if (id.includes("productsCatalog.js")) {
            return "catalog-data";
          }
          return undefined;
        },
      },
    },
  },
  optimizeDeps: {
    include: ["react", "react-dom/client", "lucide-react"],
  },
  server: {
    host: "0.0.0.0",
    port: 5173,
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  preview: {
    port: 4173,
    host: "0.0.0.0",
  },
  plugins: [react()],
});
