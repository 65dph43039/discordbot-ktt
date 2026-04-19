'use strict';

const { parseDuration, formatDuration } = require('../src/utils/duration');

describe('parseDuration', () => {
  test('parses seconds', () => expect(parseDuration('30s')).toBe(30_000));
  test('parses minutes', () => expect(parseDuration('10m')).toBe(600_000));
  test('parses hours', () => expect(parseDuration('2h')).toBe(7_200_000));
  test('parses days', () => expect(parseDuration('1d')).toBe(86_400_000));
  test('parses uppercase unit', () => expect(parseDuration('5M')).toBe(300_000));
  test('parses decimal values', () => expect(parseDuration('1.5h')).toBe(5_400_000));
  test('trims whitespace', () => expect(parseDuration(' 20m ')).toBe(1_200_000));

  test('returns null for plain text', () => expect(parseDuration('abc')).toBeNull());
  test('returns null for empty string', () => expect(parseDuration('')).toBeNull());
  test('returns null for zero', () => expect(parseDuration('0m')).toBeNull());
  test('returns null for null input', () => expect(parseDuration(null)).toBeNull());
  test('returns null for undefined', () => expect(parseDuration(undefined)).toBeNull());
  test('returns null for missing unit', () => expect(parseDuration('60')).toBeNull());
  test('returns null for unknown unit', () => expect(parseDuration('5w')).toBeNull());
});

describe('formatDuration', () => {
  test('formats seconds', () => expect(formatDuration(30_000)).toBe('30s'));
  test('formats minutes', () => expect(formatDuration(600_000)).toBe('10m'));
  test('formats hours', () => expect(formatDuration(7_200_000)).toBe('2h'));
  test('formats days', () => expect(formatDuration(86_400_000)).toBe('1d'));
  test('rounds to nearest unit', () => expect(formatDuration(90_000)).toBe('2m'));
});
