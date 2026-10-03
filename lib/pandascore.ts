import qs from "qs";
import { defaultRateLimiter, RateLimiter } from "./rate-limiter";
import type {
    PandaScoreLeague,
    PandaScoreMatch,
    PandaScoreOptions,
    PandaScoreTeam,
} from "./types";

const baseUrl = "https://api.pandascore.co";
export const DEFAULT_CONCURRENCY = 2;

export const getDefaultOptions = (): PandaScoreOptions => {
    return {
        page: 1,
        per_page: 100,
    };
};

export interface RequestOptions {
    retries?: number;
    baseDelayMs?: number;
    rateLimiter?: RateLimiter;
}

export const request = async (
    url: string,
    options: RequestOptions = {},
): Promise<Response> => {
    const retries = options.retries ?? 3;
    const baseDelayMs = options.baseDelayMs ?? 1000;
    const limiter = options.rateLimiter ?? defaultRateLimiter;

    for (let attempt = 0; attempt <= retries; attempt++) {
        // Enforce rate limiting interval (60 req/min burst limit)
        await limiter.acquire();

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
    initialOptions?: PandaScoreOptions,
): Promise<T[]> => {
    const options: PandaScoreOptions = {
        ...getDefaultOptions(),
        ...initialOptions,
    };
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

export const getGlobalPastMatches = async (
    options: PandaScoreOptions = getDefaultOptions(),
): Promise<PandaScoreMatch[]> => {
    const query = qs.stringify(options);
    const response = await PandaScore.request(
        `${baseUrl}/lol/matches/past?${query}`,
    );
    return await handleResponse<PandaScoreMatch[]>(response);
};

export const getGlobalRunningMatches = async (
    options: PandaScoreOptions = getDefaultOptions(),
): Promise<PandaScoreMatch[]> => {
    const query = qs.stringify(options);
    const response = await PandaScore.request(
        `${baseUrl}/lol/matches/running?${query}`,
    );
    return await handleResponse<PandaScoreMatch[]>(response);
};

export const getGlobalUpcomingMatches = async (
    options: PandaScoreOptions = getDefaultOptions(),
): Promise<PandaScoreMatch[]> => {
    const query = qs.stringify(options);
    const response = await PandaScore.request(
        `${baseUrl}/lol/matches/upcoming?${query}`,
    );
    return await handleResponse<PandaScoreMatch[]>(response);
};

export interface GlobalMatchesOptions {
    referenceDate?: Date;
    pastDays?: number;
}

export const getGlobalMatches = async (
    options: GlobalMatchesOptions = {},
): Promise<PandaScoreMatch[]> => {
    const { referenceDate = new Date(), pastDays = 30 } = options;
    const fromDate = new Date(
        referenceDate.getTime() - pastDays * 24 * 60 * 60 * 1000,
    );

    const pastRangeOptions: PandaScoreOptions = {
        range: {
            begin_at: `${fromDate.toISOString()},${referenceDate.toISOString()}`,
        },
    };

    const [pastMatches, runningMatches, upcomingMatches] = await Promise.all([
        getAllPages(
            (opts) => PandaScore.getGlobalPastMatches(opts),
            pastRangeOptions,
        ),
        getAllPages((opts) => PandaScore.getGlobalRunningMatches(opts)),
        getAllPages((opts) => PandaScore.getGlobalUpcomingMatches(opts)),
    ]);

    // Prioritize running matches over past/upcoming matches if a match appears across multiple endpoints
    const allMatches = [...runningMatches, ...upcomingMatches, ...pastMatches];
    const uniqueMatchesMap = new Map<number, PandaScoreMatch>();

    for (const match of allMatches) {
        if (!uniqueMatchesMap.has(match.id)) {
            uniqueMatchesMap.set(match.id, match);
        }
    }

    return Array.from(uniqueMatchesMap.values());
};

export { defaultRateLimiter, RateLimiter };

const PandaScore = {
    getPastMatches,
    getRunningMatches,
    getUpcomingMatches,
    getGlobalPastMatches,
    getGlobalRunningMatches,
    getGlobalUpcomingMatches,
    getGlobalMatches,
    getLeagues,
    getTeams,
    getAllPages,
    getDefaultOptions,
    request,
    RateLimiter,
    defaultRateLimiter,
};

export default PandaScore;
