require("dotenv").config();
const { getLeagues, getAllPages } = require("../lib/pandascore");

main();

async function main() {
    const leagues = (await getAllPages(getLeagues)).map((l) => ({
        name: l.name,
        slug: l.slug,
        image_url: l.image_url,
        url: l.url,
    }));

    leagues.sort((a, b) => a.name.localeCompare(b.name));

    // console.log(renderLeaguesForWeb(leagues));
    console.log(renderLeagueTable(leagues));
    console.log("---");
    console.log(renderLeagues(leagues));
}

function renderLeagueTable(leagues) {
    return leagues
        .map(
            (league) =>
                `| ${renderSingleLogo(league, 24, 24)} | ${
                    league.name
                } | [Get ical here](output/${league.slug}.ical)|`,
        )
        .join("\n");
}

function renderLeagues(leagues) {
    return leagues
        .map(renderSingleLeague)
        .filter((l) => !!l)
        .join("\n");
}

function renderLeaguesForWeb(leagues) {
    return leagues.map(renderSingleLeagueForWeb).join("\n");
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

function renderSingleLeagueForWeb(league) {
    const icalUrl = `https://zlypher.github.io/lol-events/cal/${league.slug}.ical`;
    return `
<label
    class="border rounded p-2 flex items-center cursor-pointer"
>
    <input type="radio" name="league" class="sr-only" />
    <input type="hidden" class="js-ical" value="${icalUrl}" />
    <img
        src="${league.image_url}"
        alt="${league.name} Logo"
        width="24"
        height="24"
        class="mr-2"
    />
    <h2>${league.name}</h2>
</label>
    `;
}
