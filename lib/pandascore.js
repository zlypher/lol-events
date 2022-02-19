// TODO: Implement actual paging

const qs = require("qs");
const fetch = require("node-fetch");
const baseUrl = "https://api.pandascore.co";

const getDefaultOptions = () => {
    return {
        page: 1,
        per_page: 100,
    };
};

const request = async (url) =>
    await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.ACCESSTOKEN}`,
        },
    });

const getUpcomingMatches = async (idOrSlug, options = getDefaultOptions()) => {
    const query = qs.stringify(options);
    const response = await request(
        `${baseUrl}/leagues/${idOrSlug}/matches/upcoming?${query}`,
    );

    const json = await response.json();
    if (!response.ok) {
        throw json.error;
    }

    return json;
};

const getLeagues = async () => {
    const response = await request(`${baseUrl}/lol/leagues?per_page=100`);
    const json = await response.json();
    if (!response.ok) {
        throw json.error;
    }

    return json;
};

const getTeams = async (options = getDefaultOptions()) => {
    const query = qs.stringify(options);
    const response = await request(`${baseUrl}/lol/teams?${query}`);
    const json = await response.json();
    if (!response.ok) {
        throw json.error;
    }

    return json;
};

module.exports = {
    getUpcomingMatches,
    getLeagues,
    getTeams,
};
