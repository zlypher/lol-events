import { describe, expect, it } from "vitest";
import { createCalendar } from "../lib/calendar-generator";
import { createEmptyMatchStore, updateMatchStore } from "../lib/match-store";
import type { PandaScoreLeague, PandaScoreMatch } from "../lib/types";
import rawMatchesFixture from "./fixtures/pandascore-matches.json" with { type: "json" };

const matchesFixture = rawMatchesFixture as unknown as PandaScoreMatch[];

const sampleLeague: PandaScoreLeague = {
    id: 4197,
    name: "LEC",
    slug: "league-of-legends-lec",
    image_url: null,
    url: null,
};

describe("sequence preservation & monotonic updates in calendar", () => {
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

    it("defaults sequence to 1 for brand new matches added to Match Store", () => {
        const store = createEmptyMatchStore();
        const newMatch: PandaScoreMatch = {
            id: 9999999,
            name: "New Match",
            begin_at: "2026-10-01T12:00:00Z",
            scheduled_at: "2026-10-01T12:00:00Z",
            number_of_games: 1,
            opponents: [],
            league: sampleLeague,
        };

        updateMatchStore(store, [newMatch]);

        const cal = createCalendar(sampleLeague, store);
        const event = cal
            .events()
            .find((e) => String(e.id()) === "9999999@zlypher.github.io");

        expect(event).toBeDefined();
        expect(event?.sequence()).toBe(1);
    });

    it("increments sequence when summary changes (e.g. from TBD to actual teams) and reflects in calendar", () => {
        const store = createEmptyMatchStore();
        store.matches[1661676] = {
            id: 1661676,
            uid: "1661676@zlypher.github.io",
            sequence: 1,
            start: "2026-09-20T15:00:00.000Z",
            end: "2026-09-20T20:00:00.000Z",
            summary: "Grand final: TBD vs TBD",
            status: null,
            leagueId: 4197,
        };

        // Incoming match has finalized summary "Grand final: G2 vs KC"
        updateMatchStore(store, [matchesFixture[0]], 4197);

        expect(store.matches[1661676].sequence).toBe(2);

        const cal = createCalendar(sampleLeague, store);
        const event = cal
            .events()
            .find((e) => String(e.id()) === "1661676@zlypher.github.io");

        expect(event).toBeDefined();
        expect(event?.sequence()).toBe(2);
        expect(event?.summary()).toBe("Grand final: G2 vs KC");
    });

    it("preserves sequence when match fields have not changed", () => {
        const store = createEmptyMatchStore();
        updateMatchStore(store, [matchesFixture[1]], 4197);
        expect(store.matches[1661677].sequence).toBe(1);

        // Second update with identical match data
        updateMatchStore(store, [matchesFixture[1]], 4197);
        expect(store.matches[1661677].sequence).toBe(1);

        const cal = createCalendar(sampleLeague, store);
        const event = cal
            .events()
            .find((e) => String(e.id()) === "1661677@zlypher.github.io");
        expect(event?.sequence()).toBe(1);
    });

    it("increments sequence when scheduled_at changes and updates calendar start time", () => {
        const store = createEmptyMatchStore();
        updateMatchStore(store, [matchesFixture[1]], 4197);
        expect(store.matches[1661677].sequence).toBe(1);

        const rescheduledMatch: PandaScoreMatch = {
            ...matchesFixture[1],
            scheduled_at: "2026-09-19T17:00:00Z",
        };

        updateMatchStore(store, [rescheduledMatch], 4197);
        expect(store.matches[1661677].sequence).toBe(2);

        const cal = createCalendar(sampleLeague, store);
        const event = cal
            .events()
            .find((e) => String(e.id()) === "1661677@zlypher.github.io");
        expect(event?.sequence()).toBe(2);
        const start = new Date(event?.start() as string | Date);
        expect(start.toISOString()).toBe("2026-09-19T17:00:00.000Z");
    });

    it("increments sequence when match duration / number of games changes", () => {
        const store = createEmptyMatchStore();
        updateMatchStore(store, [matchesFixture[1]], 4197);
        expect(store.matches[1661677].sequence).toBe(1);

        const durationChangedMatch: PandaScoreMatch = {
            ...matchesFixture[1],
            number_of_games: 3,
        };

        updateMatchStore(store, [durationChangedMatch], 4197);
        expect(store.matches[1661677].sequence).toBe(2);

        const cal = createCalendar(sampleLeague, store);
        const event = cal
            .events()
            .find((e) => String(e.id()) === "1661677@zlypher.github.io");
        expect(event?.sequence()).toBe(2);
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
