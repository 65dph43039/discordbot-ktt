'use strict';

// permissionService reads config on import; stub the env before requiring
process.env.CAPTOR_ROLE_IDS = 'captor-role-1,captor-role-2';
process.env.IMMUNE_ROLE_IDS = 'immune-role-1';

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
  test('guild owner is a captor', () => {
    expect(isCaptor(makeMember({ id: 'owner-99', ownerId: 'owner-99' }))).toBe(true);
  });

  test('administrator is a captor', () => {
    expect(isCaptor(makeMember({ id: 'admin-1', isAdmin: true }))).toBe(true);
  });

  test('member with configured captor role is a captor', () => {
    expect(isCaptor(makeMember({ id: 'user-1', roleIds: ['captor-role-1'] }))).toBe(true);
  });

  test('regular member is not a captor', () => {
    expect(isCaptor(makeMember({ id: 'user-2' }))).toBe(false);
  });

  test('returns false for null', () => {
    expect(isCaptor(null)).toBe(false);
  });
});

// ── isImmune ──────────────────────────────────────────────────────────────────

describe('isImmune', () => {
  test('guild owner is immune', () => {
    expect(isImmune(makeMember({ id: 'owner-99', ownerId: 'owner-99' }))).toBe(true);
  });

  test('administrator is immune', () => {
    expect(isImmune(makeMember({ id: 'admin-1', isAdmin: true }))).toBe(true);
  });

  test('member with configured immune role is immune', () => {
    expect(isImmune(makeMember({ id: 'user-1', roleIds: ['immune-role-1'] }))).toBe(true);
  });

  test('regular member is not immune', () => {
    expect(isImmune(makeMember({ id: 'user-2' }))).toBe(false);
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

  test('captor cannot target an immune user', () => {
    const admin = makeMember({ id: 'admin-1', isAdmin: true });
    const owner = makeMember({ id: 'owner-99', ownerId: 'owner-99' });
    const result = canTarget(admin, owner);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/immune/i);
  });

  test('non-captor cannot target anyone', () => {
    const user = makeMember({ id: 'user-1' });
    const target = makeMember({ id: 'target-1' });
    const result = canTarget(user, target);
    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/permission/i);
  });

  test('captor can target a regular user', () => {
    const admin = makeMember({ id: 'admin-1', isAdmin: true });
    const target = makeMember({ id: 'target-1' });
    const result = canTarget(admin, target);
    expect(result.allowed).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});
