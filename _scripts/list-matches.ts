import "dotenv/config";
import { getUpcomingMatches } from "../lib/pandascore";

async function main(): Promise<void> {
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

if (
    process.argv[1] &&
    import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`
) {
    main();
}
