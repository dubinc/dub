import crypto from "node:crypto";

Object.defineProperty(globalThis, "crypto", {
  value: crypto,
  writable: false, // Ensure it's not writable
  configurable: true, // Allow reconfiguration if needed
});
