import type {
    NormalizedMatch,
    NormalizedOpponent,
    PandaScoreMatch,
    PandaScoreOpponent,
} from "./types";

const IGNORED_STAGES = new Set(["regular season"]);

const escapeRegExp = (str: string): string =>
    str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const shouldPrefixStage = (
    stageName: string | undefined | null,
): stageName is string => {
    if (!stageName) {
        return false;
    }
    const normalized = stageName.trim().toLowerCase();
    return normalized.length > 0 && !IGNORED_STAGES.has(normalized);
};

export const formatMatchTitle = (match: PandaScoreMatch): string => {
    const stage = match.tournament?.name?.trim();
    if (!shouldPrefixStage(stage)) {
        return match.name;
    }

    const stagePrefixPattern = new RegExp(
        `^\\(?\\[?${escapeRegExp(stage)}[\\]\\)]?[:\\s-]`,
        "i",
    );
    if (stagePrefixPattern.test(match.name.trim())) {
        return match.name;
    }

    return `(${stage}) ${match.name}`;
};

export const mapPandaScoreOpponent = (
    opponent: PandaScoreOpponent,
): NormalizedOpponent => {
    return {
        name: opponent.opponent.name,
    };
};

export const mapPandaScoreResult = (
    result: PandaScoreMatch[],
): NormalizedMatch[] => {
    return result.map((game) => {
        return {
            id: game.id,
            name: formatMatchTitle(game),
            beginAt: game.begin_at,
            scheduledAt: game.scheduled_at ?? null,
            numberOfGames: game.number_of_games,
            teams: game.opponents.map(mapPandaScoreOpponent),
        };
    });
};

export const groupMatchesByLeague = (
    matches: PandaScoreMatch[],
): Map<number, PandaScoreMatch[]> => {
    const grouped = new Map<number, PandaScoreMatch[]>();

    for (const match of matches) {
        if (!match.league || typeof match.league.id !== "number") {
            continue;
        }

        const leagueId = match.league.id;
        const leagueMatches = grouped.get(leagueId);
        if (leagueMatches) {
            leagueMatches.push(match);
        } else {
            grouped.set(leagueId, [match]);
        }
    }

    return grouped;
};

export default {
    formatMatchTitle,
    groupMatchesByLeague,
    mapPandaScoreOpponent,
    mapPandaScoreResult,
    shouldPrefixStage,
};
