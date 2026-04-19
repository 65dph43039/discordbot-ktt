'use strict';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('../src/storage/adapter', () => ({
  connect: jest.fn(),
  getDb: jest.fn(),
}));

jest.mock('../src/storage/repositories/punishmentRepository');
jest.mock('../src/core/scheduler');
jest.mock('../src/services/auditService');
jest.mock('../src/services/restoreService');
jest.mock('../src/features/capture/effectRegistry');

const repo = require('../src/storage/repositories/punishmentRepository');
const scheduler = require('../src/core/scheduler');
const restoreService = require('../src/services/restoreService');
const punishmentManager = require('../src/features/capture/punishmentManager');

// ── release() ─────────────────────────────────────────────────────────────────

describe('punishmentManager.release', () => {
  beforeEach(() => jest.resetAllMocks());

  test('returns null when the user has no active punishment', async () => {
    repo.findActiveByTarget.mockReturnValue(null);

    const result = await punishmentManager.release({
      client: {},
      guild: { id: 'guild-1' },
      targetId: 'user-1',
      actorId: 'admin-1',
    });

    expect(result).toBeNull();
    expect(restoreService.restore).not.toHaveBeenCalled();
  });

  test('cancels the timer and triggers restore when a punishment exists', async () => {
    const raw = {
      id: 42,
      guild_id: 'guild-1',
      target_id: 'user-1',
      actor_id: 'admin-1',
      type: 'shock',
      roles_snapshot: null,
      meta: null,
    };
    repo.findActiveByTarget.mockReturnValue(raw);
    repo.parseRecord.mockReturnValue({ ...raw, rolesSnapshot: null, meta: null });
    restoreService.restore.mockResolvedValue();
    scheduler.cancel.mockImplementation(() => {});

    const result = await punishmentManager.release({
      client: {},
      guild: { id: 'guild-1' },
      targetId: 'user-1',
      actorId: 'admin-1',
    });

    expect(scheduler.cancel).toHaveBeenCalledWith(42);
    expect(restoreService.restore).toHaveBeenCalledWith({}, 42);
    expect(result).toMatchObject({ id: 42, type: 'shock' });
  });
});

// ── reloadActiveOnStartup() ───────────────────────────────────────────────────

describe('punishmentManager.reloadActiveOnStartup', () => {
  beforeEach(() => jest.resetAllMocks());

  test('immediately restores punishments that expired while offline', async () => {
    const now = Date.now();
    const records = [
      { id: 10, expires_at: now - 60_000, roles_snapshot: null, meta: null },
    ];
    repo.findAllActiveGlobal.mockReturnValue(records);
    restoreService.restore.mockResolvedValue();

    await punishmentManager.reloadActiveOnStartup({});

    expect(restoreService.restore).toHaveBeenCalledWith({}, 10);
    expect(scheduler.schedule).not.toHaveBeenCalled();
  });

  test('schedules timers for punishments that are still active', async () => {
    const now = Date.now();
    const futureExpiry = now + 60_000;
    const records = [
      { id: 20, expires_at: futureExpiry, roles_snapshot: null, meta: null },
    ];
    repo.findAllActiveGlobal.mockReturnValue(records);
    scheduler.schedule.mockImplementation(() => {});

    await punishmentManager.reloadActiveOnStartup({});

    expect(scheduler.schedule).toHaveBeenCalledWith(20, futureExpiry, expect.any(Function));
    expect(restoreService.restore).not.toHaveBeenCalled();
  });

  test('handles a mix of expired and active punishments', async () => {
    const now = Date.now();
    const records = [
      { id: 30, expires_at: now - 1_000, roles_snapshot: null, meta: null },
      { id: 31, expires_at: now + 30_000, roles_snapshot: null, meta: null },
    ];
    repo.findAllActiveGlobal.mockReturnValue(records);
    restoreService.restore.mockResolvedValue();
    scheduler.schedule.mockImplementation(() => {});

    await punishmentManager.reloadActiveOnStartup({});

    expect(restoreService.restore).toHaveBeenCalledWith({}, 30);
    expect(scheduler.schedule).toHaveBeenCalledWith(31, records[1].expires_at, expect.any(Function));
  });
});
