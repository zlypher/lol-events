import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    generateAllCalendars,
    generateIcalCalendar,
} from "../lib/calendar-generator";
import PandaScore from "../lib/pandascore";
import type { PandaScoreLeague, PandaScoreMatch } from "../lib/types";
import rawLeaguesFixture from "./fixtures/pandascore-leagues.json" with { type: "json" };

describe("calendar-generator", () => {
    const referenceDate = new Date("2026-06-01T12:00:00Z");
    const leagues = rawLeaguesFixture as PandaScoreLeague[];
    const inactiveLeague = leagues.find((l) => l.name === "OPL")!;
    let testOutputDir: string;

    beforeEach(() => {
        testOutputDir = fs.mkdtempSync(
            path.join(os.tmpdir(), "lol-events-test-"),
        );
        vi.spyOn(PandaScore, "getPastMatches").mockResolvedValue([]);
        vi.spyOn(PandaScore, "getRunningMatches").mockResolvedValue([]);
        vi.spyOn(PandaScore, "getUpcomingMatches").mockResolvedValue([]);
        vi.spyOn(PandaScore, "getGlobalMatches").mockResolvedValue([]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        fs.rmSync(testOutputDir, { recursive: true, force: true });
    });

    describe("generateIcalCalendar", () => {
        it("skips match queries, logs inactive notice, and does not write files for an inactive league", async () => {
            const consoleSpy = vi
                .spyOn(console, "log")
                .mockImplementation(() => {});

            await generateIcalCalendar(inactiveLeague, {
                referenceDate,
                outputDir: testOutputDir,
            });

            expect(PandaScore.getPastMatches).not.toHaveBeenCalled();
            expect(PandaScore.getRunningMatches).not.toHaveBeenCalled();
            expect(PandaScore.getUpcomingMatches).not.toHaveBeenCalled();
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
            });

            expect(fs.readFileSync(icalPath, "utf-8")).toBe(
                existingIcalContent,
            );
            expect(fs.readFileSync(jsonPath, "utf-8")).toBe(
                existingJsonContent,
            );
        });

        it("fetches matches and generates calendar files for an active league", async () => {
            const activeLeague = leagues.find((l) => l.name === "LEC")!;

            await generateIcalCalendar(activeLeague, {
                referenceDate,
                outputDir: testOutputDir,
            });

            expect(PandaScore.getPastMatches).toHaveBeenCalledWith(
                activeLeague.id,
                { page: 1, per_page: 20 },
            );
            expect(PandaScore.getRunningMatches).toHaveBeenCalledWith(
                activeLeague.id,
            );
            expect(PandaScore.getUpcomingMatches).toHaveBeenCalledWith(
                activeLeague.id,
            );

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

            // Verify individual league match endpoints are NO LONGER called during generateAllCalendars
            expect(PandaScore.getPastMatches).not.toHaveBeenCalled();
            expect(PandaScore.getRunningMatches).not.toHaveBeenCalled();
            expect(PandaScore.getUpcomingMatches).not.toHaveBeenCalled();

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

        it("correctly routes grouped global matches into individual league calendars", async () => {
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
        });
    });
});
