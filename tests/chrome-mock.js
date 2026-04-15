export function installChromeMock(initialData = {}) {
  const store = { ...initialData };
  let quotaError = false;
  globalThis.chrome = {
    runtime: { lastError: null },
    storage: {
      sync: {
        async get(keys) {
          const out = {};
          const k = keys === null ? Object.keys(store) : (Array.isArray(keys) ? keys : [keys]);
          for (const key of k) if (key in store) out[key] = store[key];
          return out;
        },
        async set(obj) {
          if (quotaError) {
            const err = new Error("QUOTA_BYTES exceeded");
            err.name = "QuotaExceededError";
            throw err;
          }
          Object.assign(store, obj);
        },
      },
    },
  };
  return {
    store,
    triggerQuotaError() { quotaError = true; },
    reset() { for (const k of Object.keys(store)) delete store[k]; quotaError = false; },
  };
}
