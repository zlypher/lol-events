const ical = require("ical-generator");
const moment = require("moment");

function toIcalEvents(match) {
    const date = moment.utc(match.beginAt);
    return {
        id: match.id,
        start: date,
        end: moment(date).add(match.numberOfGames, "hour"),
        timestamp: date,
        summary: match.name,
        sequence: 1,
    };
}

function toIcal(name, matches) {
    const data = ical({
        domain: "zlypher.github.io",
        prodId: "//Zlypher//LOL Events//EN",
        timezone: "UTC",
        name: name,
        events: matches.map(toIcalEvents),
    });

    data.x("X-WR-CALDESC", name);

    return data;
}

module.exports = {
    toIcal,
};
