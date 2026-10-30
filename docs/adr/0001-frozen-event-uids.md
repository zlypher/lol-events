# Event UIDs are frozen to `<matchId>@zlypher.github.io`

Every calendar event's UID is `<matchId>@zlypher.github.io`, and it stays that way permanently — even after Calendars move off GitHub Pages to a dedicated domain. Calendar clients use the UID as the event's primary key, so changing it would duplicate every event for existing subscribers. RFC 5545 treats the UID as an opaque string with no relation to the serving host, so the domain suffix is purely an identifier. The same Match carries the exact same UID in every Calendar it appears in.
