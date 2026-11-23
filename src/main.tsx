import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/jetbrains-mono";
import "@fontsource/permanent-marker/latin-400.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

/** The room paints text onto textures, so its fonts must exist first. */
const FONT_TIMEOUT_MS = 1200;

async function boot() {
  const fonts = Promise.all([
    document.fonts.load('600 24px "JetBrains Mono Variable"'),
    document.fonts.load('700 24px "Bricolage Grotesque Variable"'),
    document.fonts.load('400 24px "Permanent Marker"'),
  ]);
  await Promise.race([fonts, new Promise((resolve) => setTimeout(resolve, FONT_TIMEOUT_MS))]).catch(() => undefined);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void boot();
