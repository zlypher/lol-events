import "dotenv/config";
import fs from "node:fs";
import {
    generateLeaguesManifest,
    serializeLeaguesManifest,
} from "../lib/manifest-generator";
import PandaScore from "../lib/pandascore";

async function main(): Promise<void> {
    try {
        const leagues = await PandaScore.getAllPages(PandaScore.getLeagues);
        const manifest = generateLeaguesManifest(leagues);
        fs.writeFileSync(
            "./docs/leagues.json",
            serializeLeaguesManifest(manifest),
        );
        console.log("Created leagues manifest under docs/leagues.json");
    } catch (err) {
        console.error("Error creating manifest:", err);
        process.exit(1);
    }
}

main();
