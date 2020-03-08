const ical = require("ical-generator");
const moment = require("moment");
const fs = require("fs");

const output = ical({
    domain: "example.com",
    prodId: "//example.com//ical-gen//EN",
    events: [
        {
            start: moment(),
            end: moment().add(1, "hour"),
            timestamp: moment(),
            summary: "Test Event",
            organizer: "Test <test.example.com>"
        }
    ]
}).toString();

fs.writeFileSync("./output/example.ical", output);