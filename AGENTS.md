# AGENTS.md

## Project Overview

This is an automated CI/CD solution to download and build Windows ISO files from [UUP dump](https://uupdump.net). The project is bilingual (English/Chinese) and consists of two main components:

1. **Scraper (`playwright/`)** — A Playwright-based web scraper that monitors UUP dump for new Windows builds, handles Cloudflare challenges, and produces incremental data updates.
2. **Builder (`builder/`)** — A rule-based automation engine that matches scraped data against user-defined rules, downloads UUP packages, and compiles ISO files.

## Repository Structure

```
├── builder/              # ISO builder engine (TypeScript, ESM)
│   ├── src/
│   │   ├── auto_build.ts     # Entry point for automated builds
│   │   ├── index.ts          # Entry point for manual builds
│   │   ├── iso_builder.ts    # ISO compilation logic
│   │   ├── selector.ts       # Build selection/matching logic
│   │   ├── verify_rules.ts   # Rule validation
│   │   ├── types.ts          # TypeScript type definitions
│   │   └── config/
│   │       └── rules.ts      # User-defined build rules
│   ├── scripts/              # Helper scripts (e.g., generate-matrix.js)
│   ├── package.json
│   └── tsconfig.json
├── playwright/           # UUP dump web scraper (TypeScript)
│   ├── src/
│   │   ├── scrape.ts         # Page scraping logic
│   │   ├── analyze_params.ts # Parameter analysis & incremental updates
│   │   └── types.ts          # TypeScript type definitions
│   └── package.json
├── .github/workflows/
│   ├── scrape.yml            # Daily scrape workflow (Ubuntu)
│   └── uup-auto-build.yml   # ISO build workflow (Windows, every 3 days)
└── README.md
```

## Tech Stack

- **Language**: TypeScript (strict mode, ES2022 target, ESM modules)
- **Runtime**: Node.js v20+
- **Package Manager**: pnpm
- **Scraper**: Playwright (Chromium)
- **Builder dependencies**: axios, cheerio, adm-zip, commander, fs-extra
- **Dev tooling**: tsx (TypeScript execution), tsc (compilation)
- **ISO build environment**: Windows + PowerShell Core (pwsh)

## Development Commands

### Scraper (`playwright/`)

```bash
cd playwright
pnpm install
pnpm run scrape    # Scrape UUP dump HTML pages
pnpm run analyze   # Analyze parameters, generate incremental data
```

### Builder (`builder/`)

```bash
cd builder
pnpm install
pnpm start                        # Run automated build (matches rules)
pnpm run manual                   # Run manual build
pnpm run compile                  # TypeScript compilation check
pnpm run generate-matrix          # Generate CI matrix JSON
```

## CI/CD Workflows

- **`scrape.yml`**: Runs daily at 02:00 UTC on Ubuntu. Scrapes UUP dump, analyzes data, and pushes results to the `data` branch.
- **`uup-auto-build.yml`**: Runs every 3 days at 02:00 UTC on Windows. Generates a build matrix from rules, checks out scraped data from the `data` branch, and builds ISOs as artifacts.

## Key Conventions

- **Bilingual comments**: Code and documentation include both English and Chinese.
- **Strict TypeScript**: The builder uses strict compiler options including `noImplicitAny`, `strictNullChecks`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
- **ESM modules**: The builder uses `"type": "module"` with ESNext module resolution.
- **Rule-based configuration**: Build targets are defined in `builder/src/config/rules.ts` using the `BuildRule` interface.
- **Incremental data**: The scraper only processes new builds to avoid redundant work.
- **Data branch**: Scraped data is stored on an orphan `data` branch, not in the main source tree.

## Important Notes for Agents

- ISO building requires Windows OS with PowerShell Core — this cannot run on Linux/macOS.
- The `builder/output/` and `playwright/output/` directories contain generated artifacts and are not committed to the main branch.
- When modifying build rules, ensure they conform to the `BuildRule` type defined in `builder/src/types.ts`.
- The project has no test framework configured — validate changes with `pnpm run compile` in the builder directory.
- Do not commit scraped data or ISO files to the main branch.
