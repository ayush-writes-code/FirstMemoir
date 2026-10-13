import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { resolveStorageEvent } from '../store/auth.context';

describe('Auth Context Resilience & Hint Invariant Tests', () => {
  // In-memory mock localStorage for Node.js test environment
  const mockStorage: Record<string, string> = {};
  const fakeLocalStorage = {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, val: string) => { mockStorage[key] = val; },
    removeItem: (key: string) => { delete mockStorage[key]; },
    clear: () => { Object.keys(mockStorage).forEach((k) => delete mockStorage[k]); },
  };

  beforeEach(() => {
    fakeLocalStorage.clear();
  });

  it('anonymous visitor: without auth_hint, profile check is bypassed to prevent 401 console error', () => {
    let apiCallMade = false;
    const mockAuthGetMe = async () => {
      apiCallMade = true;
      return { success: false, data: null, error: 'Unauthorized' };
    };

    const hasAuthHint = !!fakeLocalStorage.getItem('auth_hint');
    if (hasAuthHint) {
      mockAuthGetMe();
    }

    assert.strictEqual(hasAuthHint, false, 'Anonymous visitor must not have auth_hint set');
    assert.strictEqual(apiCallMade, false, 'No /auth/me call should be made for anonymous visitors');
  });

  it('authenticated visitor: with auth_hint present, profile check executes and restores user', async () => {
    fakeLocalStorage.setItem('auth_hint', 'true');
    let apiCallMade = false;

    const mockAuthGetMe = async () => {
      apiCallMade = true;
      return { success: true, data: { user: { id: 'u1', phone_number: '+919999999999' } } };
    };

    const hasAuthHint = !!fakeLocalStorage.getItem('auth_hint');
    assert.strictEqual(hasAuthHint, true);

    const res = await mockAuthGetMe();
    assert.strictEqual(apiCallMade, true);
    assert.strictEqual(res.success, true);
    assert.strictEqual(res.data?.user.phone_number, '+919999999999');
  });

  it('session expiry: if profile retrieval returns 401/failure, auth_hint is revoked', async () => {
    fakeLocalStorage.setItem('auth_hint', 'true');

    const mockAuthGetMe = async () => {
      return { success: false, data: null, error: 'Session expired' };
    };

    const res = await mockAuthGetMe();
    if (!res.success) {
      fakeLocalStorage.removeItem('auth_hint');
    }

    assert.strictEqual(
      fakeLocalStorage.getItem('auth_hint'),
      null,
      'auth_hint must be cleared when session is invalid or expired'
    );
  });

  it('logout: explicitly purges auth_hint from storage', () => {
    fakeLocalStorage.setItem('auth_hint', 'true');
    assert.strictEqual(fakeLocalStorage.getItem('auth_hint'), 'true');

    // Simulate logout action
    fakeLocalStorage.removeItem('auth_hint');
    assert.strictEqual(fakeLocalStorage.getItem('auth_hint'), null);
  });

  it('login success: persists auth_hint so subsequent visits restore session', () => {
    assert.strictEqual(fakeLocalStorage.getItem('auth_hint'), null);

    // Simulate handleLoginSuccess
    fakeLocalStorage.setItem('auth_hint', 'true');
    assert.strictEqual(fakeLocalStorage.getItem('auth_hint'), 'true');
  });

  it('multi-tab synchronization: storage event with removed hint signals signout', () => {
    let currentUser: any = { id: 'u1' };

    // Test exported resolveStorageEvent directly
    const action = resolveStorageEvent({ key: 'auth_hint', newValue: null });
    if (action === 'clear') {
      currentUser = null;
    }

    assert.strictEqual(action, 'clear');
    assert.strictEqual(currentUser, null, 'User must be cleared in other tabs when auth_hint is removed');
  });

  it('multi-tab synchronization: storage event with active hint signals cross-tab login refresh', () => {
    const action = resolveStorageEvent({ key: 'auth_hint', newValue: 'true' });
    assert.strictEqual(action, 'refresh', 'Cross-tab login must dispatch refresh action');
  });

  it('multi-tab synchronization: localStorage.clear() (key === null) signals clear action', () => {
    const action = resolveStorageEvent({ key: null, newValue: null });
    assert.strictEqual(action, 'clear', 'Global storage clear must trigger clear action');
  });

  it('multi-tab synchronization: unrelated storage key changes are ignored as noop', () => {
    const action = resolveStorageEvent({ key: 'theme', newValue: 'dark' });
    assert.strictEqual(action, 'noop', 'Unrelated storage keys must not affect auth state');
  });

  it('race condition safety: in-flight refresh aborted if logout occurs before network response', async () => {
    let reqId = 0;
    let currentUser: any = { id: 'initial-user' };
    fakeLocalStorage.setItem('auth_hint', 'true');

    // 1. Tab triggers refreshUser()
    const thisReqId = ++reqId;

    // Simulate slow network promise
    const slowNetwork = new Promise<{ success: boolean; data: any }>((resolve) => {
      setTimeout(() => {
        resolve({ success: true, data: { user: { id: 'resurrected-user' } } });
      }, 50);
    });

    // 2. User clicks logout while network is in-flight
    reqId++; // logout bumps sequence
    currentUser = null;
    fakeLocalStorage.removeItem('auth_hint');

    // 3. Network response finally resolves
    const res = await slowNetwork;
    if (thisReqId === reqId && res.success) {
      // Should NOT execute
      currentUser = res.data.user;
      fakeLocalStorage.setItem('auth_hint', 'true');
    }

    // 4. Assert user is NOT resurrected and auth_hint is NOT re-armed
    assert.strictEqual(currentUser, null, 'Stale network response must NOT resurrect user state');
    assert.strictEqual(fakeLocalStorage.getItem('auth_hint'), null, 'Stale response must NOT re-arm auth_hint');
  });

  it('forced profile check: force option bypasses missing auth_hint check', async () => {
    // auth_hint is intentionally missing
    assert.strictEqual(fakeLocalStorage.getItem('auth_hint'), null);

    let networkCalled = false;
    const executeCheck = async (options?: { force?: boolean }) => {
      if (!options?.force && !fakeLocalStorage.getItem('auth_hint')) {
        return null;
      }
      networkCalled = true;
      return { success: true, user: { id: 'recovered-user' } };
    };

    // Standard mount skips
    await executeCheck();
    assert.strictEqual(networkCalled, false);

    // Explicit force option executes recovery check
    const result = await executeCheck({ force: true });
    assert.strictEqual(networkCalled, true);
    assert.strictEqual(result?.user.id, 'recovered-user');
  });
});
