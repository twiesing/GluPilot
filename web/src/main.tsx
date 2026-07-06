import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { bootstrapToken } from "./api";
// Figtree selbst hosten (vom Neutral-Theme vorgesehen) – Vite bündelt die woff2,
// keine externen Requests.
import "@fontsource/figtree/latin-400.css";
import "@fontsource/figtree/latin-500.css";
import "@fontsource/figtree/latin-600.css";
import "@fontsource/figtree/latin-700.css";
import "./global.css";
import "./app.css";

// Token evtl. aus #token=... übernehmen, bevor die App rendert.
bootstrapToken();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service Worker nur in Produktion – im Dev cacht er sonst alte Stände.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}
