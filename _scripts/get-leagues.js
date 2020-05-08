require("dotenv").config();
const { getLeagues } = require("../lib/pandascore");

main();

async function main() {
    const leagues = (await getLeagues()).map((l) => ({
        name: l.name,
        slug: l.slug,
        image_url: l.image_url,
        url: l.url,
    }));

    console.log(renderLeagueTable(leagues));
    // console.log(renderLeagues(leagues));
}

function renderLeagueTable(leagues) {
    return leagues
        .map(
            (league) =>
                `| <img src="${league.image_url}" alt="${league.name} Logo" width="24" height="24" /> | ${league.name} | [Get ical here](output/${league.slug}.ical)|`,
        )
        .join("\n");
}

function renderLeagues(leagues) {
    return leagues.map(renderSingleLeague).join("\n");
}

function renderSingleLeague(league) {
    return `<a href="${league.url}" target="_blank"><img src="${league.image_url}" alt="${league.name} Logo" width="100" height="100" /></a>`;
}
