import "dotenv/config";
import type { ICalCalendar } from "ical-generator";
import fs from "node:fs";
import pLimit from "p-limit";
import {
    hasEventChanged,
    toIcal,
    updateCalendarEvents,
} from "../lib/ical-utils";
import PandaScore, { DEFAULT_CONCURRENCY } from "../lib/pandascore";
import PandaScoreUtils from "../lib/pandascore-utils";
import type { CalendarJSON, PandaScoreLeague } from "../lib/types";

export { DEFAULT_CONCURRENCY, hasEventChanged, updateCalendarEvents };

export function outputCalendar(name: string, icalData: ICalCalendar): void {
    fs.writeFileSync(`./docs/cal/${name}.ical`, icalData.toString());
    fs.writeFileSync(
        `./docs/cal/${name}.json`,
        JSON.stringify(icalData.toJSON()),
    );
}

export async function createCalendar(
    league: PandaScoreLeague,
): Promise<ICalCalendar> {
    // Get only 20 past matches so that we don't dramatically increase the calendar,
    // but so that there are still at least some of the past events.
    const pastMatches = await PandaScore.getPastMatches(league.id, {
        page: 1,
        per_page: 20,
    });
    const runningMatches = await PandaScore.getRunningMatches(league.id);
    const upcomingMatches = await PandaScore.getUpcomingMatches(league.id);

    const relevantMatches = [
        ...pastMatches,
        ...runningMatches,
        ...upcomingMatches,
    ];

    const mappedMatches = PandaScoreUtils.mapPandaScoreResult(relevantMatches);
    return toIcal(league.name, mappedMatches);
}

export async function generateIcalCalendar(
    league: PandaScoreLeague,
): Promise<void> {
    try {
        console.log("Creating ical for", league.name);

        const icalData = await createCalendar(league);
        const jsonPath = `./docs/cal/${league.slug}.json`;
        if (fs.existsSync(jsonPath)) {
            const jsonData = JSON.parse(
                fs.readFileSync(jsonPath).toString(),
            ) as CalendarJSON;
            updateCalendarEvents(icalData, jsonData);
        }

        outputCalendar(league.slug, icalData);
    } catch (e) {
        // Don't rethrow the exception, so that the other calendars are still generated
        console.error("Error creating ical for", league.name, e);
    }
}

export async function generateAllCalendars(
    leagues: PandaScoreLeague[],
    concurrency = Number(process.env.CONCURRENCY) || DEFAULT_CONCURRENCY,
): Promise<void> {
    const limit = pLimit(concurrency);
    let completed = 0;
    console.log(
        `Generating calendars for ${leagues.length} leagues (concurrency: ${concurrency}, burst limit: 60 req/min)...`,
    );
    await Promise.all(
        leagues.map((league) =>
            limit(async () => {
                await generateIcalCalendar(league);
                completed++;
                if (completed % 10 === 0 || completed === leagues.length) {
                    console.log(
                        `Progress: ${completed}/${leagues.length} leagues completed (${Math.round((completed / leagues.length) * 100)}%)`,
                    );
                }
            }),
        ),
    );
}

async function main(): Promise<void> {
    try {
        const leagues = await PandaScore.getAllPages(PandaScore.getLeagues);
        await generateAllCalendars(leagues);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();
