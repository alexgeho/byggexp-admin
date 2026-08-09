'use client';

import { useState } from 'react';
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

// One draggable block. dnd-kit drives the reorder; the drag handle is the grip
// only, so text/links inside the block stay clickable. While dragging, the
// original slot collapses to a dashed placeholder and the block itself rides in
// the DragOverlay (rendered by the grid) for smooth, flicker-free motion.
//
// The layout is a flex-wrap row: each block declares a size (full/twoThird/half/
// third) as its flex-basis and `flex-grow` lets it stretch. So a half-block left
// alone in a row grows to full width (no empty gap), while two halves stay 50/50
// and three thirds stay at a third each.
function SortableBlockItem({ id, size, gripLabel, children }) {
  const {
    attributes, listeners, setNodeRef, transform, transition, isDragging,
  } = useSortable({ id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`dash-block-col dash-block-col--${size || 'full'}${isDragging ? ' dash-block-col--dragging' : ''}`}
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
    </div>
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
  gap = 30,
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
        <div className={className} style={{ gap: `${gap}px` }}>
          {visibleKeys.map((key) => (
            <SortableBlockItem key={key} id={key} size={blockMap[key]?.size} gripLabel={t('Drag to reorder')}>
              {content[key]}
            </SortableBlockItem>
          ))}
        </div>
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
