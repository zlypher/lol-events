import fs from "node:fs";
import path from "node:path";
import { isLeagueActive } from "./league-activity";
import {
    extractActiveTeamsFromMatchStore,
    loadMatchStore,
    saveMatchStore,
    updateMatchStore,
} from "./match-store";
import PandaScore from "./pandascore";
import type {
    LeagueManifestItem,
    LeaguesManifest,
    MatchStore,
    PandaScoreLeague,
    PandaScoreMatch,
    TeamInfo,
    TeamManifestItem,
    TeamsManifest,
} from "./types";

export const DEFAULT_CALENDAR_BASE_URL =
    "https://zlypher.github.io/lol-events/cal";
export const DEFAULT_TEAM_CALENDAR_BASE_URL =
    "https://zlypher.github.io/lol-events/cal/team";

export type ManifestFilter = "all" | "active" | "inactive";

export interface ManifestOptions {
    referenceDate?: Date | string | number;
    baseUrl?: string;
    filter?: ManifestFilter;
}

function normalizeNullableString(value?: string | null): string | null {
    if (!value) {
        return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function parseReferenceDate(value?: Date | string | number): Date {
    if (value === undefined) {
        return new Date();
    }
    const date = value instanceof Date ? value : new Date(value);
    return isNaN(date.getTime()) ? new Date() : date;
}

export function createLeagueManifestItem(
    league: PandaScoreLeague,
    options: ManifestOptions = {},
): LeagueManifestItem {
    const refDate = parseReferenceDate(options.referenceDate);
    const baseUrl = options.baseUrl ?? DEFAULT_CALENDAR_BASE_URL;

    return {
        id: league.id,
        name: league.name,
        slug: league.slug,
        logoUrl: normalizeNullableString(league.image_url),
        url: normalizeNullableString(league.url),
        calendarUrl: `${baseUrl}/${league.slug}.ical`,
        jsonUrl: `${baseUrl}/${league.slug}.json`,
        active: isLeagueActive(league, refDate),
    };
}

export function generateLeaguesManifest(
    leagues: PandaScoreLeague[],
    options: ManifestOptions = {},
): LeaguesManifest {
    const refDate = parseReferenceDate(options.referenceDate);
    const filter = options.filter ?? "all";

    const sortedLeagues = [...leagues].sort((a, b) =>
        a.name.localeCompare(b.name),
    );

    let items = sortedLeagues.map((league) =>
        createLeagueManifestItem(league, {
            ...options,
            referenceDate: refDate,
        }),
    );

    if (filter === "active") {
        items = items.filter((item) => item.active);
    } else if (filter === "inactive") {
        items = items.filter((item) => !item.active);
    }

    return {
        generatedAt: refDate.toISOString(),
        leagues: items,
    };
}

export function serializeLeaguesManifest(
    manifest: LeaguesManifest,
    space: number = 2,
): string {
    return JSON.stringify(manifest, null, space);
}

export function createTeamManifestItem(
    team: TeamInfo,
    options: ManifestOptions = {},
): TeamManifestItem {
    const base = options.baseUrl ?? DEFAULT_CALENDAR_BASE_URL;
    const teamBaseUrl = base.endsWith("/team") ? base : `${base}/team`;

    return {
        id: team.id,
        name: team.name,
        slug: team.slug ?? "",
        acronym: normalizeNullableString(team.acronym),
        logoUrl: normalizeNullableString(team.imageUrl),
        calendarUrl: `${teamBaseUrl}/${team.id}.ical`,
        jsonUrl: `${teamBaseUrl}/${team.id}.json`,
    };
}

export function generateTeamsManifest(
    teams: TeamInfo[],
    options: ManifestOptions = {},
): TeamsManifest {
    const refDate = parseReferenceDate(options.referenceDate);

    const sortedTeams = [...teams].sort((a, b) => a.name.localeCompare(b.name));

    const items = sortedTeams.map((team) =>
        createTeamManifestItem(team, {
            ...options,
            referenceDate: refDate,
        }),
    );

    return {
        generatedAt: refDate.toISOString(),
        teams: items,
    };
}

export function serializeTeamsManifest(
    manifest: TeamsManifest,
    space: number = 2,
): string {
    return JSON.stringify(manifest, null, space);
}

export interface SyncOptions {
    referenceDate?: Date | string | number;
    baseUrl?: string;
    leagues?: PandaScoreLeague[];
    fetchLeagues?: () => Promise<PandaScoreLeague[]>;
    fetchGlobalMatches?: (options: {
        referenceDate: Date;
    }) => Promise<PandaScoreMatch[]>;
    matchStore?: MatchStore;
    matchStorePath?: string;
    leaguesManifestPath?: string;
    teamsManifestPath?: string;
    writeFiles?: boolean;
}

export interface SyncResult {
    leaguesManifest: LeaguesManifest;
    teamsManifest: TeamsManifest;
    matchStore: MatchStore;
    activeLeaguesCount: number;
    activeTeamsCount: number;
    matchesFetched: boolean;
}

export async function syncManifestsAndStore(
    options: SyncOptions = {},
): Promise<SyncResult> {
    const refDate = parseReferenceDate(options.referenceDate);
    const writeFiles = options.writeFiles ?? true;

    let leagues = options.leagues;
    if (!leagues) {
        if (options.fetchLeagues) {
            leagues = await options.fetchLeagues();
        } else {
            leagues = await PandaScore.getAllPages(PandaScore.getLeagues);
        }
    }

    const leaguesManifest = generateLeaguesManifest(leagues, {
        referenceDate: refDate,
        baseUrl: options.baseUrl,
    });

    const leaguesManifestPath =
        options.leaguesManifestPath ?? "./docs/leagues.json";
    if (writeFiles) {
        const dir = path.dirname(leaguesManifestPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(
            leaguesManifestPath,
            serializeLeaguesManifest(leaguesManifest),
            "utf-8",
        );
    }

    const activeLeagues = leaguesManifest.leagues.filter((l) => l.active);
    const matchStorePath = options.matchStorePath ?? "./data/matches.json";
    const store = options.matchStore ?? loadMatchStore(matchStorePath);
    let matchesFetched = false;

    if (activeLeagues.length > 0) {
        const fetchFn =
            options.fetchGlobalMatches ??
            ((opts) => PandaScore.getGlobalMatches(opts));
        const matches = await fetchFn({ referenceDate: refDate });
        updateMatchStore(store, matches);
        matchesFetched = true;
        if (writeFiles) {
            saveMatchStore(store, matchStorePath);
        }
    }

    const activeTeams = extractActiveTeamsFromMatchStore(store, refDate);
    const teamsManifest = generateTeamsManifest(activeTeams, {
        referenceDate: refDate,
        baseUrl: options.baseUrl,
    });

    const teamsManifestPath = options.teamsManifestPath ?? "./docs/teams.json";
    if (writeFiles) {
        const dir = path.dirname(teamsManifestPath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(
            teamsManifestPath,
            serializeTeamsManifest(teamsManifest),
            "utf-8",
        );
    }

    return {
        leaguesManifest,
        teamsManifest,
        matchStore: store,
        activeLeaguesCount: activeLeagues.length,
        activeTeamsCount: activeTeams.length,
        matchesFetched,
    };
}

export default {
    DEFAULT_CALENDAR_BASE_URL,
    DEFAULT_TEAM_CALENDAR_BASE_URL,
    createLeagueManifestItem,
    generateLeaguesManifest,
    serializeLeaguesManifest,
    createTeamManifestItem,
    generateTeamsManifest,
    serializeTeamsManifest,
    syncManifestsAndStore,
};
