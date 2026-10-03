import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PandaScore, {
    getGlobalPastMatches,
    getGlobalRunningMatches,
    getGlobalUpcomingMatches,
    getGlobalMatches,
} from "../lib/pandascore";
import type { PandaScoreMatch } from "../lib/types";
import rawMatchesFixture from "./fixtures/pandascore-matches.json" with { type: "json" };

describe("pandascore global match ingestion", () => {
    const matchesFixture = rawMatchesFixture as unknown as PandaScoreMatch[];

    beforeEach(() => {
        vi.restoreAllMocks();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe.each([
        {
            name: "getGlobalPastMatches",
            fn: getGlobalPastMatches,
            endpoint: "/lol/matches/past",
        },
        {
            name: "getGlobalRunningMatches",
            fn: getGlobalRunningMatches,
            endpoint: "/lol/matches/running",
        },
        {
            name: "getGlobalUpcomingMatches",
            fn: getGlobalUpcomingMatches,
            endpoint: "/lol/matches/upcoming",
        },
    ])("$name", ({ fn, endpoint }) => {
        it(`should query ${endpoint} with default pagination options`, async () => {
            const requestSpy = vi
                .spyOn(PandaScore, "request")
                .mockResolvedValue(
                    new Response(JSON.stringify(matchesFixture)),
                );

            const res = await fn();

            expect(requestSpy).toHaveBeenCalledTimes(1);
            const callUrl = requestSpy.mock.calls[0][0];
            expect(callUrl).toContain(endpoint);
            expect(callUrl).toContain("page=1");
            expect(callUrl).toContain("per_page=100");
            expect(res).toHaveLength(matchesFixture.length);
        });
    });

    describe("getGlobalMatches", () => {
        it("should query running, upcoming, and past matches (within 30-day window) and deduplicate matches by id", async () => {
            const refDate = new Date("2026-09-30T12:00:00Z");

            // Past matches: match 1661676 and 1661677
            const mockPast = [matchesFixture[0], matchesFixture[1]];
            // Running matches: empty
            const mockRunning: PandaScoreMatch[] = [];
            // Upcoming matches: match 1661678 and duplicate of 1661677
            const mockUpcoming = [matchesFixture[1], matchesFixture[2]];

            vi.spyOn(PandaScore, "getAllPages").mockImplementation(
                async (callback, initialOptions) => {
                    const dummyOpts = initialOptions ?? {
                        page: 1,
                        per_page: 100,
                    };
                    return callback(dummyOpts);
                },
            );

            const getPastSpy = vi
                .spyOn(PandaScore, "getGlobalPastMatches")
                .mockResolvedValue(mockPast);
            const getRunningSpy = vi
                .spyOn(PandaScore, "getGlobalRunningMatches")
                .mockResolvedValue(mockRunning);
            const getUpcomingSpy = vi
                .spyOn(PandaScore, "getGlobalUpcomingMatches")
                .mockResolvedValue(mockUpcoming);

            const allMatches = await getGlobalMatches({
                referenceDate: refDate,
            });

            // Check that range filter was applied to past matches (30 days before refDate)
            expect(getPastSpy).toHaveBeenCalled();
            const pastCallArg = getPastSpy.mock.calls[0][0];
            expect(pastCallArg?.range).toBeDefined();

            // Expected range: 30 days before 2026-09-30T12:00:00Z is 2026-08-31T12:00:00Z
            const expectedFromDate = new Date(
                refDate.getTime() - 30 * 24 * 60 * 60 * 1000,
            );
            expect(pastCallArg?.range?.begin_at).toBe(
                `${expectedFromDate.toISOString()},${refDate.toISOString()}`,
            );

            expect(getRunningSpy).toHaveBeenCalled();
            expect(getUpcomingSpy).toHaveBeenCalled();

            // Deduplication: 3 unique matches in total
            expect(allMatches).toHaveLength(3);
            const ids = allMatches.map((m) => m.id);
            expect(ids).toEqual([1661676, 1661677, 1661678]);
        });
    });
});
