import fs from "node:fs";
import path from "node:path";
import type {
    CalendarJSON,
    EventStatus,
    LeaguesManifest,
    MatchStore,
    MatchStoreEntry,
    MatchStoreOpponent,
    NormalizedMatch,
    PandaScoreMatch,
    TeamInfo,
} from "./types";

const MATCH_STORE_PATH = "./data/matches.json";

export interface TeamMatchesOptions {
    referenceDate?: Date;
    windowDays?: number;
}

export function createEmptyMatchStore(): MatchStore {
    return {
        version: 1,
        generatedAt: new Date().toISOString(),
        matches: {},
    };
}

export function loadMatchStore(
    storePath: string = MATCH_STORE_PATH,
): MatchStore {
    if (!fs.existsSync(storePath)) {
        return createEmptyMatchStore();
    }
    try {
        const content = fs.readFileSync(storePath, "utf-8");
        return JSON.parse(content) as MatchStore;
    } catch {
        return createEmptyMatchStore();
    }
}

export function saveMatchStore(
    store: MatchStore,
    storePath: string = MATCH_STORE_PATH,
): void {
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(storePath, `${JSON.stringify(store, null, 4)}\n`, "utf-8");
}

export function seedMatchStoreFromCalendars(
    calDir: string,
    leaguesPath = "./docs/leagues.json",
): MatchStore {
    const store = createEmptyMatchStore();

    if (!fs.existsSync(calDir)) {
        return store;
    }

    const slugToLeagueId = new Map<string, number>();
    const slugToLeagueName = new Map<string, string>();
    if (fs.existsSync(leaguesPath)) {
        try {
            const leaguesContent = fs.readFileSync(leaguesPath, "utf-8");
            const data = JSON.parse(leaguesContent) as LeaguesManifest;
            if (Array.isArray(data.leagues)) {
                for (const l of data.leagues) {
                    if (l.slug) {
                        if (typeof l.id === "number") {
                            slugToLeagueId.set(l.slug, l.id);
                        }
                        if (l.name) {
                            slugToLeagueName.set(l.slug, l.name);
                        }
                    }
                }
            }
        } catch {
            // Ignore malformed leagues.json
        }
    }

    const files = fs.readdirSync(calDir).filter((f) => f.endsWith(".json"));

    for (const file of files) {
        const filePath = path.join(calDir, file);
        const slug = file.replace(/\.json$/, "");
        const leagueId = slugToLeagueId.get(slug);
        const leagueName = slugToLeagueName.get(slug);

        try {
            const content = fs.readFileSync(filePath, "utf-8");
            const calData = JSON.parse(content) as CalendarJSON;

            if (!calData.events || !Array.isArray(calData.events)) {
                continue;
            }

            for (const event of calData.events) {
                const rawId = event.id ?? event.uid;
                if (!rawId) continue;

                const matchIdStr = String(rawId).split("@")[0];
                const matchId = parseInt(matchIdStr, 10);
                if (isNaN(matchId)) continue;

                const uid = String(event.uid ?? `${matchId}@zlypher.github.io`);
                const sequence =
                    typeof event.sequence === "number" ? event.sequence : 1;
                const start = event.start ? String(event.start) : null;
                const end = event.end ? String(event.end) : null;
                const summary = event.summary ? String(event.summary) : "";
                const rawStatus =
                    typeof event.status === "string"
                        ? event.status.toUpperCase()
                        : null;
                const status: EventStatus | null =
                    rawStatus === "CANCELLED" || rawStatus === "CANCELED"
                        ? "CANCELLED"
                        : null;

                const existing = store.matches[matchId];
                if (existing) {
                    if (sequence > existing.sequence) {
                        existing.sequence = sequence;
                        existing.start = start;
                        existing.end = end;
                        existing.summary = summary;
                        existing.status = status;
                    }
                    if (
                        leagueId !== undefined &&
                        existing.leagueId === undefined
                    ) {
                        existing.leagueId = leagueId;
                    }
                    if (
                        leagueName !== undefined &&
                        existing.leagueName === undefined
                    ) {
                        existing.leagueName = leagueName;
                    }
                } else {
                    const entry: MatchStoreEntry = {
                        id: matchId,
                        uid,
                        sequence,
                        start,
                        end,
                        summary,
                        status,
                        ...(leagueId !== undefined ? { leagueId } : {}),
                        ...(leagueName !== undefined ? { leagueName } : {}),
                    };
                    store.matches[matchId] = entry;
                }
            }
        } catch {
            // Ignore malformed files during seeding
        }
    }

    return store;
}

function computeMatchTimes(match: PandaScoreMatch): {
    start: string | null;
    end: string | null;
} {
    const rawStart = match.scheduled_at || match.begin_at;
    if (!rawStart) {
        return { start: null, end: null };
    }

    const startDate = new Date(rawStart);
    if (isNaN(startDate.getTime())) {
        return { start: null, end: null };
    }

    const durationHours =
        match.number_of_games && match.number_of_games > 0
            ? match.number_of_games
            : 2;
    const endDate = new Date(
        startDate.getTime() + durationHours * 60 * 60 * 1000,
    );

    return {
        start: startDate.toISOString(),
        end: endDate.toISOString(),
    };
}

function determineMatchStatus(match: PandaScoreMatch): EventStatus | null {
    const normalizedStatus = (match.status || "").toLowerCase();
    if (normalizedStatus === "canceled") {
        return "CANCELLED";
    }
    if (normalizedStatus === "postponed") {
        // Postponed match without an announced time is marked CANCELLED
        const hasTime = Boolean(match.scheduled_at || match.begin_at);
        if (!hasTime) {
            return "CANCELLED";
        }
    }
    return null;
}

function extractOpponents(match: PandaScoreMatch): MatchStoreOpponent[] {
    if (!Array.isArray(match.opponents)) {
        return [];
    }
    return match.opponents
        .filter(
            (item) =>
                item &&
                item.opponent &&
                typeof item.opponent.id === "number" &&
                item.opponent.name,
        )
        .map((item) => {
            const opp = item.opponent;
            return {
                id: opp.id,
                name: opp.name,
                ...(opp.slug ? { slug: opp.slug } : {}),
                ...(opp.acronym !== undefined ? { acronym: opp.acronym } : {}),
                ...(opp.image_url !== undefined
                    ? { imageUrl: opp.image_url }
                    : {}),
            };
        });
}

function areOpponentsEqual(
    a?: MatchStoreOpponent[],
    b?: MatchStoreOpponent[],
): boolean {
    const listA = a || [];
    const listB = b || [];
    if (listA.length !== listB.length) {
        return false;
    }
    const idsA = listA.map((o) => o.id).sort((x, y) => x - y);
    const idsB = listB.map((o) => o.id).sort((x, y) => x - y);
    return idsA.every((id, idx) => id === idsB[idx]);
}

export function updateMatchStore(
    store: MatchStore,
    matches: PandaScoreMatch[],
    defaultLeagueId?: number,
): void {
    store.generatedAt = new Date().toISOString();

    for (const match of matches) {
        if (!match || typeof match.id !== "number") {
            continue;
        }

        const matchId = match.id;
        const uid = `${matchId}@zlypher.github.io`;
        const { start: computedStart, end: computedEnd } =
            computeMatchTimes(match);
        const summary = match.name || "";
        const status = determineMatchStatus(match);
        const newOpponents = extractOpponents(match);
        const existing = store.matches[matchId];
        const leagueId =
            match.league?.id ?? defaultLeagueId ?? existing?.leagueId;
        const leagueName = match.league?.name ?? existing?.leagueName;

        // If a match is postponed/canceled with no new time, preserve existing start/end if available
        const start = computedStart ?? existing?.start ?? null;
        const end = computedEnd ?? existing?.end ?? null;

        if (!existing) {
            store.matches[matchId] = {
                id: matchId,
                uid,
                sequence: 1,
                start,
                end,
                summary,
                status,
                opponents: newOpponents,
                ...(leagueId !== undefined ? { leagueId } : {}),
                ...(leagueName !== undefined ? { leagueName } : {}),
            };
        } else {
            // Sequence increments if start, duration (end), summary, status, or opponents change
            const timeChanged =
                start !== existing.start || end !== existing.end;
            const summaryChanged = summary !== existing.summary;
            const statusChanged = status !== existing.status;
            const opponentsChanged =
                existing.opponents !== undefined &&
                Array.isArray(match.opponents) &&
                !areOpponentsEqual(existing.opponents, newOpponents);

            if (
                timeChanged ||
                summaryChanged ||
                statusChanged ||
                opponentsChanged
            ) {
                existing.sequence += 1;
                existing.start = start;
                existing.end = end;
                existing.summary = summary;
                existing.status = status;
            }

            if (newOpponents.length > 0 || existing.opponents === undefined) {
                existing.opponents = newOpponents;
            }
            if (leagueId !== undefined) {
                existing.leagueId = leagueId;
            }
            if (leagueName !== undefined) {
                existing.leagueName = leagueName;
            }
        }
    }
}

export function getWindowStartTime(
    referenceDate: Date = new Date(),
    windowDays: number = 30,
): Date {
    return new Date(referenceDate.getTime() - windowDays * 24 * 60 * 60 * 1000);
}

function normalizeMatchStoreEntry(
    entry: MatchStoreEntry,
    summaryOverride?: string,
): NormalizedMatch {
    let numberOfGames = 2;
    if (entry.start && entry.end) {
        const diffHours = Math.round(
            (new Date(entry.end).getTime() - new Date(entry.start).getTime()) /
                (60 * 60 * 1000),
        );
        if (diffHours > 0) {
            numberOfGames = diffHours;
        }
    }

    return {
        id: entry.id,
        name: summaryOverride ?? entry.summary,
        beginAt: entry.start,
        scheduledAt: entry.start,
        numberOfGames,
        teams: (entry.opponents || []).map((opp) => ({ name: opp.name })),
        sequence: entry.sequence,
        status: entry.status,
    };
}

export function getMatchesForLeague(
    store: MatchStore,
    leagueId: number,
): NormalizedMatch[] {
    return Object.values(store.matches)
        .filter((entry) => entry.leagueId === leagueId)
        .map((entry) => normalizeMatchStoreEntry(entry));
}

export function getMatchesForTeam(
    store: MatchStore,
    teamId: number,
    options: TeamMatchesOptions = {},
): NormalizedMatch[] {
    const cutoff =
        options.windowDays !== undefined
            ? getWindowStartTime(options.referenceDate, options.windowDays)
            : null;

    return Object.values(store.matches)
        .filter((entry) => {
            const hasTeam = Boolean(
                entry.opponents?.some((opp) => opp.id === teamId),
            );
            if (!hasTeam) {
                return false;
            }
            if (cutoff !== null) {
                const matchTimeStr = entry.end || entry.start;
                if (!matchTimeStr) {
                    return false;
                }
                const matchTime = new Date(matchTimeStr).getTime();
                if (isNaN(matchTime) || matchTime < cutoff.getTime()) {
                    return false;
                }
            }
            return true;
        })
        .map((entry) => {
            let summary = entry.summary;
            if (entry.leagueName) {
                const prefix = `[${entry.leagueName}]`;
                if (!summary.startsWith(prefix)) {
                    summary = `[${entry.leagueName}] ${summary}`;
                }
            }
            return normalizeMatchStoreEntry(entry, summary);
        });
}

export function extractActiveTeamsFromMatchStore(
    store: MatchStore,
    referenceDate?: Date,
    windowDays: number = 30,
): TeamInfo[] {
    const cutoff = getWindowStartTime(referenceDate, windowDays);
    const teamsMap = new Map<number, TeamInfo>();

    for (const entry of Object.values(store.matches)) {
        const matchTimeStr = entry.end || entry.start;
        if (!matchTimeStr) {
            continue;
        }
        const matchTime = new Date(matchTimeStr).getTime();
        if (isNaN(matchTime) || matchTime < cutoff.getTime()) {
            continue;
        }

        if (entry.opponents && Array.isArray(entry.opponents)) {
            for (const opp of entry.opponents) {
                if (typeof opp.id === "number" && opp.name) {
                    const existing = teamsMap.get(opp.id);
                    if (!existing) {
                        teamsMap.set(opp.id, {
                            id: opp.id,
                            name: opp.name,
                            ...(opp.slug ? { slug: opp.slug } : {}),
                            ...(opp.acronym !== undefined
                                ? { acronym: opp.acronym }
                                : {}),
                            ...(opp.imageUrl !== undefined
                                ? { imageUrl: opp.imageUrl }
                                : {}),
                        });
                    } else {
                        if (!existing.slug && opp.slug)
                            existing.slug = opp.slug;
                        if (!existing.acronym && opp.acronym)
                            existing.acronym = opp.acronym;
                        if (!existing.imageUrl && opp.imageUrl)
                            existing.imageUrl = opp.imageUrl;
                    }
                }
            }
        }
    }

    return Array.from(teamsMap.values()).sort((a, b) =>
        a.name.localeCompare(b.name),
    );
}
