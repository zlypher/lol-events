import { mapPandaScoreResult } from "../lib/pandascore-utils.js";
import matchesFixture from "./fixtures/pandascore-matches.json" with { type: "json" };

describe("pandascore-utils", () => {
    describe("mapPandaScoreResult", () => {
        it("should transform raw PandaScore matches to simplified match structure", () => {
            const result = mapPandaScoreResult(matchesFixture);

            expect(result).toHaveLength(3);
            expect(result[0]).toEqual({
                id: 1661676,
                name: "Grand final: G2 vs KC",
                beginAt: "2026-09-20T15:00:00Z",
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
});
