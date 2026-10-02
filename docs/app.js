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
 * Extracts initials from a league name for the placeholder icon.
 *
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
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
 * Renders HTML string for a league card.
 *
 * @param {object} league
 * @returns {string}
 */
export function renderLeagueCard(league) {
    const webcal = toWebcalUrl(league.calendarUrl || "");
    const activeBadgeClass = league.active
        ? "badge badge--active"
        : "badge badge--inactive";
    const activeText = league.active ? "Active" : "Inactive";

    const logoHtml = league.logoUrl
        ? `<img class="league-logo" src="${escapeHtml(league.logoUrl)}" alt="${escapeHtml(league.name)} Logo" loading="lazy" />`
        : `<div class="logo-placeholder" aria-hidden="true">${escapeHtml(getInitials(league.name))}</div>`;

    const websiteLink = league.url
        ? `<a href="${escapeHtml(league.url)}" target="_blank" rel="noopener noreferrer" class="link-website" title="Official Website">Official Site</a>`
        : "";

    return `<article class="league-card" data-slug="${escapeHtml(league.slug || "")}">
    <div class="card-header">
        <div class="logo-wrapper">
            ${logoHtml}
        </div>
        <div class="card-meta">
            <span class="${activeBadgeClass}">${activeText}</span>
            ${websiteLink}
        </div>
    </div>
    <h2 class="league-title">${escapeHtml(league.name || "")}</h2>
    <div class="card-actions">
        <button type="button" class="btn btn--copy" data-copy="${escapeHtml(league.calendarUrl || "")}">Copy iCal</button>
        <a href="${escapeHtml(webcal)}" class="btn btn--subscribe">Subscribe</a>
    </div>
</article>`;
}

/**
 * Renders HTML for empty search/filter result.
 *
 * @param {string} [query]
 * @param {string} [category]
 * @returns {string}
 */
export function renderEmptyState(query = "", category = "all") {
    const queryPart = query
        ? ` matching "<strong>${escapeHtml(query)}</strong>"`
        : "";
    const categoryPart =
        category !== "all" ? ` in ${escapeHtml(category)} leagues` : "";

    return `<div class="empty-state">
    <div class="empty-icon" aria-hidden="true">🔍</div>
    <h3>No leagues found</h3>
    <p>No leagues found${queryPart}${categoryPart}. Try adjusting your search term or category filter.</p>
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
    let currentCategory = "all";
    let currentSearch = "";

    const searchInput = document.getElementById("search-input");
    const categoryButtons = document.querySelectorAll("[data-category]");
    const grid = document.getElementById("leagues-grid");
    const statusContainer = document.getElementById("status-container");
    const summaryCount = document.getElementById("summary-count");

    function updateCounts() {
        const total = allLeagues.length;
        const active = allLeagues.filter((l) => l.active).length;
        const inactive = total - active;
        const counts = { all: total, active, inactive };

        categoryButtons.forEach((btn) => {
            const cat = btn.getAttribute("data-category");
            const countSpan = btn.querySelector(".count");
            if (countSpan && cat && cat in counts) {
                countSpan.textContent = `(${counts[cat]})`;
            }
        });
    }

    function render() {
        if (!grid || !statusContainer) {
            return;
        }

        const filtered = filterLeagues(
            allLeagues,
            currentSearch,
            currentCategory,
        );

        if (summaryCount) {
            summaryCount.textContent = `Showing ${filtered.length} of ${allLeagues.length} leagues`;
        }

        if (filtered.length === 0) {
            grid.innerHTML = "";
            grid.style.display = "none";
            statusContainer.innerHTML = renderEmptyState(
                currentSearch,
                currentCategory,
            );
            statusContainer.style.display = "block";
            const clearBtn = document.getElementById("btn-clear-search");
            if (clearBtn) {
                clearBtn.addEventListener("click", () => {
                    if (searchInput) searchInput.value = "";
                    currentSearch = "";
                    currentCategory = "all";
                    categoryButtons.forEach((b) => {
                        b.classList.toggle(
                            "active",
                            b.getAttribute("data-category") === "all",
                        );
                    });
                    render();
                    if (searchInput) searchInput.focus();
                });
            }
            return;
        }

        statusContainer.innerHTML = "";
        statusContainer.style.display = "none";
        grid.style.display = "grid";
        grid.innerHTML = filtered.map(renderLeagueCard).join("\n");
    }

    async function loadManifest() {
        if (statusContainer) {
            statusContainer.innerHTML = `<div class="loading-state">Loading leagues catalog...</div>`;
            statusContainer.style.display = "block";
        }
        if (grid) {
            grid.style.display = "none";
        }

        try {
            const response = await fetch("./leagues.json");
            if (!response.ok) {
                throw new Error(
                    `HTTP ${response.status}: ${response.statusText}`,
                );
            }
            const data = await response.json();
            allLeagues = Array.isArray(data) ? data : data.leagues || [];
            updateCounts();
            render();
        } catch (err) {
            if (statusContainer) {
                statusContainer.innerHTML = renderErrorState(
                    `Failed to load leagues manifest: ${err.message || "Network error"}.`,
                );
                statusContainer.style.display = "block";
                const retryBtn = document.getElementById("btn-retry");
                if (retryBtn) {
                    retryBtn.addEventListener("click", loadManifest);
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
            if (
                target &&
                target.classList &&
                target.classList.contains("btn--copy")
            ) {
                if (target.classList.contains("btn--copied")) {
                    return;
                }
                const url = target.getAttribute("data-copy");
                if (url) {
                    const ok = await copyToClipboard(url);
                    if (ok) {
                        target.textContent = "Copied!";
                        target.classList.add("btn--copied");
                        setTimeout(() => {
                            target.textContent = "Copy iCal";
                            target.classList.remove("btn--copied");
                        }, 2000);
                    }
                }
            }
        });
    }

    loadManifest();
}

if (typeof window !== "undefined" && typeof document !== "undefined") {
    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initApp);
    } else {
        initApp();
    }
}
