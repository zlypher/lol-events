import "dotenv/config";
import { getAllPages, getLeagues } from "../lib/pandascore";
import type { PandaScoreLeague } from "../lib/types";

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

export function renderSingleLeagueForWeb(league: PandaScoreLeague): string {
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

export function renderLeaguesForWeb(leagues: PandaScoreLeague[]): string {
    return leagues.map(renderSingleLeagueForWeb).join("\n");
}

async function main(): Promise<void> {
    const leagues = (await getAllPages(getLeagues)).map((l) => ({
        id: l.id,
        name: l.name,
        slug: l.slug,
        image_url: l.image_url,
        url: l.url,
    }));

    leagues.sort((a, b) => a.name.localeCompare(b.name));

    console.log(renderLeagueTable(leagues));
    console.log("---");
    console.log(renderLeagues(leagues));
}

if (
    process.argv[1] &&
    import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`
) {
    main();
}
