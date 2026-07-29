import { useState } from 'react';
import { Popover, Switch } from 'antd';
import { ControlOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import { useT } from '@/src/i18n/LanguageProvider';
import { DASHBOARD_BLOCKS } from '@/src/features/dashboard/dashboardBlocks';

// Popover to show/hide dashboard blocks (minimalist personalisation). State
// lives in useDashboardLayout; this is only the control surface. Reuses the
// project overview-customizer styles for a consistent look.
export default function DashboardCustomizer({ isHidden, toggle, reset, isCustomized }) {
  const t = useT();
  const [open, setOpen] = useState(false);

  const content = (
    <div className="overview-customizer">
      <ul className="overview-customizer__list">
        {DASHBOARD_BLOCKS.map((block) => {
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
      title={t('Customize dashboard')}
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
