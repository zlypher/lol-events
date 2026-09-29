import pLimit from "p-limit";
import { DEFAULT_CONCURRENCY } from "../_scripts/create-ical";
import { request } from "../lib/pandascore";

describe("concurrency & rate limiting", () => {
    it("should export a sensible DEFAULT_CONCURRENCY", () => {
        expect(DEFAULT_CONCURRENCY).toBeGreaterThan(0);
        expect(DEFAULT_CONCURRENCY).toBeLessThanOrEqual(10);
    });

    it("should throttle execution so active promises never exceed concurrency limit", async () => {
        const concurrency = 2;
        const limit = pLimit(concurrency);
        let activeCount = 0;
        let maxObservedActive = 0;

        const tasks = Array.from({ length: 6 }, (_, i) =>
            limit(async () => {
                activeCount++;
                maxObservedActive = Math.max(maxObservedActive, activeCount);
                // simulate network delay
                await new Promise((resolve) => setTimeout(resolve, 20));
                activeCount--;
                return i;
            }),
        );

        const results = await Promise.all(tasks);
        expect(results).toEqual([0, 1, 2, 3, 4, 5]);
        expect(maxObservedActive).toBeLessThanOrEqual(concurrency);
    });

    it("should retry on HTTP 429 rate limit when calling request", async () => {
        let attempts = 0;
        const mockFetch = vi.fn().mockImplementation(async () => {
            attempts++;
            if (attempts < 2) {
                return new Response(JSON.stringify({ error: "rate limit" }), {
                    status: 429,
                    statusText: "Too Many Requests",
                    headers: { "Retry-After": "0" },
                });
            }
            return new Response(JSON.stringify({ ok: true }), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        });

        const originalFetch = globalThis.fetch;
        globalThis.fetch = mockFetch;

        try {
            const res = await request("https://api.pandascore.co/test", {
                retries: 2,
                baseDelayMs: 1,
            });
            expect(res.status).toBe(200);
            expect(attempts).toBe(2);
        } finally {
            globalThis.fetch = originalFetch;
        }
    });
});
