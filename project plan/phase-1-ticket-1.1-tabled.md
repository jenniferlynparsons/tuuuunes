# Phase 1 - Ticket 1.1: Tabled due to ESM / Node / Electron build incompatibility

Date: 2026-01-01

Summary
-------
We've encountered a challenging issue setting up the Electron + React + Vite stack. The core problem is that modern build tools (e.g. `vite-plugin-electron`, `electron-vite`) exhibit ESM/CommonJS interoperability issues with Node 20+ (and later), particularly when trying to load Electron APIs. Because resolving this reliably would take more time than available for Phase 1, Ticket 1.1 is being tabled for now.

What we tried
------------
- Manual Electron + React + Vite setup — hit module resolution failures when loading preloads/main.
- `electron-vite` package — same module resolution issues in our environment.
- `vite-plugin-electron` using the official template — reproduced ESM/CommonJS errors even in the official boilerplate.

Root cause
----------
The error `TypeError: Cannot read properties of undefined (reading 'exports')` arises when Node's ESM loader attempts to load CommonJS modules. This surface error is symptomatic of ESM/CommonJS interop problems introduced or exposed by newer Node versions and certain package combinations (bundlers, plugins, and Electron preload/bridge code). In short: the ESM loader and plugin/transform chain are producing incompatible module shapes at runtime.

Best-practices research and notes
--------------------------------
- Official guidance and community writeups (electron-vite.org and assorted guides) recommend `electron-vite`/vite-plugin-electron for modern Electron+Vite setups (2025/2026). However, those stacks still experience edge-case compatibility problems with Node 20+ and some dependency combinations.
- Workarounds commonly suggested in the community: pin Node to an LTS that is known to behave (Node 18), avoid mixing ESM/CJS in critical electron entry points, or switch to older, more battle-tested builders.

Recommended next steps
----------------------
1. Try running the project under Node 18 LTS (recommended quick test). If the issue disappears, consider pinning the development and CI Node version to 18 for Phase 1 while we investigate long-term fixes.
2. If pinning Node isn't acceptable, consider switching to a simpler, proven stack for Phase 1 (for example, Electron Forge with webpack) to get a working dev/build flow quickly.
3. Alternatively, run plain Electron without a bundler initially (use native ESM/CJS requires directly), then reintroduce Vite/bundlers once a clear compatibility path is found.
4. If we want to keep pursuing the Vite approach, collect minimal reproduction steps and open an issue with `electron-vite` / `vite-plugin-electron` including Node version, Electron version, and a tiny repro so maintainers can triage.

Quick reproduction notes (for future debugging)
---------------------------------------------
- Record Node version used for tests, Electron version, Vite and plugin versions, and minimal repro that replicates `TypeError: Cannot read properties of undefined (reading 'exports')`.

Decision
--------
Table ticket 1.1 for now. Continue Phase 1 work on other tickets; revisit this with either a Node pin or alternative build approach.

Files added/changed: this document.
