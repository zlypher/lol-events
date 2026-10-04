import "dotenv/config";
import fs from "node:fs";
import {
    generateLeaguesManifest,
    generateTeamsManifest,
    serializeLeaguesManifest,
    serializeTeamsManifest,
} from "../lib/manifest-generator";
import {
    extractActiveTeamsFromMatchStore,
    loadMatchStore,
} from "../lib/match-store";
import PandaScore from "../lib/pandascore";

async function main(): Promise<void> {
    try {
        const leagues = await PandaScore.getAllPages(PandaScore.getLeagues);
        const leaguesManifest = generateLeaguesManifest(leagues);
        fs.writeFileSync(
            "./docs/leagues.json",
            serializeLeaguesManifest(leaguesManifest),
        );
        console.log("Created leagues manifest under docs/leagues.json");

        const store = loadMatchStore();
        const activeTeams = extractActiveTeamsFromMatchStore(store);
        const teamsManifest = generateTeamsManifest(activeTeams);
        fs.writeFileSync(
            "./docs/teams.json",
            serializeTeamsManifest(teamsManifest),
        );
        console.log(
            `Created teams manifest under docs/teams.json (${activeTeams.length} active teams)`,
        );
    } catch (err) {
        console.error("Error creating manifests:", err);
        process.exit(1);
    }
}

main();
