import { hasEventChanged, updateCalendarEvents } from "../_scripts/create-ical";
import { toIcal } from "../lib/ical-utils";
import { mapPandaScoreResult } from "../lib/pandascore-utils";
import type { CalendarJSON, PandaScoreMatch } from "../lib/types";
import rawMatchesFixture from "./fixtures/pandascore-matches.json" with { type: "json" };
import rawCalJsonFixture from "./fixtures/sample-league-cal.json" with { type: "json" };

const matchesFixture = rawMatchesFixture as unknown as PandaScoreMatch[];
const calJsonFixture = rawCalJsonFixture as unknown as CalendarJSON;

describe("sequence update logic", () => {
    it("should increment sequence when summary changes (e.g. from TBD to actual teams)", () => {
        // In fixture, event 1661676 had summary "Grand final: TBD vs TBD" with sequence 1.
        // In matchesFixture, event 1661676 now has summary "Grand final: G2 vs KC".
        const mappedMatches = mapPandaScoreResult(matchesFixture);
        const cal = toIcal("LEC", mappedMatches);

        updateCalendarEvents(cal, calJsonFixture);

        const updatedEvent = cal
            .events()
            .find((e) => String(e.id()) === "1661676@zlypher.github.io");
        expect(updatedEvent).toBeDefined();
        expect(updatedEvent?.sequence()).toBe(2);
    });

    it("should preserve existing sequence when event fields have not changed", () => {
        // In fixture, event 1661677 has summary "Lower bracket final: KC vs MKOI" and sequence 2.
        // In matchesFixture, event 1661677 has the exact same summary, start, and end time.
        const mappedMatches = mapPandaScoreResult(matchesFixture);
        const cal = toIcal("LEC", mappedMatches);

        updateCalendarEvents(cal, calJsonFixture);

        const unchangedEvent = cal
            .events()
            .find((e) => String(e.id()) === "1661677@zlypher.github.io");
        expect(unchangedEvent).toBeDefined();
        // Should preserve sequence 2 from the previous state, NOT reset to 1
        expect(unchangedEvent?.sequence()).toBe(2);
    });

    it("should increment sequence when match is rescheduled to a new start time", () => {
        // Event 1661677 originally started at 2026-09-19T15:09:22Z with sequence 2.
        // Reschedule to 2 hours later with identical summary.
        const rescheduledMatch: PandaScoreMatch = {
            ...matchesFixture[1],
            begin_at: "2026-09-19T17:09:22Z",
            scheduled_at: "2026-09-19T17:00:00Z",
        };

        const mappedMatches = mapPandaScoreResult([rescheduledMatch]);
        const cal = toIcal("LEC", mappedMatches);

        updateCalendarEvents(cal, calJsonFixture);

        const rescheduledEvent = cal.events()[0];
        expect(rescheduledEvent).toBeDefined();
        // Sequence should increment from 2 to 3
        expect(rescheduledEvent?.sequence()).toBe(3);
    });

    it("should increment sequence when match duration / end time changes", () => {
        // Event 1661677 originally had number_of_games: 5. Change to 3 games (shorter duration).
        const durationChangedMatch: PandaScoreMatch = {
            ...matchesFixture[1],
            number_of_games: 3,
        };

        const mappedMatches = mapPandaScoreResult([durationChangedMatch]);
        const cal = toIcal("LEC", mappedMatches);

        updateCalendarEvents(cal, calJsonFixture);

        const event = cal.events()[0];
        expect(event).toBeDefined();
        // Sequence should increment from 2 to 3
        expect(event?.sequence()).toBe(3);
    });

    it("should default sequence to 1 for brand new events not present in previous JSON", () => {
        const newMatch: PandaScoreMatch = {
            id: 9999999,
            name: "New Match",
            begin_at: "2026-10-01T12:00:00Z",
            number_of_games: 1,
            opponents: [],
        };
        const mappedMatches = mapPandaScoreResult([newMatch]);
        const cal = toIcal("LEC", mappedMatches);

        updateCalendarEvents(cal, calJsonFixture);

        const newEvent = cal.events()[0];
        expect(newEvent?.sequence()).toBe(1);
    });

    describe("hasEventChanged helper", () => {
        it("should return false when summary and times are identical", () => {
            const mappedMatches = mapPandaScoreResult([matchesFixture[1]]);
            const cal = toIcal("LEC", mappedMatches);
            const currentEvent = cal.events()[0];
            const prevEvent = calJsonFixture.events.find(
                (e) => String(e.id) === "1661677",
            )!;

            expect(hasEventChanged(currentEvent, prevEvent)).toBe(false);
        });

        it("should return true when summary differs", () => {
            const mappedMatches = mapPandaScoreResult([matchesFixture[0]]);
            const cal = toIcal("LEC", mappedMatches);
            const currentEvent = cal.events()[0];
            const prevEvent = calJsonFixture.events.find(
                (e) => String(e.id) === "1661676",
            )!;

            expect(hasEventChanged(currentEvent, prevEvent)).toBe(true);
        });
    });
});
