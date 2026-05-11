// Rate limiting utility for wallet checker
// Tracks requests per session (simulates IP-based limiting on client side)

const STORAGE_KEY = 'wallet_checker_requests';
const MAX_REQUESTS = 3;
const RESET_HOURS = 24;

interface RequestLog {
    count: number;
    firstRequest: number;
}

function getRequestLog(): RequestLog {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return { count: 0, firstRequest: Date.now() };
        return JSON.parse(stored) as RequestLog;
    } catch {
        return { count: 0, firstRequest: Date.now() };
    }
}

function saveRequestLog(log: RequestLog): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
    } catch {
        // Ignore storage errors
    }
}

function shouldReset(log: RequestLog): boolean {
    const hoursSinceFirst = (Date.now() - log.firstRequest) / (1000 * 60 * 60);
    return hoursSinceFirst >= RESET_HOURS;
}

export function canMakeRequest(isAuthenticated: boolean): boolean {
    // Authenticated users have unlimited requests
    if (isAuthenticated) return true;

    const log = getRequestLog();

    // Reset if 24 hours have passed
    if (shouldReset(log)) {
        saveRequestLog({ count: 0, firstRequest: Date.now() });
        return true;
    }

    return log.count < MAX_REQUESTS;
}

export function incrementRequestCount(isAuthenticated: boolean): void {
    // Don't track authenticated users
    if (isAuthenticated) return;

    const log = getRequestLog();

    // Reset if needed
    if (shouldReset(log)) {
        saveRequestLog({ count: 1, firstRequest: Date.now() });
        return;
    }

    saveRequestLog({ count: log.count + 1, firstRequest: log.firstRequest });
}

export function getRemainingRequests(isAuthenticated: boolean): number | null {
    // Authenticated users have unlimited
    if (isAuthenticated) return null;

    const log = getRequestLog();

    // Reset if needed
    if (shouldReset(log)) {
        return MAX_REQUESTS;
    }

    return Math.max(0, MAX_REQUESTS - log.count);
}

export function getResetTime(): Date | null {
    const log = getRequestLog();
    if (log.count === 0) return null;

    const resetTime = new Date(log.firstRequest + RESET_HOURS * 60 * 60 * 1000);
    return resetTime;
}
