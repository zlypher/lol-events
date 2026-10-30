import { generateAllCalendars } from "../lib/calendar-generator";
import {
    loadLeaguesManifest,
    loadTeamsManifest,
} from "../lib/manifest-generator";
import { loadMatchStore } from "../lib/match-store";

async function main(): Promise<void> {
    try {
        const leaguesManifest = loadLeaguesManifest("./docs/leagues.json");
        if (!leaguesManifest) {
            console.error(
                "Leagues manifest not found at ./docs/leagues.json. Run npm run scripts:manifest first.",
            );
            process.exit(1);
        }

        const teamsManifest = loadTeamsManifest("./docs/teams.json");
        const activeTeams = teamsManifest?.teams;
        const matchStore = loadMatchStore("./data/matches.json");

        await generateAllCalendars(leaguesManifest.leagues, {
            matchStore,
            activeTeams,
        });
        process.exit(0);
    } catch (err) {
        console.error("Error creating ical files:", err);
        process.exit(1);
    }
}

main();
