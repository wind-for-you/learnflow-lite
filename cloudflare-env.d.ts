// Bindings for @opennextjs/cloudflare getCloudflareContext().env.
// Names must match wrangler.toml ([[d1_databases]] binding, [vars]) and secrets.
declare global {
  interface CloudflareEnv {
    DB: D1Database;
    LLM_BASE_URL: string;
    LLM_API_KEY: string;
    LLM_MODEL?: string;
    RATE_LIMIT_PER_DEVICE_PER_DAY?: string;
    RATE_LIMIT_PER_IP_PER_DAY?: string;
  }
}

export {};
