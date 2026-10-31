import { describe, expect, it } from "vitest";
import { generateLeaguesManifest } from "../lib/manifest-generator";
import {
    DEFAULT_TEAM_CALENDAR_BASE_URL,
    generateReadme,
    getTeamCalendarUrl,
    getTeamLogoUrl,
    partitionTeams,
    README_TEMPLATE,
    renderInactiveSection,
    renderInactiveTeamSection,
    renderSingleTeamLogo,
    renderTeamCalendarSection,
    renderTeamTable,
    sortTeamsByName,
    TEAM_TABLE_HEADER,
} from "../lib/readme-generator";
import type {
    PandaScoreLeague,
    TeamInfo,
    TeamManifestItem,
} from "../lib/types";
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

    describe("team utilities", () => {
        const teamWithLogoUrl: TeamManifestItem = {
            id: 1533,
            name: "T1",
            slug: "t1",
            acronym: "T1",
            logoUrl: "https://example.com/t1.png",
            calendarUrl:
                "https://zlypher.github.io/lol-events/cal/team/1533.ical",
            jsonUrl: "https://zlypher.github.io/lol-events/cal/team/1533.json",
        };

        const teamWithImageUrl: TeamInfo = {
            id: 100,
            name: "Gen.G",
            imageUrl: "https://example.com/geng.png",
        };

        const teamWithoutLogo: TeamInfo = {
            id: 200,
            name: "No Logo Team",
        };

        describe("getTeamLogoUrl and renderSingleTeamLogo", () => {
            it("extracts logo URL from logoUrl, imageUrl, or image_url", () => {
                expect(getTeamLogoUrl(teamWithLogoUrl)).toBe(
                    "https://example.com/t1.png",
                );
                expect(getTeamLogoUrl(teamWithImageUrl)).toBe(
                    "https://example.com/geng.png",
                );
                expect(getTeamLogoUrl(teamWithoutLogo)).toBeNull();
                expect(
                    getTeamLogoUrl({
                        id: 300,
                        name: "Panda Team",
                        image_url: "https://example.com/panda.png",
                    }),
                ).toBe("https://example.com/panda.png");
            });

            it("renders img tag when logo URL exists and dash when missing", () => {
                expect(renderSingleTeamLogo(teamWithLogoUrl)).toBe(
                    '<img src="https://example.com/t1.png" alt="T1 Logo" width="24" height="24" />',
                );
                expect(renderSingleTeamLogo(teamWithoutLogo)).toBe("-");
            });
        });

        describe("getTeamCalendarUrl", () => {
            it("uses calendarUrl if present on team object", () => {
                expect(getTeamCalendarUrl(teamWithLogoUrl)).toBe(
                    "https://zlypher.github.io/lol-events/cal/team/1533.ical",
                );
            });

            it("constructs team calendar URL with numeric id when calendarUrl is absent", () => {
                expect(getTeamCalendarUrl(teamWithImageUrl)).toBe(
                    `${DEFAULT_TEAM_CALENDAR_BASE_URL}/100.ical`,
                );
            });

            it("supports custom baseUrl", () => {
                expect(
                    getTeamCalendarUrl(
                        teamWithImageUrl,
                        "https://custom.com/team",
                    ),
                ).toBe("https://custom.com/team/100.ical");
            });
        });

        describe("renderTeamTable", () => {
            it("renders markdown table rows for teams", () => {
                const rows = renderTeamTable([
                    teamWithLogoUrl,
                    teamWithoutLogo,
                ]);
                expect(rows).toBe(
                    '| <img src="https://example.com/t1.png" alt="T1 Logo" width="24" height="24" /> | T1 | https://zlypher.github.io/lol-events/cal/team/1533.ical\n| - | No Logo Team | https://zlypher.github.io/lol-events/cal/team/200.ical',
                );
            });
        });

        describe("renderInactiveTeamSection", () => {
            it("renders a details block when inactive teams are provided", () => {
                const result = renderInactiveTeamSection([teamWithoutLogo]);
                expect(result).toContain("<details>");
                expect(result).toContain(
                    "<summary>Inactive Teams (1)</summary>",
                );
                expect(result).toContain(TEAM_TABLE_HEADER);
                expect(result).toContain(
                    "| - | No Logo Team | https://zlypher.github.io/lol-events/cal/team/200.ical",
                );
                expect(result).toContain("</details>");
            });

            it("returns empty string when inactive teams list is empty", () => {
                expect(renderInactiveTeamSection([])).toBe("");
            });
        });

        describe("sortTeamsByName", () => {
            it("sorts teams alphabetically by name", () => {
                const teams = [
                    { id: 1, name: "T1" },
                    { id: 2, name: "Cloud9" },
                    { id: 3, name: "Fnatic" },
                ];
                sortTeamsByName(teams);
                expect(teams.map((t) => t.name)).toEqual([
                    "Cloud9",
                    "Fnatic",
                    "T1",
                ]);
            });
        });

        describe("partitionTeams", () => {
            it("partitions teams based on active property", () => {
                const teams = [
                    { id: 1, name: "Active 1" },
                    { id: 2, name: "Active 2", active: true },
                    { id: 3, name: "Inactive 1", active: false },
                ];
                const { active, inactive } = partitionTeams(teams);
                expect(active.map((t) => t.name)).toEqual([
                    "Active 1",
                    "Active 2",
                ]);
                expect(inactive.map((t) => t.name)).toEqual(["Inactive 1"]);
            });
        });

        describe("renderTeamCalendarSection", () => {
            it("assembles team section with active table and inactive details", () => {
                const activeTeams = [teamWithLogoUrl];
                const inactiveTeams = [teamWithoutLogo];
                const lastUpdate = "31.10.2026, 12:00";

                const section = renderTeamCalendarSection(
                    activeTeams,
                    inactiveTeams,
                    lastUpdate,
                );

                expect(section).toContain("## Calendars by Team");
                expect(section).toContain(`Last update: ${lastUpdate}`);
                expect(section).toContain(TEAM_TABLE_HEADER);
                expect(section).toContain("| T1 |");
                expect(section).toContain(
                    "<summary>Inactive Teams (1)</summary>",
                );
                expect(section).toContain("| No Logo Team |");
            });
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

        it("produces identical output when given precomputed manifest league items as when given raw league objects", () => {
            const manifest = generateLeaguesManifest(leagues, {
                referenceDate,
            });

            const readmeFromRaw = generateReadme(leagues, {
                referenceDate,
                lastUpdate: "01.06.2026, 12:00",
            });
            const readmeFromManifest = generateReadme(manifest.leagues, {
                referenceDate,
                lastUpdate: "01.06.2026, 12:00",
            });

            expect(readmeFromManifest).toBe(readmeFromRaw);
        });

        it("omits ## Calendars by Team section when teams option is not provided", () => {
            const readme = generateReadme(leagues, {
                referenceDate,
                lastUpdate: "01.06.2026, 12:00",
            });
            expect(readme).not.toContain("## Calendars by Team");
        });

        it("renders ## Calendars by Team with active and inactive teams when teams option is provided", () => {
            const teams = [
                {
                    id: 1,
                    name: "T1",
                    slug: "t1",
                    logoUrl: "https://example.com/t1.png",
                    calendarUrl:
                        "https://zlypher.github.io/lol-events/cal/team/1.ical",
                    jsonUrl:
                        "https://zlypher.github.io/lol-events/cal/team/1.json",
                },
                {
                    id: 2,
                    name: "Cloud9",
                    slug: "cloud9",
                    logoUrl: null,
                    calendarUrl:
                        "https://zlypher.github.io/lol-events/cal/team/2.ical",
                    jsonUrl:
                        "https://zlypher.github.io/lol-events/cal/team/2.json",
                },
                {
                    id: 3,
                    name: "Old Team",
                    slug: "old-team",
                    logoUrl: null,
                    calendarUrl:
                        "https://zlypher.github.io/lol-events/cal/team/3.ical",
                    jsonUrl:
                        "https://zlypher.github.io/lol-events/cal/team/3.json",
                    active: false,
                },
            ];

            const readme = generateReadme(leagues, {
                referenceDate,
                lastUpdate: "01.06.2026, 12:00",
                teams,
            });

            expect(readme).toContain("## Calendars by Team");
            const teamSection = readme.split("## Calendars by Team")[1];
            const gettingStartedSection =
                teamSection.split("## Getting Started")[0];

            // Primary table contains sorted active teams (Cloud9 before T1)
            const [primaryTablePart, inactivePart] =
                gettingStartedSection.split("<details>");
            expect(primaryTablePart).toContain("| Cloud9 |");
            expect(primaryTablePart).toContain("| T1 |");
            expect(primaryTablePart).not.toContain("| Old Team |");

            const c9Index = primaryTablePart.indexOf("| Cloud9 |");
            const t1Index = primaryTablePart.indexOf("| T1 |");
            expect(c9Index).toBeLessThan(t1Index);

            // Inactive section contains Old Team
            expect(inactivePart).toContain(
                "<summary>Inactive Teams (1)</summary>",
            );
            expect(inactivePart).toContain("| Old Team |");
        });

        it("omits inactive teams details section when all teams are active", () => {
            const teams = [
                {
                    id: 1,
                    name: "T1",
                    calendarUrl:
                        "https://zlypher.github.io/lol-events/cal/team/1.ical",
                },
            ];

            const readme = generateReadme(leagues, {
                referenceDate,
                lastUpdate: "01.06.2026, 12:00",
                teams,
            });

            expect(readme).toContain("## Calendars by Team");
            const teamSection = readme.split("## Calendars by Team")[1];
            expect(teamSection).toContain("| T1 |");
            expect(teamSection).not.toContain("Inactive Teams");
            expect(teamSection).not.toContain("<details>");
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

        it("assembles markdown with team section placed between league section and Getting Started", () => {
            const readme = README_TEMPLATE(
                "| league-row |",
                "<details>inactive-league</details>",
                "<a>logo</a>",
                "01.01.2026, 12:00",
                "## Calendars by Team\n\n| team-row |",
            );

            expect(readme).toContain("## Calendars by Team\n\n| team-row |");
            const leagueIndex = readme.indexOf("## Calendars by League");
            const teamIndex = readme.indexOf("## Calendars by Team");
            const gettingStartedIndex = readme.indexOf("## Getting Started");

            expect(leagueIndex).toBeLessThan(teamIndex);
            expect(teamIndex).toBeLessThan(gettingStartedIndex);
        });
    });
});
