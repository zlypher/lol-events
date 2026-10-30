import type { ICalCalendar } from "ical-generator";
import fs from "node:fs";
import path from "node:path";
import pLimit from "p-limit";
import { toIcal, updateCalendarEvents } from "./ical-utils";
import { isLeagueActive, partitionLeagues } from "./league-activity";
import PandaScore, { DEFAULT_CONCURRENCY } from "./pandascore";
import PandaScoreUtils from "./pandascore-utils";
import type { CalendarJSON, PandaScoreLeague, PandaScoreMatch } from "./types";

export interface CalendarGenerationOptions {
    concurrency?: number;
    referenceDate?: Date;
    outputDir?: string;
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

export async function createCalendar(
    league: PandaScoreLeague,
    matches?: PandaScoreMatch[],
): Promise<ICalCalendar> {
    let relevantMatches: PandaScoreMatch[];

    if (matches !== undefined) {
        relevantMatches = matches;
    } else {
        const pastMatches = await PandaScore.getPastMatches(league.id, {
            page: 1,
            per_page: 20,
        });
        const runningMatches = await PandaScore.getRunningMatches(league.id);
        const upcomingMatches = await PandaScore.getUpcomingMatches(league.id);

        relevantMatches = [
            ...pastMatches,
            ...runningMatches,
            ...upcomingMatches,
        ];
    }

    const mappedMatches = PandaScoreUtils.mapPandaScoreResult(relevantMatches);
    return toIcal(league.name, mappedMatches);
}

export async function generateIcalCalendar(
    league: PandaScoreLeague,
    options: CalendarGenerationOptions = {},
    matches?: PandaScoreMatch[],
): Promise<void> {
    const { referenceDate, outputDir = "./docs/cal" } = options;

    if (!isLeagueActive(league, referenceDate)) {
        console.log(`[${league.name}] (inactive) no matches fetched`);
        return;
    }

    try {
        console.log("Creating ical for", league.name);

        const icalData = await createCalendar(league, matches);
        const jsonPath = path.join(outputDir, `${league.slug}.json`);
        if (fs.existsSync(jsonPath)) {
            const jsonData = JSON.parse(
                fs.readFileSync(jsonPath).toString(),
            ) as CalendarJSON;
            updateCalendarEvents(icalData, jsonData);
        }

        outputCalendar(league.slug, icalData, outputDir);
    } catch (e) {
        console.error("Error creating ical for", league.name, e);
    }
}

export async function generateAllCalendars(
    leagues: PandaScoreLeague[],
    options: CalendarGenerationOptions = {},
    matchesByLeague?: Map<number, PandaScoreMatch[]>,
): Promise<void> {
    const {
        concurrency = Number(process.env.CONCURRENCY) || DEFAULT_CONCURRENCY,
        referenceDate = new Date(),
        outputDir = "./docs/cal",
    } = options;

    const { active, inactive } = partitionLeagues(leagues, referenceDate);

    for (const league of inactive) {
        console.log(`[${league.name}] (inactive) no matches fetched`);
    }

    // Ingest matches globally if matchesByLeague was not directly provided
    let groupedMatches = matchesByLeague;
    if (!groupedMatches) {
        console.log("Ingesting global matches from PandaScore...");
        const allMatches = await PandaScore.getGlobalMatches({ referenceDate });
        groupedMatches = PandaScoreUtils.groupMatchesByLeague(allMatches);
    }

    const limit = pLimit(concurrency);
    let completed = 0;
    console.log(
        `Generating calendars for ${active.length} active leagues (${inactive.length} inactive skipped, concurrency: ${concurrency})...`,
    );

    await Promise.all(
        active.map((league) =>
            limit(async () => {
                const leagueMatches = groupedMatches?.get(league.id) ?? [];
                await generateIcalCalendar(
                    league,
                    {
                        referenceDate,
                        outputDir,
                    },
                    leagueMatches,
                );
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
