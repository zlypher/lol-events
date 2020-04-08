require("dotenv").config();
const fs = require("fs");
const PandaScore = require("../lib/pandascore");
const PandaScoreUtils = require("../lib/pandascore-utils");
const IcalUtils = require("../lib/ical-utils");

main();

async function main() {
    const leagues = await PandaScore.getLeagues();
    leagues.forEach(generateIcalCalendar);
}

async function generateIcalCalendar(league) {
    console.log("Creating ical for", league.name);

    const matches = await PandaScore.getUpcomingMatches(league.id);
    const mappedMatches = PandaScoreUtils.mapPandaScoreResult(matches);
    const icalData = IcalUtils.toIcal(mappedMatches);
    fs.writeFileSync(`./output/${league.slug}.ical`, icalData);
}
