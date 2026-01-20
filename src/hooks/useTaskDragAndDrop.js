import { useState } from "react";
import { useData } from "../context/DataContext";

export const useTaskDragAndDrop = () => {
  const { events, updateEvent } = useData();
  const [draggedEventId, setDraggedEventId] = useState(null);

  const handleDragStart = (e, id) => {
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedEventId(id);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (e, targetDate) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    if (!id || !targetDate) return;

    const ev = events.find((e) => e.id === id);
    if (ev) {
      updateEvent({ ...ev, date: targetDate });
    }
    setDraggedEventId(null);
  };

  const handleSidebarDrop = (e, targetGroup) => {
    e.preventDefault();
    const id = e.dataTransfer.getData("text/plain");
    
    let targetDate = new Date();
    if (targetGroup === "tomorrow") {
      targetDate.setDate(targetDate.getDate() + 1);
    }
    
    // For "today" and "tomorrow", we just need the date string
    const dateStr = targetDate.toISOString().split("T")[0];
    
    const ev = events.find((e) => e.id === id);
    if (ev) {
      updateEvent({ ...ev, date: dateStr });
    }
    setDraggedEventId(null);
  };

  return {
    draggedEventId,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleSidebarDrop,
  };
};