import type { ICalCalendar } from "ical-generator";
import fs from "node:fs";
import path from "node:path";
import pLimit from "p-limit";
import { toIcal } from "./ical-utils";
import { isLeagueActive, partitionLeagues } from "./league-activity";
import PandaScore, { DEFAULT_CONCURRENCY } from "./pandascore";
import {
    getMatchesForLeague,
    loadMatchStore,
    saveMatchStore,
    updateMatchStore,
} from "./match-store";
import type { MatchStore, PandaScoreLeague } from "./types";

export interface CalendarGenerationOptions {
    concurrency?: number;
    referenceDate?: Date;
    outputDir?: string;
    matchStore?: MatchStore;
}

export function outputCalendar(
    name: string,
    icalData: ICalCalendar,
    outputDir = "./docs/cal",
): void {
    if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
    }
    fs.writeFileSync(path.join(outputDir, `${name}.ical`), icalData.toString());
    fs.writeFileSync(
        path.join(outputDir, `${name}.json`),
        JSON.stringify(icalData.toJSON()),
    );
}

export function createCalendar(
    league: PandaScoreLeague,
    matchStore: MatchStore,
): ICalCalendar {
    const matches = getMatchesForLeague(matchStore, league.id);
    return toIcal(league.name, matches);
}

export async function generateIcalCalendar(
    league: PandaScoreLeague,
    options: CalendarGenerationOptions = {},
): Promise<void> {
    const { referenceDate, outputDir = "./docs/cal", matchStore } = options;

    if (!isLeagueActive(league, referenceDate)) {
        console.log(`[${league.name}] (inactive) no matches fetched`);
        return;
    }

    try {
        console.log("Creating ical for", league.name);

        const store = matchStore ?? loadMatchStore();
        const icalData = createCalendar(league, store);
        outputCalendar(league.slug, icalData, outputDir);
    } catch (e) {
        console.error("Error creating ical for", league.name, e);
    }
}

export async function generateAllCalendars(
    leagues: PandaScoreLeague[],
    options: CalendarGenerationOptions = {},
): Promise<void> {
    const {
        concurrency = Number(process.env.CONCURRENCY) || DEFAULT_CONCURRENCY,
        referenceDate = new Date(),
        outputDir = "./docs/cal",
        matchStore,
    } = options;

    const { active, inactive } = partitionLeagues(leagues, referenceDate);

    for (const league of inactive) {
        console.log(`[${league.name}] (inactive) no matches fetched`);
    }

    if (active.length === 0) {
        console.log("No active leagues to generate calendars for.");
        return;
    }

    console.log("Ingesting global matches from PandaScore...");
    const allMatches = await PandaScore.getGlobalMatches({ referenceDate });

    const store = matchStore ?? loadMatchStore();
    updateMatchStore(store, allMatches);
    if (!matchStore) {
        saveMatchStore(store);
    }

    const limit = pLimit(concurrency);
    let completed = 0;
    console.log(
        `Generating calendars for ${active.length} active leagues (${inactive.length} inactive skipped, concurrency: ${concurrency})...`,
    );

    await Promise.all(
        active.map((league) =>
            limit(async () => {
                await generateIcalCalendar(league, {
                    referenceDate,
                    outputDir,
                    matchStore: store,
                });
                completed++;
                if (completed % 10 === 0 || completed === active.length) {
                    const pct =
                        active.length > 0
                            ? Math.round((completed / active.length) * 100)
                            : 100;
                    console.log(
                        `Progress: ${completed}/${active.length} leagues completed (${pct}%)`,
                    );
                }
            }),
        ),
    );
}
