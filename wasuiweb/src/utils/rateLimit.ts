/**
 * Rate limiting utility
 * Prevents spam by enforcing cooldowns between actions
 */

interface RateLimitConfig {
    key: string;
    cooldownMs: number;
}

interface RateLimitState {
    lastAction: number;
    count: number;
}

class RateLimiter {
    private getState(key: string): RateLimitState | null {
        if (typeof window === 'undefined') return null;

        const stored = localStorage.getItem(`rateLimit_${key}`);
        if (!stored) return null;

        try {
            return JSON.parse(stored);
        } catch {
            return null;
        }
    }

    private setState(key: string, state: RateLimitState): void {
        if (typeof window === 'undefined') return;
        localStorage.setItem(`rateLimit_${key}`, JSON.stringify(state));
    }

    /**
     * Check if an action is allowed
     * @returns {boolean} true if allowed, false if rate limited
     */
    isAllowed(config: RateLimitConfig): boolean {
        const state = this.getState(config.key);
        const now = Date.now();

        if (!state) {
            // First time, allow it
            this.setState(config.key, { lastAction: now, count: 1 });
            return true;
        }

        const timeSinceLastAction = now - state.lastAction;

        if (timeSinceLastAction < config.cooldownMs) {
            // Still in cooldown
            return false;
        }

        // Cooldown expired, allow it
        this.setState(config.key, { lastAction: now, count: state.count + 1 });
        return true;
    }

    /**
     * Get remaining cooldown time in milliseconds
     */
    getRemainingCooldown(config: RateLimitConfig): number {
        const state = this.getState(config.key);
        if (!state) return 0;

        const now = Date.now();
        const timeSinceLastAction = now - state.lastAction;
        const remaining = config.cooldownMs - timeSinceLastAction;

        return Math.max(0, remaining);
    }

    /**
     * Reset rate limit for a key
     */
    reset(key: string): void {
        if (typeof window === 'undefined') return;
        localStorage.removeItem(`rateLimit_${key}`);
    }

    /**
     * Clear all rate limits
     */
    clearAll(): void {
        if (typeof window === 'undefined') return;

        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('rateLimit_')) {
                localStorage.removeItem(key);
            }
        });
    }
}

export const rateLimiter = new RateLimiter();

// Predefined rate limit configs
export const RATE_LIMITS = {
    TREASURE_CREATE: {
        key: 'treasure_create',
        cooldownMs: 30000, // 30 seconds
    },
    TREASURE_CLAIM: {
        key: 'treasure_claim',
        cooldownMs: 5000, // 5 seconds
    },
} as const;
