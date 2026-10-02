import "dotenv/config";
import { generateAllCalendars } from "../lib/calendar-generator";
import PandaScore from "../lib/pandascore";

async function main(): Promise<void> {
    try {
        const leagues = await PandaScore.getAllPages(PandaScore.getLeagues);
        await generateAllCalendars(leagues);
        process.exit(0);
    } catch (err) {
        console.error("Error:", err);
        process.exit(1);
    }
}

main();
