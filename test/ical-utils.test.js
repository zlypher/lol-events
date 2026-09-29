const { toIcal } = require("../lib/ical-utils");
const { mapPandaScoreResult } = require("../lib/pandascore-utils");
const matchesFixture = require("./fixtures/pandascore-matches.json");

describe("ical-utils", () => {
    describe("toIcal", () => {
        it("should generate a valid iCal calendar with correct metadata", () => {
            const mappedMatches = mapPandaScoreResult(matchesFixture);
            const cal = toIcal("LEC", mappedMatches);

            expect(cal).toBeDefined();
            expect(cal.name()).toBe("LEC");
            expect(cal.domain()).toBe("zlypher.github.io");
            expect(cal.prodId()).toBe("//Zlypher//LOL Events//EN");
            expect(cal.timezone()).toBe("UTC");
        });

        it("should filter out matches without beginAt", () => {
            const mappedMatches = mapPandaScoreResult(matchesFixture);
            const cal = toIcal("LEC", mappedMatches);

            // Fixture has 3 matches, but match index 2 has begin_at: null
            expect(cal.events()).toHaveLength(2);
        });

        it("should format VEVENT fields properly", () => {
            const mappedMatches = mapPandaScoreResult([matchesFixture[0]]);
            const cal = toIcal("LEC", mappedMatches);
            const events = cal.events();

            expect(events).toHaveLength(1);
            const event = events[0];
            expect(event.summary()).toBe("Grand final: G2 vs KC");
            expect(event.sequence()).toBe(1);
        });

        it("should produce valid iCalendar string output", () => {
            const mappedMatches = mapPandaScoreResult([matchesFixture[0]]);
            const cal = toIcal("LEC", mappedMatches);
            const icalString = cal.toString();

            expect(icalString).toContain("BEGIN:VCALENDAR");
            expect(icalString).toContain("VERSION:2.0");
            expect(icalString).toContain("PRODID:-//Zlypher//LOL Events//EN");
            expect(icalString).toContain("BEGIN:VEVENT");
            expect(icalString).toContain("SUMMARY:Grand final: G2 vs KC");
            expect(icalString).toContain("END:VEVENT");
            expect(icalString).toContain("END:VCALENDAR");
        });

        it("should serialize to JSON with expected structure", () => {
            const mappedMatches = mapPandaScoreResult([matchesFixture[0]]);
            const cal = toIcal("LEC", mappedMatches);
            const json = cal.toJSON();

            expect(json.name).toBe("LEC");
            expect(json.events).toHaveLength(1);
            expect(json.events[0].summary).toBe("Grand final: G2 vs KC");
        });
    });
});
