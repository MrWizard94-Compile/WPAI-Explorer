# WPAI Explorer

WPAI Explorer is a desktop-first Minecraft/mod knowledge explorer for Wizard Productions AI Studio. It combines a local entity filesystem, provenance viewer, smart context search, vector/topology views, and a local-first AI assistant backed by Ollama in Docker.

SOUL is law: the app is wired for complete, tested, reproducible local operation.

## Local Tiny Model Set

The app is configured around three small Ollama models:

| Model | Role | Why it is here |
| --- | --- | --- |
| `gemma3:270m` | Default analyst | Fast graph summaries, compatibility notes, and general local chat. |
| `qwen2.5-coder:0.5b` | Code/modding assistant | Better fit for YAML entity specs, Minecraft modding snippets, and code repair. |
| `smollm2:135m` | Ultra-light fallback | Smallest local diagnostic model for quick endpoint checks and short answers. |

## Run As A Desktop App

```powershell
npm install
npm run docker:ollama
npm run desktop
```

`npm run docker:ollama` starts the Docker Ollama service and pulls the configured tiny model set into the persistent `ollama_data` volume.

## Build The Windows Executable

```powershell
npm run dist:win
```

Artifacts are written to `dist-desktop/`. The portable executable is named like:

```text
WPAI Explorer-1.0.0-win-x64.exe
```

## Docker Stack

```powershell
docker compose up -d
```

The compose stack includes:

- `ollama`: local Ollama runtime on port `11434`.
- `ollama-models`: one-shot model pull service for the WPAI tiny model set.
- `app`: development server on port `3000`, using `http://ollama:11434/v1` inside the Docker network.

Desktop mode uses `http://127.0.0.1:11434/v1` by default.

## Verification

```powershell
npm run lint
npm test
npm run build
docker exec ollama ollama list
```

Expected local models:

```text
gemma3:270m
qwen2.5-coder:0.5b
smollm2:135m
```
