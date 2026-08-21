const { AsyncLocalStorage } = require("node:async_hooks");

if (typeof globalThis.AsyncLocalStorage !== "function") {
  globalThis.AsyncLocalStorage = AsyncLocalStorage;
}
