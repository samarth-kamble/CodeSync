import { describe, it, expect } from 'vitest';
import { getRedirectUri } from '../src/github/auth';
import { DEFAULT_AUTH_STATE } from '@leetsync/shared';

describe('GitHub Auth Client Logic', () => {
  it('returns valid redirect uri', () => {
    const uri = getRedirectUri();
    expect(typeof uri).toBe('string');
    expect(uri.length).toBeGreaterThan(0);
  });

  it('verifies default auth state', () => {
    expect(DEFAULT_AUTH_STATE.isConnected).toBe(false);
    expect(DEFAULT_AUTH_STATE.user).toBe(null);
    expect(DEFAULT_AUTH_STATE.token).toBe(null);
  });
});

