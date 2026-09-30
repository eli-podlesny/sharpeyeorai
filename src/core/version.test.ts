import { describe, expect, it } from 'vitest';
import { formatVersionLabel } from './version';

describe('formatVersionLabel', () => {
  it('shows major.minor only', () => {
    expect(formatVersionLabel('0.1.0')).toBe('v0.1');
    expect(formatVersionLabel('1.2.7')).toBe('v1.2');
  });
});
