import "dotenv/config";
import { getLeagues } from "../lib/pandascore";

async function main(): Promise<void> {
    const leagues = (await getLeagues()).map((l) => {
        return { id: l.id, name: l.name };
    });
    console.log(leagues);
}

if (
    process.argv[1] &&
    import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`
) {
    main();
}
