require("dotenv").config();
const pandascore = require("./lib/pandascore");
const { mapPandaScoreResult } = require("./lib/pandascore-utils");

const lcsId = 4198;

async function main() {
    // Test
    const result = await pandascore.getUpcomingMatches(lcsId);
    const mapped = mapPandaScoreResult(result);
    console.log(JSON.stringify(mapped));
}

main();
