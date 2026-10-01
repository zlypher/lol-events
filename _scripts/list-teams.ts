import "dotenv/config";
import { getTeams } from "../lib/pandascore";

async function main(): Promise<void> {
    const options = {
        page: 1,
        per_page: 100,
    };

    const teams = (await getTeams(options)).map((l) => {
        return { id: l.id, name: l.name };
    });
    console.log(teams);
}

if (
    process.argv[1] &&
    import.meta.url === `file:///${process.argv[1].replace(/\\/g, "/")}`
) {
    main();
}
