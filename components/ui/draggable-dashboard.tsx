"use client";

import React, { useState, useCallback, useEffect } from "react";
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
  MeasuringStrategy,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Move } from "lucide-react";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

// ============================================
// TYPES
// ============================================
interface DashboardCard {
  id: string;
  content: React.ReactNode;
  className?: string;
}

interface SortableCardProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isDragging?: boolean;
  isEditMode?: boolean;
}

interface DraggableDashboardProps {
  cards: DashboardCard[];
  onOrderChange?: (newOrder: string[]) => void;
  className?: string;
  isEditMode: boolean;
}

// ============================================
// SORTABLE CARD COMPONENT
// ============================================
export function SortableCard({
  id,
  children,
  className,
  isDragging,
  isEditMode,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
    zIndex: isSortableDragging ? 50 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group",
        isDragging && "ring-2 ring-primary ring-offset-2 ring-offset-background",
        className
      )}
    >
      {/* Drag Handle - Only visible in edit mode */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute -top-2 -right-2 z-50 p-1.5 rounded-lg",
            "bg-primary/90 text-primary-foreground shadow-lg",
            "cursor-grab active:cursor-grabbing",
            "opacity-0 group-hover:opacity-100 transition-opacity duration-200",
            "hover:bg-primary hover:scale-110 transition-all",
            isSortableDragging && "opacity-100"
          )}
        >
          <Move className="w-3.5 h-3.5" />
        </div>
      )}
      {children}
    </div>
  );
}

// ============================================
// DRAGGABLE DASHBOARD CONTAINER
// ============================================
export function DraggableDashboard({
  cards,
  onOrderChange,
  className,
  isEditMode,
}: DraggableDashboardProps) {
  const [items, setItems] = useState(cards.map((c) => c.id));
  const [activeId, setActiveId] = useState<string | null>(null);

  // Update items when cards change
  useEffect(() => {
    setItems(cards.map((c) => c.id));
  }, [cards]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);

      if (over && active.id !== over.id) {
        setItems((currentItems) => {
          const oldIndex = currentItems.indexOf(active.id as string);
          const newIndex = currentItems.indexOf(over.id as string);
          const newOrder = arrayMove(currentItems, oldIndex, newIndex);
          onOrderChange?.(newOrder);
          return newOrder;
        });
      }
    },
    [onOrderChange]
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
  }, []);

  // Get card by ID
  const getCardById = (id: string) => cards.find((card) => card.id === id);
  const activeCard = activeId ? getCardById(activeId) : null;

  // Sort cards by current order
  const sortedCards = items
    .map((id) => getCardById(id))
    .filter((card): card is DashboardCard => card !== undefined);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
      measuring={{
        droppable: {
          strategy: MeasuringStrategy.Always,
        },
      }}
    >
      <SortableContext items={items} strategy={rectSortingStrategy}>
        <div className={className}>
          {sortedCards.map((card) => (
            <SortableCard
              key={card.id}
              id={card.id}
              className={card.className}
              isDragging={activeId === card.id}
              isEditMode={isEditMode}
            >
              {card.content}
            </SortableCard>
          ))}
        </div>
      </SortableContext>

      {/* Drag Overlay - Shows the dragged card */}
      <DragOverlay>
        {activeCard ? (
          <div
            className={cn(
              "transform scale-105 shadow-2xl rounded-xl opacity-90",
              activeCard.className
            )}
          >
            {activeCard.content}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// ============================================
// HOOK FOR DASHBOARD LAYOUT PERSISTENCE
// ============================================
export function useDashboardLayout(defaultOrder: string[]) {
  const queryClient = useQueryClient();

  // Fetch saved layout
  const { data: savedLayout, isLoading } = useQuery({
    queryKey: ["dashboard-layout"],
    queryFn: async () => {
      const response = await fetch("/api/dashboard/layout");
      if (!response.ok) throw new Error("Failed to fetch layout");
      const data = await response.json();
      return data.layout?.cardOrder || [];
    },
    staleTime: 60000,
  });

  // Save layout mutation
  const { mutate: saveLayout } = useMutation({
    mutationFn: async (cardOrder: string[]) => {
      const response = await fetch("/api/dashboard/layout", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardOrder }),
      });
      if (!response.ok) throw new Error("Failed to save layout");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-layout"] });
    },
  });

  // Determine the actual order to use
  const cardOrder =
    savedLayout && savedLayout.length > 0 ? savedLayout : defaultOrder;

  // Sort items by saved order, keeping new items at the end
  const getSortedItems = useCallback(
    (items: string[]) => {
      const orderMap = new Map<string, number>(
        cardOrder.map((id: string, idx: number) => [id, idx] as [string, number])
      );
      return [...items].sort((a, b) => {
        const indexA: number = orderMap.has(a) ? (orderMap.get(a) ?? items.length) : items.length;
        const indexB: number = orderMap.has(b) ? (orderMap.get(b) ?? items.length) : items.length;
        return indexA - indexB;
      });
    },
    [cardOrder]
  );

  return {
    cardOrder,
    isLoading,
    saveLayout,
    getSortedItems,
  };
}
