import qs from "qs";
import type {
    PandaScoreLeague,
    PandaScoreMatch,
    PandaScoreOptions,
    PandaScoreTeam,
} from "./types";

const baseUrl = "https://api.pandascore.co";

export const getDefaultOptions = (): PandaScoreOptions => {
    return {
        page: 1,
        per_page: 100,
    };
};

export const request = async (url: string): Promise<Response> => {
    return await fetch(url, {
        headers: {
            Authorization: `Bearer ${process.env.ACCESSTOKEN}`,
        },
    });
};

const handleResponse = async <T>(response: Response): Promise<T> => {
    let json: { error?: string } & unknown;
    try {
        json = (await response.json()) as { error?: string };
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

    return json as T;
};

export const getPastMatches = async (
    idOrSlug: number | string,
    options: PandaScoreOptions = getDefaultOptions(),
): Promise<PandaScoreMatch[]> => {
    const query = qs.stringify(options);
    const response = await request(
        `${baseUrl}/leagues/${idOrSlug}/matches/past?${query}`,
    );
    return await handleResponse<PandaScoreMatch[]>(response);
};

export const getRunningMatches = async (
    idOrSlug: number | string,
    options: PandaScoreOptions = getDefaultOptions(),
): Promise<PandaScoreMatch[]> => {
    const query = qs.stringify(options);
    const response = await request(
        `${baseUrl}/leagues/${idOrSlug}/matches/running?${query}`,
    );
    return await handleResponse<PandaScoreMatch[]>(response);
};

export const getUpcomingMatches = async (
    idOrSlug: number | string,
    options: PandaScoreOptions = getDefaultOptions(),
): Promise<PandaScoreMatch[]> => {
    const query = qs.stringify(options);
    const response = await request(
        `${baseUrl}/leagues/${idOrSlug}/matches/upcoming?${query}`,
    );
    return await handleResponse<PandaScoreMatch[]>(response);
};

export const getLeagues = async (
    options: PandaScoreOptions = getDefaultOptions(),
): Promise<PandaScoreLeague[]> => {
    const query = qs.stringify(options);
    const response = await request(`${baseUrl}/lol/leagues?${query}`);
    return await handleResponse<PandaScoreLeague[]>(response);
};

export const getTeams = async (
    options: PandaScoreOptions = getDefaultOptions(),
): Promise<PandaScoreTeam[]> => {
    const query = qs.stringify(options);
    const response = await request(`${baseUrl}/lol/teams?${query}`);
    return await handleResponse<PandaScoreTeam[]>(response);
};

export const getAllPages = async <T>(
    callback: (options: PandaScoreOptions) => Promise<T[]>,
): Promise<T[]> => {
    const options = getDefaultOptions();
    let results: T[] = [];

    let response = await callback(options);
    results = results.concat(response);

    while (response.length === (options.per_page ?? 100)) {
        options.page = (options.page ?? 1) + 1;
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
