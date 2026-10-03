import type {
    NormalizedMatch,
    NormalizedOpponent,
    PandaScoreMatch,
    PandaScoreOpponent,
} from "./types";

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
            name: game.name,
            beginAt: game.begin_at,
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
    groupMatchesByLeague,
    mapPandaScoreOpponent,
    mapPandaScoreResult,
};
