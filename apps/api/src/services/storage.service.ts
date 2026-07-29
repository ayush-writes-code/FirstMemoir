import { r2Provider } from './storage/r2.provider.js';

/**
 * Singleton storage service.
 *
 * Exposes the active storage provider to the rest of the application.
 * To swap providers (e.g. in tests), replace `r2Provider` here — no
 * other files need to change.
 */
export const storageService = r2Provider;
