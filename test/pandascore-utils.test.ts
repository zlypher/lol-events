import {
    formatMatchTitle,
    groupMatchesByLeague,
    mapPandaScoreOpponent,
    mapPandaScoreResult,
    shouldPrefixStage,
} from "../lib/pandascore-utils";
import type { PandaScoreMatch } from "../lib/types";
import rawMatchesFixture from "./fixtures/pandascore-matches.json" with { type: "json" };

const matchesFixture = rawMatchesFixture as unknown as PandaScoreMatch[];

describe("pandascore-utils", () => {
    describe("mapPandaScoreOpponent", () => {
        it("should extract opponent name from PandaScoreOpponent", () => {
            const result = mapPandaScoreOpponent({
                opponent: {
                    id: 88,
                    name: "G2 Esports",
                },
            });
            expect(result).toEqual({ name: "G2 Esports" });
        });
    });

    describe("shouldPrefixStage", () => {
        it("should return false for missing, null, or empty stage names", () => {
            expect(shouldPrefixStage(undefined)).toBe(false);
            expect(shouldPrefixStage(null)).toBe(false);
            expect(shouldPrefixStage("")).toBe(false);
            expect(shouldPrefixStage("   ")).toBe(false);
        });

        it("should return false for Regular Season (case-insensitive)", () => {
            expect(shouldPrefixStage("Regular Season")).toBe(false);
            expect(shouldPrefixStage("regular season")).toBe(false);
            expect(shouldPrefixStage("REGULAR SEASON")).toBe(false);
            expect(shouldPrefixStage("  regular season  ")).toBe(false);
        });

        it("should return true for other stages", () => {
            expect(shouldPrefixStage("Play-In")).toBe(true);
            expect(shouldPrefixStage("Playoffs")).toBe(true);
            expect(shouldPrefixStage("Group Stage")).toBe(true);
            expect(shouldPrefixStage("Swiss Stage")).toBe(true);
            expect(shouldPrefixStage("Knockout Stage")).toBe(true);
            expect(shouldPrefixStage("Last Chance Qualifier")).toBe(true);
        });
    });

    describe("formatMatchTitle", () => {
        it("should prefix stage in parentheses when stage is present and not ignored", () => {
            const match: PandaScoreMatch = {
                id: 1,
                name: "Upper Bracket Semifinal 1: FUR vs MVK",
                begin_at: null,
                number_of_games: 5,
                opponents: [],
                tournament: {
                    id: 100,
                    name: "Play-In",
                },
            };
            expect(formatMatchTitle(match)).toBe(
                "(Play-In) Upper Bracket Semifinal 1: FUR vs MVK",
            );
        });

        it("should prefix Playoffs stage in parentheses", () => {
            const match: PandaScoreMatch = {
                id: 2,
                name: "Grand final: G2 vs MKOI",
                begin_at: null,
                number_of_games: 5,
                opponents: [],
                tournament: {
                    id: 101,
                    name: "Playoffs",
                },
            };
            expect(formatMatchTitle(match)).toBe(
                "(Playoffs) Grand final: G2 vs MKOI",
            );
        });

        it("should NOT prefix Regular Season matches", () => {
            const match: PandaScoreMatch = {
                id: 3,
                name: "FNC vs GX",
                begin_at: null,
                number_of_games: 1,
                opponents: [],
                tournament: {
                    id: 102,
                    name: "Regular Season",
                },
            };
            expect(formatMatchTitle(match)).toBe("FNC vs GX");
        });

        it("should preserve original name when tournament is undefined or has no name", () => {
            const matchWithoutTournament: PandaScoreMatch = {
                id: 4,
                name: "T1 vs GEN",
                begin_at: null,
                number_of_games: 3,
                opponents: [],
            };
            expect(formatMatchTitle(matchWithoutTournament)).toBe("T1 vs GEN");

            const matchWithEmptyTournament: PandaScoreMatch = {
                id: 5,
                name: "T1 vs GEN",
                begin_at: null,
                number_of_games: 3,
                opponents: [],
                tournament: {
                    id: 103,
                    name: "",
                },
            };
            expect(formatMatchTitle(matchWithEmptyTournament)).toBe(
                "T1 vs GEN",
            );
        });

        it("should avoid duplicate prefix if match name already starts with stage name", () => {
            const matchWithColon: PandaScoreMatch = {
                id: 6,
                name: "Play-In: FUR vs MVK",
                begin_at: null,
                number_of_games: 3,
                opponents: [],
                tournament: {
                    id: 104,
                    name: "Play-In",
                },
            };
            expect(formatMatchTitle(matchWithColon)).toBe(
                "Play-In: FUR vs MVK",
            );

            const matchWithParens: PandaScoreMatch = {
                id: 7,
                name: "(Play-In) FUR vs MVK",
                begin_at: null,
                number_of_games: 3,
                opponents: [],
                tournament: {
                    id: 104,
                    name: "Play-In",
                },
            };
            expect(formatMatchTitle(matchWithParens)).toBe(
                "(Play-In) FUR vs MVK",
            );
        });

        it("should not false-positive on substring occurrences of stage name in match title", () => {
            const match: PandaScoreMatch = {
                id: 8,
                name: "Semifinal 1: T1 vs GEN",
                begin_at: null,
                number_of_games: 5,
                opponents: [],
                tournament: {
                    id: 105,
                    name: "Final",
                },
            };
            // "Final" should not false-positive against "Semifinal"
            expect(formatMatchTitle(match)).toBe(
                "(Final) Semifinal 1: T1 vs GEN",
            );
        });
    });

    describe("mapPandaScoreResult", () => {
        it("should transform raw PandaScore matches to simplified match structure", () => {
            const result = mapPandaScoreResult(matchesFixture);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                id: 1661676,
                name: "(Playoffs) Grand final: G2 vs KC",
                beginAt: "2026-09-20T15:00:00Z",
                numberOfGames: 5,
                teams: [{ name: "G2 Esports" }, { name: "Karmine Corp" }],
            });
            expect(result[1]).toEqual({
                id: 1661677,
                name: "Lower bracket final: KC vs MKOI",
                beginAt: "2026-09-19T15:09:22Z",
                numberOfGames: 5,
                teams: [{ name: "Karmine Corp" }, { name: "Movistar KOI" }],
            });
        });

        it("should format match title when tournament is present", () => {
            const matchWithTournament: PandaScoreMatch = {
                ...matchesFixture[0],
                tournament: {
                    id: 22046,
                    name: "Play-In",
                },
            };

            const result = mapPandaScoreResult([matchWithTournament]);
            expect(result[0].name).toBe("(Play-In) Grand final: G2 vs KC");
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
