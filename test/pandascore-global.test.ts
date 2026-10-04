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
            const ids = new Set(allMatches.map((m) => m.id));
            expect(ids).toEqual(new Set([1661676, 1661677, 1661678]));
        });

        it("should prioritize running match details when a match is present in both past and running", async () => {
            const runningMatch: PandaScoreMatch = {
                ...matchesFixture[0],
                status: "running",
                name: "Grand final: G2 vs KC (LIVE)",
            };
            const pastMatch: PandaScoreMatch = {
                ...matchesFixture[0],
                status: "finished",
                name: "Grand final: G2 vs KC (PAST)",
            };

            vi.spyOn(PandaScore, "getAllPages").mockImplementation(
                async (callback, initialOptions) => {
                    const dummyOpts = initialOptions ?? {
                        page: 1,
                        per_page: 100,
                    };
                    return callback(dummyOpts);
                },
            );

            vi.spyOn(PandaScore, "getGlobalPastMatches").mockResolvedValue([
                pastMatch,
            ]);
            vi.spyOn(PandaScore, "getGlobalRunningMatches").mockResolvedValue([
                runningMatch,
            ]);
            vi.spyOn(PandaScore, "getGlobalUpcomingMatches").mockResolvedValue(
                [],
            );

            const allMatches = await getGlobalMatches();
            expect(allMatches).toHaveLength(1);
            expect(allMatches[0].status).toBe("running");
            expect(allMatches[0].name).toBe("Grand final: G2 vs KC (LIVE)");
        });

        it("should traverse multiple pages when a page returns 100 matches", async () => {
            const page1: PandaScoreMatch[] = Array.from(
                { length: 100 },
                (_, i) => ({
                    ...matchesFixture[0],
                    id: 1000 + i,
                }),
            );
            const page2: PandaScoreMatch[] = [
                {
                    ...matchesFixture[1],
                    id: 2000,
                },
            ];

            let callCount = 0;
            vi.spyOn(PandaScore, "getGlobalUpcomingMatches").mockImplementation(
                async (opts) => {
                    callCount++;
                    if (opts?.page === 1) {
                        return page1;
                    }
                    return page2;
                },
            );
            vi.spyOn(PandaScore, "getGlobalPastMatches").mockResolvedValue([]);
            vi.spyOn(PandaScore, "getGlobalRunningMatches").mockResolvedValue(
                [],
            );

            const allMatches = await getGlobalMatches();

            expect(callCount).toBe(2);
            expect(allMatches).toHaveLength(101);
            expect(allMatches.some((m) => m.id === 2000)).toBe(true);
        });
    });
});
