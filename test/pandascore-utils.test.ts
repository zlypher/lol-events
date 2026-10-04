import {
    groupMatchesByLeague,
    mapPandaScoreResult,
} from "../lib/pandascore-utils";
import type { PandaScoreMatch } from "../lib/types";
import rawMatchesFixture from "./fixtures/pandascore-matches.json" with { type: "json" };

const matchesFixture = rawMatchesFixture as unknown as PandaScoreMatch[];

describe("pandascore-utils", () => {
    describe("mapPandaScoreResult", () => {
        it("should transform raw PandaScore matches to simplified match structure", () => {
            const result = mapPandaScoreResult(matchesFixture);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                id: 1661676,
                name: "Grand final: G2 vs KC",
                beginAt: "2026-09-20T15:00:00Z",
                scheduledAt: "2026-09-20T15:00:00Z",
                numberOfGames: 5,
                teams: [{ name: "G2 Esports" }, { name: "Karmine Corp" }],
            });
        });

        it("should handle empty matches array", () => {
            const result = mapPandaScoreResult([]);
            expect(result).toEqual([]);
        });

        it("should handle matches with no opponents", () => {
            const result = mapPandaScoreResult([matchesFixture[2]]);
            expect(result[0].teams).toEqual([]);
            expect(result[0].beginAt).toBeNull();
        });
    });

    describe("groupMatchesByLeague", () => {
        it("should group matches by their league.id", () => {
            const matches: PandaScoreMatch[] = [
                {
                    ...matchesFixture[0],
                    league: {
                        id: 4197,
                        name: "LEC",
                        slug: "league-of-legends-lec",
                        image_url: null,
                        url: null,
                    },
                },
                {
                    ...matchesFixture[1],
                    league: {
                        id: 4197,
                        name: "LEC",
                        slug: "league-of-legends-lec",
                        image_url: null,
                        url: null,
                    },
                },
                {
                    ...matchesFixture[2],
                    league: {
                        id: 4198,
                        name: "LCS",
                        slug: "league-of-legends-lcs",
                        image_url: null,
                        url: null,
                    },
                },
            ];

            const grouped = groupMatchesByLeague(matches);

            expect(grouped.get(4197)).toHaveLength(2);
            expect(grouped.get(4197)?.[0].id).toBe(1661676);
            expect(grouped.get(4197)?.[1].id).toBe(1661677);
            expect(grouped.get(4198)).toHaveLength(1);
            expect(grouped.get(4198)?.[0].id).toBe(1661678);
        });

        it("should ignore matches without a league or without league.id", () => {
            const matches: PandaScoreMatch[] = [
                {
                    ...matchesFixture[0],
                    league: undefined,
                },
                {
                    ...matchesFixture[1],
                    league: {
                        id: 0,
                        name: "Zero",
                        slug: "zero",
                        image_url: null,
                        url: null,
                    },
                },
            ];

            const grouped = groupMatchesByLeague(matches);
            expect(grouped.get(0)).toHaveLength(1);
            expect(grouped.size).toBe(1);
        });

        it("should return an empty map for empty matches", () => {
            const grouped = groupMatchesByLeague([]);
            expect(grouped.size).toBe(0);
        });
    });
});
