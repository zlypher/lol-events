import fs from "node:fs";
import { loadLeaguesManifest } from "../lib/manifest-generator";
import { generateReadme } from "../lib/readme-generator";

function main(): void {
    try {
        const leaguesManifest = loadLeaguesManifest("./docs/leagues.json");
        if (!leaguesManifest) {
            console.error(
                "Leagues manifest not found at ./docs/leagues.json. Run npm run scripts:manifest first.",
            );
            process.exit(1);
        }

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
