const ical = require("ical-generator");
const moment = require("moment");
const fs = require("fs");

function toIcalEvents(jsonData) {
    const date = moment(jsonData.date);
    return {
        start: date,
        end: date.add(1, "hour"),
        timestamp: date,
        summary: jsonData.title,
        organizer: "Test <test.example.com>"
    };
}

function toIcal(jsonData) {
    console.log(jsonData);
    const data = ical({
        domain: "example.com",
        prodId: "//example.com//ical-gen//EN",
        events: jsonData.map(toIcalEvents),
    });
    return data.toString();
};

function main() {
    const lcs = JSON.parse(fs.readFileSync("./sources/2020/lcs.json").toString());
    console.log(lcs);

    const lcsIcal = toIcal(lcs);
    console.log(lcsIcal);
}

main();

// // ----------------------------------------------------------

// // const output = ical({
// //     domain: "example.com",
// //     prodId: "//example.com//ical-gen//EN",
// //     events: [
// //         {
// //             start: moment(),
// //             end: moment().add(1, "hour"),
// //             timestamp: moment(),
// //             summary: "Test Event",
// //             organizer: "Test <test.example.com>"
// //         },
// //         {
// //             start: moment().add(3, "hour"),
// //             end: moment().add(4, "hour"),
// //             timestamp: moment(),
// //             summary: "Test Event 2",
// //             organizer: "Test <test.example.com>"
// //         }
// //     ]
// // }).toString();

// // fs.writeFileSync("./output/example.ical", output);