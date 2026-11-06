declare namespace Cloudflare {
  interface Env {
    OLLAMA_URL?: string;
    SEARXNG_URL?: string;
    OLLAMA_MODEL?: string;
    BUCKET?: R2Bucket;
  }
}
