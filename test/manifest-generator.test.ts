import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
    createLeagueManifestItem,
    createTeamManifestItem,
    generateLeaguesManifest,
    generateTeamsManifest,
    loadLeaguesManifest,
    loadTeamsManifest,
    serializeLeaguesManifest,
    serializeTeamsManifest,
    syncManifestsAndStore,
} from "../lib/manifest-generator";
import { createEmptyMatchStore } from "../lib/match-store";
import PandaScore from "../lib/pandascore";
import type { PandaScoreLeague, PandaScoreMatch, TeamInfo } from "../lib/types";

describe("manifest-generator", () => {
    describe("generateLeaguesManifest - mapping and sorting", () => {
        it("maps leagues to manifest items with canonical URLs and sorts them alphabetically by name", () => {
            const leagues: PandaScoreLeague[] = [
                {
                    id: 4197,
                    name: "LEC",
                    slug: "league-of-legends-lec",
                    image_url: "https://example.com/lec.png",
                    url: "https://lolesports.com",
                    series: [],
                },
                {
                    id: 4198,
                    name: "CBLOL",
                    slug: "league-of-legends-cblol",
                    image_url: "https://example.com/cblol.png",
                    url: "https://cblol.com",
                    series: [],
                },
            ];

            const manifest = generateLeaguesManifest(leagues);

            expect(manifest.leagues).toHaveLength(2);
            // CBLOL before LEC
            expect(manifest.leagues[0]).toEqual({
                id: 4198,
                name: "CBLOL",
                slug: "league-of-legends-cblol",
                logoUrl: "https://example.com/cblol.png",
                url: "https://cblol.com",
                calendarUrl:
                    "https://zlypher.github.io/lol-events/cal/league-of-legends-cblol.ical",
                jsonUrl:
                    "https://zlypher.github.io/lol-events/cal/league-of-legends-cblol.json",
                active: false,
            });
            expect(manifest.leagues[1]).toEqual({
                id: 4197,
                name: "LEC",
                slug: "league-of-legends-lec",
                logoUrl: "https://example.com/lec.png",
                url: "https://lolesports.com",
                calendarUrl:
                    "https://zlypher.github.io/lol-events/cal/league-of-legends-lec.ical",
                jsonUrl:
                    "https://zlypher.github.io/lol-events/cal/league-of-legends-lec.json",
                active: false,
            });
        });
    });

    describe("generateLeaguesManifest - activity classification", () => {
        it("correctly identifies active and inactive leagues based on series and reference date", () => {
            const activeLeague: PandaScoreLeague = {
                id: 1,
                name: "Active League",
                slug: "active-league",
                image_url: null,
                url: null,
                series: [
                    {
                        id: 101,
                        league_id: 1,
                        name: "Summer 2026",
                        slug: "summer-2026",
                        season: "Summer",
                        year: 2026,
                        begin_at: "2026-06-15T15:00:00Z",
                        end_at: "2026-08-30T21:00:00Z",
                        modified_at: "2026-06-01T10:00:00Z",
                        full_name: "Summer 2026",
                    },
                ],
            };

            const dormantLeague: PandaScoreLeague = {
                id: 2,
                name: "Dormant League",
                slug: "dormant-league",
                image_url: null,
                url: null,
                series: [
                    {
                        id: 102,
                        league_id: 2,
                        name: "Winter 2020",
                        slug: "winter-2020",
                        season: "Winter",
                        year: 2020,
                        begin_at: "2020-01-10T16:00:00Z",
                        end_at: "2020-02-28T21:00:00Z",
                        modified_at: "2020-03-01T00:00:00Z",
                        full_name: "Winter 2020",
                    },
                ],
            };

            const referenceDate = new Date("2026-06-01T12:00:00Z");
            const manifest = generateLeaguesManifest(
                [activeLeague, dormantLeague],
                { referenceDate },
            );

            const activeItem = manifest.leagues.find(
                (l) => l.slug === "active-league",
            );
            const dormantItem = manifest.leagues.find(
                (l) => l.slug === "dormant-league",
            );

            expect(activeItem?.active).toBe(true);
            expect(dormantItem?.active).toBe(false);
        });

        it("partitions fixture leagues accurately into active and inactive status", async () => {
            const rawLeagues = (await import(
                "./fixtures/pandascore-leagues.json",
                { with: { type: "json" } }
            )) as { default: PandaScoreLeague[] };

            const referenceDate = new Date("2026-06-01T12:00:00Z");
            const manifest = generateLeaguesManifest(rawLeagues.default, {
                referenceDate,
            });

            const activeSlugs = manifest.leagues
                .filter((l) => l.active)
                .map((l) => l.slug);
            const inactiveSlugs = manifest.leagues
                .filter((l) => !l.active)
                .map((l) => l.slug);

            expect(activeSlugs).toEqual([
                "league-of-legends-lcs",
                "league-of-legends-lec",
            ]);
            expect(inactiveSlugs).toContain("league-of-legends-opl");
            expect(inactiveSlugs).toContain(
                "league-of-legends-prime-league-pro-division",
            );
            expect(inactiveSlugs).toContain("empty-series-league");
            expect(inactiveSlugs).toContain("null-dates-series-league");
            expect(inactiveSlugs).toContain("missing-series-league");
        });
    });

    describe("createLeagueManifestItem - edge cases and fallbacks", () => {
        it("normalizes undefined, null, or empty string image_url and url to null", () => {
            const leagueWithUndefined = {
                id: 10,
                name: "League Undefined",
                slug: "league-undefined",
                // image_url and url omitted / undefined
            } as unknown as PandaScoreLeague;

            const leagueWithEmptyStrings: PandaScoreLeague = {
                id: 11,
                name: "League Empty Strings",
                slug: "league-empty",
                image_url: "",
                url: "   ",
            };

            const itemUndefined = createLeagueManifestItem(leagueWithUndefined);
            const itemEmpty = createLeagueManifestItem(leagueWithEmptyStrings);

            expect(itemUndefined.logoUrl).toBeNull();
            expect(itemUndefined.url).toBeNull();

            expect(itemEmpty.logoUrl).toBeNull();
            expect(itemEmpty.url).toBeNull();
        });
    });

    describe("generateLeaguesManifest - envelope and options", () => {
        it("records referenceDate as ISO 8601 string in generatedAt and supports custom baseUrl", () => {
            const league: PandaScoreLeague = {
                id: 1,
                name: "LEC",
                slug: "league-of-legends-lec",
                image_url: "https://example.com/lec.png",
                url: "https://lolesports.com",
                series: [],
            };

            const fixedDate = new Date("2026-05-15T08:30:00.000Z");
            const customBaseUrl = "https://example.com/custom-cal";

            const manifest = generateLeaguesManifest([league], {
                referenceDate: fixedDate,
                baseUrl: customBaseUrl,
            });

            expect(manifest.generatedAt).toBe("2026-05-15T08:30:00.000Z");
            expect(manifest.leagues[0].calendarUrl).toBe(
                "https://example.com/custom-cal/league-of-legends-lec.ical",
            );
            expect(manifest.leagues[0].jsonUrl).toBe(
                "https://example.com/custom-cal/league-of-legends-lec.json",
            );
        });

        it("serializes manifest to formatted JSON string", () => {
            const league: PandaScoreLeague = {
                id: 1,
                name: "LEC",
                slug: "league-of-legends-lec",
                image_url: null,
                url: null,
                series: [],
            };

            const fixedDate = new Date("2026-01-01T00:00:00.000Z");
            const manifest = generateLeaguesManifest([league], {
                referenceDate: fixedDate,
            });

            const serialized = serializeLeaguesManifest(manifest);
            expect(typeof serialized).toBe("string");

            const parsed = JSON.parse(serialized);
            expect(parsed).toEqual(manifest);
            expect(serialized).toContain(
                '  "generatedAt": "2026-01-01T00:00:00.000Z"',
            );
        });

        it("accepts string and numeric timestamp representations for referenceDate", () => {
            const league: PandaScoreLeague = {
                id: 1,
                name: "LEC",
                slug: "league-of-legends-lec",
                image_url: null,
                url: null,
                series: [],
            };

            const isoString = "2026-07-20T18:00:00.000Z";
            const epochMs = Date.parse(isoString);

            const manifestFromString = generateLeaguesManifest([league], {
                referenceDate: isoString,
            });
            const manifestFromEpoch = generateLeaguesManifest([league], {
                referenceDate: epochMs,
            });

            expect(manifestFromString.generatedAt).toBe(isoString);
            expect(manifestFromEpoch.generatedAt).toBe(isoString);
        });

        it("filters manifest items by active or inactive status when filter option is provided", async () => {
            const rawLeagues = (await import(
                "./fixtures/pandascore-leagues.json",
                { with: { type: "json" } }
            )) as { default: PandaScoreLeague[] };

            const referenceDate = new Date("2026-06-01T12:00:00Z");

            const activeManifest = generateLeaguesManifest(rawLeagues.default, {
                referenceDate,
                filter: "active",
            });
            const inactiveManifest = generateLeaguesManifest(
                rawLeagues.default,
                {
                    referenceDate,
                    filter: "inactive",
                },
            );

            expect(activeManifest.leagues).toHaveLength(2);
            expect(activeManifest.leagues.every((l) => l.active)).toBe(true);

            expect(inactiveManifest.leagues).toHaveLength(5);
            expect(inactiveManifest.leagues.every((l) => !l.active)).toBe(true);
        });
    });

    describe("createTeamManifestItem", () => {
        it("creates manifest item with canonical team URLs and numeric ID", () => {
            const team: TeamInfo = {
                id: 1533,
                name: "T1",
                slug: "t1",
                acronym: "T1",
                imageUrl: "https://example.com/t1.png",
            };

            const item = createTeamManifestItem(team);

            expect(item).toEqual({
                id: 1533,
                name: "T1",
                slug: "t1",
                acronym: "T1",
                logoUrl: "https://example.com/t1.png",
                calendarUrl:
                    "https://zlypher.github.io/lol-events/cal/team/1533.ical",
                jsonUrl:
                    "https://zlypher.github.io/lol-events/cal/team/1533.json",
            });
        });

        it("normalizes empty or undefined optional fields to null", () => {
            const team: TeamInfo = {
                id: 10,
                name: "Unknown Team",
                acronym: "   ",
                imageUrl: "",
            };

            const item = createTeamManifestItem(team);
            expect(item.acronym).toBeNull();
            expect(item.logoUrl).toBeNull();
            expect(item.slug).toBe("");
        });

        it("supports custom baseUrl", () => {
            const team: TeamInfo = {
                id: 123,
                name: "Custom Team",
            };

            const item = createTeamManifestItem(team, {
                baseUrl: "https://custom.org/events",
            });
            expect(item.calendarUrl).toBe(
                "https://custom.org/events/team/123.ical",
            );
            expect(item.jsonUrl).toBe(
                "https://custom.org/events/team/123.json",
            );
        });
    });

    describe("generateTeamsManifest and serializeTeamsManifest", () => {
        it("sorts teams alphabetically by name and serializes properly", () => {
            const teams: TeamInfo[] = [
                { id: 2, name: "Gen.G", slug: "gen-g" },
                { id: 1, name: "Cloud9", slug: "c9" },
                { id: 3, name: "T1", slug: "t1" },
            ];

            const refDate = new Date("2026-06-15T10:00:00.000Z");
            const manifest = generateTeamsManifest(teams, {
                referenceDate: refDate,
            });

            expect(manifest.generatedAt).toBe("2026-06-15T10:00:00.000Z");
            expect(manifest.teams).toHaveLength(3);
            expect(manifest.teams[0].name).toBe("Cloud9");
            expect(manifest.teams[1].name).toBe("Gen.G");
            expect(manifest.teams[2].name).toBe("T1");

            const serialized = serializeTeamsManifest(manifest);
            const parsed = JSON.parse(serialized);
            expect(parsed).toEqual(manifest);
        });
    });

    describe("loadLeaguesManifest and loadTeamsManifest", () => {
        it("returns null if file does not exist or is invalid JSON", () => {
            expect(
                loadLeaguesManifest("./non-existent-leagues.json"),
            ).toBeNull();
            expect(loadTeamsManifest("./non-existent-teams.json")).toBeNull();
        });

        it("loads and parses existing manifest files accurately", () => {
            const tmpDir = fs.mkdtempSync(
                path.join(os.tmpdir(), "lol-events-load-manifest-"),
            );
            const leaguesPath = path.join(tmpDir, "leagues.json");
            const teamsPath = path.join(tmpDir, "teams.json");

            const leaguesData = {
                generatedAt: "2026-06-01T00:00:00.000Z",
                leagues: [],
            };
            const teamsData = {
                generatedAt: "2026-06-01T00:00:00.000Z",
                teams: [],
            };

            fs.writeFileSync(leaguesPath, JSON.stringify(leaguesData));
            fs.writeFileSync(teamsPath, JSON.stringify(teamsData));

            try {
                expect(loadLeaguesManifest(leaguesPath)).toEqual(leaguesData);
                expect(loadTeamsManifest(teamsPath)).toEqual(teamsData);
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });
    });

    describe("syncManifestsAndStore", () => {
        const referenceDate = new Date("2026-06-01T12:00:00Z");

        const activeLeague: PandaScoreLeague = {
            id: 4197,
            name: "LEC",
            slug: "league-of-legends-lec",
            image_url: "https://example.com/lec.png",
            url: "https://lolesports.com",
            series: [
                {
                    id: 101,
                    league_id: 4197,
                    name: "Summer 2026",
                    slug: "summer-2026",
                    season: "Summer",
                    year: 2026,
                    begin_at: "2026-06-15T15:00:00Z",
                    end_at: "2026-08-30T21:00:00Z",
                    modified_at: "2026-06-01T10:00:00Z",
                    full_name: "Summer 2026",
                },
            ],
        };

        const inactiveLeague: PandaScoreLeague = {
            id: 4244,
            name: "OPL",
            slug: "league-of-legends-opl",
            image_url: null,
            url: null,
            series: [],
        };

        const mockMatch: PandaScoreMatch = {
            id: 999,
            name: "G2 vs FNC",
            begin_at: "2026-06-15T16:00:00Z",
            number_of_games: 1,
            status: "not_started",
            opponents: [
                {
                    opponent: {
                        id: 1,
                        name: "G2 Esports",
                        slug: "g2",
                    },
                },
                {
                    opponent: {
                        id: 2,
                        name: "Fnatic",
                        slug: "fnc",
                    },
                },
            ],
            league: {
                id: 4197,
                name: "LEC",
                slug: "league-of-legends-lec",
                image_url: null,
                url: null,
            },
        };

        it("calls global match fetcher, updates store, and derives active teams when active leagues exist", async () => {
            const store = createEmptyMatchStore();
            const fetchMatchesMock = vi.fn().mockResolvedValue([mockMatch]);

            const result = await syncManifestsAndStore({
                referenceDate,
                leagues: [activeLeague, inactiveLeague],
                matchStore: store,
                fetchGlobalMatches: fetchMatchesMock,
                writeFiles: false,
            });

            expect(result.activeLeaguesCount).toBe(1);
            expect(result.matchesFetched).toBe(true);
            expect(fetchMatchesMock).toHaveBeenCalledTimes(1);
            expect(fetchMatchesMock).toHaveBeenCalledWith({ referenceDate });

            // Match store updated
            expect(store.matches[999]).toBeDefined();
            expect(store.matches[999].summary).toBe("G2 vs FNC");

            // Teams manifest derived from updated store
            expect(result.teamsManifest.teams).toHaveLength(2);
            expect(result.teamsManifest.teams[0].name).toBe("Fnatic");
            expect(result.teamsManifest.teams[1].name).toBe("G2 Esports");
        });

        it("skips calling global match fetcher when zero active leagues exist", async () => {
            const store = createEmptyMatchStore();
            const fetchMatchesMock = vi.fn().mockResolvedValue([]);

            const result = await syncManifestsAndStore({
                referenceDate,
                leagues: [inactiveLeague],
                matchStore: store,
                fetchGlobalMatches: fetchMatchesMock,
                writeFiles: false,
            });

            expect(result.activeLeaguesCount).toBe(0);
            expect(result.matchesFetched).toBe(false);
            expect(fetchMatchesMock).not.toHaveBeenCalled();
            expect(Object.keys(store.matches)).toHaveLength(0);
            expect(result.teamsManifest.teams).toHaveLength(0);
        });

        it("writes leagues manifest, teams manifest, and match store to disk", async () => {
            const tmpDir = fs.mkdtempSync(
                path.join(os.tmpdir(), "lol-events-sync-"),
            );
            const leaguesPath = path.join(tmpDir, "leagues.json");
            const teamsPath = path.join(tmpDir, "teams.json");
            const storePath = path.join(tmpDir, "matches.json");

            const store = createEmptyMatchStore();
            const fetchMatchesMock = vi.fn().mockResolvedValue([mockMatch]);

            try {
                const result = await syncManifestsAndStore({
                    referenceDate,
                    leagues: [activeLeague],
                    matchStore: store,
                    fetchGlobalMatches: fetchMatchesMock,
                    leaguesManifestPath: leaguesPath,
                    teamsManifestPath: teamsPath,
                    matchStorePath: storePath,
                    writeFiles: true,
                });

                expect(fs.existsSync(leaguesPath)).toBe(true);
                expect(fs.existsSync(teamsPath)).toBe(true);
                expect(fs.existsSync(storePath)).toBe(true);

                const leaguesFile = JSON.parse(
                    fs.readFileSync(leaguesPath, "utf-8"),
                );
                expect(leaguesFile.leagues).toHaveLength(1);
                expect(leaguesFile.leagues[0].name).toBe("LEC");

                const teamsFile = JSON.parse(
                    fs.readFileSync(teamsPath, "utf-8"),
                );
                expect(teamsFile.teams).toHaveLength(2);

                const storeFile = JSON.parse(
                    fs.readFileSync(storePath, "utf-8"),
                );
                expect(storeFile.matches[999]).toBeDefined();

                expect(result.activeLeaguesCount).toBe(1);
                expect(result.activeTeamsCount).toBe(2);
            } finally {
                fs.rmSync(tmpDir, { recursive: true, force: true });
            }
        });

        it("falls back to PandaScore.getAllPages and PandaScore.getGlobalMatches by default", async () => {
            const getAllPagesSpy = vi
                .spyOn(PandaScore, "getAllPages")
                .mockResolvedValue([activeLeague]);
            const getGlobalMatchesSpy = vi
                .spyOn(PandaScore, "getGlobalMatches")
                .mockResolvedValue([mockMatch]);

            const store = createEmptyMatchStore();
            const result = await syncManifestsAndStore({
                referenceDate,
                matchStore: store,
                writeFiles: false,
            });

            expect(getAllPagesSpy).toHaveBeenCalledWith(PandaScore.getLeagues);
            expect(getGlobalMatchesSpy).toHaveBeenCalledWith({ referenceDate });
            expect(result.activeLeaguesCount).toBe(1);
            expect(result.activeTeamsCount).toBe(2);

            getAllPagesSpy.mockRestore();
            getGlobalMatchesSpy.mockRestore();
        });
    });
});
