import { initDefaults } from "./storage.js";

chrome.runtime.onInstalled.addListener(async () => {
  try {
    await initDefaults();
  } catch (err) {
    console.error("[mcf-blocker] initDefaults failed", err);
  }
});

// migration hook: when schemaVersion changes in a future release, handle it here.
