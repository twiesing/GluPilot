import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Baut das Frontend nach ../public – von dort serviert Fastify die App (ein Container).
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: "../public",
    emptyOutDir: true,
  },
  server: {
    // Dev: Analyse/Historie ans laufende Backend weiterreichen.
    proxy: {
      "/analyze": "http://localhost:8787",
      "/history": "http://localhost:8787",
      "/health": "http://localhost:8787",
    },
  },
});
