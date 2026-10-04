import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
    createEmptyMatchStore,
    extractActiveTeamsFromMatchStore,
    getMatchesForLeague,
    getMatchesForTeam,
    getWindowStartTime,
    loadMatchStore,
    saveMatchStore,
    seedMatchStoreFromCalendars,
    updateMatchStore,
} from "../lib/match-store";
import type { PandaScoreMatch } from "../lib/types";

describe("match-store seeding", () => {
    it("seeds existing match IDs, sequence numbers, start, end, and summary from calendar JSON files", () => {
        const fixtureDir = path.resolve(__dirname, "fixtures/sample-cals");
        fs.mkdirSync(fixtureDir, { recursive: true });

        const sampleCal = {
            domain: "zlypher.github.io",
            prodId: "//Zlypher//LOL Events//EN",
            name: "LEC",
            timezone: "UTC",
            events: [
                {
                    id: 1661676,
                    uid: "1661676@zlypher.github.io",
                    sequence: 1,
                    start: "2026-09-20T15:00:00.000Z",
                    end: "2026-09-20T20:00:00.000Z",
                    summary: "Grand final: TBD vs TBD",
                },
                {
                    id: "1661677@zlypher.github.io",
                    uid: "1661677@zlypher.github.io",
                    sequence: 3,
                    start: "2026-09-19T15:09:22.000Z",
                    end: "2026-09-19T20:09:22.000Z",
                    summary: "Lower bracket final: KC vs MKOI",
                },
            ],
        };

        fs.writeFileSync(
            path.join(fixtureDir, "lec.json"),
            JSON.stringify(sampleCal),
        );

        const store = seedMatchStoreFromCalendars(fixtureDir);

        expect(store.matches[1661676]).toEqual({
            id: 1661676,
            uid: "1661676@zlypher.github.io",
            sequence: 1,
            start: "2026-09-20T15:00:00.000Z",
            end: "2026-09-20T20:00:00.000Z",
            summary: "Grand final: TBD vs TBD",
            status: null,
        });

        expect(store.matches[1661677]).toEqual({
            id: 1661677,
            uid: "1661677@zlypher.github.io",
            sequence: 3,
            start: "2026-09-19T15:09:22.000Z",
            end: "2026-09-19T20:09:22.000Z",
            summary: "Lower bracket final: KC vs MKOI",
            status: null,
        });

        // Cleanup
        fs.rmSync(fixtureDir, { recursive: true, force: true });
    });

    describe("loadMatchStore and saveMatchStore", () => {
        it("saves and loads the store to/from disk", () => {
            const tempDir = path.resolve(__dirname, "temp-store-test");
            const tempFile = path.join(tempDir, "matches.json");

            const initialStore = {
                version: 1,
                generatedAt: "2026-10-03T20:00:00.000Z",
                matches: {
                    123: {
                        id: 123,
                        uid: "123@zlypher.github.io",
                        sequence: 1,
                        start: "2026-10-04T12:00:00.000Z",
                        end: "2026-10-04T14:00:00.000Z",
                        summary: "Team A vs Team B",
                        status: null,
                    },
                },
            };

            saveMatchStore(initialStore, tempFile);

            expect(fs.existsSync(tempFile)).toBe(true);

            const loadedStore = loadMatchStore(tempFile);
            expect(loadedStore).toEqual(initialStore);

            fs.rmSync(tempDir, { recursive: true, force: true });
        });

        it("returns empty store if file does not exist", () => {
            const store = loadMatchStore("./non-existent-matches.json");
            expect(store.version).toBe(1);
            expect(store.matches).toEqual({});
        });
    });

    describe("updateMatchStore", () => {
        it("inserts new match using scheduled_at as start time with sequence 1", () => {
            const store = createEmptyMatchStore();
            const match: PandaScoreMatch = {
                id: 100,
                name: "G2 vs FNC",
                begin_at: "2026-10-10T15:30:00Z",
                scheduled_at: "2026-10-10T15:00:00Z",
                number_of_games: 3,
                status: "not_started",
                opponents: [
                    { opponent: { id: 1, name: "G2" } },
                    { opponent: { id: 2, name: "FNC" } },
                ],
                league: {
                    id: 4198,
                    name: "LEC",
                    slug: "lec",
                    image_url: null,
                    url: null,
                },
            };

            updateMatchStore(store, [match]);

            expect(store.matches[100]).toEqual({
                id: 100,
                uid: "100@zlypher.github.io",
                sequence: 1,
                start: new Date("2026-10-10T15:00:00Z").toISOString(),
                end: new Date("2026-10-10T18:00:00Z").toISOString(),
                summary: "G2 vs FNC",
                status: null,
                leagueId: 4198,
                leagueName: "LEC",
                opponents: [
                    { id: 1, name: "G2" },
                    { id: 2, name: "FNC" },
                ],
            });
        });

        it("preserves sequence when match fields are identical", () => {
            const store = createEmptyMatchStore();
            const match: PandaScoreMatch = {
                id: 100,
                name: "G2 vs FNC",
                begin_at: null,
                scheduled_at: "2026-10-10T15:00:00Z",
                number_of_games: 3,
                status: "not_started",
                opponents: [],
            };

            // First update
            updateMatchStore(store, [match]);
            expect(store.matches[100].sequence).toBe(1);

            // Second update with same data
            updateMatchStore(store, [match]);
            expect(store.matches[100].sequence).toBe(1);
        });

        it("increments sequence monotonically when scheduled_at changes", () => {
            const store = createEmptyMatchStore();
            const match: PandaScoreMatch = {
                id: 100,
                name: "G2 vs FNC",
                begin_at: null,
                scheduled_at: "2026-10-10T15:00:00Z",
                number_of_games: 3,
                status: "not_started",
                opponents: [],
            };

            updateMatchStore(store, [match]);
            expect(store.matches[100].sequence).toBe(1);

            // Rescheduled to 17:00
            const rescheduled: PandaScoreMatch = {
                ...match,
                scheduled_at: "2026-10-10T17:00:00Z",
            };

            updateMatchStore(store, [rescheduled]);
            expect(store.matches[100].sequence).toBe(2);
            expect(store.matches[100].start).toBe(
                new Date("2026-10-10T17:00:00Z").toISOString(),
            );
        });

        it("increments sequence when summary changes", () => {
            const store = createEmptyMatchStore();
            const match: PandaScoreMatch = {
                id: 100,
                name: "TBD vs TBD",
                begin_at: null,
                scheduled_at: "2026-10-10T15:00:00Z",
                number_of_games: 3,
                status: "not_started",
                opponents: [],
            };

            updateMatchStore(store, [match]);
            expect(store.matches[100].sequence).toBe(1);

            const updatedSummary: PandaScoreMatch = {
                ...match,
                name: "G2 vs FNC",
            };

            updateMatchStore(store, [updatedSummary]);
            expect(store.matches[100].sequence).toBe(2);
            expect(store.matches[100].summary).toBe("G2 vs FNC");
        });

        it("increments sequence when duration / number of games changes", () => {
            const store = createEmptyMatchStore();
            const match: PandaScoreMatch = {
                id: 100,
                name: "G2 vs FNC",
                begin_at: null,
                scheduled_at: "2026-10-10T15:00:00Z",
                number_of_games: 3,
                status: "not_started",
                opponents: [],
            };

            updateMatchStore(store, [match]);
            expect(store.matches[100].sequence).toBe(1);

            const changedDuration: PandaScoreMatch = {
                ...match,
                number_of_games: 5,
            };

            updateMatchStore(store, [changedDuration]);
            expect(store.matches[100].sequence).toBe(2);
            expect(store.matches[100].end).toBe(
                new Date("2026-10-10T20:00:00Z").toISOString(),
            );
        });

        it("marks canceled matches with STATUS:CANCELLED and increments sequence", () => {
            const store = createEmptyMatchStore();
            const match: PandaScoreMatch = {
                id: 100,
                name: "G2 vs FNC",
                begin_at: null,
                scheduled_at: "2026-10-10T15:00:00Z",
                number_of_games: 3,
                status: "not_started",
                opponents: [],
            };

            updateMatchStore(store, [match]);
            expect(store.matches[100].sequence).toBe(1);
            expect(store.matches[100].status).toBeNull();

            const canceledMatch: PandaScoreMatch = {
                ...match,
                status: "canceled",
            };

            updateMatchStore(store, [canceledMatch]);
            expect(store.matches[100].sequence).toBe(2);
            expect(store.matches[100].status).toBe("CANCELLED");
        });

        it("marks postponed match without announced time as STATUS:CANCELLED and preserves existing start", () => {
            const store = createEmptyMatchStore();
            const match: PandaScoreMatch = {
                id: 100,
                name: "G2 vs FNC",
                begin_at: null,
                scheduled_at: "2026-10-10T15:00:00Z",
                number_of_games: 3,
                status: "not_started",
                opponents: [],
            };

            updateMatchStore(store, [match]);
            const originalStart = store.matches[100].start;

            // Postponed without new scheduled time (scheduled_at becomes null or empty)
            const postponedMatch: PandaScoreMatch = {
                ...match,
                scheduled_at: null,
                begin_at: null,
                status: "postponed",
            };

            updateMatchStore(store, [postponedMatch]);
            expect(store.matches[100].sequence).toBe(2);
            expect(store.matches[100].status).toBe("CANCELLED");
            expect(store.matches[100].start).toBe(originalStart);
        });

        it("increments sequence when opponents change", () => {
            const store = createEmptyMatchStore();
            const match: PandaScoreMatch = {
                id: 100,
                name: "TBD vs TBD",
                begin_at: null,
                scheduled_at: "2026-10-10T15:00:00Z",
                number_of_games: 3,
                status: "not_started",
                opponents: [
                    { opponent: { id: 1, name: "Team 1" } },
                    { opponent: { id: 2, name: "Team 2" } },
                ],
            };

            updateMatchStore(store, [match]);
            expect(store.matches[100].sequence).toBe(1);

            const changedOpponents: PandaScoreMatch = {
                ...match,
                opponents: [
                    { opponent: { id: 1, name: "Team 1" } },
                    { opponent: { id: 3, name: "Team 3" } },
                ],
            };

            updateMatchStore(store, [changedOpponents]);
            expect(store.matches[100].sequence).toBe(2);
            expect(store.matches[100].opponents).toEqual([
                { id: 1, name: "Team 1" },
                { id: 3, name: "Team 3" },
            ]);
        });

        it("does not increment sequence when opponents are identical", () => {
            const store = createEmptyMatchStore();
            const match: PandaScoreMatch = {
                id: 100,
                name: "G2 vs FNC",
                begin_at: null,
                scheduled_at: "2026-10-10T15:00:00Z",
                number_of_games: 3,
                status: "not_started",
                opponents: [
                    { opponent: { id: 1, name: "G2" } },
                    { opponent: { id: 2, name: "FNC" } },
                ],
            };

            updateMatchStore(store, [match]);
            expect(store.matches[100].sequence).toBe(1);

            // Re-run with same opponents in different order
            const sameOpponents: PandaScoreMatch = {
                ...match,
                opponents: [
                    { opponent: { id: 2, name: "FNC" } },
                    { opponent: { id: 1, name: "G2" } },
                ],
            };

            updateMatchStore(store, [sameOpponents]);
            expect(store.matches[100].sequence).toBe(1);
        });
    });

    describe("getMatchesForLeague", () => {
        it("returns only matches matching the specified leagueId", () => {
            const store = createEmptyMatchStore();
            store.matches[1] = {
                id: 1,
                uid: "1@zlypher.github.io",
                sequence: 1,
                start: "2026-10-10T15:00:00Z",
                end: "2026-10-10T18:00:00Z",
                summary: "LEC Match",
                status: null,
                leagueId: 4197,
            };
            store.matches[2] = {
                id: 2,
                uid: "2@zlypher.github.io",
                sequence: 1,
                start: "2026-10-10T19:00:00Z",
                end: "2026-10-10T22:00:00Z",
                summary: "LCS Match",
                status: null,
                leagueId: 4198,
            };

            const lecMatches = getMatchesForLeague(store, 4197);
            expect(lecMatches).toHaveLength(1);
            expect(lecMatches[0].name).toBe("LEC Match");

            const lcsMatches = getMatchesForLeague(store, 4198);
            expect(lcsMatches).toHaveLength(1);
            expect(lcsMatches[0].name).toBe("LCS Match");

            const unknownMatches = getMatchesForLeague(store, 9999);
            expect(unknownMatches).toHaveLength(0);
        });
    });

    describe("getWindowStartTime", () => {
        it("calculates window start time correctly for specified referenceDate and windowDays", () => {
            const refDate = new Date("2026-06-30T12:00:00.000Z");
            const windowStart = getWindowStartTime(refDate, 30);
            expect(windowStart.toISOString()).toBe("2026-05-31T12:00:00.000Z");
        });
    });

    describe("getMatchesForTeam", () => {
        it("filters matches where the team participated and prefixes league tag to summary", () => {
            const store = createEmptyMatchStore();
            store.matches[1] = {
                id: 1,
                uid: "1@zlypher.github.io",
                sequence: 1,
                start: "2026-06-15T15:00:00Z",
                end: "2026-06-15T18:00:00Z",
                summary: "T1 vs GEN",
                status: null,
                leagueId: 4198,
                leagueName: "LCK",
                opponents: [
                    { id: 10, name: "T1" },
                    { id: 20, name: "GEN" },
                ],
            };
            store.matches[2] = {
                id: 2,
                uid: "2@zlypher.github.io",
                sequence: 1,
                start: "2026-06-16T15:00:00Z",
                end: "2026-06-16T18:00:00Z",
                summary: "G2 vs FNC",
                status: null,
                leagueId: 4197,
                leagueName: "LEC",
                opponents: [
                    { id: 30, name: "G2" },
                    { id: 40, name: "FNC" },
                ],
            };

            const t1Matches = getMatchesForTeam(store, 10);
            expect(t1Matches).toHaveLength(1);
            expect(t1Matches[0].id).toBe(1);
            expect(t1Matches[0].name).toBe("[LCK] T1 vs GEN");

            const genMatches = getMatchesForTeam(store, 20);
            expect(genMatches).toHaveLength(1);
            expect(genMatches[0].name).toBe("[LCK] T1 vs GEN");

            const unrelated = getMatchesForTeam(store, 999);
            expect(unrelated).toHaveLength(0);
        });

        it("does not double-prefix if summary already has league tag", () => {
            const store = createEmptyMatchStore();
            store.matches[1] = {
                id: 1,
                uid: "1@zlypher.github.io",
                sequence: 1,
                start: "2026-06-15T15:00:00Z",
                end: "2026-06-15T18:00:00Z",
                summary: "[LCK] T1 vs GEN",
                status: null,
                leagueName: "LCK",
                opponents: [{ id: 10, name: "T1" }],
            };

            const matches = getMatchesForTeam(store, 10);
            expect(matches[0].name).toBe("[LCK] T1 vs GEN");
        });

        it("filters out matches older than windowDays when window is specified", () => {
            const store = createEmptyMatchStore();
            const refDate = new Date("2026-06-30T12:00:00.000Z");

            // Match within 30 days (June 15)
            store.matches[1] = {
                id: 1,
                uid: "1@zlypher.github.io",
                sequence: 1,
                start: "2026-06-15T15:00:00Z",
                end: "2026-06-15T18:00:00Z",
                summary: "T1 vs GEN",
                status: null,
                leagueName: "LCK",
                opponents: [{ id: 10, name: "T1" }],
            };
            // Match older than 30 days (May 1)
            store.matches[2] = {
                id: 2,
                uid: "2@zlypher.github.io",
                sequence: 1,
                start: "2026-05-01T15:00:00Z",
                end: "2026-05-01T18:00:00Z",
                summary: "T1 vs KT",
                status: null,
                leagueName: "LCK",
                opponents: [{ id: 10, name: "T1" }],
            };

            const matchesInWindow = getMatchesForTeam(store, 10, {
                referenceDate: refDate,
                windowDays: 30,
            });
            expect(matchesInWindow).toHaveLength(1);
            expect(matchesInWindow[0].id).toBe(1);

            const allMatches = getMatchesForTeam(store, 10);
            expect(allMatches).toHaveLength(2);
        });
    });

    describe("extractActiveTeamsFromMatchStore", () => {
        it("extracts active teams with matches in 30-day window and sorts them alphabetically", () => {
            const store = createEmptyMatchStore();
            const refDate = new Date("2026-06-30T12:00:00.000Z");

            // Active match (June 10)
            store.matches[1] = {
                id: 1,
                uid: "1@zlypher.github.io",
                sequence: 1,
                start: "2026-06-10T15:00:00Z",
                end: "2026-06-10T18:00:00Z",
                summary: "T1 vs Gen.G",
                status: null,
                opponents: [
                    {
                        id: 10,
                        name: "T1",
                        slug: "t1",
                        acronym: "T1",
                        imageUrl: "https://example.com/t1.png",
                    },
                    {
                        id: 20,
                        name: "Gen.G",
                        slug: "gen-g",
                        acronym: "GEN",
                        imageUrl: "https://example.com/gen.png",
                    },
                ],
            };

            // Inactive match outside 30 days (April 10)
            store.matches[2] = {
                id: 2,
                uid: "2@zlypher.github.io",
                sequence: 1,
                start: "2026-04-10T15:00:00Z",
                end: "2026-04-10T18:00:00Z",
                summary: "Old Team A vs Old Team B",
                status: null,
                opponents: [
                    { id: 99, name: "Old Team A" },
                    { id: 98, name: "Old Team B" },
                ],
            };

            const activeTeams = extractActiveTeamsFromMatchStore(
                store,
                refDate,
                30,
            );

            expect(activeTeams).toHaveLength(2);
            // Alphabetical: Gen.G before T1
            expect(activeTeams[0]).toEqual({
                id: 20,
                name: "Gen.G",
                slug: "gen-g",
                acronym: "GEN",
                imageUrl: "https://example.com/gen.png",
            });
            expect(activeTeams[1]).toEqual({
                id: 10,
                name: "T1",
                slug: "t1",
                acronym: "T1",
                imageUrl: "https://example.com/t1.png",
            });
        });
    });
});
