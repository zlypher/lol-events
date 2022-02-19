require("dotenv").config();
const { getLeagues } = require("../lib/pandascore");

main();

async function main() {
    const leagues = (await getLeagues()).map((l) => {
        return { id: l.id, name: l.name };
    });
    console.log(leagues);
}
