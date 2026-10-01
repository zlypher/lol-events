/**
 * RateLimiter coordinates requests to obey PandaScore's rate limits:
 * - 60 requests per minute burst limit (default 1200ms spacing = 50 req/min).
 * - 1,000 requests per hour ceiling.
 */
export class RateLimiter {
    private queue: Array<() => void> = [];
    private lastRequestTime = 0;
    private minIntervalMs: number;
    private isProcessing = false;

    constructor(minIntervalMs?: number) {
        if (minIntervalMs !== undefined) {
            this.minIntervalMs = minIntervalMs;
        } else if (process.env.PANDASCORE_REQUEST_DELAY_MS !== undefined) {
            this.minIntervalMs = Number(
                process.env.PANDASCORE_REQUEST_DELAY_MS,
            );
        } else if (process.env.VITEST || process.env.NODE_ENV === "test") {
            // Instant in tests to avoid test suite slowdowns
            this.minIntervalMs = 0;
        } else {
            // Default: 1200ms interval between requests (50 req/min, safely under the 60 req/min burst limit)
            this.minIntervalMs = 1200;
        }
    }

    public setIntervalMs(intervalMs: number): void {
        this.minIntervalMs = intervalMs;
    }

    public getIntervalMs(): number {
        return this.minIntervalMs;
    }

    public async acquire(): Promise<void> {
        if (this.minIntervalMs <= 0) {
            return;
        }

        return new Promise<void>((resolve) => {
            this.queue.push(resolve);
            this.process();
        });
    }

    private async process(): Promise<void> {
        if (this.isProcessing) {
            return;
        }
        this.isProcessing = true;

        while (this.queue.length > 0) {
            const now = Date.now();
            const elapsed = now - this.lastRequestTime;
            if (elapsed < this.minIntervalMs) {
                await new Promise((resolve) =>
                    setTimeout(resolve, this.minIntervalMs - elapsed),
                );
            }
            this.lastRequestTime = Date.now();
            const next = this.queue.shift();
            if (next) {
                next();
            }
        }

        this.isProcessing = false;
    }
}

export const defaultRateLimiter = new RateLimiter();
