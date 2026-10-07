'use client';

import * as React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { motion, useReducedMotion } from 'framer-motion';
import { ContentItem } from '@/types/content';
import { ContentCard } from '@/components/cards/ContentCard';

export interface SortableCardProps {
  item: ContentItem;
}

export function SortableCard({ item }: SortableCardProps) {
  const shouldReduceMotion = useReducedMotion();
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      layout={!shouldReduceMotion}
      initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={shouldReduceMotion ? undefined : { opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="h-full"
    >
      <ContentCard
        item={item}
        isDragging={isDragging}
        dragHandleProps={{
          ...attributes,
          ...listeners,
        }}
      />
    </motion.div>
  );
}
