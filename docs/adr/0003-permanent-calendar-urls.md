# Permanent Calendar URLs and numeric ID keys for Team Calendars

Once published, Calendar URLs are never deleted. When a League or Team becomes inactive or has no scheduled matches in the current window, its Calendar is published empty rather than removed to prevent client synchronization errors. Team Calendars are published at `cal/team/<teamId>.ical` using PandaScore's immutable numeric Team ID rather than the team slug, preventing broken URLs or split history when teams rebrand or change organizations. Human-readable team names and search are provided by the web catalog interface.
