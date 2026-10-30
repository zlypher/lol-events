import { isLeagueActive } from "./league-activity";
import type {
    LeagueManifestItem,
    LeaguesManifest,
    PandaScoreLeague,
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

export default {
    DEFAULT_CALENDAR_BASE_URL,
    DEFAULT_TEAM_CALENDAR_BASE_URL,
    createLeagueManifestItem,
    generateLeaguesManifest,
    serializeLeaguesManifest,
    createTeamManifestItem,
    generateTeamsManifest,
    serializeTeamsManifest,
};
