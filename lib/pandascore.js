const fetch = require("node-fetch");
const baseUrl = "https://api.pandascore.co";

const request = async (url) =>
    await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.ACCESSTOKEN}`,
        },
    });

const getUpcomingMatches = async (idOrSlug) => {
    const response = await request(
        `${baseUrl}/leagues/${idOrSlug}/matches/upcoming`,
    );

    const json = await response.json();
    if (!response.ok) {
        throw json.error;
    }

    return json;
};

const getLeagues = async () => {
    const response = await request(`${baseUrl}/lol/leagues`);
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
