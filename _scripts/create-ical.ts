import "dotenv/config";
import type { ICalCalendar, ICalEvent } from "ical-generator";
import fs from "node:fs";
import pLimit from "p-limit";
import IcalUtils from "../lib/ical-utils";
import PandaScore from "../lib/pandascore";
import PandaScoreUtils from "../lib/pandascore-utils";
import type {
    CalendarEventJSON,
    CalendarJSON,
    PandaScoreLeague,
} from "../lib/types";

export const DEFAULT_CONCURRENCY = 4;

export function hasEventChanged(
    currentEvent: ICalEvent,
    prevEvent: CalendarEventJSON,
): boolean {
    // 1. Check summary changes (teams replaced, match title changed)
    if (currentEvent.summary() !== prevEvent.summary) {
        return true;
    }

    // 2. Check start time changes (match rescheduled or delayed)
    const currentStart = currentEvent.start()
        ? new Date(currentEvent.start() as string | Date).getTime()
        : null;
    const prevStart = prevEvent.start
        ? new Date(prevEvent.start).getTime()
        : null;
    if (currentStart !== prevStart) {
        return true;
    }

    // 3. Check end time changes
    const currentEnd = currentEvent.end()
        ? new Date(currentEvent.end() as string | Date).getTime()
        : null;
    const prevEnd = prevEvent.end ? new Date(prevEvent.end).getTime() : null;
    if (currentEnd !== prevEnd) {
        return true;
    }

    return false;
}

export function updateCalendarEvents(
    icalData: ICalCalendar,
    jsonData: CalendarJSON,
): void {
    if (!jsonData?.events || !Array.isArray(jsonData.events)) {
        return;
    }

    for (const event of icalData.events()) {
        const prevEvent = jsonData.events.find(
            (e) =>
                String(e.uid) === String(event.uid()) ||
                String(e.id) === String(event.id()),
        );

        if (prevEvent) {
            const prevSeq =
                typeof prevEvent.sequence === "number" ? prevEvent.sequence : 1;
            if (hasEventChanged(event, prevEvent)) {
                event.sequence(prevSeq + 1);
            } else {
                event.sequence(prevSeq);
            }
        }
    }
}

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
    return IcalUtils.toIcal(league.name, mappedMatches);
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
    console.log(
        `Generating calendars for ${leagues.length} leagues (concurrency: ${concurrency})...`,
    );
    await Promise.all(
        leagues.map((league) => limit(() => generateIcalCalendar(league))),
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

if (
    process.argv[1] &&
    import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`
) {
    main();
}
