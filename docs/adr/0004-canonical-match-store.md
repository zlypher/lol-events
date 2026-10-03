# Canonical Match Store for multi-calendar sequence tracking

We maintain a central repository file (`data/matches.json`) as the single source of truth for normalized matches and their RFC 5545 `sequence` counters. When the same match appears in a League Calendar, multiple Team Calendars, and future Custom Calendars, all generated calendar outputs derive their sequence number from this shared store.

## Consequences

- Calendar generation no longer reads previous state from individual `docs/cal/*.json` files to detect changes.
- If a match's scheduled time, status, or summary changes, its sequence increments exactly once in the Match Store, ensuring all calendar subscribers receive consistent update notifications regardless of which calendar they follow.
