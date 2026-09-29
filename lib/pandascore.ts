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

export interface RequestOptions {
    retries?: number;
    baseDelayMs?: number;
}

export const request = async (
    url: string,
    options: RequestOptions = {},
): Promise<Response> => {
    const retries = options.retries ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 1000;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${process.env.ACCESSTOKEN}`,
            },
        });

        // Handle rate limiting (429) and server errors (5xx) with backoff
        if (response.status === 429 && attempt < retries) {
            const retryAfterHeader = response.headers.get("Retry-After");
            const retryAfterSec = retryAfterHeader
                ? parseInt(retryAfterHeader, 10)
                : 0;
            const delayMs =
                !isNaN(retryAfterSec) && retryAfterSec > 0
                    ? retryAfterSec * 1000
                    : Math.min(
                          baseDelayMs * Math.pow(2, attempt) +
                              Math.random() * 500,
                          15000,
                      );

            console.warn(
                `[PandaScore] Rate limited (429). Retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${retries})...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
        }

        if (response.status >= 500 && attempt < retries) {
            const delayMs = Math.min(
                baseDelayMs * Math.pow(2, attempt) + Math.random() * 500,
                15000,
            );
            console.warn(
                `[PandaScore] Server error (${response.status}). Retrying in ${Math.round(delayMs)}ms (attempt ${attempt + 1}/${retries})...`,
            );
            await new Promise((resolve) => setTimeout(resolve, delayMs));
            continue;
        }

        return response;
    }

    throw new Error(`Failed to fetch ${url} after ${retries} retries`);
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
