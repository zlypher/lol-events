export const mapPandaScoreOpponent = (opponent) => {
    return {
        name: opponent.opponent.name,
    };
};

export const mapPandaScoreResult = (result) => {
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

export default {
    mapPandaScoreOpponent,
    mapPandaScoreResult,
};
