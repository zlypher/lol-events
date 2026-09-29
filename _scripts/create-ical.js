import "dotenv/config";
import fs from "node:fs";
import PandaScore from "../lib/pandascore.js";
import PandaScoreUtils from "../lib/pandascore-utils.js";
import IcalUtils from "../lib/ical-utils.js";

export function updateCalendarEvents(icalData, jsonData) {
    for (const event of icalData.events()) {
        const prevEvent = jsonData.events.find(
            (e) =>
                (String(e.uid) === String(event.uid()) ||
                    String(e.id) === String(event.id())) &&
                e.summary !== event.summary(),
        );

        if (prevEvent) {
            event.sequence(prevEvent.sequence + 1);
        }
    }
}

export function outputCalendar(name, icalData) {
    fs.writeFileSync(`./docs/cal/${name}.ical`, icalData.toString());
    fs.writeFileSync(
        `./docs/cal/${name}.json`,
        JSON.stringify(icalData.toJSON()),
    );
}

export async function createCalendar(league) {
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

export async function generateIcalCalendar(league) {
    try {
        console.log("Creating ical for", league.name);

        const icalData = await createCalendar(league);
        const jsonPath = `./docs/cal/${league.slug}.json`;
        if (fs.existsSync(jsonPath)) {
            const jsonData = JSON.parse(fs.readFileSync(jsonPath).toString());
            updateCalendarEvents(icalData, jsonData);
        }

        outputCalendar(league.slug, icalData);
    } catch (e) {
        // Don't rethrow the exception, so that the other calendars are still generated
        console.error("Error creating ical for", league.name, e);
    }
}

async function main() {
    try {
        const leagues = await PandaScore.getAllPages(PandaScore.getLeagues);
        await Promise.all(leagues.map(generateIcalCalendar));
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

// Only run automatically if executed directly as a script
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
    main();
}
