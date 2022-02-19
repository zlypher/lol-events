require("dotenv").config();
const { getUpcomingMatches } = require("../lib/pandascore");

main();

async function main() {
    const options = {
        filter: {
            opponent_id: 387,
        },
        page: 1,
        per_page: 100,
    };

    const matches = (await getUpcomingMatches(4198, options)).map((l) => {
        return {
            name: l.name,
            date: l.scheduled_at,
        };
    });
    console.log(matches);
}
