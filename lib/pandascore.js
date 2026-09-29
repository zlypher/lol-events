import qs from "qs";

const baseUrl = "https://api.pandascore.co";

export const getDefaultOptions = () => {
    return {
        page: 1,
        per_page: 100,
    };
};

export const request = async (url) => {
    return await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.ACCESSTOKEN}`,
        },
    });
};

const handleResponse = async (response) => {
    let json;
    try {
        json = await response.json();
    } catch {
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        throw new Error("Invalid JSON response received from PandaScore");
    }

    if (!response.ok) {
        throw new Error(
            json?.error || `HTTP ${response.status}: ${response.statusText}`,
        );
    }

    return json;
};

export const getPastMatches = async (
    idOrSlug,
    options = getDefaultOptions(),
) => {
    const query = qs.stringify(options);
    const response = await request(
        `${baseUrl}/leagues/${idOrSlug}/matches/past?${query}`,
    );
    return await handleResponse(response);
};

export const getRunningMatches = async (
    idOrSlug,
    options = getDefaultOptions(),
) => {
    const query = qs.stringify(options);
    const response = await request(
        `${baseUrl}/leagues/${idOrSlug}/matches/running?${query}`,
    );
    return await handleResponse(response);
};

export const getUpcomingMatches = async (
    idOrSlug,
    options = getDefaultOptions(),
) => {
    const query = qs.stringify(options);
    const response = await request(
        `${baseUrl}/leagues/${idOrSlug}/matches/upcoming?${query}`,
    );
    return await handleResponse(response);
};

export const getLeagues = async (options = getDefaultOptions()) => {
    const query = qs.stringify(options);
    const response = await request(`${baseUrl}/lol/leagues?${query}`);
    return await handleResponse(response);
};

export const getTeams = async (options = getDefaultOptions()) => {
    const query = qs.stringify(options);
    const response = await request(`${baseUrl}/lol/teams?${query}`);
    return await handleResponse(response);
};

export const getAllPages = async (callback) => {
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

export default {
    getPastMatches,
    getRunningMatches,
    getUpcomingMatches,
    getLeagues,
    getTeams,
    getAllPages,
    getDefaultOptions,
    request,
};
