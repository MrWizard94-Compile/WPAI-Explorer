# Legacy constitution migration (WPAI-wide)

**Date:** 2026-07-28 (run stamp in CSV filenames)  
**Source of truth for pack content:** Desktop human workspace (mirrored here as empire install)  
**Empire pack path:** `C:\WPAI\AGENTS Constitution` (v5.0.1 LOCKED)

## What was done

1. Installed/refreshed this pack under `C:\WPAI\AGENTS Constitution` from Desktop SoT.  
2. Crawled `C:\WPAI` for legacy `AGENTS.md` / `SOUL.md` / `CLAUDE.md` / `CONSTITUTION.md`.  
3. Replaced empire/project agent-law files with **Level 4 pointers** to this pack.  
4. Left originals beside each file as `*.legacy-pre-pack-<stamp>`.  

## Skipped (on purpose)

| Pattern | Why |
|---------|-----|
| `AGENTS Constitution/**` | The pack itself |
| `**/intelligence/corpus/**` | Third-party / scraped corpus |
| `**/sources/**` | Third-party upstream projects (e.g. mod sources) |

## Logs

- `legacy-replace-*.csv` — per-file actions  
- `legacy-replace-*.log` — TSV path list  

## Verify

```powershell
pwsh -File "C:\WPAI\AGENTS Constitution\tools\verify-pack.ps1"
```
