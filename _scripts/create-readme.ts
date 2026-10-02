import "dotenv/config";
import fs from "node:fs";
import PandaScore from "../lib/pandascore";
import { generateReadme } from "../lib/readme-generator";

async function main(): Promise<void> {
    const leagues = await PandaScore.getAllPages(PandaScore.getLeagues);
    const readmeContent = generateReadme(leagues);
    fs.writeFileSync("./README.md", readmeContent);
}

main();
