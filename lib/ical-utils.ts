import ical, { type ICalCalendar, type ICalEventData } from "ical-generator";
import type { NormalizedMatch } from "./types";

export function toIcalEvents(match: NormalizedMatch): ICalEventData | null {
    if (!match.beginAt) {
        return null;
    }

    const start = new Date(match.beginAt);
    if (isNaN(start.getTime())) {
        return null;
    }

    const durationHours =
        match.numberOfGames && match.numberOfGames > 0
            ? match.numberOfGames
            : 2;
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    return {
        id: match.id,
        start,
        end,
        stamp: start,
        summary: match.name,
        sequence: 1,
    };
}

export function toIcal(name: string, matches: NormalizedMatch[]): ICalCalendar {
    const events = matches
        .map(toIcalEvents)
        .filter((e): e is ICalEventData => e !== null);

    const data = ical({
        url: "https://zlypher.github.io/lol-events/",
        prodId: "//Zlypher//LOL Events//EN",
        timezone: "UTC",
        name,
        events,
    });

    data.x("X-WR-CALDESC", name);

    return data;
}

export default {
    toIcal,
    toIcalEvents,
};
