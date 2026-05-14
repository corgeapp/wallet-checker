// Admin API Key Management
// Stores API key in localStorage and auto-injects it into requests

const API_KEY_STORAGE = 'corge_admin_api_key';

export function getApiKey(): string | null {
    try {
        return localStorage.getItem(API_KEY_STORAGE);
    } catch {
        return null;
    }
}

export function setApiKey(key: string): void {
    try {
        localStorage.setItem(API_KEY_STORAGE, key);
    } catch {
        // Ignore storage errors
    }
}

export function clearApiKey(): void {
    try {
        localStorage.removeItem(API_KEY_STORAGE);
    } catch {
        // Ignore storage errors
    }
}

export function hasApiKey(): boolean {
    return !!getApiKey();
}

/**
 * Add API key to request headers if available
 */
export function getAuthHeaders(): Record<string, string> {
    const apiKey = getApiKey();
    if (apiKey) {
        return { 'X-API-Key': apiKey };
    }
    return {};
}
