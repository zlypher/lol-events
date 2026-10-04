import ical, {
    type ICalCalendar,
    type ICalEventData,
    ICalEventStatus,
} from "ical-generator";
import type { MatchStoreEntry, NormalizedMatch } from "./types";

export function toIcalEvents(
    item: NormalizedMatch | MatchStoreEntry,
): ICalEventData | null {
    const rawStart =
        "start" in item && item.start !== undefined
            ? item.start
            : (item as NormalizedMatch).scheduledAt ||
              (item as NormalizedMatch).beginAt;

    if (!rawStart) {
        return null;
    }

    const start = new Date(rawStart);
    if (isNaN(start.getTime())) {
        return null;
    }

    let end: Date;
    if ("end" in item && item.end) {
        end = new Date(item.end);
        if (isNaN(end.getTime())) {
            end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
        }
    } else {
        const numGames = (item as NormalizedMatch).numberOfGames;
        const durationHours = numGames && numGames > 0 ? numGames : 2;
        end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);
    }

    const uid =
        "uid" in item && item.uid ? item.uid : `${item.id}@zlypher.github.io`;
    const summary =
        "summary" in item && item.summary !== undefined
            ? item.summary
            : (item as NormalizedMatch).name;

    const eventData: ICalEventData = {
        id: uid,
        start,
        end,
        stamp: start,
        summary,
        sequence: typeof item.sequence === "number" ? item.sequence : 1,
    };

    if (item.status) {
        const normalized = item.status.toUpperCase();
        if (normalized === "CANCELLED" || normalized === "CANCELED") {
            eventData.status = ICalEventStatus.CANCELLED;
        }
    }

    return eventData;
}

export function toIcal(
    name: string,
    matches: Array<NormalizedMatch | MatchStoreEntry>,
): ICalCalendar {
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
