import pLimit from "p-limit";
import { DEFAULT_CONCURRENCY } from "../_scripts/create-ical";
import { request } from "../lib/pandascore";
import { RateLimiter } from "../lib/rate-limiter";

describe("concurrency & rate limiting", () => {
    describe("DEFAULT_CONCURRENCY", () => {
        it("should export a sensible DEFAULT_CONCURRENCY", () => {
            expect(DEFAULT_CONCURRENCY).toBeGreaterThan(0);
            expect(DEFAULT_CONCURRENCY).toBeLessThanOrEqual(5);
        });
    });

    describe("RateLimiter", () => {
        it("should space out calls according to minIntervalMs to obey burst limit", async () => {
            const intervalMs = 30;
            const limiter = new RateLimiter(intervalMs);
            const timestamps: number[] = [];

            // Trigger 4 concurrent acquires
            await Promise.all(
                Array.from({ length: 4 }, async () => {
                    await limiter.acquire();
                    timestamps.push(Date.now());
                }),
            );

            expect(timestamps).toHaveLength(4);
            // Verify each subsequent request was spaced by at least ~intervalMs
            for (let i = 1; i < timestamps.length; i++) {
                const diff = timestamps[i] - timestamps[i - 1];
                // Allow a small delta for timer resolution
                expect(diff).toBeGreaterThanOrEqual(intervalMs - 5);
            }
        });

        it("should execute immediately when minIntervalMs is 0", async () => {
            const limiter = new RateLimiter(0);
            const start = Date.now();

            await Promise.all([
                limiter.acquire(),
                limiter.acquire(),
                limiter.acquire(),
            ]);

            const elapsed = Date.now() - start;
            expect(elapsed).toBeLessThan(30);
        });
    });

    describe("p-limit concurrency", () => {
        it("should throttle execution so active promises never exceed concurrency limit", async () => {
            const concurrency = 2;
            const limit = pLimit(concurrency);
            let activeCount = 0;
            let maxObservedActive = 0;

            const tasks = Array.from({ length: 6 }, (_, i) =>
                limit(async () => {
                    activeCount++;
                    maxObservedActive = Math.max(
                        maxObservedActive,
                        activeCount,
                    );
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
    });

    describe("request retry on 429", () => {
        it("should retry on HTTP 429 rate limit when calling request", async () => {
            let attempts = 0;
            const mockFetch = vi.fn().mockImplementation(async () => {
                attempts++;
                if (attempts < 2) {
                    return new Response(
                        JSON.stringify({ error: "rate limit" }),
                        {
                            status: 429,
                            statusText: "Too Many Requests",
                            headers: { "Retry-After": "0" },
                        },
                    );
                }
                return new Response(JSON.stringify({ ok: true }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" },
                });
            });

            const originalFetch = globalThis.fetch;
            globalThis.fetch = mockFetch;

            try {
                const testLimiter = new RateLimiter(0);
                const res = await request("https://api.pandascore.co/test", {
                    retries: 2,
                    baseDelayMs: 1,
                    rateLimiter: testLimiter,
                });
                expect(res.status).toBe(200);
                expect(attempts).toBe(2);
            } finally {
                globalThis.fetch = originalFetch;
            }
        });
    });
});
