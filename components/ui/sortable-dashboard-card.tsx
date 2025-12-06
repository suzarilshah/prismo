"use client";

import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface SortableDashboardCardProps {
  id: string;
  children: React.ReactNode;
  className?: string;
  isEditMode?: boolean;
}

export function SortableDashboardCard({
  id,
  children,
  className,
  isEditMode = false,
}: SortableDashboardCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditMode });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative group/card",
        isDragging && "z-50 opacity-80",
        isEditMode && "ring-2 ring-transparent hover:ring-primary/30 rounded-xl transition-all",
        className
      )}
    >
      {/* Drag Handle - Only visible in edit mode */}
      {isEditMode && (
        <div
          {...attributes}
          {...listeners}
          className={cn(
            "absolute -top-1 left-1/2 -translate-x-1/2 z-50",
            "flex items-center gap-1 px-3 py-1 rounded-full",
            "bg-primary text-primary-foreground shadow-lg",
            "cursor-grab active:cursor-grabbing",
            "opacity-0 group-hover/card:opacity-100 transition-all duration-200",
            "hover:scale-105 hover:shadow-xl",
            isDragging && "opacity-100 cursor-grabbing"
          )}
        >
          <GripVertical className="w-3 h-3" />
          <span className="text-[10px] font-medium uppercase tracking-wide">Drag</span>
        </div>
      )}
      {children}
    </div>
  );
}

export default SortableDashboardCard;
