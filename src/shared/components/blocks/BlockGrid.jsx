'use client';

import { useState } from 'react';
import { Col, Row } from 'antd';
import { HolderOutlined } from '@ant-design/icons';
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useT } from '@/src/i18n/LanguageProvider';

// Column span per declared block size. antd's 24-col grid: full row, two-thirds,
// half, third. Unknown sizes fall back to a full row.
const SPAN = { full: 24, twoThird: 16, half: 12, third: 8 };
const spanForSize = (size) => SPAN[size] ?? 24;

// One draggable block. dnd-kit drives the reorder; the drag handle is the grip
// only, so text/links inside the block stay clickable. While dragging, the
// original slot collapses to a dashed placeholder and the block itself rides in
// the DragOverlay (rendered by the grid) for smooth, flicker-free motion.
function SortableBlockCol({ id, span, gripLabel, children }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <Col
      xs={24}
      xl={span}
      ref={setNodeRef}
      style={style}
      className={`dash-block-col${isDragging ? ' dash-block-col--dragging' : ''}`}
    >
      <div className="dash-block">
        <span
          className="dash-block__grip"
          role="button"
          aria-label={gripLabel}
          title={gripLabel}
          {...attributes}
          {...listeners}
        >
          <HolderOutlined />
        </span>
        {children}
      </div>
    </Col>
  );
}

// Shared drag-reorderable block grid. Pair with useBlockLayout for the state.
//
//   <BlockGrid layout={layout} blockMap={DASHBOARD_BLOCK_MAP} content={blockContent} />
//
// `content` maps block key → rendered node; a key missing from `content` (or
// hidden, or absent from `blockMap`) is simply skipped, so callers drop a block
// by omitting its content entry — no special-casing needed here.
export default function BlockGrid({
  layout,
  blockMap,
  content,
  className = 'dashboard-blocks',
  gutter = [30, 30],
}) {
  const t = useT();
  const [activeKey, setActiveKey] = useState(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const visibleKeys = layout.order.filter(
    (key) => !layout.isHidden(key) && content[key] && blockMap[key],
  );
  if (!visibleKeys.length) return null;

  const spanFor = (key) => spanForSize(blockMap[key]?.size);
  const handleDragEnd = ({ active, over }) => {
    setActiveKey(null);
    if (over && active.id !== over.id) layout.reorder(active.id, over.id);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={({ active }) => setActiveKey(active.id)}
      onDragCancel={() => setActiveKey(null)}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={visibleKeys} strategy={rectSortingStrategy}>
        <Row gutter={gutter} className={className}>
          {visibleKeys.map((key) => (
            <SortableBlockCol key={key} id={key} span={spanFor(key)} gripLabel={t('Drag to reorder')}>
              {content[key]}
            </SortableBlockCol>
          ))}
        </Row>
      </SortableContext>
      <DragOverlay dropAnimation={{ duration: 180 }}>
        {activeKey ? (
          <div className="dash-block dash-block--overlay">
            <span className="dash-block__grip" aria-hidden>
              <HolderOutlined />
            </span>
            {content[activeKey]}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
