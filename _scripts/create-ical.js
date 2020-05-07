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

    // TODO: Load previous json and increase sequence for existing events

    const matches = await PandaScore.getUpcomingMatches(league.id);
    const mappedMatches = PandaScoreUtils.mapPandaScoreResult(matches);
    const icalData = IcalUtils.toIcal(league.name, mappedMatches);
    fs.writeFileSync(`./output/${league.slug}.ical`, icalData.toString());
    fs.writeFileSync(
        `./output/${league.slug}.json`,
        JSON.stringify(icalData.toJSON()),
    );
}
