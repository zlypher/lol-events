import { DEFAULT_TEAM_CALENDAR_BASE_URL } from "./manifest-generator";
import { partitionLeagues } from "./league-activity";
import type {
    LeagueManifestItem,
    PandaScoreLeague,
    PandaScoreTeam,
    TeamInfo,
    TeamManifestItem,
} from "./types";

export { DEFAULT_TEAM_CALENDAR_BASE_URL };

export const TABLE_HEADER = `|                                                                                                                                                                                  | League                             |                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |`;

export const TEAM_TABLE_HEADER = `|                                                                                                                                                                                  | Team                               |                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |`;

export const README_TEMPLATE = (
    activeCalendarString: string,
    inactiveSectionString: string,
    leagueString: string,
    lastUpdate: string,
    teamCalendarSectionString?: string,
): string => {
    const inactiveBlock = inactiveSectionString
        ? `\n\n${inactiveSectionString}`
        : "";

    const teamBlock = teamCalendarSectionString
        ? `\n\n${teamCalendarSectionString}`
        : "";

    return `# League of Legends - Event Calendar

![Update iCal](https://github.com/zlypher/lol-events/workflows/Update%20iCal/badge.svg)
[![MIT license](https://img.shields.io/badge/License-MIT-blue.svg)](https://lbesson.mit-license.org/)

League of Legends - Event Calendar offers multiple calendars in an \`.ical\` format, so that you can keep track of all your favourite leagues.

Data and Images from [PandaScore](https://pandascore.co/)

## General

The \`.ical\` files for all leagues are updated daily. The last update date can be found in \`output/INFO.md\` and all \`.ical\` files are kept up to date under \`output/\`.

## Calendars by League

Last update: ${lastUpdate}

${TABLE_HEADER}
${activeCalendarString}${inactiveBlock}${teamBlock}

## Getting Started

### Google Calendar (web)

See official steps here: [Sync your calendar with computer programs](https://support.google.com/calendar/answer/37648?hl=en#view_only)

1. Open Google Calendar: https://calendar.google.com/
2. In the left sidebar click on the "+" next to "Other calendars"
3. Select "From URL" from the dropdown
4. Paste the URL of the league .ical in the preselected textfield
5. Click "Add calendar"

## Supported Leagues

Last update: ${lastUpdate}

${leagueString}

## Further Resources

-   [Official LoL Esports Schedule](https://watch.lolesports.com/schedule)
-   [Liquipedia League of Legends](https://liquipedia.net/leagueoflegends/Main_Page)
-   [PandaScore](https://pandascore.co/)

## Known Issues

-   There doesn't seem to be a way to tell Google Calendar when to update, so it might take some time until changed/new events show up

## License

[MIT License](LICENSE)
`;
};

export function getLeagueLogoUrl(
    league: PandaScoreLeague | LeagueManifestItem,
): string | null {
    return "logoUrl" in league ? league.logoUrl : (league.image_url ?? null);
}

export function renderSingleLogo(
    league: PandaScoreLeague | LeagueManifestItem,
    width = 24,
    height = 24,
): string {
    const imageUrl = getLeagueLogoUrl(league);
    if (!imageUrl) {
        return "-";
    }

    return `<img src="${imageUrl}" alt="${league.name} Logo" width="${width}" height="${height}" />`;
}

export function renderLeagueTable(
    leagues: (PandaScoreLeague | LeagueManifestItem)[],
): string {
    return leagues
        .map(
            (league) =>
                `| ${renderSingleLogo(league, 24, 24)} | ${
                    league.name
                } | https://zlypher.github.io/lol-events/cal/${
                    league.slug
                }.ical`,
        )
        .join("\n");
}

export function renderInactiveSection(
    inactiveLeagues: (PandaScoreLeague | LeagueManifestItem)[],
): string {
    if (!inactiveLeagues || inactiveLeagues.length === 0) {
        return "";
    }

    const rows = renderLeagueTable(inactiveLeagues);
    return `<details>
<summary>Inactive Leagues (${inactiveLeagues.length})</summary>

${TABLE_HEADER}
${rows}

</details>`;
}

export function renderSingleLeague(
    league: PandaScoreLeague | LeagueManifestItem,
): string | null {
    const imageUrl = getLeagueLogoUrl(league);
    if (!imageUrl) {
        return null;
    }

    return `<a href="${league.url}" target="_blank">${renderSingleLogo(
        league,
        50,
        50,
    )}</a>`;
}

export function renderLeagues(
    leagues: (PandaScoreLeague | LeagueManifestItem)[],
): string {
    return leagues
        .map(renderSingleLeague)
        .filter((l): l is string => Boolean(l))
        .join("\n");
}

export function sortLeaguesByName<
    T extends PandaScoreLeague | LeagueManifestItem,
>(leagues: T[]): T[] {
    return leagues.sort((a, b) => a.name.localeCompare(b.name));
}

export function getTeamLogoUrl(
    team: TeamInfo | TeamManifestItem | PandaScoreTeam,
): string | null {
    if ("logoUrl" in team && team.logoUrl !== undefined) {
        return team.logoUrl;
    }
    if ("imageUrl" in team && team.imageUrl !== undefined) {
        return team.imageUrl;
    }
    if ("image_url" in team && team.image_url !== undefined) {
        return team.image_url;
    }
    return null;
}

export function renderSingleTeamLogo(
    team: TeamInfo | TeamManifestItem | PandaScoreTeam,
    width = 24,
    height = 24,
): string {
    const imageUrl = getTeamLogoUrl(team);
    if (!imageUrl) {
        return "-";
    }

    return `<img src="${imageUrl}" alt="${team.name} Logo" width="${width}" height="${height}" />`;
}

export function getTeamCalendarUrl(
    team: TeamInfo | TeamManifestItem | PandaScoreTeam,
    baseUrl = DEFAULT_TEAM_CALENDAR_BASE_URL,
): string {
    if ("calendarUrl" in team && team.calendarUrl) {
        return team.calendarUrl;
    }
    return `${baseUrl}/${team.id}.ical`;
}

export function renderTeamTable(
    teams: (TeamInfo | TeamManifestItem | PandaScoreTeam)[],
    baseUrl?: string,
): string {
    return teams
        .map(
            (team) =>
                `| ${renderSingleTeamLogo(team, 24, 24)} | ${
                    team.name
                } | ${getTeamCalendarUrl(team, baseUrl)}`,
        )
        .join("\n");
}

export function renderInactiveTeamSection(
    inactiveTeams: (TeamInfo | TeamManifestItem | PandaScoreTeam)[],
    baseUrl?: string,
): string {
    if (!inactiveTeams || inactiveTeams.length === 0) {
        return "";
    }

    const rows = renderTeamTable(inactiveTeams, baseUrl);
    return `<details>
<summary>Inactive Teams (${inactiveTeams.length})</summary>

${TEAM_TABLE_HEADER}
${rows}

</details>`;
}

export function sortTeamsByName<
    T extends TeamInfo | TeamManifestItem | PandaScoreTeam,
>(teams: T[]): T[] {
    return teams.sort((a, b) => a.name.localeCompare(b.name));
}

export function partitionTeams<
    T extends TeamInfo | TeamManifestItem | PandaScoreTeam,
>(teams: T[]): { active: T[]; inactive: T[] } {
    const active: T[] = [];
    const inactive: T[] = [];

    for (const team of teams) {
        if ("active" in team && team.active === false) {
            inactive.push(team);
        } else {
            active.push(team);
        }
    }

    return { active, inactive };
}

export function renderTeamCalendarSection(
    activeTeams: (TeamInfo | TeamManifestItem | PandaScoreTeam)[],
    inactiveTeams: (TeamInfo | TeamManifestItem | PandaScoreTeam)[] = [],
    lastUpdate?: string,
    baseUrl?: string,
): string {
    const activeRows = renderTeamTable(activeTeams, baseUrl);
    const inactiveSection = renderInactiveTeamSection(inactiveTeams, baseUrl);
    const inactiveBlock = inactiveSection ? `\n\n${inactiveSection}` : "";
    const updateLine = lastUpdate ? `\n\nLast update: ${lastUpdate}` : "";

    return `## Calendars by Team${updateLine}

${TEAM_TABLE_HEADER}
${activeRows}${inactiveBlock}`;
}

export interface ReadmeOptions {
    referenceDate?: Date;
    lastUpdate?: string;
    teams?: (TeamInfo | TeamManifestItem | PandaScoreTeam)[];
    baseUrl?: string;
}

export function generateReadme(
    leagues: (PandaScoreLeague | LeagueManifestItem)[],
    options: ReadmeOptions = {},
): string {
    const { referenceDate = new Date(), lastUpdate, teams, baseUrl } = options;

    const { active, inactive } = partitionLeagues(leagues, referenceDate);

    sortLeaguesByName(active);
    sortLeaguesByName(inactive);

    const activeCalendarString = renderLeagueTable(active);
    const inactiveSectionString = renderInactiveSection(inactive);

    const allSortedLeagues = sortLeaguesByName([...leagues]);
    const leagueString = renderLeagues(allSortedLeagues);

    const formattedLastUpdate =
        lastUpdate ??
        new Intl.DateTimeFormat("de-DE", {
            dateStyle: "medium",
            timeStyle: "short",
        }).format(referenceDate);

    let teamSectionString: string | undefined;
    if (teams && teams.length > 0) {
        const { active: activeTeams, inactive: inactiveTeams } =
            partitionTeams(teams);
        sortTeamsByName(activeTeams);
        sortTeamsByName(inactiveTeams);

        teamSectionString = renderTeamCalendarSection(
            activeTeams,
            inactiveTeams,
            formattedLastUpdate,
            baseUrl,
        );
    }

    return README_TEMPLATE(
        activeCalendarString,
        inactiveSectionString,
        leagueString,
        formattedLastUpdate,
        teamSectionString,
    );
}

export default {
    DEFAULT_TEAM_CALENDAR_BASE_URL,
    README_TEMPLATE,
    TABLE_HEADER,
    TEAM_TABLE_HEADER,
    generateReadme,
    getLeagueLogoUrl,
    getTeamCalendarUrl,
    getTeamLogoUrl,
    partitionTeams,
    renderInactiveSection,
    renderInactiveTeamSection,
    renderLeagueTable,
    renderLeagues,
    renderSingleLeague,
    renderSingleLogo,
    renderSingleTeamLogo,
    renderTeamCalendarSection,
    renderTeamTable,
    sortLeaguesByName,
    sortTeamsByName,
};
