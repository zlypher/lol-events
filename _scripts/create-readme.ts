import fs from "node:fs";
import {
    loadLeaguesManifest,
    loadTeamsManifest,
} from "../lib/manifest-generator";
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

        const teamsManifest = loadTeamsManifest("./docs/teams.json");

        const readmeContent = generateReadme(leaguesManifest.leagues, {
            teams: teamsManifest?.teams ?? [],
        });
        fs.writeFileSync("./README.md", readmeContent);
        console.log("Updated README.md from leagues and teams manifests.");
        process.exit(0);
    } catch (err) {
        console.error("Error creating README:", err);
        process.exit(1);
    }
}

main();
