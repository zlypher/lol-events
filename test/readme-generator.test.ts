import { describe, expect, it } from "vitest";
import {
    generateReadme,
    README_TEMPLATE,
    renderInactiveSection,
} from "../lib/readme-generator";
import type { PandaScoreLeague } from "../lib/types";
import rawLeaguesFixture from "./fixtures/pandascore-leagues.json" with { type: "json" };

describe("readme-generator", () => {
    describe("renderInactiveSection", () => {
        it("renders a collapsed details block containing a table with inactive leagues", () => {
            const mockInactiveLeagues: PandaScoreLeague[] = [
                {
                    id: 4244,
                    name: "OPL",
                    slug: "league-of-legends-opl",
                    image_url: "https://example.com/opl.png",
                    url: null,
                },
                {
                    id: 4302,
                    name: "Prime League 1st Division",
                    slug: "league-of-legends-prime-league-pro-division",
                    image_url: null,
                    url: null,
                },
            ];

            const result = renderInactiveSection(mockInactiveLeagues);

            expect(result).toContain("<details>");
            expect(result).toContain("<summary>Inactive Leagues (2)</summary>");
            expect(result).toContain(
                "|                                                                                                                                                                                  | League                             |                                                                                                    |",
            );
            expect(result).toContain(
                "| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |",
            );
            expect(result).toContain(
                '| <img src="https://example.com/opl.png" alt="OPL Logo" width="24" height="24" /> | OPL | https://zlypher.github.io/lol-events/cal/league-of-legends-opl.ical',
            );
            expect(result).toContain(
                "| - | Prime League 1st Division | https://zlypher.github.io/lol-events/cal/league-of-legends-prime-league-pro-division.ical",
            );
            expect(result).toContain("</details>");
        });

        it("returns an empty string when inactive leagues list is empty", () => {
            expect(renderInactiveSection([])).toBe("");
        });
    });

    describe("generateReadme", () => {
        const referenceDate = new Date("2026-06-01T12:00:00Z");
        const leagues = rawLeaguesFixture as PandaScoreLeague[];

        it("partitions leagues into active and inactive sections, both sorted alphabetically", () => {
            const lastUpdate = "01.06.2026, 12:00";
            const readme = generateReadme(leagues, {
                referenceDate,
                lastUpdate,
            });

            // 1. Structure: Calendars by League section exists
            expect(readme).toContain("## Calendars by League");
            expect(readme).toContain(`Last update: ${lastUpdate}`);

            // 2. Active leagues appear in primary table
            const calendarsSection = readme.split("## Calendars by League")[1];
            const gettingStartedSection =
                calendarsSection.split("## Getting Started")[0];
            const [primaryTablePart, inactivePart] =
                gettingStartedSection.split("<details>");

            // Primary table contains active leagues (LCS, LEC)
            expect(primaryTablePart).toContain("| LCS |");
            expect(primaryTablePart).toContain("| LEC |");
            expect(primaryTablePart).not.toContain("| OPL |");
            expect(primaryTablePart).not.toContain(
                "| Prime League 1st Division |",
            );

            // Active leagues are alphabetically sorted (LCS before LEC)
            const lcsIndex = primaryTablePart.indexOf("| LCS |");
            const lecIndex = primaryTablePart.indexOf("| LEC |");
            expect(lcsIndex).toBeGreaterThan(-1);
            expect(lecIndex).toBeGreaterThan(-1);
            expect(lcsIndex).toBeLessThan(lecIndex);

            // 3. Inactive leagues appear in collapsed <details> table
            expect(inactivePart).toBeDefined();
            expect(inactivePart).toContain(
                "<summary>Inactive Leagues (5)</summary>",
            );
            expect(inactivePart).toContain("| OPL |");
            expect(inactivePart).toContain("| Prime League 1st Division |");
            expect(inactivePart).toContain("| Empty Series League |");
            expect(inactivePart).toContain("| Null Dates Series League |");
            expect(inactivePart).toContain("| Missing Series League |");
            expect(inactivePart).not.toContain("| LCS |");
            expect(inactivePart).not.toContain("| LEC |");

            // Inactive leagues are alphabetically sorted
            const emptyIndex = inactivePart.indexOf("| Empty Series League |");
            const missingIndex = inactivePart.indexOf(
                "| Missing Series League |",
            );
            const nullDatesIndex = inactivePart.indexOf(
                "| Null Dates Series League |",
            );
            const oplIndex = inactivePart.indexOf("| OPL |");
            const primeIndex = inactivePart.indexOf(
                "| Prime League 1st Division |",
            );

            expect(emptyIndex).toBeLessThan(missingIndex);
            expect(missingIndex).toBeLessThan(nullDatesIndex);
            expect(nullDatesIndex).toBeLessThan(oplIndex);
            expect(oplIndex).toBeLessThan(primeIndex);

            // 4. Inactive table includes consistent columns, logos, and .ical URLs
            expect(inactivePart).toContain(
                '| <img src="https://cdn.pandascore.co/images/league/image/4244/opl.png" alt="OPL Logo" width="24" height="24" /> | OPL | https://zlypher.github.io/lol-events/cal/league-of-legends-opl.ical',
            );
            expect(inactivePart).toContain(
                "| - | Empty Series League | https://zlypher.github.io/lol-events/cal/empty-series-league.ical",
            );
        });

        it("omits the inactive <details> section when all leagues are active", () => {
            const activeOnly = leagues.filter(
                (l) => l.name === "LEC" || l.name === "LCS",
            );
            const readme = generateReadme(activeOnly, {
                referenceDate,
                lastUpdate: "01.06.2026, 12:00",
            });

            expect(readme).toContain("| LCS |");
            expect(readme).toContain("| LEC |");
            expect(readme).not.toContain("<details>");
            expect(readme).not.toContain("Inactive Leagues");
        });

        it("renders empty primary table and all leagues in <details> when all leagues are inactive", () => {
            const inactiveOnly = leagues.filter(
                (l) => l.name !== "LEC" && l.name !== "LCS",
            );
            const readme = generateReadme(inactiveOnly, {
                referenceDate,
                lastUpdate: "01.06.2026, 12:00",
            });

            expect(readme).toContain("<details>");
            expect(readme).toContain("<summary>Inactive Leagues (5)</summary>");
            expect(readme).toContain("| OPL |");
            expect(readme).not.toContain("| LEC |");
        });
    });

    describe("README_TEMPLATE", () => {
        it("assembles markdown with active table, inactive details block, and metadata", () => {
            const readme = README_TEMPLATE(
                "| active-row |",
                "<details>inactive</details>",
                "<a>logo</a>",
                "01.01.2026, 12:00",
            );
            expect(readme).toContain("| active-row |");
            expect(readme).toContain("<details>inactive</details>");
            expect(readme).toContain("<a>logo</a>");
            expect(readme).toContain("Last update: 01.01.2026, 12:00");
        });
    });
});
