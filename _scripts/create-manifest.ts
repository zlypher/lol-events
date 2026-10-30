import "dotenv/config";
import { syncManifestsAndStore } from "../lib/manifest-generator";

async function main(): Promise<void> {
    try {
        console.log(
            "Synchronizing manifests and match store from PandaScore...",
        );
        const result = await syncManifestsAndStore();
        console.log(
            `Created leagues manifest under docs/leagues.json (${result.activeLeaguesCount} active leagues)`,
        );
        if (result.matchesFetched) {
            console.log("Updated match store under data/matches.json");
        } else {
            console.log(
                "Skipped fetching matches: zero active leagues present",
            );
        }
        console.log(
            `Created teams manifest under docs/teams.json (${result.activeTeamsCount} active teams)`,
        );
        process.exit(0);
    } catch (err) {
        console.error("Error creating manifests:", err);
        process.exit(1);
    }
}

main();
