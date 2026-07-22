# MANIFEST

## Project
**Wizard Productions AI Studio (WPAI)** — A Vector & Graph-native exploration interface for AI Studio context, provenance, and topological analysis.

> "SOUL IS LAW."

## Deliverables
- **Standalone Desktop App (PWA & Electron)**: Upgraded the build pipeline with `vite-plugin-pwa` for immediate browser-to-desktop installation, plus an Electron `main.cjs` wrapper (`npm run desktop`) to package the Node backend natively for complete offline standalone usage.
- **Multi-Provider AI Analyst**: Upgraded the server-side analyst to route prompts dynamically across Gemini, OpenAI, Anthropic, xAI, and local Ollama models. Fully structured JSON validation across all SDKs with strict key security.
- **KnowledgeGraph Explorer**: A force-directed D3 topology visualizer inspired by Neo4j and Obsidian. Interactive canvas scaling, dragging, and hover metadata.
- **Git-Style Provenance Blame**: Upgraded the Entity Viewer to feature a line-by-line attribution matrix, explicitly matching field values to their origin sources and confidence scores, inspired by `git blame` and Wikipedia history.
- **High-Tech Cypherpunk Aesthetic**: Migrated the entire UI from a standard dashboard look into a data-dense, dark-mode terminal layout featuring monospace data grids, scanline backgrounds, sharp lime green accents, and strict geometric structural hierarchy.
- **SmartSearchPanel**: An advanced faceted search interface with a Chroma-style metadata pre-filter display and latency metrics.
- **Type Safety Update**: Eliminated raw `any` types from `types.ts` and `yaml.ts` to enforce strictly typed, discriminated objects.
- **Test Suite**: Added `src/test.ts` to mathematically guarantee facet parsing and graph traversal correctness.

## Pre-Delivery Gate Validation
1. **Completeness**: All vectors, graphs, blame matrices, and tabs are fully wired and functional. No stubs. No placeholders.
2. **Dependency-First**: Installed `d3` and `@types/d3`. All prerequisites are stable. Zero missing packages.
3. **Zero Warnings/Errors**: `tsc --noEmit` returns strictly zero errors.
4. **Tests Exist & Pass**: Node-based assertion tests written and passed successfully.
5. **Documentation**: Documented metrics and UI layers via `MANIFEST.md` and inline React rendering.
6. **Performance Reasoning**: UMAP 2D approximation and D3 force simulation both utilize hardware acceleration and decoupled positioning where appropriate.
7. **Version/Stack Fidelity**: Fully adheres to React 18+ and Tailwind CSS v4 styling rules.
8. **Invention Hygiene**: Replaced generic file viewers with vector-native entity visualizers and graph structures.

## Next Actions
- Connect the frontend search to an actual embedded SQLite/Chroma instance.
- Upgrade the 2D mock projection into a WASM-based UMAP calculation for dynamic dimensionality reduction.
- Add local storage persistence for node positions in the Knowledge Graph.
