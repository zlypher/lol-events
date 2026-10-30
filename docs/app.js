/**
 * Converts https:// or http:// calendar feed URL to webcal:// protocol.
 *
 * @param {string} url
 * @returns {string}
 */
export function toWebcalUrl(url) {
    if (!url || typeof url !== "string") {
        return "";
    }
    return url.replace(/^https?:\/\//i, "webcal://");
}

/**
 * Filters leagues by text query and category.
 *
 * @template T
 * @param {T[]} leagues
 * @param {string} [query]
 * @param {"all" | "active" | "inactive"} [category]
 * @returns {T[]}
 */
export function filterLeagues(leagues, query = "", category = "all") {
    if (!Array.isArray(leagues)) {
        return [];
    }

    const trimmedQuery = (query || "").trim().toLowerCase();

    return leagues.filter((league) => {
        if (!league) {
            return false;
        }

        // Category check
        if (category === "active" && !league.active) {
            return false;
        }
        if (category === "inactive" && league.active) {
            return false;
        }

        // Text query check
        if (!trimmedQuery) {
            return true;
        }

        const nameMatch = (league.name || "")
            .toLowerCase()
            .includes(trimmedQuery);
        const slugMatch = (league.slug || "")
            .toLowerCase()
            .includes(trimmedQuery);

        return nameMatch || slugMatch;
    });
}

/**
 * Filters teams by text query (name, acronym, or slug).
 *
 * @template T
 * @param {T[]} teams
 * @param {string} [query]
 * @returns {T[]}
 */
export function filterTeams(teams, query = "") {
    if (!Array.isArray(teams)) {
        return [];
    }

    const trimmedQuery = (query || "").trim().toLowerCase();
    if (!trimmedQuery) {
        return teams;
    }

    return teams.filter((team) => {
        if (!team) {
            return false;
        }

        const nameMatch = (team.name || "")
            .toLowerCase()
            .includes(trimmedQuery);
        const slugMatch = (team.slug || "")
            .toLowerCase()
            .includes(trimmedQuery);
        const acronymMatch = (team.acronym || "")
            .toLowerCase()
            .includes(trimmedQuery);

        return nameMatch || slugMatch || acronymMatch;
    });
}

/**
 * Escapes characters unsafe for HTML interpolation.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
    if (!str || typeof str !== "string") {
        return "";
    }
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

/**
 * Extracts initials from a name for placeholder icons.
 *
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
    if (!name) {
        return "LoL";
    }
    const words = name.trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].slice(0, 3).toUpperCase();
    }
    return words
        .slice(0, 3)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
}

/**
 * Resolves a calendar JSON URL from absolute production URL to relative path.
 *
 * @param {string} url
 * @returns {string}
 */
/**
 * Resolves a calendar JSON URL from absolute production or custom domain URL to relative path.
 *
 * @param {string} url
 * @returns {string}
 */
export function resolveCalendarJsonUrl(url) {
    if (!url || typeof url !== "string") {
        return "";
    }
    return url.replace(/^https?:\/\/[^/]+(?:\/lol-events)?\/cal\//i, "./cal/");
}

/**
 * Extracts opponent names from a match summary string, stripping league tags and stage prefixes.
 *
 * @param {string} summary
 * @returns {string}
 */
export function formatOpponentNames(summary) {
    if (!summary || typeof summary !== "string") {
        return "Match";
    }
    let cleaned = summary.trim();
    cleaned = cleaned.replace(/^\[[^\]]+\]\s*/, "");
    cleaned = cleaned.replace(/^\([^)]+\)\s*/, "");
    cleaned = cleaned.replace(/^[^:]+:\s*/, "");
    return cleaned.trim() || summary.trim();
}

/**
 * Formats a match start date/time into localized relative string (e.g. "Tomorrow at 18:00").
 *
 * @param {string} dateStr
 * @param {Date | string | number} [referenceDate]
 * @param {string} [locale]
 * @param {string} [timeZone]
 * @returns {string}
 */
export function formatLocalizedMatchTime(
    dateStr,
    referenceDate = new Date(),
    locale = "en-US",
    timeZone,
) {
    if (!dateStr || typeof dateStr !== "string") {
        return "";
    }
    const eventDate = new Date(dateStr);
    const refDate =
        referenceDate instanceof Date
            ? referenceDate
            : new Date(referenceDate);

    if (isNaN(eventDate.getTime()) || isNaN(refDate.getTime())) {
        return dateStr;
    }

    const timeOptions = {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
    };
    if (timeZone) {
        timeOptions.timeZone = timeZone;
    }

    const timeStr = new Intl.DateTimeFormat(locale, timeOptions).format(
        eventDate,
    );

    const datePartsOptions = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    };
    if (timeZone) {
        datePartsOptions.timeZone = timeZone;
    }

    const dtf = new Intl.DateTimeFormat("en-CA", datePartsOptions);
    const [refYear, refMonth, refDay] = dtf
        .format(refDate)
        .split("-")
        .map(Number);
    const [eventYear, eventMonth, eventDay] = dtf
        .format(eventDate)
        .split("-")
        .map(Number);

    const refUtc = Date.UTC(refYear, refMonth - 1, refDay);
    const eventUtc = Date.UTC(eventYear, eventMonth - 1, eventDay);
    const dayDiff = Math.round((eventUtc - refUtc) / (24 * 60 * 60 * 1000));

    if (dayDiff === 0) {
        return `Today at ${timeStr}`;
    }
    if (dayDiff === 1) {
        return `Tomorrow at ${timeStr}`;
    }
    if (dayDiff === -1) {
        return `Yesterday at ${timeStr}`;
    }
    if (dayDiff > 1 && dayDiff < 7) {
        const weekdayOptions = { weekday: "long" };
        if (timeZone) {
            weekdayOptions.timeZone = timeZone;
        }
        const weekday = new Intl.DateTimeFormat(locale, weekdayOptions).format(
            eventDate,
        );
        return `${weekday} at ${timeStr}`;
    }

    const dateOptions = { month: "short", day: "numeric" };
    if (timeZone) {
        dateOptions.timeZone = timeZone;
    }
    const monthDay = new Intl.DateTimeFormat(locale, dateOptions).format(
        eventDate,
    );
    return `${monthDay} at ${timeStr}`;
}

/**
 * Filters and sorts upcoming matches from a list of calendar events.
 *
 * @template {Record<string, any>} T
 * @param {T[]} events
 * @param {Date | string | number} [referenceDate]
 * @param {number} [limit]
 * @returns {T[]}
 */
export function getUpcomingMatches(
    events,
    referenceDate = new Date(),
    limit = 5,
) {
    if (!Array.isArray(events)) {
        return [];
    }

    const refTime =
        referenceDate instanceof Date
            ? referenceDate.getTime()
            : new Date(referenceDate).getTime();
    const validRefTime = isNaN(refTime) ? Date.now() : refTime;

    const upcoming = events.filter((event) => {
        if (!event || !event.start) {
            return false;
        }
        const startTime = new Date(event.start).getTime();
        if (isNaN(startTime)) {
            return false;
        }
        return startTime >= validRefTime;
    });

    upcoming.sort(
        (a, b) =>
            new Date(a.start).getTime() - new Date(b.start).getTime(),
    );

    const maxLimit = Math.max(1, limit);
    return upcoming.slice(0, maxLimit);
}

/**
 * Fetches calendar events from a given JSON URL.
 *
 * @template {Record<string, any>} [T=Record<string, any>]
 * @param {string} url
 * @param {typeof fetch} [fetchFn]
 * @returns {Promise<T[]>}
 */
export async function fetchCalendarEvents(url, fetchFn = fetch) {
    const resolvedUrl = resolveCalendarJsonUrl(url);
    const response = await fetchFn(resolvedUrl);
    if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : data.events || [];
}

/**
 * Renders HTML string for upcoming match preview list.
 *
 * @param {Array<object>} events
 * @param {object} [options]
 * @returns {string}
 */
export function renderMatchPreview(events, options = {}) {
    const referenceDate = options.referenceDate ?? new Date();
    const limit = options.limit ?? 5;
    const locale = options.locale ?? "en-US";
    const timeZone = options.timeZone;

    const upcoming = getUpcomingMatches(events, referenceDate, limit);

    if (upcoming.length === 0) {
        return `<div class="preview-empty">No upcoming matches scheduled.</div>`;
    }

    const itemsHtml = upcoming
        .map((event) => {
            const timeStr = formatLocalizedMatchTime(
                event.start,
                referenceDate,
                locale,
                timeZone,
            );
            const isCanceled = event.status === "CANCELLED";
            const canceledBadge = isCanceled
                ? ` <span class="preview-badge preview-badge--canceled">Canceled</span>`
                : "";
            const opponentNames = formatOpponentNames(event.summary);

            return `        <li class="preview-match-item${isCanceled ? " preview-match-item--canceled" : ""}">
            <span class="preview-match-time">${escapeHtml(timeStr)}</span>
            <span class="preview-match-summary" title="${escapeHtml(event.summary || "")}">${escapeHtml(opponentNames)}</span>${canceledBadge}
        </li>`;
        })
        .join("\n");

    return `<div class="preview-container">
    <h3 class="preview-heading">Upcoming Matches</h3>
    <ul class="preview-match-list">
${itemsHtml}
    </ul>
</div>`;
}

/**
 * Renders HTML string for a league card.
 *
 * @param {object} league
 * @returns {string}
 */
export function renderLeagueCard(league) {
    const logoHtml = league.logoUrl
        ? `<img class="league-logo" src="${escapeHtml(league.logoUrl)}" alt="${escapeHtml(league.name)} Logo" loading="lazy" />`
        : `<div class="logo-placeholder" aria-hidden="true">${escapeHtml(getInitials(league.name))}</div>`;

    return `<article class="league-card" data-slug="${escapeHtml(league.slug || "")}" data-json="${escapeHtml(league.jsonUrl || "")}" aria-expanded="false">
    <div class="card-main">
        <div class="logo-wrapper">
            ${logoHtml}
        </div>
        <div class="card-content">
            <h2 class="league-title" title="${escapeHtml(league.name || "")}">${escapeHtml(league.name || "")}</h2>
        </div>
        <div class="card-actions">
            <button type="button" class="btn btn--copy" data-copy="${escapeHtml(league.calendarUrl || "")}" aria-label="Copy iCal for ${escapeHtml(league.name || "")}" title="Copy iCal">
                <svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <button type="button" class="btn btn--expand" aria-label="Toggle upcoming matches for ${escapeHtml(league.name || "")}" title="Upcoming matches" aria-expanded="false">
                <svg class="icon-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
        </div>
    </div>
    <div class="card-preview" aria-hidden="true" style="display: none;"></div>
</article>`;
}

/**
 * Renders HTML string for a team card.
 *
 * @param {object} team
 * @returns {string}
 */
export function renderTeamCard(team) {
    const logoHtml = team.logoUrl
        ? `<img class="team-logo" src="${escapeHtml(team.logoUrl)}" alt="${escapeHtml(team.name)} Logo" loading="lazy" />`
        : `<div class="logo-placeholder" aria-hidden="true">${escapeHtml(team.acronym || getInitials(team.name))}</div>`;

    const acronymHtml = team.acronym
        ? `<span class="team-acronym">${escapeHtml(team.acronym)}</span>`
        : "";

    return `<article class="team-card" data-slug="${escapeHtml(team.slug || "")}" data-id="${escapeHtml(String(team.id))}" data-json="${escapeHtml(team.jsonUrl || "")}" aria-expanded="false">
    <div class="card-main">
        <div class="logo-wrapper">
            ${logoHtml}
        </div>
        <div class="card-content">
            <h2 class="team-title" title="${escapeHtml(team.name || "")}">
                ${escapeHtml(team.name || "")}
                ${acronymHtml}
            </h2>
        </div>
        <div class="card-actions">
            <button type="button" class="btn btn--copy" data-copy="${escapeHtml(team.calendarUrl || "")}" aria-label="Copy iCal for ${escapeHtml(team.name || "")}" title="Copy iCal">
                <svg class="icon-copy" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
                <svg class="icon-check" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </button>
            <button type="button" class="btn btn--expand" aria-label="Toggle upcoming matches for ${escapeHtml(team.name || "")}" title="Upcoming matches" aria-expanded="false">
                <svg class="icon-chevron" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
        </div>
    </div>
    <div class="card-preview" aria-hidden="true" style="display: none;"></div>
</article>`;
}

/**
 * Renders HTML for empty search/filter result.
 *
 * @param {string} [query]
 * @param {string} [category]
 * @param {"leagues" | "teams"} [entityType]
 * @returns {string}
 */
export function renderEmptyState(
    query = "",
    category = "all",
    entityType = "leagues",
) {
    const isTeams = entityType === "teams";
    const entityName = isTeams ? "teams" : "leagues";
    const queryPart = query
        ? ` matching "<strong>${escapeHtml(query)}</strong>"`
        : "";
    const categoryPart =
        !isTeams && category !== "all"
            ? ` in ${escapeHtml(category)} ${entityName}`
            : "";

    return `<div class="empty-state">
    <div class="empty-icon" aria-hidden="true">🔍</div>
    <h3>No ${entityName} found</h3>
    <p>No ${entityName} found${queryPart}${categoryPart}. Try adjusting your search term${isTeams ? "" : " or category filter"}.</p>
    <button type="button" class="btn btn--secondary" id="btn-clear-search">Reset Filters</button>
</div>`;
}

/**
 * Renders HTML for error banner when manifest cannot be fetched.
 *
 * @param {string} [message]
 * @returns {string}
 */
export function renderErrorState(
    message = "Unable to load leagues.json manifest.",
) {
    return `<div class="error-banner" role="alert">
    <div class="error-icon" aria-hidden="true">⚠️</div>
    <div class="error-content">
        <h3>Catalog Unavailable</h3>
        <p>${escapeHtml(message)}</p>
    </div>
    <button type="button" class="btn btn--retry" id="btn-retry">Retry</button>
</div>`;
}

/**
 * Copies text to the clipboard with modern navigator API and textarea fallback.
 *
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
    if (
        typeof navigator !== "undefined" &&
        navigator.clipboard &&
        navigator.clipboard.writeText
    ) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
            // fallback below
        }
    }

    if (typeof document !== "undefined") {
        try {
            const textarea = document.createElement("textarea");
            textarea.value = text;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            textarea.style.top = "-9999px";
            document.body.appendChild(textarea);
            textarea.select();
            const success = document.execCommand("copy");
            document.body.removeChild(textarea);
            return success;
        } catch {
            return false;
        }
    }

    return false;
}

/**
 * Client application controller for browser environments.
 */
export function initApp() {
    if (typeof document === "undefined") {
        return;
    }

    let allLeagues = [];
    let allTeams = [];
    let currentTab = "leagues"; // "leagues" | "teams"
    let currentCategory = "all";
    let currentSearch = "";
    const calendarCache = new Map();

    const searchInput = document.getElementById("search-input");
    const categoryFilters = document.getElementById("category-filters");
    const categoryButtons = document.querySelectorAll("[data-category]");
    const tabButtons = document.querySelectorAll("[data-tab]");
    const grid = document.getElementById("leagues-grid");
    const statusContainer = document.getElementById("status-container");
    const summaryCount = document.getElementById("summary-count");

    function updateCounts() {
        const totalLeagues = allLeagues.length;
        const activeLeagues = allLeagues.filter((l) => l.active).length;
        const inactiveLeagues = totalLeagues - activeLeagues;
        const leagueCounts = {
            all: totalLeagues,
            active: activeLeagues,
            inactive: inactiveLeagues,
        };

        categoryButtons.forEach((btn) => {
            const cat = btn.getAttribute("data-category");
            const countSpan = btn.querySelector(".count");
            if (countSpan && cat && cat in leagueCounts) {
                countSpan.textContent = `(${leagueCounts[cat]})`;
            }
        });

        const leaguesTabCount = document.getElementById("tab-count-leagues");
        if (leaguesTabCount) {
            leaguesTabCount.textContent = `(${totalLeagues})`;
        }
        const teamsTabCount = document.getElementById("tab-count-teams");
        if (teamsTabCount) {
            teamsTabCount.textContent = `(${allTeams.length})`;
        }
    }

    function render() {
        if (!grid || !statusContainer) {
            return;
        }

        const isTeams = currentTab === "teams";

        if (categoryFilters) {
            categoryFilters.style.display = isTeams ? "none" : "inline-flex";
        }

        if (searchInput) {
            searchInput.placeholder = isTeams
                ? "Search teams by name, acronym, or slug (e.g. T1, G2, Fnatic)..."
                : "Search leagues by name or slug (e.g. LEC, Worlds, LCS)...";
            searchInput.setAttribute(
                "aria-label",
                isTeams ? "Search teams" : "Search leagues",
            );
        }

        if (isTeams) {
            const filteredTeams = filterTeams(allTeams, currentSearch);

            if (summaryCount) {
                summaryCount.textContent = `Showing ${filteredTeams.length} of ${allTeams.length} teams`;
            }

            if (filteredTeams.length === 0) {
                grid.innerHTML = "";
                grid.style.display = "none";
                statusContainer.innerHTML = renderEmptyState(
                    currentSearch,
                    "all",
                    "teams",
                );
                statusContainer.style.display = "block";
                bindClearButton();
                return;
            }

            statusContainer.innerHTML = "";
            statusContainer.style.display = "none";
            grid.style.display = "grid";
            grid.innerHTML = filteredTeams.map(renderTeamCard).join("\n");
        } else {
            const filteredLeagues = filterLeagues(
                allLeagues,
                currentSearch,
                currentCategory,
            );

            if (summaryCount) {
                summaryCount.textContent = `Showing ${filteredLeagues.length} of ${allLeagues.length} leagues`;
            }

            if (filteredLeagues.length === 0) {
                grid.innerHTML = "";
                grid.style.display = "none";
                statusContainer.innerHTML = renderEmptyState(
                    currentSearch,
                    currentCategory,
                    "leagues",
                );
                statusContainer.style.display = "block";
                bindClearButton();
                return;
            }

            statusContainer.innerHTML = "";
            statusContainer.style.display = "none";
            grid.style.display = "grid";
            grid.innerHTML = filteredLeagues.map(renderLeagueCard).join("\n");
        }
    }

    function bindClearButton() {
        const clearBtn = document.getElementById("btn-clear-search");
        if (clearBtn) {
            clearBtn.addEventListener("click", () => {
                if (searchInput) {
                    searchInput.value = "";
                }
                currentSearch = "";
                currentCategory = "all";
                categoryButtons.forEach((b) => {
                    b.classList.toggle(
                        "active",
                        b.getAttribute("data-category") === "all",
                    );
                });
                render();
                if (searchInput) {
                    searchInput.focus();
                }
            });
        }
    }

    async function togglePreview(card) {
        if (!card) {
            return;
        }

        const previewContainer = card.querySelector(".card-preview");
        const expandBtn = card.querySelector(".btn--expand");
        if (!previewContainer) {
            return;
        }

        const isCurrentlyExpanded =
            card.getAttribute("aria-expanded") === "true";

        if (isCurrentlyExpanded) {
            // Collapse
            card.setAttribute("aria-expanded", "false");
            if (expandBtn) {
                expandBtn.setAttribute("aria-expanded", "false");
            }
            card.classList.remove("is-expanded");
            previewContainer.style.display = "none";
            previewContainer.setAttribute("aria-hidden", "true");
            return;
        }

        // Expand
        card.setAttribute("aria-expanded", "true");
        if (expandBtn) {
            expandBtn.setAttribute("aria-expanded", "true");
        }
        card.classList.add("is-expanded");
        previewContainer.style.display = "block";
        previewContainer.setAttribute("aria-hidden", "false");

        const jsonUrl = card.getAttribute("data-json");
        if (!jsonUrl) {
            previewContainer.innerHTML = `<div class="preview-empty">No schedule data available.</div>`;
            return;
        }

        // If cached, render immediately
        if (calendarCache.has(jsonUrl)) {
            const cachedEvents = calendarCache.get(jsonUrl);
            previewContainer.innerHTML = renderMatchPreview(cachedEvents, {
                locale: navigator.language,
            });
            return;
        }

        // Show loading state
        previewContainer.innerHTML = `<div class="preview-loading"><span class="preview-spinner" aria-hidden="true">⏳</span> Loading upcoming matches...</div>`;

        try {
            const events = await fetchCalendarEvents(jsonUrl);
            calendarCache.set(jsonUrl, events);
            previewContainer.innerHTML = renderMatchPreview(events, {
                locale: navigator.language,
            });
        } catch {
            previewContainer.innerHTML = `<div class="preview-error">
                <span>Failed to load match schedule.</span>
                <button type="button" class="btn btn--secondary btn--retry-preview">Retry</button>
            </div>`;
            const retryBtn = previewContainer.querySelector(
                ".btn--retry-preview",
            );
            if (retryBtn) {
                retryBtn.addEventListener("click", (e) => {
                    e.stopPropagation();
                    calendarCache.delete(jsonUrl);
                    card.setAttribute("aria-expanded", "false");
                    togglePreview(card);
                });
            }
        }
    }

    async function loadManifests() {
        if (statusContainer) {
            statusContainer.innerHTML = `<div class="loading-state">Loading catalogs...</div>`;
            statusContainer.style.display = "block";
        }
        if (grid) {
            grid.style.display = "none";
        }

        try {
            const leaguesPromise = fetch("./leagues.json").then((res) => {
                if (!res.ok) {
                    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
                }
                return res.json();
            });

            const teamsPromise = fetch("./teams.json")
                .then((res) => (res.ok ? res.json() : { teams: [] }))
                .catch(() => ({ teams: [] }));

            const [leaguesData, teamsData] = await Promise.all([
                leaguesPromise,
                teamsPromise,
            ]);

            allLeagues = Array.isArray(leaguesData)
                ? leaguesData
                : leaguesData.leagues || [];
            allTeams = Array.isArray(teamsData)
                ? teamsData
                : teamsData.teams || [];

            updateCounts();
            render();
        } catch (err) {
            if (statusContainer) {
                statusContainer.innerHTML = renderErrorState(
                    `Failed to load catalogs: ${err.message || "Network error"}.`,
                );
                statusContainer.style.display = "block";
                const retryBtn = document.getElementById("btn-retry");
                if (retryBtn) {
                    retryBtn.addEventListener("click", loadManifests);
                }
            }
        }
    }

    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            currentSearch = e.target.value;
            render();
        });
    }

    tabButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            tabButtons.forEach((b) => {
                b.classList.remove("active");
                b.setAttribute("aria-selected", "false");
            });
            btn.classList.add("active");
            btn.setAttribute("aria-selected", "true");
            currentTab = btn.getAttribute("data-tab") || "leagues";
            render();
        });
    });

    categoryButtons.forEach((btn) => {
        btn.addEventListener("click", () => {
            categoryButtons.forEach((b) => b.classList.remove("active"));
            btn.classList.add("active");
            currentCategory = btn.getAttribute("data-category") || "all";
            render();
        });
    });

    if (grid) {
        grid.addEventListener("click", async (e) => {
            const target = e.target;
            if (!(target instanceof Element)) {
                return;
            }

            // Copy button click
            const copyBtn = target.closest(".btn--copy");
            if (copyBtn) {
                e.stopPropagation();
                if (copyBtn.classList.contains("btn--copied")) {
                    return;
                }
                const url = copyBtn.getAttribute("data-copy");
                if (url) {
                    const ok = await copyToClipboard(url);
                    if (ok) {
                        copyBtn.classList.add("btn--copied");
                        copyBtn.setAttribute("title", "Copied!");
                        copyBtn.setAttribute("aria-label", "Copied!");
                        setTimeout(() => {
                            copyBtn.classList.remove("btn--copied");
                            copyBtn.setAttribute("title", "Copy iCal");
                            copyBtn.setAttribute("aria-label", "Copy iCal");
                        }, 1000);
                    }
                }
                return;
            }

            // Retry preview button click
            if (target.closest(".btn--retry-preview")) {
                return; // Handled in togglePreview retry listener
            }

            // Ignore clicks inside preview content so inspecting/selecting text does not collapse the card
            if (target.closest(".card-preview")) {
                return;
            }

            // Card click or expand button click
            const card = target.closest(".league-card, .team-card");
            if (card) {
                togglePreview(card);
            }
        });
    }

    loadManifests();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initApp);
    } else {
        initApp();
    }
}
