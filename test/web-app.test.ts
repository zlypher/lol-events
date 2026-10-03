import { describe, expect, it, vi } from "vitest";
import {
    copyToClipboard,
    filterLeagues,
    renderEmptyState,
    renderErrorState,
    renderLeagueCard,
    toWebcalUrl,
} from "../docs/app.js";
import type { LeagueManifestItem } from "../lib/types";

describe("web-app", () => {
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
});
