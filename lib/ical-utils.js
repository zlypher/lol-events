import ical from "ical-generator";

export function toIcalEvents(match) {
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
        timestamp: start,
        summary: match.name,
        sequence: 1,
    };
}

export function toIcal(name, matches) {
    const data = ical({
        url: "https://zlypher.github.io/lol-events/",
        prodId: "//Zlypher//LOL Events//EN",
        timezone: "UTC",
        name,
        events: matches.map(toIcalEvents).filter(Boolean),
    });

    data.x("X-WR-CALDESC", name);

    return data;
}

export default {
    toIcal,
    toIcalEvents,
};
