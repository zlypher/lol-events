import { describe, expect, it } from "vitest";
import {
    getThreeMonthsBefore,
    isLeagueActive,
    isSeriesActive,
    partitionLeagues,
} from "../lib/league-activity";
import type { PandaScoreLeague, PandaScoreSerie } from "../lib/types";
import rawLeaguesFixture from "./fixtures/pandascore-leagues.json" with { type: "json" };

function createSeries(
    overrides: Partial<PandaScoreSerie> = {},
): PandaScoreSerie {
    return {
        id: 1,
        league_id: 100,
        name: "Test Series",
        slug: "test-series",
        season: "Summer",
        year: 2026,
        begin_at: null,
        end_at: null,
        modified_at: "2026-06-01T00:00:00Z",
        full_name: "Test Series 2026",
        winner_id: null,
        winner_type: null,
        ...overrides,
    };
}

describe("league activity classification", () => {
    const referenceDate = new Date("2026-06-01T12:00:00Z");

    describe("isSeriesActive", () => {
        it("returns true for a series scheduled entirely in the future", () => {
            const series = createSeries({
                begin_at: "2026-07-01T10:00:00Z",
                end_at: "2026-08-30T18:00:00Z",
            });

            expect(isSeriesActive(series, referenceDate)).toBe(true);
        });

        it("returns true for a future series where only begin_at is populated", () => {
            const series = createSeries({
                begin_at: "2026-07-01T10:00:00Z",
                end_at: null,
            });

            expect(isSeriesActive(series, referenceDate)).toBe(true);
        });

        it("returns true for a future series where only end_at is populated", () => {
            const series = createSeries({
                begin_at: null,
                end_at: "2026-07-01T10:00:00Z",
            });

            expect(isSeriesActive(series, referenceDate)).toBe(true);
        });

        it("returns true for an ongoing series with future end date", () => {
            const series = createSeries({
                begin_at: "2026-05-01T10:00:00Z",
                end_at: "2026-06-15T18:00:00Z",
            });

            expect(isSeriesActive(series, referenceDate)).toBe(true);
        });

        it("returns true for an ongoing series started within 3 months with null end date", () => {
            const series = createSeries({
                begin_at: "2026-05-01T10:00:00Z",
                end_at: null,
            });

            expect(isSeriesActive(series, referenceDate)).toBe(true);
        });

        it("returns true for an ongoing series started within 3 months with undefined end date", () => {
            const series = createSeries({
                begin_at: "2026-05-01T10:00:00Z",
                end_at: undefined,
            });

            expect(isSeriesActive(series, referenceDate)).toBe(true);
        });

        it("returns false for an old series with null end date started more than 3 months ago", () => {
            const series = createSeries({
                begin_at: "2025-01-01T10:00:00Z",
                end_at: null,
            });

            expect(isSeriesActive(series, referenceDate)).toBe(false);
        });

        it("returns true for a series that ended 1 day ago", () => {
            const series = createSeries({
                begin_at: "2026-04-01T10:00:00Z",
                end_at: "2026-05-31T12:00:00Z",
            });

            expect(isSeriesActive(series, referenceDate)).toBe(true);
        });

        it("returns true for a series that ended 2 months ago", () => {
            const series = createSeries({
                begin_at: "2026-02-01T10:00:00Z",
                end_at: "2026-04-01T12:00:00Z",
            });

            expect(isSeriesActive(series, referenceDate)).toBe(true);
        });

        it("returns true for a series that ended exactly at the 3-month boundary", () => {
            const series = createSeries({
                begin_at: "2026-01-01T10:00:00Z",
                end_at: "2026-03-01T12:00:00Z",
            });

            expect(isSeriesActive(series, referenceDate)).toBe(true);
        });

        it("returns false for a series that ended more than 3 months ago", () => {
            const series = createSeries({
                begin_at: "2026-01-01T10:00:00Z",
                end_at: "2026-02-28T23:59:59Z",
            });

            expect(isSeriesActive(series, referenceDate)).toBe(false);
        });

        it("returns false for a series from a prior year", () => {
            const series = createSeries({
                begin_at: "2025-06-01T10:00:00Z",
                end_at: "2025-08-30T18:00:00Z",
            });

            expect(isSeriesActive(series, referenceDate)).toBe(false);
        });

        it("returns false when both begin_at and end_at are null", () => {
            const series = createSeries({
                begin_at: null,
                end_at: null,
            });

            expect(isSeriesActive(series, referenceDate)).toBe(false);
        });

        it("returns false when dates are invalid strings", () => {
            const series = createSeries({
                begin_at: "invalid-date",
                end_at: "also-invalid",
            });

            expect(isSeriesActive(series, referenceDate)).toBe(false);
        });
    });

    describe("getThreeMonthsBefore", () => {
        it("handles standard 3-month subtraction", () => {
            const date = new Date("2026-06-15T10:00:00Z");
            const expected = new Date("2026-03-15T10:00:00Z");
            expect(getThreeMonthsBefore(date)).toEqual(expected);
        });

        it("clamps May 31 in a non-leap year to February 28", () => {
            const date = new Date("2026-05-31T12:00:00Z");
            const expected = new Date("2026-02-28T12:00:00Z");
            expect(getThreeMonthsBefore(date)).toEqual(expected);
        });

        it("clamps May 31 in a leap year to February 29", () => {
            const date = new Date("2024-05-31T12:00:00Z");
            const expected = new Date("2024-02-29T12:00:00Z");
            expect(getThreeMonthsBefore(date)).toEqual(expected);
        });

        it("handles year rollover from March 31 to December 31", () => {
            const date = new Date("2026-03-31T08:00:00Z");
            const expected = new Date("2025-12-31T08:00:00Z");
            expect(getThreeMonthsBefore(date)).toEqual(expected);
        });
    });

    describe("isLeagueActive", () => {
        it("returns false when league has no series property", () => {
            const league: PandaScoreLeague = {
                id: 1,
                name: "LEC",
                slug: "league-of-legends-lec",
                image_url: null,
                url: null,
            };

            expect(isLeagueActive(league, referenceDate)).toBe(false);
        });

        it("returns false when league has an empty series array", () => {
            const league: PandaScoreLeague = {
                id: 1,
                name: "LEC",
                slug: "league-of-legends-lec",
                image_url: null,
                url: null,
                series: [],
            };

            expect(isLeagueActive(league, referenceDate)).toBe(false);
        });

        it("returns false when league has only inactive series", () => {
            const league: PandaScoreLeague = {
                id: 1,
                name: "LEC",
                slug: "league-of-legends-lec",
                image_url: null,
                url: null,
                series: [
                    createSeries({
                        begin_at: "2025-01-10T10:00:00Z",
                        end_at: "2025-03-01T18:00:00Z",
                    }),
                ],
            };

            expect(isLeagueActive(league, referenceDate)).toBe(false);
        });

        it("returns true when league has at least one active series among inactive ones", () => {
            const league: PandaScoreLeague = {
                id: 1,
                name: "LEC",
                slug: "league-of-legends-lec",
                image_url: null,
                url: null,
                series: [
                    createSeries({
                        begin_at: "2025-01-10T10:00:00Z",
                        end_at: "2025-03-01T18:00:00Z",
                    }),
                    createSeries({
                        begin_at: "2026-06-15T10:00:00Z",
                        end_at: "2026-08-15T18:00:00Z",
                    }),
                ],
            };

            expect(isLeagueActive(league, referenceDate)).toBe(true);
        });
    });

    describe("partitionLeagues", () => {
        it("partitions leagues into active and inactive lists deterministically", () => {
            const leagues: PandaScoreLeague[] = [
                {
                    id: 1,
                    name: "Active League 1",
                    slug: "active-1",
                    image_url: null,
                    url: null,
                    series: [
                        createSeries({
                            begin_at: "2026-07-01T10:00:00Z",
                            end_at: "2026-08-30T10:00:00Z",
                        }),
                    ],
                },
                {
                    id: 2,
                    name: "Inactive League 1",
                    slug: "inactive-1",
                    image_url: null,
                    url: null,
                    series: [
                        createSeries({
                            begin_at: "2025-01-01T10:00:00Z",
                            end_at: "2025-02-01T10:00:00Z",
                        }),
                    ],
                },
                {
                    id: 3,
                    name: "Active League 2",
                    slug: "active-2",
                    image_url: null,
                    url: null,
                    series: [
                        createSeries({
                            begin_at: "2026-05-15T10:00:00Z",
                            end_at: "2026-06-20T10:00:00Z",
                        }),
                    ],
                },
                {
                    id: 4,
                    name: "Inactive League without Series",
                    slug: "inactive-no-series",
                    image_url: null,
                    url: null,
                },
            ];

            const result = partitionLeagues(leagues, referenceDate);

            expect(result.active.map((l) => l.id)).toEqual([1, 3]);
            expect(result.inactive.map((l) => l.id)).toEqual([2, 4]);
        });
    });

    describe("offline fixtures evaluation", () => {
        const fixtureLeagues =
            rawLeaguesFixture as unknown as PandaScoreLeague[];

        it("classifies offline league fixtures correctly against reference date", () => {
            const result = partitionLeagues(fixtureLeagues, referenceDate);

            // Active leagues
            expect(result.active.map((l) => l.name)).toEqual(["LEC", "LCS"]);

            // Inactive leagues
            expect(result.inactive.map((l) => l.name)).toEqual([
                "Prime League 1st Division",
                "OPL",
                "Empty Series League",
                "Null Dates Series League",
                "Missing Series League",
            ]);
        });

        it("correctly identifies individual league statuses in fixture", () => {
            const lec = fixtureLeagues.find(
                (l) => l.slug === "league-of-legends-lec",
            )!;
            const lcs = fixtureLeagues.find(
                (l) => l.slug === "league-of-legends-lcs",
            )!;
            const prime = fixtureLeagues.find(
                (l) => l.slug === "league-of-legends-prime-league-pro-division",
            )!;
            const opl = fixtureLeagues.find(
                (l) => l.slug === "league-of-legends-opl",
            )!;
            const emptySeries = fixtureLeagues.find(
                (l) => l.slug === "empty-series-league",
            )!;
            const nullDates = fixtureLeagues.find(
                (l) => l.slug === "null-dates-series-league",
            )!;
            const missingSeries = fixtureLeagues.find(
                (l) => l.slug === "missing-series-league",
            )!;

            expect(isLeagueActive(lec, referenceDate)).toBe(true);
            expect(isLeagueActive(lcs, referenceDate)).toBe(true);
            expect(isLeagueActive(prime, referenceDate)).toBe(false);
            expect(isLeagueActive(opl, referenceDate)).toBe(false);
            expect(isLeagueActive(emptySeries, referenceDate)).toBe(false);
            expect(isLeagueActive(nullDates, referenceDate)).toBe(false);
            expect(isLeagueActive(missingSeries, referenceDate)).toBe(false);
        });
    });
});
