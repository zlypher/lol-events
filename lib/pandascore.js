const fetch = require("node-fetch");
const baseUrl = "https://api.pandascore.co";
const accessToken = process.env.AccessToken;

const getUpcomingMatches = async (idOrSlug) => {
    const response = await fetch(
        `${baseUrl}/leagues/${idOrSlug}/matches/upcoming`,
        {
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        },
    );

    const json = await response.json();
    if (!response.ok) {
        throw json.error;
    }

    return json;
};

const getLeagues = async () => {
    const response = await fetch(`${baseUrl}/lol/leagues`, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
    });
    const json = await response.json();
    if (!response.ok) {
        throw json.error;
    }

    return json;
};

module.exports = {
    getUpcomingMatches,
    getLeagues,
};
