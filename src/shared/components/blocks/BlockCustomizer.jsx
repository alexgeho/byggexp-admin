'use client';

import { useState } from 'react';
import { Popover, Switch } from 'antd';
import { ControlOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';

// Shared "Customize" popover: show/hide the movable blocks. Reordering is done
// by dragging the blocks on the page (see BlockGrid), so this is only the
// visibility + reset control surface. Pair with useBlockLayout.
//
//   <BlockCustomizer blocks={DASHBOARD_BLOCKS} layout={layout} title={t('Customize dashboard')} />
//
// `blocks` is the list of { key, title } to list; titles are run through t().
export default function BlockCustomizer({ blocks, layout, title }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const { isHidden, toggle, reset, isCustomized } = layout;

  const content = (
    <div className="overview-customizer">
      <ul className="overview-customizer__list">
        {blocks.map((block) => {
          const hidden = isHidden(block.key);
          return (
            <li
              key={block.key}
              className={`overview-customizer__item${hidden ? ' overview-customizer__item--off' : ''}`}
            >
              <span className="overview-customizer__name">{t(block.title)}</span>
              <Switch size="small" checked={!hidden} onChange={() => toggle(block.key)} />
            </li>
          );
        })}
      </ul>
      <div className="overview-customizer__footer">
        <button
          type="button"
          className="overview-customizer__reset"
          disabled={!isCustomized}
          onClick={reset}
        >
          {t('Reset to default')}
        </button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      title={title || t('Customize')}
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
    >
      <Button variant="secondary" className="overview-customizer__trigger">
        <ControlOutlined />
        <span>{t('Customize')}</span>
      </Button>
    </Popover>
  );
}
