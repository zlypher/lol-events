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
            numberOfGames: game.number_of_games,
            teams: game.opponents.map(mapPandaScoreOpponent),
        };
    });
};

export default {
    formatMatchTitle,
    mapPandaScoreOpponent,
    mapPandaScoreResult,
    shouldPrefixStage,
};
