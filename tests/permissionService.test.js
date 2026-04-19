'use strict';

const { isCaptor, isImmune, canTarget } = require('../src/services/permissionService');

/**
 * Create a minimal GuildMember-like object for tests.
 *
 * @param {{ id, ownerId?, isAdmin?, roleIds? }} opts
 */
function makeMember({ id, ownerId = 'owner-99', isAdmin = false, roleIds = [] } = {}) {
  return {
    id,
    guild: { id: 'guild-1', ownerId },
    permissions: { has: perm => isAdmin && perm === 'Administrator' },
    roles: { cache: { has: roleId => roleIds.includes(roleId) } },
    displayName: `User-${id}`,
  };
}

// ── isCaptor ──────────────────────────────────────────────────────────────────

describe('isCaptor', () => {
  test('any guild member is a captor', () => {
    expect(isCaptor(makeMember({ id: 'user-2' }))).toBe(true);
  });

  test('returns false for null', () => {
    expect(isCaptor(null)).toBe(false);
  });
});

// ── isImmune ──────────────────────────────────────────────────────────────────

describe('isImmune', () => {
  test('regular member is not immune', () => {
    expect(isImmune(makeMember({ id: 'user-2' }))).toBe(false);
  });

  test('owner and administrators are not immune', () => {
    expect(isImmune(makeMember({ id: 'owner-99', ownerId: 'owner-99' }))).toBe(false);
    expect(isImmune(makeMember({ id: 'admin-1', isAdmin: true }))).toBe(false);
  });

  test('returns false for null', () => {
    expect(isImmune(null)).toBe(false);
  });
});

// ── canTarget ─────────────────────────────────────────────────────────────────

describe('canTarget', () => {
  test('actor cannot target themselves', () => {
    const admin = makeMember({ id: 'admin-1', isAdmin: true });
    const result = canTarget(admin, admin);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/yourself/i);
  });

  test('all members can target other members', () => {
    const user = makeMember({ id: 'user-1' });
    const target = makeMember({ id: 'target-1' });
    const result = canTarget(user, target);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
