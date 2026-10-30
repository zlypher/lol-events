import fs from "node:fs";
import { generateAllCalendars } from "../lib/calendar-generator";
import { loadMatchStore } from "../lib/match-store";
import type { LeaguesManifest, TeamsManifest } from "../lib/types";

async function main(): Promise<void> {
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

        const teamsPath = "./docs/teams.json";
        let activeTeams;
        if (fs.existsSync(teamsPath)) {
            const teamsManifest = JSON.parse(
                fs.readFileSync(teamsPath, "utf-8"),
            ) as TeamsManifest;
            activeTeams = teamsManifest.teams;
        }

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
