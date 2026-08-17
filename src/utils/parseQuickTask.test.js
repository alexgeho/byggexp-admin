import { describe, it, expect } from 'vitest';
import { parseQuickTask } from './parseQuickTask';

// Local noon so the "today" boundary is never near midnight in any TZ.
const NOW = new Date(2026, 5, 15, 12, 0, 0).getTime();

describe('parseQuickTask', () => {
  it('returns an empty result for blank input', () => {
    expect(parseQuickTask('', NOW)).toEqual({
      title: '', dueMs: null, priority: 'normal', dueDays: null, dueHour: null,
    });
  });

  it('parses "tomorrow" / "imorgon" and strips it from the title', () => {
    const en = parseQuickTask('ring peter tomorrow', NOW);
    expect(en.title).toBe('ring peter');
    expect(en.dueDays).toBe(1);

    const sv = parseQuickTask('ring peter imorgon', NOW);
    expect(sv.title).toBe('ring peter');
    expect(sv.dueDays).toBe(1);
  });

  it('parses "today" / "idag"', () => {
    expect(parseQuickTask('offert idag', NOW).dueDays).toBe(0);
    expect(parseQuickTask('send offer today', NOW).dueDays).toBe(0);
  });

  it('parses relative "in N days" / "om N dagar"', () => {
    const en = parseQuickTask('review docs in 3 days', NOW);
    expect(en.title).toBe('review docs');
    expect(en.dueDays).toBe(3);
    expect(parseQuickTask('städa om 5 dagar', NOW).dueDays).toBe(5);
  });

  it('detects high priority from "!" and urgent words, stripping them', () => {
    const bang = parseQuickTask('fix bug !!', NOW);
    expect(bang.priority).toBe('high');
    expect(bang.title).toBe('fix bug');

    const word = parseQuickTask('urgent call client', NOW);
    expect(word.priority).toBe('high');
    expect(word.title).toBe('call client');
  });

  it('detects a time of day and implies today', () => {
    const r = parseQuickTask('lunch kl 14', NOW);
    expect(r.dueHour).toBe(14);
    expect(r.dueDays).toBe(0);
    expect(r.title).toBe('lunch');
  });

  it('keeps the literal text if a date/time word was the whole line', () => {
    const r = parseQuickTask('tomorrow', NOW);
    expect(r.title).toBe('tomorrow');
    expect(r.dueMs).toBeNull();
  });
});
