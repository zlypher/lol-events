require("dotenv").config();
const fs = require("fs");
const PandaScore = require("../lib/pandascore");
const PandaScoreUtils = require("../lib/pandascore-utils");
const IcalUtils = require("../lib/ical-utils");

(async function main() {
    try {
        const leagues = await PandaScore.getAllPages(PandaScore.getLeagues);
        await Promise.all(leagues.map(generateIcalCalendar));
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
})();

async function generateIcalCalendar(league) {
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

async function createCalendar(league) {
    // Get only 20 past matches so that we don't dramatically increase the calender,
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

function updateCalendarEvents(icalData, jsonData) {
    for (const event of icalData.events()) {
        const prevEvent = jsonData.events.find(
            (e) => e.uid === event.uid() && e.summary !== event.summary(),
        );

        if (prevEvent) {
            event.sequence(prevEvent.sequence + 1);
        }
    }
}

function outputCalendar(name, icalData) {
    fs.writeFileSync(`./docs/cal/${name}.ical`, icalData.toString());
    fs.writeFileSync(
        `./docs/cal/${name}.json`,
        JSON.stringify(icalData.toJSON()),
    );
}
