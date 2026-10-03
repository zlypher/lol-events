# lol-events

Publishes subscribable schedules of professional League of Legends esports matches, sourced from PandaScore.

## Language

### Calendars

**Calendar**:
A named, subscribable set of matches, published as an iCal file at a stable URL.
_Avoid_: Feed, subscription, ical (that's the file format, not the concept)

**League Calendar**:
A Calendar containing the matches of exactly one League.

**Team Calendar**:
A Calendar containing the matches in which one specific Team plays, across all Leagues.

**Custom Calendar**:
A Calendar whose contents are an arbitrary combination of Leagues and Teams chosen by a user.

### Esports

**League**:
A recurring competition as modeled by PandaScore (e.g. LEC, LCK), which runs Series over time.

**Active League**:
A League with at least one Serie that is upcoming, ongoing, or concluded within the last three months.

**Team**:
A competing organization's roster as identified by PandaScore. Identified by its PandaScore ID; its name and slug may change.

**Match**:
A single best-of-N contest between two Teams within a League. Calendars never reveal a Match's result.
_Avoid_: Game (a Match consists of one or more games), event (that's the iCal representation)

**Scheduled Time**:
The planned start of a Match; the time a Calendar shows. Distinct from when the Match actually began.

**Canceled Match**:
A Match that will not take place. It stays in Calendars, marked as canceled.

**Postponed Match**:
A Match moved to an as-yet-unknown time. Shown as canceled until a new Scheduled Time is known.

### Architecture

**Match Store**:
The canonical dataset of normalized Matches and their RFC 5545 sequence counters, acting as the single source of truth for all generated Calendars.
_Avoid_: Cache, database
