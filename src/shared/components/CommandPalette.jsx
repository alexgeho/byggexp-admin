'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { PlusOutlined, SearchOutlined, ArrowRightOutlined } from '@ant-design/icons';
import { NAVIGATION } from '@/src/shared/layouts/DashboardSidebar';
import { useT } from '@/src/i18n/LanguageProvider';
import './CommandPalette.scss';

// ⌘K / Ctrl+K command palette: fuzzy-jump to any section and fire quick
// actions without touching the mouse. Navigation targets are derived from the
// same sidebar config so the two never drift apart.
const flattenNav = (section) => {
  const conf = NAVIGATION[section];
  if (!conf) return [];
  const out = [];
  const walk = (items) => {
    for (const item of items || []) {
      if (item.href) out.push({ label: item.label, href: item.href });
      if (item.children) walk(item.children);
    }
  };
  walk(conf.items);
  return out;
};

export default function CommandPalette() {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);

  const section = useMemo(() => {
    const seg = (pathname || '').split('/').filter(Boolean)[0];
    return NAVIGATION[seg] ? seg : 'company';
  }, [pathname]);

  // Global shortcut.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [open]);

  const commands = useMemo(() => {
    const actions = [
      {
        id: 'new-task',
        label: t('New task'),
        hint: t('Action'),
        icon: <PlusOutlined />,
        run: () => window.dispatchEvent(new Event('quicktask:open')),
      },
    ];
    const nav = flattenNav(section).map((n) => ({
      id: `nav:${n.href}`,
      label: t(n.label),
      hint: t('Go to'),
      icon: <ArrowRightOutlined />,
      run: () => router.push(n.href),
    }));
    return [...actions, ...nav];
  }, [section, router, t]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return commands;
    return commands.filter((c) => c.label.toLowerCase().includes(q));
  }, [commands, query]);

  const run = (cmd) => {
    if (!cmd) return;
    setOpen(false);
    cmd.run();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      run(filtered[active]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    }
  };

  if (!open) return null;

  return (
    <div className="cmdk__overlay" onMouseDown={() => setOpen(false)}>
      <div className="cmdk" onMouseDown={(e) => e.stopPropagation()}>
        <div className="cmdk__search">
          <SearchOutlined className="cmdk__search-icon" />
          <input
            ref={inputRef}
            className="cmdk__input"
            value={query}
            placeholder={t('Search or jump to…')}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
          />
          <span className="cmdk__kbd">ESC</span>
        </div>
        <div className="cmdk__list">
          {filtered.length ? (
            filtered.map((cmd, i) => (
              <button
                key={cmd.id}
                type="button"
                className={`cmdk__item${i === active ? ' cmdk__item--active' : ''}`}
                onMouseEnter={() => setActive(i)}
                onClick={() => run(cmd)}
              >
                <span className="cmdk__item-icon">{cmd.icon}</span>
                <span className="cmdk__item-label">{cmd.label}</span>
                <span className="cmdk__item-hint">{cmd.hint}</span>
              </button>
            ))
          ) : (
            <div className="cmdk__empty">{t('No matches')}</div>
          )}
        </div>
      </div>
    </div>
  );
}
