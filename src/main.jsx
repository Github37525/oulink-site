import React from "react";
import { createRoot, hydrateRoot } from "react-dom/client";
import "./styles/tokens.css";
import "./styles/main.css";
import "./styles/cad-viewer.css";
import { App } from "./App.jsx";
import { resolveLegacyRedirect } from "./routing.js";

const legacyTarget = resolveLegacyRedirect(window.location.search);
if (legacyTarget) {
  window.history.replaceState(null, "", legacyTarget);
}

const rootElement = document.getElementById("root");
const normalizedPath = window.location.pathname.replace(/\/+$/, "") || "/";
const effectivePath = normalizedPath === "/" ? "/zh" : normalizedPath;
const prerenderedPath = rootElement?.dataset?.pathname;

const element = <App pathname={effectivePath} />;

if (
  rootElement?.dataset?.prerendered === "true" &&
  prerenderedPath === effectivePath &&
  rootElement.hasChildNodes()
) {
  hydrateRoot(rootElement, element);
} else if (rootElement) {
  createRoot(rootElement).render(element);
}
