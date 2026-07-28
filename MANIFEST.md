# MANIFEST

## Project

**WPAI Explorer** - desktop-first vector, graph, provenance, and local-model exploration interface for Wizard Productions AI Studio.

SOUL IS LAW.

## Current Delivery

This delivery converts the AI Studio-style web shell into a regular Electron desktop app, wires Docker-hosted Ollama into the app runtime, installs the selected tiny model set, and prepares Windows executable packaging.

## Files Changed

| File | Purpose |
| --- | --- |
| `server.ts` | Adds runtime config, Ollama status, safe model pulling, local-first chat/analyze routing, private desktop server startup, and production-safe Vite loading. |
| `electron-main.cjs` | Runs the packaged backend privately on loopback, disables renderer Node access, uses a native desktop window, and enforces a single app instance. |
| `docker-compose.yml` | Adds Ollama health checks, one-shot tiny-model pull service, and Docker-network app wiring. |
| `Dockerfile` | Adds separate dev, builder, and production stages so compose dev and production builds both work. |
| `package.json` | Renames the package, removes PWA packaging, adds Docker/model scripts, adds Windows executable packaging, and bundles the server for desktop use. |
| `package-lock.json` | Syncs dependencies after removing the PWA plugin. |
| `vite.config.ts` | Removes PWA behavior and keeps the renderer focused on Electron/browser development. |
| `.env.example` | Documents Ollama defaults and the configured tiny model set. |
| `README.md` | Replaces the AI Studio starter text with desktop, Docker, model, packaging, and verification instructions. |
| `src/config/ollamaModels.ts` | Defines the three approved tiny Ollama model profiles and default model contract. |
| `src/types.ts` | Adds shared runtime, provider, and Ollama status types. |
| `src/components/ModelSettings.tsx` | Adds a desktop runtime settings pane for endpoint status, installed models, missing models, and safe pulls. |
| `src/components/ChatUI.tsx` | Makes Ollama the default provider and uses the runtime model inventory for local chat. |
| `src/components/SmartSearch.tsx` | Makes Ollama the default analyzer and uses the runtime model inventory for graph analysis. |
| `src/App.tsx` | Wires the Settings sidebar entry to the new desktop runtime pane. |
| `src/test.ts` | Adds assertions that pin the exact three-model local contract. |

## Ollama Models Pulled

Verified in Docker container `ollama`:

| Model | Size reported by Ollama |
| --- | --- |
| `gemma3:270m` | 291 MB |
| `qwen2.5-coder:0.5b` | 397 MB |
| `smollm2:135m` | 270 MB |

An older `llama2:latest` model was already present and was not removed.

## Verification Commands

```powershell
npm run lint
npm test
npm run build
docker exec ollama ollama list
npm run dist:win
```

## Review Path

1. `src/config/ollamaModels.ts`
2. `server.ts`
3. `docker-compose.yml`
4. `electron-main.cjs`
5. `src/components/ModelSettings.tsx`
6. `src/components/ChatUI.tsx`
7. `src/components/SmartSearch.tsx`

## Suggested Commit Message

```text
Ship desktop Ollama runtime and Windows executable packaging
```
