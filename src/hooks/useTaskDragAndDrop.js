import { useState } from "react";
import { useData } from "../context/DataContext";
import { useDraggable, useDroppable } from "@dnd-kit/core";

/**
 * useTaskDragAndDrop Hook
 * Refactored with dndkit for drag-and-drop functionality
 */
export const useTaskDragAndDrop = () => {
  const { events, updateEvent } = useData();
  const [draggedEventId, setDraggedEventId] = useState(null);

  const { attributes, listeners, setNodeRef: setDraggableRef } = useDraggable({
    id: draggedEventId,
  });

  const { setNodeRef: setDroppableRef } = useDroppable({
    id: "droppable-area",
  });

  const handleDrop = (id, targetDate) => {
    if (!id || !targetDate) return;

    const ev = events.find((e) => e.id === id);
    if (ev) {
      updateEvent({ ...ev, date: targetDate });
    }
    setDraggedEventId(null);
  };

  return {
    setDraggableRef,
    setDroppableRef,
    attributes,
    listeners,
    handleDrop,
  };
};