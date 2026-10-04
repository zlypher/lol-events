import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    createCalendar,
    generateAllCalendars,
    generateIcalCalendar,
} from "../lib/calendar-generator";
import { createEmptyMatchStore } from "../lib/match-store";
import PandaScore from "../lib/pandascore";
import type {
    MatchStore,
    PandaScoreLeague,
    PandaScoreMatch,
} from "../lib/types";
import rawLeaguesFixture from "./fixtures/pandascore-leagues.json" with { type: "json" };

describe("calendar-generator", () => {
    const referenceDate = new Date("2026-06-01T12:00:00Z");
    const leagues = rawLeaguesFixture as PandaScoreLeague[];
    const inactiveLeague = leagues.find((l) => l.name === "OPL")!;
    let testOutputDir: string;
    let testMatchStore: MatchStore;

    beforeEach(() => {
        testOutputDir = fs.mkdtempSync(
            path.join(os.tmpdir(), "lol-events-test-"),
        );
        testMatchStore = createEmptyMatchStore();
        vi.spyOn(PandaScore, "getGlobalMatches").mockResolvedValue([]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        fs.rmSync(testOutputDir, { recursive: true, force: true });
    });

    describe("createCalendar", () => {
        it("generates iCal from MatchStore entries matching league id", () => {
            const activeLeague = leagues.find((l) => l.name === "LEC")!;
            const store = createEmptyMatchStore();
            store.matches[123] = {
                id: 123,
                uid: "123@zlypher.github.io",
                sequence: 2,
                start: "2026-06-02T16:00:00.000Z",
                end: "2026-06-02T18:00:00.000Z",
                summary: "G2 vs FNC",
                status: null,
                leagueId: activeLeague.id,
            };
            store.matches[456] = {
                id: 456,
                uid: "456@zlypher.github.io",
                sequence: 1,
                start: "2026-06-02T20:00:00.000Z",
                end: "2026-06-02T22:00:00.000Z",
                summary: "Other League Match",
                status: null,
                leagueId: 99999,
            };

            const cal = createCalendar(activeLeague, store);
            expect(cal.events()).toHaveLength(1);
            expect(cal.events()[0].summary()).toBe("G2 vs FNC");
            expect(cal.events()[0].sequence()).toBe(2);
        });
    });

    describe("generateIcalCalendar", () => {
        it("logs inactive notice and does not write files for an inactive league", async () => {
            const consoleSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            await generateIcalCalendar(inactiveLeague, {
                referenceDate,
                outputDir: testOutputDir,
                matchStore: testMatchStore,
            });

            expect(consoleSpy).toHaveBeenCalledWith(
                `[${inactiveLeague.name}] (inactive) no matches fetched`,
            );
        });

        it("preserves existing calendar files intact for an inactive league", async () => {
            const icalPath = path.join(
                testOutputDir,
                `${inactiveLeague.slug}.ical`,
            );
            const jsonPath = path.join(
                testOutputDir,
                `${inactiveLeague.slug}.json`,
            );
            const existingIcalContent =
                "BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR";
            const existingJsonContent = JSON.stringify({
                name: inactiveLeague.name,
                events: [],
            });

            fs.writeFileSync(icalPath, existingIcalContent);
            fs.writeFileSync(jsonPath, existingJsonContent);

            await generateIcalCalendar(inactiveLeague, {
                referenceDate,
                outputDir: testOutputDir,
                matchStore: testMatchStore,
            });

            expect(fs.readFileSync(icalPath, "utf-8")).toBe(
                existingIcalContent,
            );
            expect(fs.readFileSync(jsonPath, "utf-8")).toBe(
                existingJsonContent,
            );
        });

        it("generates calendar files for an active league from the match store", async () => {
            const activeLeague = leagues.find((l) => l.name === "LEC")!;
            testMatchStore.matches[1661676] = {
                id: 1661676,
                uid: "1661676@zlypher.github.io",
                sequence: 1,
                start: "2026-09-20T15:00:00.000Z",
                end: "2026-09-20T20:00:00.000Z",
                summary: "Grand final: G2 vs KC",
                status: null,
                leagueId: activeLeague.id,
            };

            await generateIcalCalendar(activeLeague, {
                referenceDate,
                outputDir: testOutputDir,
                matchStore: testMatchStore,
            });

            const icalPath = path.join(
                testOutputDir,
                `${activeLeague.slug}.ical`,
            );
            const jsonPath = path.join(
                testOutputDir,
                `${activeLeague.slug}.json`,
            );

            expect(fs.existsSync(icalPath)).toBe(true);
            expect(fs.existsSync(jsonPath)).toBe(true);
            const json = JSON.parse(fs.readFileSync(jsonPath, "utf-8"));
            expect(json.events).toHaveLength(1);
            expect(json.events[0].summary).toBe("Grand final: G2 vs KC");
        });
    });

    describe("generateAllCalendars", () => {
        it("partitions leagues and only fetches matches for active leagues while logging inactive leagues", async () => {
            const consoleSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            // Pre-seed an inactive league calendar file to verify it stays intact
            const inactiveLeague1 = leagues.find((l) => l.name === "OPL")!;
            const preseededIcal = path.join(
                testOutputDir,
                `${inactiveLeague1.slug}.ical`,
            );
            const preseededJson = path.join(
                testOutputDir,
                `${inactiveLeague1.slug}.json`,
            );
            fs.writeFileSync(preseededIcal, "PRESERVED_ICAL");
            fs.writeFileSync(preseededJson, "PRESERVED_JSON");

            await generateAllCalendars(leagues, {
                referenceDate,
                outputDir: testOutputDir,
                concurrency: 2,
                matchStore: testMatchStore,
            });

            // Inactive leagues
            const inactiveLeagueNames = [
                "Prime League 1st Division",
                "OPL",
                "Empty Series League",
                "Null Dates Series League",
                "Missing Series League",
            ];

            // Verify global match endpoint was called with referenceDate
            expect(PandaScore.getGlobalMatches).toHaveBeenCalledTimes(1);
            expect(PandaScore.getGlobalMatches).toHaveBeenCalledWith({
                referenceDate,
            });

            // Verify inactive notices were logged
            for (const name of inactiveLeagueNames) {
                expect(consoleSpy).toHaveBeenCalledWith(
                    `[${name}] (inactive) no matches fetched`,
                );
            }

            // Verify active league files exist
            expect(
                fs.existsSync(
                    path.join(testOutputDir, "league-of-legends-lec.ical"),
                ),
            ).toBe(true);
            expect(
                fs.existsSync(
                    path.join(testOutputDir, "league-of-legends-lec.json"),
                ),
            ).toBe(true);
            expect(
                fs.existsSync(
                    path.join(testOutputDir, "league-of-legends-lcs.ical"),
                ),
            ).toBe(true);
            expect(
                fs.existsSync(
                    path.join(testOutputDir, "league-of-legends-lcs.json"),
                ),
            ).toBe(true);

            // Verify preseeded inactive league files remain untouched
            expect(fs.readFileSync(preseededIcal, "utf-8")).toBe(
                "PRESERVED_ICAL",
            );
            expect(fs.readFileSync(preseededJson, "utf-8")).toBe(
                "PRESERVED_JSON",
            );

            // Verify inactive leagues without preseeded files had NO files created
            expect(
                fs.existsSync(
                    path.join(
                        testOutputDir,
                        "league-of-legends-prime-league-pro-division.ical",
                    ),
                ),
            ).toBe(false);
        });

        it("correctly routes grouped global matches into individual league calendars via match store", async () => {
            const mockMatches: PandaScoreMatch[] = [
                {
                    id: 101,
                    name: "LEC Game: G2 vs FNC",
                    begin_at: "2026-06-02T16:00:00Z",
                    number_of_games: 1,
                    status: "not_started",
                    opponents: [
                        { opponent: { id: 1, name: "G2 Esports" } },
                        { opponent: { id: 2, name: "Fnatic" } },
                    ],
                    league: {
                        id: 4197,
                        name: "LEC",
                        slug: "league-of-legends-lec",
                        image_url: null,
                        url: null,
                    },
                },
                {
                    id: 102,
                    name: "LCS Game: C9 vs TL",
                    begin_at: "2026-06-02T20:00:00Z",
                    number_of_games: 1,
                    status: "not_started",
                    opponents: [
                        { opponent: { id: 3, name: "Cloud9" } },
                        { opponent: { id: 4, name: "Team Liquid" } },
                    ],
                    league: {
                        id: 4198,
                        name: "LCS",
                        slug: "league-of-legends-lcs",
                        image_url: null,
                        url: null,
                    },
                },
            ];

            vi.spyOn(PandaScore, "getGlobalMatches").mockResolvedValue(
                mockMatches,
            );

            await generateAllCalendars(leagues, {
                referenceDate,
                outputDir: testOutputDir,
                matchStore: testMatchStore,
            });

            const lecJson = JSON.parse(
                fs.readFileSync(
                    path.join(testOutputDir, "league-of-legends-lec.json"),
                    "utf-8",
                ),
            );
            const lcsJson = JSON.parse(
                fs.readFileSync(
                    path.join(testOutputDir, "league-of-legends-lcs.json"),
                    "utf-8",
                ),
            );

            expect(lecJson.events).toHaveLength(1);
            expect(lecJson.events[0].summary).toBe("LEC Game: G2 vs FNC");
            expect(lcsJson.events).toHaveLength(1);
            expect(lcsJson.events[0].summary).toBe("LCS Game: C9 vs TL");

            // Verify matches are in the store
            expect(testMatchStore.matches[101]).toBeDefined();
            expect(testMatchStore.matches[102]).toBeDefined();
        });

        it("does not query global matches when there are zero active leagues", async () => {
            const inactiveLeagues = [inactiveLeague];

            await generateAllCalendars(inactiveLeagues, {
                referenceDate,
                outputDir: testOutputDir,
                matchStore: testMatchStore,
            });

            expect(PandaScore.getGlobalMatches).not.toHaveBeenCalled();
        });
    });
});
