import "dotenv/config";
import { getTeams } from "../lib/pandascore.js";

async function main() {
    const options = {
        page: 1,
        per_page: 100,
    };

    const teams = (await getTeams(options)).map((l) => {
        return { id: l.id, name: l.name };
    });
    console.log(teams);
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`) {
    main();
}
