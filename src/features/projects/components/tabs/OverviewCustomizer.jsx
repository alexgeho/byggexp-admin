import { useState } from 'react';
import { Popover, Switch } from 'antd';
import { ArrowDownOutlined, ArrowUpOutlined, ControlOutlined } from '@ant-design/icons';
import { Button } from '@/src/ui-kit';
import { OVERVIEW_BLOCK_MAP } from '@/src/features/projects/overviewBlocks';

// Small popover that lets a user reorder and show/hide the movable overview
// blocks. State lives in useOverviewLayout; this is purely the control surface.
export default function OverviewCustomizer({ order, isHidden, toggle, move, reset, isCustomized }) {
  const [open, setOpen] = useState(false);

  const content = (
    <div className="overview-customizer">
      <ul className="overview-customizer__list">
        {order.map((key, index) => {
          const block = OVERVIEW_BLOCK_MAP[key];
          if (!block) return null;
          const hidden = isHidden(key);
          return (
            <li key={key} className={`overview-customizer__item${hidden ? ' overview-customizer__item--off' : ''}`}>
              <div className="overview-customizer__reorder">
                <button
                  type="button"
                  className="overview-customizer__arrow"
                  disabled={index === 0}
                  onClick={() => move(key, -1)}
                  aria-label="Move up"
                >
                  <ArrowUpOutlined />
                </button>
                <button
                  type="button"
                  className="overview-customizer__arrow"
                  disabled={index === order.length - 1}
                  onClick={() => move(key, 1)}
                  aria-label="Move down"
                >
                  <ArrowDownOutlined />
                </button>
              </div>
              <span className="overview-customizer__name">{block.title}</span>
              <Switch size="small" checked={!hidden} onChange={() => toggle(key)} />
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
          Reset to default
        </button>
      </div>
    </div>
  );

  return (
    <Popover
      content={content}
      title="Customize overview"
      trigger="click"
      placement="bottomRight"
      open={open}
      onOpenChange={setOpen}
    >
      <Button variant="secondary" className="overview-customizer__trigger">
        <ControlOutlined />
        <span>Customize</span>
      </Button>
    </Popover>
  );
}
