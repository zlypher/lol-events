export interface PandaScoreSerie {
    id: number;
    league_id: number;
    name: string | null;
    slug: string;
    season: string | null;
    year: number | null;
    begin_at: string | null;
    end_at: string | null;
    modified_at: string;
    full_name: string;
    winner_id?: number | null;
    winner_type?: "Player" | "Team" | string | null;
}

export interface PandaScoreLeague {
    id: number;
    name: string;
    slug: string;
    image_url: string | null;
    url: string | null;
    modified_at?: string;
    series?: PandaScoreSerie[];
}

export interface PartitionedLeagues {
    active: PandaScoreLeague[];
    inactive: PandaScoreLeague[];
}

export interface PandaScoreOpponentDetails {
    id: number;
    name: string;
    location?: string | null;
    slug?: string;
    acronym?: string | null;
    image_url?: string | null;
    dark_mode_image_url?: string | null;
}

export interface PandaScoreOpponent {
    type?: string;
    opponent: PandaScoreOpponentDetails;
}

export interface PandaScoreMatch {
    id: number;
    name: string;
    begin_at: string | null;
    scheduled_at?: string | null;
    original_scheduled_at?: string | null;
    end_at?: string | null;
    status?:
        | "finished"
        | "running"
        | "not_started"
        | "canceled"
        | "postponed"
        | string;
    number_of_games: number;
    opponents: PandaScoreOpponent[];
    league?: PandaScoreLeague;
    tournament_id?: number;
    winner_id?: number | null;
    rescheduled?: boolean;
    slug?: string;
    match_type?: string;
}

export interface PandaScoreTeam {
    id: number;
    name: string;
    slug?: string;
    acronym?: string | null;
    image_url?: string | null;
    location?: string | null;
}

export interface PandaScoreOptions {
    page?: number;
    per_page?: number;
    filter?: Record<string, string | number | boolean | (string | number)[]>;
    sort?: string;
    range?: Record<string, string>;
    [key: string]: unknown;
}

export interface NormalizedOpponent {
    name: string;
}

export interface NormalizedMatch {
    id: number;
    name: string;
    beginAt: string | null;
    numberOfGames: number;
    teams: NormalizedOpponent[];
}

export interface CalendarEventJSON {
    id: number | string;
    uid: number | string;
    sequence: number;
    start: string;
    end: string;
    timezone?: string | null;
    stamp?: string;
    timestamp?: string;
    summary: string;
    [key: string]: unknown;
}

export interface CalendarJSON {
    domain?: string;
    prodId?: string;
    name?: string;
    timezone?: string | null;
    events: CalendarEventJSON[];
    [key: string]: unknown;
}

export interface LeagueManifestItem {
    id: number;
    name: string;
    slug: string;
    logoUrl: string | null;
    url: string | null;
    calendarUrl: string;
    jsonUrl: string;
    active: boolean;
}

export interface LeaguesManifest {
    generatedAt: string;
    leagues: LeagueManifestItem[];
}
