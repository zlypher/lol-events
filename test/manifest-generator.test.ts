import { describe, expect, it } from "vitest";
import {
    createLeagueManifestItem,
    generateLeaguesManifest,
    serializeLeaguesManifest,
} from "../lib/manifest-generator";
import type { PandaScoreLeague } from "../lib/types";

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
});
