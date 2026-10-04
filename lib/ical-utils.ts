import ical, {
    type ICalCalendar,
    type ICalEvent,
    type ICalEventData,
    ICalEventStatus,
} from "ical-generator";
import type { CalendarEventJSON, CalendarJSON, NormalizedMatch } from "./types";

export function hasEventChanged(
    currentEvent: ICalEvent,
    prevEvent: CalendarEventJSON,
): boolean {
    // 1. Check summary changes (teams replaced, match title changed)
    if (currentEvent.summary() !== prevEvent.summary) {
        return true;
    }

    // 2. Check start time changes (match rescheduled or delayed)
    const currentStart = currentEvent.start()
        ? new Date(currentEvent.start() as string | Date).getTime()
        : null;
    const prevStart = prevEvent.start
        ? new Date(prevEvent.start).getTime()
        : null;
    if (currentStart !== prevStart) {
        return true;
    }

    // 3. Check end time changes
    const currentEnd = currentEvent.end()
        ? new Date(currentEvent.end() as string | Date).getTime()
        : null;
    const prevEnd = prevEvent.end ? new Date(prevEvent.end).getTime() : null;
    if (currentEnd !== prevEnd) {
        return true;
    }

    return false;
}

export function updateCalendarEvents(
    icalData: ICalCalendar,
    jsonData: CalendarJSON,
): void {
    if (!jsonData?.events || !Array.isArray(jsonData.events)) {
        return;
    }

    for (const event of icalData.events()) {
        const eventUid = String(event.uid() || event.id());
        const prevEvent = jsonData.events.find((e) => {
            const prevUid = String(e.uid ?? e.id);
            return (
                prevUid === eventUid ||
                `${prevUid}@zlypher.github.io` === eventUid ||
                prevUid === `${eventUid}@zlypher.github.io`
            );
        });

        if (prevEvent) {
            const prevSeq =
                typeof prevEvent.sequence === "number" ? prevEvent.sequence : 1;
            if (hasEventChanged(event, prevEvent)) {
                event.sequence(prevSeq + 1);
            } else {
                event.sequence(prevSeq);
            }
        }
    }
}

export function toIcalEvents(match: NormalizedMatch): ICalEventData | null {
    const rawStart = match.scheduledAt || match.beginAt;
    if (!rawStart) {
        return null;
    }

    const start = new Date(rawStart);
    if (isNaN(start.getTime())) {
        return null;
    }

    const durationHours =
        match.numberOfGames && match.numberOfGames > 0
            ? match.numberOfGames
            : 2;
    const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000);

    const eventData: ICalEventData = {
        id: `${match.id}@zlypher.github.io`,
        start,
        end,
        stamp: start,
        summary: match.name,
        sequence: typeof match.sequence === "number" ? match.sequence : 1,
    };

    if (match.status) {
        const normalized = match.status.toUpperCase();
        if (normalized === "CANCELLED" || normalized === "CANCELED") {
            eventData.status = ICalEventStatus.CANCELLED;
        }
    }

    return eventData;
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
    hasEventChanged,
    toIcal,
    toIcalEvents,
    updateCalendarEvents,
};

