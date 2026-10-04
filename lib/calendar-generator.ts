import type { ICalCalendar } from "ical-generator";
import fs from "node:fs";
import path from "node:path";
import pLimit from "p-limit";
import { toIcal } from "./ical-utils";
import { isLeagueActive, partitionLeagues } from "./league-activity";
import PandaScore, { DEFAULT_CONCURRENCY } from "./pandascore";
import {
    extractActiveTeamsFromMatchStore,
    getMatchesForLeague,
    getMatchesForTeam,
    loadMatchStore,
    saveMatchStore,
    type TeamMatchesOptions,
    updateMatchStore,
} from "./match-store";
import type { MatchStore, PandaScoreLeague, TeamInfo } from "./types";

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

export function createTeamCalendar(
    team: TeamInfo,
    matchStore: MatchStore,
    options: TeamMatchesOptions = {},
): ICalCalendar {
    const matches = getMatchesForTeam(matchStore, team.id, options);
    return toIcal(team.name, matches);
}

export function generateTeamCalendar(
    team: TeamInfo,
    options: CalendarGenerationOptions = {},
): void {
    const { referenceDate, outputDir = "./docs/cal", matchStore } = options;
    const store = matchStore ?? loadMatchStore();
    const teamCalDir = path.join(outputDir, "team");
    console.log("Creating team calendar for", team.name);

    const icalData = createTeamCalendar(team, store, {
        referenceDate,
        windowDays: 30,
    });
    outputCalendar(String(team.id), icalData, teamCalDir);
}

export async function generateAllTeamCalendars(
    teams: TeamInfo[],
    options: CalendarGenerationOptions = {},
): Promise<void> {
    const {
        concurrency = Number(process.env.CONCURRENCY) || DEFAULT_CONCURRENCY,
        referenceDate = new Date(),
        outputDir = "./docs/cal",
        matchStore,
    } = options;

    const teamCalDir = path.join(outputDir, "team");
    const activeTeamIds = new Set(teams.map((t) => t.id));

    // Handle inactive teams that exist on disk: republish with zero VEVENTs (ADR-0003)
    if (fs.existsSync(teamCalDir)) {
        const existingFiles = fs.readdirSync(teamCalDir);
        const existingIds = new Set<number>();
        for (const file of existingFiles) {
            const match = file.match(/^(\d+)\.json$/);
            if (match) {
                existingIds.add(parseInt(match[1], 10));
            }
        }

        for (const id of existingIds) {
            if (!activeTeamIds.has(id)) {
                let teamName = `Team ${id}`;
                try {
                    const jsonPath = path.join(teamCalDir, `${id}.json`);
                    const calJson = JSON.parse(
                        fs.readFileSync(jsonPath, "utf-8"),
                    );
                    if (calJson.name) {
                        teamName = calJson.name;
                    }
                } catch {
                    // Fallback to default teamName
                }
                const emptyCal = toIcal(teamName, []);
                outputCalendar(String(id), emptyCal, teamCalDir);
                console.log(
                    `[${teamName}] (inactive) published empty calendar`,
                );
            }
        }
    }

    if (teams.length === 0) {
        console.log("No active teams to generate calendars for.");
        return;
    }

    const limit = pLimit(concurrency);
    let completed = 0;
    console.log(
        `Generating team calendars for ${teams.length} active teams (concurrency: ${concurrency})...`,
    );

    const store = matchStore ?? loadMatchStore();

    await Promise.all(
        teams.map((team) =>
            limit(async () => {
                generateTeamCalendar(team, {
                    referenceDate,
                    outputDir,
                    matchStore: store,
                });
                completed++;
                if (completed % 10 === 0 || completed === teams.length) {
                    const pct = Math.round((completed / teams.length) * 100);
                    console.log(
                        `Progress: ${completed}/${teams.length} teams completed (${pct}%)`,
                    );
                }
            }),
        ),
    );
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

    const activeTeams = extractActiveTeamsFromMatchStore(store, referenceDate);
    await generateAllTeamCalendars(activeTeams, {
        concurrency,
        referenceDate,
        outputDir,
        matchStore: store,
    });
}
