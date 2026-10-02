import { partitionLeagues } from "./league-activity";
import type { PandaScoreLeague } from "./types";

export const TABLE_HEADER = `|                                                                                                                                                                                  | League                             |                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |`;

export const README_TEMPLATE = (
    activeCalendarString: string,
    inactiveSectionString: string,
    leagueString: string,
    lastUpdate: string,
): string => {
    const inactiveBlock = inactiveSectionString
        ? `\n\n${inactiveSectionString}`
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
${activeCalendarString}${inactiveBlock}

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

export function renderSingleLogo(
    league: PandaScoreLeague,
    width = 24,
    height = 24,
): string {
    if (!league.image_url) {
        return "-";
    }

    return `<img src="${league.image_url}" alt="${league.name} Logo" width="${width}" height="${height}" />`;
}

export function renderLeagueTable(leagues: PandaScoreLeague[]): string {
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
    inactiveLeagues: PandaScoreLeague[],
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

export function renderSingleLeague(league: PandaScoreLeague): string | null {
    if (!league.image_url) {
        return null;
    }

    return `<a href="${league.url}" target="_blank">${renderSingleLogo(
        league,
        50,
        50,
    )}</a>`;
}

export function renderLeagues(leagues: PandaScoreLeague[]): string {
    return leagues
        .map(renderSingleLeague)
        .filter((l): l is string => Boolean(l))
        .join("\n");
}

export function sortLeaguesByName(
    leagues: PandaScoreLeague[],
): PandaScoreLeague[] {
    return leagues.sort((a, b) => a.name.localeCompare(b.name));
}

export interface ReadmeOptions {
    referenceDate?: Date;
    lastUpdate?: string;
}

export function generateReadme(
    leagues: PandaScoreLeague[],
    options: ReadmeOptions = {},
): string {
    const { referenceDate = new Date(), lastUpdate } = options;

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

    return README_TEMPLATE(
        activeCalendarString,
        inactiveSectionString,
        leagueString,
        formattedLastUpdate,
    );
}

export default {
    README_TEMPLATE,
    generateReadme,
    renderInactiveSection,
    renderLeagueTable,
    renderLeagues,
    renderSingleLeague,
    renderSingleLogo,
};
