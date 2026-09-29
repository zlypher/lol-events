import "dotenv/config";
import { getLeagues } from "../lib/pandascore.js";

async function main() {
    const leagues = (await getLeagues()).map((l) => {
        return { id: l.id, name: l.name };
    });
    console.log(leagues);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
    main();
}
