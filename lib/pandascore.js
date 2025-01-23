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

const getPastMatches = async (idOrSlug, options = getDefaultOptions()) => {
    const query = qs.stringify(options);
    const response = await request(
        `${baseUrl}/leagues/${idOrSlug}/matches/past?${query}`,
    );

    const json = await response.json();
    if (!response.ok) {
        throw json.error;
    }

    return json;
};

const getRunningMatches = async (idOrSlug, options = getDefaultOptions()) => {
    const query = qs.stringify(options);
    const response = await request(
        `${baseUrl}/leagues/${idOrSlug}/matches/running?${query}`,
    );

    const json = await response.json();
    if (!response.ok) {
        throw json.error;
    }

    return json;
};

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

const getLeagues = async (options = getDefaultOptions()) => {
    const query = qs.stringify(options);
    const response = await request(`${baseUrl}/lol/leagues?${query}`);
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

const getAllPages = async (callback) => {
    let options = getDefaultOptions();
    let results = [];

    let response = await callback(options);
    results = results.concat(response);

    while (response.length === options.per_page) {
        options.page++;
        response = await callback(options);
        results = results.concat(response);
    }

    return results;
};

module.exports = {
    getPastMatches,
    getRunningMatches,
    getUpcomingMatches,
    getLeagues,
    getTeams,
    getAllPages,
};
