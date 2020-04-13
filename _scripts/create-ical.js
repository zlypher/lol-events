require("dotenv").config();
const fs = require("fs");
const PandaScore = require("../lib/pandascore");
const PandaScoreUtils = require("../lib/pandascore-utils");
const IcalUtils = require("../lib/ical-utils");

(async function main() {
    try {
        const leagues = await PandaScore.getLeagues();
        leagues.forEach(generateIcalCalendar);
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
})();

async function generateIcalCalendar(league) {
    console.log("Creating ical for", league.name);

    const matches = await PandaScore.getUpcomingMatches(league.id);
    const mappedMatches = PandaScoreUtils.mapPandaScoreResult(matches);
    const icalData = IcalUtils.toIcal(league.name, mappedMatches);
    fs.writeFileSync(`./output/${league.slug}.ical`, icalData);
}
