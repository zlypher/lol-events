import fs from "node:fs";
import { generateReadme } from "../lib/readme-generator";
import type { LeaguesManifest } from "../lib/types";

function main(): void {
    try {
        const leaguesPath = "./docs/leagues.json";
        if (!fs.existsSync(leaguesPath)) {
            console.error(
                `Leagues manifest not found at ${leaguesPath}. Run npm run scripts:manifest first.`,
            );
            process.exit(1);
        }

        const leaguesManifest = JSON.parse(
            fs.readFileSync(leaguesPath, "utf-8"),
        ) as LeaguesManifest;

        const readmeContent = generateReadme(leaguesManifest.leagues);
        fs.writeFileSync("./README.md", readmeContent);
        console.log("Updated README.md from leagues manifest.");
        process.exit(0);
    } catch (err) {
        console.error("Error creating README:", err);
        process.exit(1);
    }
}

main();
