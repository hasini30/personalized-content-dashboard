'use client';

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { ContentItem } from '@/types/content';
import { SortableCard } from './SortableCard';
import { ContentCard } from '@/components/cards/ContentCard';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { setCustomOrder } from '@/features/feed/feedSlice';

export interface SortableFeedProps {
  items: ContentItem[];
  onReorder?: (newItems: ContentItem[]) => void;
}

export function SortableFeed({ items, onReorder }: SortableFeedProps) {
  const dispatch = useAppDispatch();
  const customOrder = useAppSelector((state) => state.feed.customOrder);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  // Setup sensors with pointer and keyboard navigation
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Avoid accidental drag on tap/click
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const activeItem = React.useMemo(() => items.find((i) => i.id === activeId), [items, activeId]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = items.findIndex((i) => i.id === active.id);
      const newIndex = items.findIndex((i) => i.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reordered = arrayMove(items, oldIndex, newIndex);
        const reorderedSectionIds = reordered.map((i) => i.id);
        const sectionIdSet = new Set(items.map((i) => i.id));

        let mergedOrder: string[];
        if (customOrder.length > 0 && customOrder.some((id) => sectionIdSet.has(id))) {
          let reorderIdx = 0;
          mergedOrder = customOrder.map((id) => {
            if (sectionIdSet.has(id)) {
              return reorderedSectionIds[reorderIdx++];
            }
            return id;
          });
          while (reorderIdx < reorderedSectionIds.length) {
            mergedOrder.push(reorderedSectionIds[reorderIdx++]);
          }
        } else {
          mergedOrder = [
            ...customOrder.filter((id) => !sectionIdSet.has(id)),
            ...reorderedSectionIds,
          ];
        }

        dispatch(setCustomOrder(mergedOrder));
        if (onReorder) {
          onReorder(reordered);
        }
      }
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            'To pick up a content card, press space or enter. While dragging, use arrow keys to move card. Press space or enter again to drop, or escape to cancel.',
        },
      }}
    >
      <SortableContext items={items.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <SortableCard key={item.id} item={item} />
          ))}
        </div>
      </SortableContext>

      <DragOverlay dropAnimation={{ duration: 250, easing: 'cubic-bezier(0.18, 0.67, 0.6, 1.22)' }}>
        {activeItem ? (
          <div className="w-full scale-105 shadow-2xl opacity-90 pointer-events-none">
            <ContentCard item={activeItem} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
