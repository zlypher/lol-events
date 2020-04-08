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
    };
}

function toIcal(matches) {
    const data = ical({
        domain: "zlypher.github.io",
        prodId: "//Zlypher//LOL Events//EN",
        timezone: "UTC",
        events: matches.map(toIcalEvents),
    });

    return data.toString();
}

module.exports = {
    toIcal,
};
