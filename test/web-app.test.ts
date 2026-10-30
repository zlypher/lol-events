import { describe, expect, it, vi } from "vitest";
import {
    copyToClipboard,
    fetchCalendarEvents,
    filterLeagues,
    filterTeams,
    formatLocalizedMatchTime,
    formatOpponentNames,
    getUpcomingMatches,
    renderEmptyState,
    renderErrorState,
    renderLeagueCard,
    renderMatchPreview,
    renderTeamCard,
    resolveCalendarJsonUrl,
    toWebcalUrl,
} from "../docs/app.js";
import type {
    CalendarEventJSON,
    LeagueManifestItem,
    TeamManifestItem,
} from "../lib/types";

describe("web-app", () => {
    const mockTeams: TeamManifestItem[] = [
        {
            id: 100,
            name: "T1",
            slug: "t1",
            acronym: "T1",
            logoUrl: "https://example.com/t1.png",
            calendarUrl:
                "https://zlypher.github.io/lol-events/cal/team/100.ical",
            jsonUrl: "https://zlypher.github.io/lol-events/cal/team/100.json",
        },
        {
            id: 101,
            name: "Gen.G Esports",
            slug: "gen-g",
            acronym: "GEN",
            logoUrl: null,
            calendarUrl:
                "https://zlypher.github.io/lol-events/cal/team/101.ical",
            jsonUrl: "https://zlypher.github.io/lol-events/cal/team/101.json",
        },
        {
            id: 102,
            name: "Fnatic",
            slug: "fnatic",
            acronym: "FNC",
            logoUrl: "https://example.com/fnc.png",
            calendarUrl:
                "https://zlypher.github.io/lol-events/cal/team/102.ical",
            jsonUrl: "https://zlypher.github.io/lol-events/cal/team/102.json",
        },
    ];

    const mockCalendarEvents: CalendarEventJSON[] = [
        {
            id: "1001@zlypher.github.io",
            uid: "1001@zlypher.github.io",
            sequence: 1,
            summary: "T1 vs GEN",
            start: "2026-10-11T16:00:00.000Z", // Today relative to 2026-10-11T12:00:00Z
            end: "2026-10-11T19:00:00.000Z",
            status: null,
        },
        {
            id: "1002@zlypher.github.io",
            uid: "1002@zlypher.github.io",
            sequence: 1,
            summary: "T1 vs KT",
            start: "2026-10-12T18:00:00.000Z", // Tomorrow
            end: "2026-10-12T21:00:00.000Z",
            status: null,
        },
        {
            id: "1003@zlypher.github.io",
            uid: "1003@zlypher.github.io",
            sequence: 1,
            summary: "DK vs T1",
            start: "2026-10-14T15:00:00.000Z", // Wednesday
            end: "2026-10-14T18:00:00.000Z",
            status: null,
        },
        {
            id: "1004@zlypher.github.io",
            uid: "1004@zlypher.github.io",
            sequence: 1,
            summary: "T1 vs HLE",
            start: "2026-10-25T14:00:00.000Z", // Later
            end: "2026-10-25T17:00:00.000Z",
            status: "CANCELLED",
        },
        {
            id: "1000@zlypher.github.io",
            uid: "1000@zlypher.github.io",
            sequence: 1,
            summary: "T1 vs BRO",
            start: "2026-10-09T14:00:00.000Z", // Past
            end: "2026-10-09T17:00:00.000Z",
            status: null,
        },
    ];

    const mockLeagues: LeagueManifestItem[] = [
        {
            id: 1,
            name: "LEC",
            slug: "league-of-legends-lec",
            logoUrl: "https://example.com/lec.png",
            url: "https://lolesports.com",
            calendarUrl:
                "https://zlypher.github.io/lol-events/cal/league-of-legends-lec.ical",
            jsonUrl:
                "https://zlypher.github.io/lol-events/cal/league-of-legends-lec.json",
            active: true,
        },
        {
            id: 2,
            name: "LCS",
            slug: "league-of-legends-lcs",
            logoUrl: "https://example.com/lcs.png",
            url: "https://lolesports.com",
            calendarUrl:
                "https://zlypher.github.io/lol-events/cal/league-of-legends-lcs.ical",
            jsonUrl:
                "https://zlypher.github.io/lol-events/cal/league-of-legends-lcs.json",
            active: true,
        },
        {
            id: 3,
            name: "Oceanic Pro League (OPL)",
            slug: "league-of-legends-opl",
            logoUrl: null,
            url: null,
            calendarUrl:
                "https://zlypher.github.io/lol-events/cal/league-of-legends-opl.ical",
            jsonUrl:
                "https://zlypher.github.io/lol-events/cal/league-of-legends-opl.json",
            active: false,
        },
    ];

    describe("toWebcalUrl", () => {
        it("converts https and http URLs to webcal protocol", () => {
            const httpsUrl =
                "https://zlypher.github.io/lol-events/cal/league-of-legends-lec.ical";
            const httpUrl =
                "http://zlypher.github.io/lol-events/cal/league-of-legends-lcs.ical";

            expect(toWebcalUrl(httpsUrl)).toBe(
                "webcal://zlypher.github.io/lol-events/cal/league-of-legends-lec.ical",
            );
            expect(toWebcalUrl(httpUrl)).toBe(
                "webcal://zlypher.github.io/lol-events/cal/league-of-legends-lcs.ical",
            );
        });

        it("preserves URL if already using webcal protocol or relative", () => {
            const webcalUrl = "webcal://example.com/cal.ical";
            expect(toWebcalUrl(webcalUrl)).toBe(webcalUrl);
        });
    });

    describe("filterLeagues", () => {
        it("returns all leagues when search query is empty and category is all", () => {
            expect(filterLeagues(mockLeagues, "", "all")).toEqual(mockLeagues);
            expect(filterLeagues(mockLeagues, "   ", "all")).toEqual(
                mockLeagues,
            );
        });

        it("filters leagues by name or slug case-insensitively", () => {
            const byName = filterLeagues(mockLeagues, "oceanic", "all");
            expect(byName).toHaveLength(1);
            expect(byName[0].id).toBe(3);

            const bySlug = filterLeagues(mockLeagues, "opl", "all");
            expect(bySlug).toHaveLength(1);
            expect(bySlug[0].id).toBe(3);

            const byPartial = filterLeagues(mockLeagues, "legends", "all");
            expect(byPartial).toHaveLength(3); // All 3 slugs contain "legends"
        });

        it("filters leagues by active and inactive category", () => {
            const activeOnly = filterLeagues(mockLeagues, "", "active");
            expect(activeOnly).toHaveLength(2);
            expect(activeOnly.every((l: LeagueManifestItem) => l.active)).toBe(
                true,
            );

            const inactiveOnly = filterLeagues(mockLeagues, "", "inactive");
            expect(inactiveOnly).toHaveLength(1);
            expect(inactiveOnly[0].id).toBe(3);
        });

        it("combines text search with category filtering", () => {
            // Searching "legends" matches all 3, but category restricts to active (LEC, LCS)
            const activeMatch = filterLeagues(mockLeagues, "legends", "active");
            expect(activeMatch).toHaveLength(2);

            const inactiveMatch = filterLeagues(mockLeagues, "LEC", "inactive");
            expect(inactiveMatch).toHaveLength(0);
        });
    });

    describe("renderLeagueCard", () => {
        const activeLeague = mockLeagues[0];
        const inactiveLeague = mockLeagues[2];

        it("renders an active league card with logo, title, and copy button with clipboard icon", () => {
            const html = renderLeagueCard(activeLeague);

            expect(html).toContain('class="league-card"');
            expect(html).toContain("LEC");
            expect(html).toContain('src="https://example.com/lec.png"');
            expect(html).toContain('alt="LEC Logo"');
            expect(html).toContain(
                'data-copy="https://zlypher.github.io/lol-events/cal/league-of-legends-lec.ical"',
            );
            expect(html).toContain('class="icon-copy"');
            expect(html).not.toContain("badge");
            expect(html).not.toContain("btn--subscribe");
            expect(html).not.toContain("https://lolesports.com");
        });

        it("renders an inactive league card with placeholder logo, title, and copy button with clipboard icon", () => {
            const html = renderLeagueCard(inactiveLeague);

            expect(html).toContain('class="league-card"');
            expect(html).toContain("OPL");
            // Null logo should render a placeholder or initials block, not broken img
            expect(html).toContain('class="logo-placeholder"');
            expect(html).toContain(
                'data-copy="https://zlypher.github.io/lol-events/cal/league-of-legends-opl.ical"',
            );
            expect(html).toContain('class="icon-copy"');
            expect(html).not.toContain("badge");
            expect(html).not.toContain("btn--subscribe");
        });
    });

    describe("renderEmptyState", () => {
        it("renders informative empty state message with search query and reset button", () => {
            const html = renderEmptyState("NonExistentLeague", "all");

            expect(html).toContain('class="empty-state"');
            expect(html).toContain("No leagues found");
            expect(html).toContain("NonExistentLeague");
            expect(html).toContain('id="btn-clear-search"');
        });
    });

    describe("renderErrorState", () => {
        it("renders user-friendly error banner with retry button", () => {
            const html = renderErrorState(
                "Unable to load leagues.json manifest.",
            );

            expect(html).toContain('class="error-banner"');
            expect(html).toContain("Unable to load leagues.json manifest.");
            expect(html).toContain('id="btn-retry"');
        });
    });

    describe("copyToClipboard", () => {
        it("uses navigator.clipboard.writeText when available", async () => {
            let copiedText = "";
            const mockClipboard = {
                writeText: async (t: string) => {
                    copiedText = t;
                },
            };
            vi.stubGlobal("navigator", { clipboard: mockClipboard });

            const result = await copyToClipboard(
                "https://example.com/test.ical",
            );
            expect(result).toBe(true);
            expect(copiedText).toBe("https://example.com/test.ical");

            vi.unstubAllGlobals();
        });

        it("returns false gracefully when no clipboard or DOM is available", async () => {
            vi.stubGlobal("navigator", {});
            vi.stubGlobal("document", undefined);

            const result = await copyToClipboard("test");
            expect(result).toBe(false);

            vi.unstubAllGlobals();
        });
    });

    describe("filterTeams", () => {
        it("returns all teams when search query is empty", () => {
            expect(filterTeams(mockTeams, "")).toEqual(mockTeams);
            expect(filterTeams(mockTeams, "   ")).toEqual(mockTeams);
        });

        it("filters teams by name case-insensitively", () => {
            const result = filterTeams(mockTeams, "gen.g");
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(101);
        });

        it("filters teams by slug case-insensitively", () => {
            const result = filterTeams(mockTeams, "fnatic");
            expect(result).toHaveLength(1);
            expect(result[0].id).toBe(102);
        });

        it("filters teams by acronym case-insensitively", () => {
            const resultT1 = filterTeams(mockTeams, "t1");
            expect(resultT1).toHaveLength(1);
            expect(resultT1[0].id).toBe(100);

            const resultGen = filterTeams(mockTeams, "GEN");
            expect(resultGen).toHaveLength(1);
            expect(resultGen[0].id).toBe(101);
        });

        it("returns empty array when query does not match any team", () => {
            expect(filterTeams(mockTeams, "nonexistent")).toHaveLength(0);
        });

        it("handles invalid or non-array inputs gracefully", () => {
            expect(filterTeams(null as unknown as TeamManifestItem[])).toEqual(
                [],
            );
            expect(
                filterTeams(undefined as unknown as TeamManifestItem[]),
            ).toEqual([]);
        });
    });

    describe("renderTeamCard", () => {
        const teamWithLogo = mockTeams[0];
        const teamWithoutLogo = mockTeams[1];

        it("renders a team card with logo, title, acronym, copy button, and expand button", () => {
            const html = renderTeamCard(teamWithLogo);

            expect(html).toContain('class="team-card');
            expect(html).toContain("T1");
            expect(html).toContain('src="https://example.com/t1.png"');
            expect(html).toContain('alt="T1 Logo"');
            expect(html).toContain(
                'data-copy="https://zlypher.github.io/lol-events/cal/team/100.ical"',
            );
            expect(html).toContain('class="btn btn--copy"');
            expect(html).toContain('class="btn btn--expand"');
            expect(html).toContain('class="card-preview"');
        });

        it("renders placeholder logo when logoUrl is null", () => {
            const html = renderTeamCard(teamWithoutLogo);

            expect(html).toContain('class="team-card');
            expect(html).toContain("Gen.G Esports");
            expect(html).toContain('class="logo-placeholder"');
            expect(html).toContain("GEN");
        });
    });

    describe("resolveCalendarJsonUrl", () => {
        it("converts GitHub Pages absolute production URLs to relative paths", () => {
            const leagueUrl =
                "https://zlypher.github.io/lol-events/cal/league-of-legends-lec.json";
            expect(resolveCalendarJsonUrl(leagueUrl)).toBe(
                "./cal/league-of-legends-lec.json",
            );

            const teamUrl =
                "https://zlypher.github.io/lol-events/cal/team/100.json";
            expect(resolveCalendarJsonUrl(teamUrl)).toBe("./cal/team/100.json");

            const customDomainUrl =
                "https://events.lolesports.com/cal/league-of-legends-lec.json";
            expect(resolveCalendarJsonUrl(customDomainUrl)).toBe(
                "./cal/league-of-legends-lec.json",
            );
        });

        it("preserves already relative paths or arbitrary URLs", () => {
            expect(resolveCalendarJsonUrl("./cal/test.json")).toBe(
                "./cal/test.json",
            );
            expect(resolveCalendarJsonUrl("https://example.com/cal.json")).toBe(
                "https://example.com/cal.json",
            );
        });

        it("handles empty or invalid inputs gracefully", () => {
            expect(resolveCalendarJsonUrl("")).toBe("");
            expect(resolveCalendarJsonUrl(null as unknown as string)).toBe("");
        });
    });

    describe("formatLocalizedMatchTime", () => {
        const refDate = new Date("2026-10-11T12:00:00.000Z"); // Sunday

        it("formats matches happening today as 'Today at HH:mm'", () => {
            const formatted = formatLocalizedMatchTime(
                "2026-10-11T18:00:00.000Z",
                refDate,
                "en-US",
                "UTC",
            );
            expect(formatted).toBe("Today at 18:00");
        });

        it("formats matches happening tomorrow as 'Tomorrow at HH:mm'", () => {
            const formatted = formatLocalizedMatchTime(
                "2026-10-12T18:00:00.000Z",
                refDate,
                "en-US",
                "UTC",
            );
            expect(formatted).toBe("Tomorrow at 18:00");
        });

        it("formats matches within 2 to 6 days with day of week", () => {
            const formatted = formatLocalizedMatchTime(
                "2026-10-14T15:30:00.000Z",
                refDate,
                "en-US",
                "UTC",
            );
            expect(formatted).toBe("Wednesday at 15:30");
        });

        it("formats matches further out with month and day", () => {
            const formatted = formatLocalizedMatchTime(
                "2026-10-25T14:00:00.000Z",
                refDate,
                "en-US",
                "UTC",
            );
            expect(formatted).toBe("Oct 25 at 14:00");
        });

        it("handles invalid dates gracefully without throwing", () => {
            expect(formatLocalizedMatchTime("invalid-date", refDate)).toBe(
                "invalid-date",
            );
            expect(formatLocalizedMatchTime("", refDate)).toBe("");
        });
    });

    describe("getUpcomingMatches", () => {
        const refDate = new Date("2026-10-11T12:00:00.000Z");

        it("filters out past matches and sorts upcoming matches chronologically ascending", () => {
            const upcoming = getUpcomingMatches(
                mockCalendarEvents,
                refDate,
                10,
            );

            // Should exclude the past match (2026-10-09)
            expect(
                upcoming.some((m) => m.id === "1000@zlypher.github.io"),
            ).toBe(false);

            // Should contain the 4 future matches in chronological order
            expect(upcoming).toHaveLength(4);
            expect(upcoming[0].id).toBe("1001@zlypher.github.io"); // Oct 11
            expect(upcoming[1].id).toBe("1002@zlypher.github.io"); // Oct 12
            expect(upcoming[2].id).toBe("1003@zlypher.github.io"); // Oct 14
            expect(upcoming[3].id).toBe("1004@zlypher.github.io"); // Oct 25
        });

        it("limits matches to requested limit (e.g. next 3 matches)", () => {
            const upcoming = getUpcomingMatches(mockCalendarEvents, refDate, 3);
            expect(upcoming).toHaveLength(3);
            expect(upcoming[0].summary).toBe("T1 vs GEN");
            expect(upcoming[2].summary).toBe("DK vs T1");
        });

        it("preserves cancelled matches scheduled in the future", () => {
            const upcoming = getUpcomingMatches(mockCalendarEvents, refDate, 5);
            const cancelled = upcoming.find((m) => m.status === "CANCELLED");
            expect(cancelled).toBeDefined();
            expect(cancelled?.summary).toBe("T1 vs HLE");
        });

        it("returns empty array when events array is empty or no matches are upcoming", () => {
            expect(getUpcomingMatches([], refDate)).toEqual([]);
            const farFutureRefDate = new Date("2027-01-01T00:00:00.000Z");
            expect(
                getUpcomingMatches(mockCalendarEvents, farFutureRefDate),
            ).toEqual([]);
        });
    });

    describe("renderMatchPreview", () => {
        const refDate = new Date("2026-10-11T12:00:00.000Z");

        it("renders upcoming matches list with localized times and summaries, spoiler-free", () => {
            const html = renderMatchPreview(mockCalendarEvents, {
                referenceDate: refDate,
                limit: 3,
                timeZone: "UTC",
                locale: "en-US",
            });

            expect(html).toContain('class="preview-container"');
            expect(html).toContain("Upcoming Matches");
            expect(html).toContain("Today at 16:00");
            expect(html).toContain("T1 vs GEN");
            expect(html).toContain("Tomorrow at 18:00");
            expect(html).toContain("T1 vs KT");
            expect(html).toContain("Wednesday at 15:00");
            expect(html).toContain("DK vs T1");
            // Must remain strictly spoiler-free: no scores or winner fields
            expect(html).not.toContain("score");
            expect(html).not.toContain("winner");
        });

        it("displays canceled badge for canceled matches", () => {
            const html = renderMatchPreview(mockCalendarEvents, {
                referenceDate: refDate,
                limit: 5,
                timeZone: "UTC",
                locale: "en-US",
            });

            expect(html).toContain("T1 vs HLE");
            expect(html).toContain("Canceled");
        });

        it("renders empty state when there are no upcoming matches", () => {
            const html = renderMatchPreview([], { referenceDate: refDate });
            expect(html).toContain('class="preview-empty"');
            expect(html).toContain("No upcoming matches scheduled.");
        });
    });

    describe("formatOpponentNames", () => {
        it("strips league acronym tags from summary", () => {
            expect(formatOpponentNames("[LCK] T1 vs GEN")).toBe("T1 vs GEN");
            expect(formatOpponentNames("[LEC] G2 vs FNC")).toBe("G2 vs FNC");
        });

        it("strips tournament stage prefix from summary", () => {
            expect(formatOpponentNames("(Playoffs) T1 vs KT")).toBe("T1 vs KT");
            expect(formatOpponentNames("[LCK] (Playoffs) T1 vs KT")).toBe(
                "T1 vs KT",
            );
        });

        it("strips stage round prefix with colon", () => {
            expect(formatOpponentNames("Grand final: G2 vs MKOI")).toBe(
                "G2 vs MKOI",
            );
            expect(formatOpponentNames("Lower bracket final: KC vs MKOI")).toBe(
                "KC vs MKOI",
            );
        });

        it("returns original summary if no prefixes exist or fallback to Match on empty", () => {
            expect(formatOpponentNames("T1 vs GEN")).toBe("T1 vs GEN");
            expect(formatOpponentNames("")).toBe("Match");
            expect(formatOpponentNames(null as unknown as string)).toBe(
                "Match",
            );
        });
    });

    describe("fetchCalendarEvents", () => {
        it("fetches and parses events from calendar JSON", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({
                    name: "T1",
                    events: mockCalendarEvents,
                }),
            });

            const events = await fetchCalendarEvents(
                "https://zlypher.github.io/lol-events/cal/team/100.json",
                mockFetch,
            );

            expect(mockFetch).toHaveBeenCalledWith("./cal/team/100.json");
            expect(events).toHaveLength(5);
            expect(events[0].summary).toBe("T1 vs GEN");
        });

        it("throws friendly error when HTTP request fails", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: "Not Found",
            });

            await expect(
                fetchCalendarEvents("./cal/nonexistent.json", mockFetch),
            ).rejects.toThrow("HTTP 404: Not Found");
        });
    });

    describe("renderEmptyState with entityType", () => {
        it("renders entity-specific empty state for teams", () => {
            const html = renderEmptyState("T1", "all", "teams");
            expect(html).toContain("No teams found");
            expect(html).toContain("T1");
        });

        it("renders default empty state for leagues", () => {
            const html = renderEmptyState("LEC", "all", "leagues");
            expect(html).toContain("No leagues found");
            expect(html).toContain("LEC");
        });
    });

    describe("timezone shift formatting", () => {
        it("accurately shifts days across different timezones", () => {
            // Reference: 2026-10-11T12:00:00Z (Sunday noon UTC)
            // Match: 2026-10-11T23:30:00Z (Sunday night UTC, but Monday morning 08:30 in Asia/Seoul)
            const refDate = new Date("2026-10-11T12:00:00.000Z");
            const matchDate = "2026-10-11T23:30:00.000Z";

            const inUtc = formatLocalizedMatchTime(
                matchDate,
                refDate,
                "en-US",
                "UTC",
            );
            expect(inUtc).toBe("Today at 23:30");

            const inSeoul = formatLocalizedMatchTime(
                matchDate,
                refDate,
                "en-US",
                "Asia/Seoul",
            );
            // In Seoul (+9h), refDate is 21:00 Sunday, matchDate is 08:30 Monday -> Tomorrow!
            expect(inSeoul).toBe("Tomorrow at 08:30");
        });
    });

    describe("fetchCalendarEvents response shapes", () => {
        it("parses calendar response when API returns raw array instead of events wrapper", async () => {
            const mockFetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockCalendarEvents,
            });

            const events = await fetchCalendarEvents(
                "./cal/sample.json",
                mockFetch,
            );
            expect(events).toHaveLength(5);
            expect(events[0].summary).toBe("T1 vs GEN");
        });
    });

    describe("preview click containment and interaction", () => {
        it("distinguishes copy button, preview content, and card expansion targets", () => {
            const leagueCardHtml = renderLeagueCard(mockLeagues[0]);

            // Verify structure has separate card-main, card-actions, and card-preview containers
            expect(leagueCardHtml).toContain('class="card-main"');
            expect(leagueCardHtml).toContain('class="card-actions"');
            expect(leagueCardHtml).toContain('class="btn btn--copy"');
            expect(leagueCardHtml).toContain('class="btn btn--expand"');
            expect(leagueCardHtml).toContain('class="card-preview"');

            // Simulate delegator logic
            function handleCardClick(targetClass: string) {
                if (targetClass.includes("btn--copy")) {
                    return "copy";
                }
                if (targetClass.includes("card-preview")) {
                    return "ignore-preview-click";
                }
                if (
                    targetClass.includes("league-card") ||
                    targetClass.includes("btn--expand") ||
                    targetClass.includes("card-main")
                ) {
                    return "toggle-preview";
                }
                return "noop";
            }

            expect(handleCardClick("btn--copy")).toBe("copy");
            expect(handleCardClick("card-preview")).toBe(
                "ignore-preview-click",
            );
            expect(handleCardClick("card-main")).toBe("toggle-preview");
            expect(handleCardClick("btn--expand")).toBe("toggle-preview");
        });
    });
});
