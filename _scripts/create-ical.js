require("dotenv").config();
const fs = require("fs");
const PandaScore = require("../lib/pandascore");
const PandaScoreUtils = require("../lib/pandascore-utils");
const IcalUtils = require("../lib/ical-utils");

(async function main() {
    try {
        const leagues = await PandaScore.getLeagues();
        await Promise.all(leagues.map(generateIcalCalendar));
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
})();

async function generateIcalCalendar(league) {
    console.log("Creating ical for", league.name);

    const icalData = await createCalendar(league);
    const jsonPath = `./output/${league.slug}.json`;
    if (fs.existsSync(jsonPath)) {
        const jsonData = JSON.parse(fs.readFileSync(jsonPath).toString());
        updateCalendarEvents(icalData, jsonData);
    }

    outputCalendar(league.slug, icalData);
}

async function createCalendar(league) {
    const matches = await PandaScore.getUpcomingMatches(league.id);
    const mappedMatches = PandaScoreUtils.mapPandaScoreResult(matches);
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
    fs.writeFileSync(`./output/${name}.ical`, icalData.toString());
    fs.writeFileSync(
        `./output/${name}.json`,
        JSON.stringify(icalData.toJSON()),
    );
}
