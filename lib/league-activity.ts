import type {
    PandaScoreLeague,
    PandaScoreSerie,
    PartitionedLeagues,
} from "./types";

/**
 * Calculates a cutoff date exactly 3 calendar months before the given reference date in UTC.
 * Clamps to the last day of the month if the day overflows (e.g. May 31 -> Feb 28/29).
 */
export function getThreeMonthsBefore(referenceDate: Date): Date {
    const cutoff = new Date(referenceDate.getTime());
    const originalDate = cutoff.getUTCDate();
    cutoff.setUTCMonth(cutoff.getUTCMonth() - 3);
    if (cutoff.getUTCDate() !== originalDate) {
        cutoff.setUTCDate(0);
    }
    return cutoff;
}

function parseDate(value?: string | null): Date | null {
    if (!value) {
        return null;
    }
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
}

/**
 * Determines whether a tournament series is active relative to a reference date.
 *
 * A series is active if:
 * 1. Future: begin_at is after now, or end_at is after now.
 * 2. Ongoing: begin_at is on or before now, and end_at is on or after now,
 *    or end_at is null/unspecified and begin_at was within the last 3 months.
 * 3. Recent (last 3 months): conclusion date (end_at, or begin_at if end_at is null/undefined)
 *    is on or after the cutoff timestamp (now minus 3 calendar months).
 */
export function isSeriesActive(
    series: PandaScoreSerie,
    referenceDate: Date = new Date(),
): boolean {
    const now =
        referenceDate instanceof Date ? referenceDate : new Date(referenceDate);

    if (isNaN(now.getTime())) {
        return false;
    }

    const beginAt = parseDate(series.begin_at);
    const endAt = parseDate(series.end_at);

    // If both dates are missing or invalid, series cannot be active
    if (!beginAt && !endAt) {
        return false;
    }

    // 1. Future: scheduled to start or end after reference date
    if ((beginAt && beginAt > now) || (endAt && endAt > now)) {
        return true;
    }

    // 2. Ongoing: started on or before now, and ends in the future
    if (beginAt && beginAt <= now && endAt && endAt >= now) {
        return true;
    }

    // 3. Recent / Ongoing without end_at: conclusion date within last 3 months.
    // When end_at is null or undefined, conclusion date falls back to begin_at.
    const conclusionDate = endAt ?? beginAt;
    if (conclusionDate) {
        const cutoff = getThreeMonthsBefore(now);
        return conclusionDate >= cutoff;
    }

    return false;
}

/**
 * Determines whether a league is active based on its tournament series.
 *
 * A league is active if and only if it contains a non-empty series array
 * and at least one series is active relative to the reference date.
 */
export function isLeagueActive(
    league: PandaScoreLeague,
    referenceDate: Date = new Date(),
): boolean {
    if (
        !league.series ||
        !Array.isArray(league.series) ||
        league.series.length === 0
    ) {
        return false;
    }

    return league.series.some((series) =>
        isSeriesActive(series, referenceDate),
    );
}

/**
 * Partitions a list of leagues into active and inactive collections
 * based on whether each league has any active series relative to the reference date.
 */
export function partitionLeagues(
    leagues: PandaScoreLeague[],
    referenceDate: Date = new Date(),
): PartitionedLeagues {
    const active: PandaScoreLeague[] = [];
    const inactive: PandaScoreLeague[] = [];

    for (const league of leagues) {
        if (isLeagueActive(league, referenceDate)) {
            active.push(league);
        } else {
            inactive.push(league);
        }
    }

    return { active, inactive };
}

export default {
    getThreeMonthsBefore,
    isLeagueActive,
    isSeriesActive,
    partitionLeagues,
};
