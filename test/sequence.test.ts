import { describe, expect, it } from "vitest";
import { createCalendar } from "../lib/calendar-generator";
import {
    hasEventChanged,
    toIcal,
    updateCalendarEvents,
} from "../lib/ical-utils";
import { createEmptyMatchStore, updateMatchStore } from "../lib/match-store";
import { mapPandaScoreResult } from "../lib/pandascore-utils";
import type {
    CalendarJSON,
    PandaScoreLeague,
    PandaScoreMatch,
} from "../lib/types";
import rawMatchesFixture from "./fixtures/pandascore-matches.json" with { type: "json" };
import rawCalJsonFixture from "./fixtures/sample-league-cal.json" with { type: "json" };

const matchesFixture = rawMatchesFixture as unknown as PandaScoreMatch[];
const calJsonFixture = rawCalJsonFixture as unknown as CalendarJSON;

const sampleLeague: PandaScoreLeague = {
    id: 4197,
    name: "LEC",
    slug: "league-of-legends-lec",
    image_url: null,
    url: null,
};

describe("sequence preservation in Match Store & generated calendar", () => {
    it("preserves exact sequence number and UID from seeded Match Store in generated calendar", () => {
        const store = createEmptyMatchStore();
        store.matches[1661677] = {
            id: 1661677,
            uid: "1661677@zlypher.github.io",
            sequence: 4,
            start: "2026-09-19T15:00:00.000Z",
            end: "2026-09-19T20:00:00.000Z",
            summary: "Lower bracket final: KC vs MKOI",
            status: null,
            leagueId: 4197,
        };

        const cal = createCalendar(sampleLeague, store);
        const event = cal
            .events()
            .find((e) => String(e.id()) === "1661677@zlypher.github.io");

        expect(event).toBeDefined();
        expect(event?.sequence()).toBe(4);
        expect(event?.summary()).toBe("Lower bracket final: KC vs MKOI");
    });

    it("marks canceled match with sequence bump and STATUS:CANCELLED in calendar", () => {
        const store = createEmptyMatchStore();
        updateMatchStore(store, [matchesFixture[0]], 4197);
        expect(store.matches[1661676].sequence).toBe(1);

        const canceledMatch: PandaScoreMatch = {
            ...matchesFixture[0],
            status: "canceled",
        };

        updateMatchStore(store, [canceledMatch], 4197);
        expect(store.matches[1661676].sequence).toBe(2);
        expect(store.matches[1661676].status).toBe("CANCELLED");

        const cal = createCalendar(sampleLeague, store);
        const event = cal
            .events()
            .find((e) => String(e.id()) === "1661676@zlypher.github.io");
        expect(event?.sequence()).toBe(2);
        expect(event?.status()).toBe("CANCELLED");
        expect(cal.toString()).toContain("STATUS:CANCELLED");
    });
});

describe("sequence update logic (calendar events)", () => {
    it("should increment sequence when summary changes (e.g. from TBD to actual teams)", () => {
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
        const mappedMatches = mapPandaScoreResult(matchesFixture);
        const cal = toIcal("LEC", mappedMatches);

        updateCalendarEvents(cal, calJsonFixture);

        const unchangedEvent = cal
            .events()
            .find((e) => String(e.id()) === "1661677@zlypher.github.io");
        expect(unchangedEvent).toBeDefined();
        expect(unchangedEvent?.sequence()).toBe(2);
    });

    it("should increment sequence when match is rescheduled to a new start time", () => {
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
        expect(rescheduledEvent?.sequence()).toBe(3);
    });

    it("should increment sequence when match duration / end time changes", () => {
        const durationChangedMatch: PandaScoreMatch = {
            ...matchesFixture[1],
            number_of_games: 3,
        };

        const mappedMatches = mapPandaScoreResult([durationChangedMatch]);
        const cal = toIcal("LEC", mappedMatches);

        updateCalendarEvents(cal, calJsonFixture);

        const event = cal.events()[0];
        expect(event).toBeDefined();
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
