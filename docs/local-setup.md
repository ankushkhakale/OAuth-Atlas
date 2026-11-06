# Local setup options

The default setup in the [README](../README.md) needs no environment file or API key. These options are here when you need them.

## Development or production build?

- `pnpm dev`: development server on port 5173, with hot reload.
- `pnpm build` then `pnpm start`: production Worker running locally on port 8080.
- `pnpm start:local`: alias for `pnpm start`, kept for older setup instructions.

Changing source files? Rebuild before running the production start command.

## Change the port

On Linux/macOS:

```sh
PORT=8090 pnpm start
```

On PowerShell:

```powershell
$env:PORT = "8090"
pnpm start
```

By default the production runner listens on `127.0.0.1`. `ATLAS_BIND=0.0.0.0` exposes it on your network; only use that when intended. Put TLS and appropriate access/egress controls in front of an internet-facing self-hosted instance.

## Local model drafts with Ollama

Install Ollama separately, then pull a model:

```sh
ollama pull qwen2.5:1.5b
```

With Ollama running, start Atlas on Linux/macOS:

```sh
OLLAMA_URL=http://127.0.0.1:11434 OLLAMA_MODEL=qwen2.5:1.5b pnpm start
```

For PowerShell, set those two environment variables before `pnpm start`.

The model is optional. Invalid drafts fall back to extraction. Known source IDs and matching excerpts are required, but a matching excerpt does not prove a correct interpretation. Model drafts remain planning advice. The model download needs extra disk space; CPU inference is slower.

## Self-hosted search with SearXNG

Enable JSON output in your SearXNG configuration:

```yaml
use_default_settings: true
search:
  formats:
    - html
    - json
```

Set `SEARXNG_URL` to your instance before starting Atlas. Example for Linux/macOS:

```sh
SEARXNG_URL=http://127.0.0.1:8888 pnpm start
```

Atlas uses `/search?q=...&format=json`. This is deployer-owned configuration, not a URL supplied by a visitor. Keep a private search service private.

## Docker

```sh
docker compose up --build -d atlas
```

Open http://127.0.0.1:8080. Stop it with `docker compose down`.

The optional Ollama service is behind the `ai` profile. To use it, enable the Ollama variables in `compose.yaml`, then:

```sh
docker compose --profile ai up --build -d
docker compose exec ollama ollama pull qwen2.5:1.5b
```

Docker packaging is supplied but has not been executed in the development environment. There is no database volume to initialize.

## When something doesn't work

| Symptom | Try this |
| --- | --- |
| `pnpm` is missing | Use the Corepack or direct pnpm installation path in the README |
| Start says to build first | Run `pnpm build`, then `pnpm start` |
| Port is already in use | Stop the other server or choose another `PORT` |
| An app name isn't resolved | Confirm any identity suggestion, or enter the provider homepage |
| Search is blocked or throttled | Try the official homepage/docs URL; inspect the recorded attempts |
| Saved reports disappeared | Check that you're in the same browser/profile and haven't cleared site storage |
| Browser storage is full | Copy or export the open report before closing it |
| Optional model isn't responding | Check Ollama separately, or unset its variables and use extraction |

The runner reads shell environment variables. Merely creating a `.env` file does not load it automatically.
