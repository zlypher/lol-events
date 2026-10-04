import { toIcal } from "../lib/ical-utils";
import { mapPandaScoreResult } from "../lib/pandascore-utils";
import type { NormalizedMatch, PandaScoreMatch } from "../lib/types";
import rawMatchesFixture from "./fixtures/pandascore-matches.json" with { type: "json" };

const matchesFixture = rawMatchesFixture as unknown as PandaScoreMatch[];

describe("ical-utils", () => {
    describe("toIcal", () => {
        it("should generate a valid iCal calendar with correct metadata", () => {
            const mappedMatches = mapPandaScoreResult(matchesFixture);
            const cal = toIcal("LEC", mappedMatches);

            expect(cal).toBeDefined();
            expect(cal.name()).toBe("LEC");
            expect(cal.url()).toBe("https://zlypher.github.io/lol-events/");
            expect(cal.prodId()).toBe("//Zlypher//LOL Events//EN");
            // In ical-generator v11, UTC timezone is normalized to null (omits VTIMEZONE and outputs RFC 5545 'Z' timestamps)
            expect(cal.timezone()).toBeNull();
        });

        it("should filter out matches without beginAt or scheduledAt", () => {
            const noTimeMatch: NormalizedMatch = {
                id: 999,
                name: "TBD vs TBD",
                beginAt: null,
                scheduledAt: null,
                numberOfGames: 1,
                teams: [],
            };
            const mappedMatches = [
                ...mapPandaScoreResult(matchesFixture),
                noTimeMatch,
            ];
            const cal = toIcal("LEC", mappedMatches);

            // Fixture has 3 matches (all have scheduled_at), plus noTimeMatch which has neither
            expect(cal.events()).toHaveLength(3);
        });

        it("should format VEVENT fields properly", () => {
            const mappedMatches = mapPandaScoreResult([matchesFixture[0]]);
            const cal = toIcal("LEC", mappedMatches);
            const events = cal.events();

            expect(events).toHaveLength(1);
            const event = events[0];
            expect(event.id()).toBe("1661676@zlypher.github.io");
            expect(event.summary()).toBe("Grand final: G2 vs KC");
            expect(event.sequence()).toBe(1);
        });

        it("should produce valid iCalendar string output with UTC 'Z' timestamps", () => {
            const mappedMatches = mapPandaScoreResult([matchesFixture[0]]);
            const cal = toIcal("LEC", mappedMatches);
            const icalString = cal.toString();

            expect(icalString).toContain("BEGIN:VCALENDAR");
            expect(icalString).toContain("VERSION:2.0");
            expect(icalString).toContain("PRODID:-//Zlypher//LOL Events//EN");
            expect(icalString).toContain("BEGIN:VEVENT");
            expect(icalString).toContain("SUMMARY:Grand final: G2 vs KC");
            expect(icalString).toContain("DTSTART:20260920T150000Z");
            expect(icalString).toContain("END:VEVENT");
            expect(icalString).toContain("END:VCALENDAR");
        });

        it("should serialize to JSON with expected structure", () => {
            const mappedMatches = mapPandaScoreResult([matchesFixture[0]]);
            const cal = toIcal("LEC", mappedMatches);
            const json = cal.toJSON();

            expect(json.name).toBe("LEC");
            expect(json.events).toHaveLength(1);
            expect(json.events[0].summary).toBe("Grand final: G2 vs KC");
        });

        it("should prefer scheduledAt over beginAt for event start time", () => {
            const matchWithTimes: NormalizedMatch = {
                id: 100,
                name: "Team A vs Team B",
                beginAt: "2026-10-10T15:30:00Z",
                scheduledAt: "2026-10-10T15:00:00Z",
                numberOfGames: 3,
                teams: [],
            };

            const cal = toIcal("LEC", [matchWithTimes]);
            const event = cal.events()[0];
            const startDate = new Date(event.start() as string | Date);
            expect(startDate.toISOString()).toBe("2026-10-10T15:00:00.000Z");
        });

        it("should set sequence and STATUS:CANCELLED on event", () => {
            const cancelledMatch: NormalizedMatch = {
                id: 101,
                name: "Team A vs Team B",
                beginAt: null,
                scheduledAt: "2026-10-10T15:00:00Z",
                numberOfGames: 3,
                teams: [],
                sequence: 4,
                status: "CANCELLED",
            };

            const cal = toIcal("LEC", [cancelledMatch]);
            const event = cal.events()[0];
            expect(event.sequence()).toBe(4);
            expect(event.status()).toBe("CANCELLED");

            const icalString = cal.toString();
            expect(icalString).toContain("SEQUENCE:4");
            expect(icalString).toContain("STATUS:CANCELLED");
        });
    });
});
