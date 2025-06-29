require("dotenv").config();
const fs = require("fs");
const { getLeagues, getAllPages } = require("../lib/pandascore");

main();

const README_TEMPLATE = (
    calendarString,
    leagueString,
    lastUpdate,
) => `# League of Legends - Event Calendar

![Update iCal](https://github.com/zlypher/lol-events/workflows/Update%20iCal/badge.svg)
[![MIT license](https://img.shields.io/badge/License-MIT-blue.svg)](https://lbesson.mit-license.org/)

League of Legends - Event Calendar offers multiple calendars in an \`.ical\` format, so that you can keep track of all your favourite leagues.

Data and Images from [PandaScore](https://pandascore.co/)

## General

The \`.ical\` files for all leagues are updated daily. The last update date can be found in \`output/INFO.md\` and all \`.ical\` files are kept up to date under \`output/\`.

## Calendars by League

Last update: ${lastUpdate}

|                                                                                                                                                                                  | League                             |                                                                                                    |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------- |
${calendarString}

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

async function main() {
    const leagues = (await getAllPages(getLeagues)).map((l) => ({
        name: l.name,
        slug: l.slug,
        image_url: l.image_url,
        url: l.url,
    }));

    leagues.sort((a, b) => a.name.localeCompare(b.name));

    const calendarString = renderLeagueTable(leagues);
    const leagueString = renderLeagues(leagues);
    const lastUpdate = new Intl.DateTimeFormat("de-DE", {
        dateStyle: "medium",
        timeStyle: "short",
    }).format(new Date());

    const readmeContent = README_TEMPLATE(
        calendarString,
        leagueString,
        lastUpdate,
    );
    fs.writeFileSync("./README.md", readmeContent);
}

function renderLeagueTable(leagues) {
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

function renderLeagues(leagues) {
    return leagues
        .map(renderSingleLeague)
        .filter((l) => !!l)
        .join("\n");
}

function renderSingleLeague(league) {
    if (!league.image_url) {
        return null;
    }

    return `<a href="${league.url}" target="_blank">${renderSingleLogo(
        league,
        50,
        50,
    )}</a>`;
}

function renderSingleLogo(league, width = 24, height = 24) {
    if (!league.image_url) {
        return "-";
    }

    return `<img src="${league.image_url}" alt="${league.name} Logo" width="50" height="50" />`;
}
