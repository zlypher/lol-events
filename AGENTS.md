# AGENTS.md

Instructions, conventions, and operational guide for autonomous agents working in `lol-events`.

---

## 1. What This Project Does

`lol-events` generates iCalendar (`.ical`) subscription feeds and JSON summaries for League of Legends esports leagues using the [PandaScore REST API](https://pandascore.co/).
Feeds are published to GitHub Pages out of `docs/cal/` (serving URLs like `https://zlypher.github.io/lol-events/cal/<league-slug>.ical`), cataloged in `README.md`, and refreshed daily via GitHub Actions.

---

## 2. Verification Commands

Run these verification gates before and after code modifications:

```bash
# Type check with TypeScript compiler
npm run typecheck

# Run unit & regression test suite (offline, fast, ~200ms)
npm test

# Run tests in watch mode
npm run test:watch

# Check ESLint rules
npm run lint

# Automatically fix lint issues
npm run lint:fix

# Check Prettier formatting
npm run format:check

# Format files with Prettier
npm run format
```

All edits MUST pass `npm run typecheck`, `npm test`, `npm run lint`, and `npm run format:check` before being considered complete.

---

## 3. Architecture & File Structure

```
lol-events/
├── AGENTS.md                  # This file: agent operational instructions
├── ROADMAP.md                 # Modernization roadmap and technical debt audit
├── tsconfig.json              # TypeScript compiler configuration
├── lib/
│   ├── types.ts               # Shared TypeScript interfaces (PandaScore & calendars)
│   ├── pandascore.ts          # PandaScore API HTTP client & pagination
│   ├── pandascore-utils.ts    # Data mapping (raw API -> normalized match objects)
│   ├── ical-utils.ts          # iCal generation (ical-generator wrapper)
│   ├── league-activity.ts     # League activity classification and partitioning
│   ├── calendar-generator.ts  # Calendar generation pipeline & orchestration
│   ├── readme-generator.ts    # README markdown documentation generation
│   └── rate-limiter.ts        # Request rate limiter for PandaScore API
├── _scripts/
│   ├── create-ical.ts         # Production script: generates docs/cal/*.ical & *.json
│   ├── create-readme.ts       # Production script: generates README.md league table
│   └── list-*.ts / get-*.ts   # Ad-hoc inspection and debugging scripts
├── test/
│   ├── fixtures/              # Offline mock fixtures (leagues, matches, calendars)
│   ├── ical-utils.test.ts     # Tests for calendar generation
│   ├── pandascore-utils.test.ts # Tests for match normalization
│   ├── league-activity.test.ts # Tests for league activity classification
│   ├── calendar-generator.test.ts # Tests for calendar pipeline and active/inactive skipping
│   ├── readme-generator.test.ts # Tests for README documentation generation
│   ├── concurrency.test.ts    # Tests for API rate limiting and retries
│   └── sequence.test.ts       # Tests for RFC 5545 sequence increment logic
├── docs/
│   └── cal/                   # Production calendar outputs (134+ leagues, .ical + .json)
└── .github/workflows/         # Daily GitHub Actions cron automation
```

---

## 4. Key Invariants & Rules

1. **Test Offline with Fixtures**:
    - Do NOT run `node _scripts/create-ical.js` to test code changes. Doing so fires 300+ requests against the live PandaScore API and generates git churn across 270 files.
    - Use `npm test` against `test/fixtures/` for verifying transformations and logic.
2. **RFC 5545 Sequence Preservation**:
    - Calendar clients (Google Calendar, Apple Calendar, Outlook) only recognize match updates (such as rescheduled times or replaced teams) if the event's `sequence` number is incremented.
    - Any modifications to calendar generation must preserve or improve sequence tracking against existing `docs/cal/*.json` state.
3. **PandaScore Concurrency & Rate Limits**:
    - The PandaScore API enforces rate limits. Any code calling PandaScore must throttle concurrent requests (see Phase 3 in `ROADMAP.md`).
4. **Environment Variables**:
    - `ACCESSTOKEN`: PandaScore API Bearer token. Stored in `.env` locally and in GitHub Secrets for CI/CD.

---

## 5. Modernization Roadmap Pointer

Refer to [ROADMAP.md](ROADMAP.md) for the phased modernization plan:

- **Phase 1 (Complete)**: Agent foundation, Vitest test harness with offline fixtures, ESLint & Prettier configs, `AGENTS.md`.
- **Phase 2 (Complete)**: Target Node 24, ESM migration, dependency updates (`ical-generator` v11, native `fetch`, native `fs`, moment removed).
- **Phase 3**: Request throttling (`p-limit`), resilient error handling, CLI execution flags (`--league`, `--dry-run`).
- **Phase 4**: GitHub Actions modernization (Node 22, consolidated workflow) and dynamic web frontend.

---

## Agent skills

### Issue tracker

Tracked in GitHub Issues using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles mapped to matching labels (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` and `docs/adr/` at repo root). See `docs/agents/domain.md`.
