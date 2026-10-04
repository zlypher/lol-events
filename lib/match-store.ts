import fs from "node:fs";
import path from "node:path";
import type {
    CalendarJSON,
    EventStatus,
    MatchStore,
    MatchStoreEntry,
    NormalizedMatch,
    PandaScoreMatch,
} from "./types";

export const DEFAULT_MATCH_STORE_PATH = "./data/matches.json";

export function createEmptyMatchStore(): MatchStore {
    return {
        version: 1,
        generatedAt: new Date().toISOString(),
        matches: {},
    };
}

export function loadMatchStore(
    storePath: string = DEFAULT_MATCH_STORE_PATH,
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
    storePath: string = DEFAULT_MATCH_STORE_PATH,
): void {
    const dir = path.dirname(storePath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(storePath, `${JSON.stringify(store, null, 4)}\n`, "utf-8");
}

export function seedMatchStoreFromCalendars(calDir: string): MatchStore {
    const store = createEmptyMatchStore();

    if (!fs.existsSync(calDir)) {
        return store;
    }

    const files = fs.readdirSync(calDir).filter((f) => f.endsWith(".json"));

    for (const file of files) {
        const filePath = path.join(calDir, file);
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
                    rawStatus === "CANCELLED" ||
                    rawStatus === "CONFIRMED" ||
                    rawStatus === "TENTATIVE"
                        ? rawStatus
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
                } else {
                    const entry: MatchStoreEntry = {
                        id: matchId,
                        uid,
                        sequence,
                        start,
                        end,
                        summary,
                        status,
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

export function computeMatchTimes(match: PandaScoreMatch): {
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

export function determineMatchStatus(
    match: PandaScoreMatch,
): EventStatus | null {
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

export function updateMatchStore(
    store: MatchStore,
    matches: PandaScoreMatch[],
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

        const existing = store.matches[matchId];

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
            };
        } else {
            // Sequence increments if start, duration (end), summary, or status changes
            const timeChanged =
                start !== existing.start || end !== existing.end;
            const summaryChanged = summary !== existing.summary;
            const statusChanged = status !== existing.status;

            if (timeChanged || summaryChanged || statusChanged) {
                existing.sequence += 1;
                existing.start = start;
                existing.end = end;
                existing.summary = summary;
                existing.status = status;
            }
        }
    }
}

export function applyMatchStore(
    store: MatchStore,
    matches: NormalizedMatch[],
): void {
    for (const match of matches) {
        const entry = store.matches[match.id];
        if (entry) {
            match.sequence = entry.sequence;
            if (entry.status) {
                match.status = entry.status;
            }
            if (entry.start) {
                match.scheduledAt = entry.start;
            }
        }
    }
}
