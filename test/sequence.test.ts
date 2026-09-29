import { updateCalendarEvents } from "../_scripts/create-ical";
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
            .find((e) => String(e.id()) === "1661676");
        expect(updatedEvent).toBeDefined();
        expect(updatedEvent?.sequence()).toBe(2);
    });

    it("should preserve existing sequence when summary did not change", () => {
        // In fixture, event 1661677 has summary "Lower bracket final: KC vs MKOI" and sequence 2.
        // In matchesFixture, event 1661677 has the exact same summary.
        const mappedMatches = mapPandaScoreResult(matchesFixture);
        const cal = toIcal("LEC", mappedMatches);

        updateCalendarEvents(cal, calJsonFixture);

        const unchangedEvent = cal
            .events()
            .find((e) => String(e.id()) === "1661677");
        expect(unchangedEvent).toBeDefined();
        expect(unchangedEvent?.sequence()).toBe(1);
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
});
