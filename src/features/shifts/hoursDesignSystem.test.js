import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

// Guard for docs/design-system.md → "Таблица часов": the rules the owner set
// for the hours grid. A change that breaks one of them fails here, before prod.
const dir = resolve(process.cwd(), 'src/features/shifts');
const scss = readFileSync(resolve(dir, 'HoursPage.scss'), 'utf8');
const jsx = readFileSync(resolve(dir, 'HoursPage.jsx'), 'utf8');
const rule = (selector) => {
  const at = scss.indexOf(`${selector} {`);
  return at < 0 ? '' : scss.slice(at, scss.indexOf('}', at));
};

describe('hours grid design system', () => {
  it('cell backgrounds use only the plan, deviation, weekend and selection tokens', () => {
    const tokens = new Set();
    for (const line of scss.split('\n')) {
      if (!/\.hours-grid[^{]*td\.h[^{]*\{[^}]*background:/.test(line)) continue;
      for (const m of line.matchAll(/background:\s*([^;}]+)/g)) tokens.add(m[1].trim());
    }
    tokens.delete('none'); // the manual-hours button inside a cell
    expect([...tokens].sort()).toEqual([
      'var(--h-colsel)', // totals row only
      'var(--h-plan-bg)',
      'var(--h-sel)',
      'var(--h-under-bg)',
      'var(--h-weekend)',
    ]);
  });

  it('weekends are always grey', () => {
    expect(rule('.hours-grid td.h.we.we')).toContain('var(--h-weekend)');
  });

  it('a selected row tints its hour cells but keeps deviations cream', () => {
    expect(scss).toContain(
      '.hours-grid tr.sel td.h:not(.flag-under):not(.flag-over), .hours-grid tr.sel td.h.we.we { background:var(--h-sel); }',
    );
  });

  it('no hover fill on hour cells', () => {
    expect(scss).not.toMatch(/td\.h[^{,]*:hover\s*\{[^}]*background/);
  });

  it('number sizes: plan 16px, GPS/manual 13.5px', () => {
    expect(rule('.hours-grid td.h .big')).toContain('font-size:16px');
    expect(rule('.hours-grid td.h .measures')).toContain('font-size:13.5px');
  });

  it('the bottom bar stays on one row and has no export button', () => {
    expect(rule('.hours-actionbar .inner')).toContain('flex-wrap:nowrap');
    const bar = jsx.slice(jsx.indexOf('className="hours-actionbar"'));
    expect(bar).not.toContain('doExport(');
    expect((bar.match(/<button/g) || []).length).toBe(4); // Fill, Clear, payroll, invoice
  });

  it('day columns stretch to the card width (no empty column before the total)', () => {
    expect(jsx).toContain("'--day-w': `${Math.max(dayWidth, fitWidth)}px`");
  });
});
