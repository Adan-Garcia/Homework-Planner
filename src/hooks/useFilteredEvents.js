import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { useUI } from "../context/PlannerContext";
import { compareTasks } from "../utils/helpers";

export const useFilteredEvents = () => {
  const { events, hiddenClasses } = useData();
  const { activeTypeFilter, showCompleted, searchQuery } = useUI();

  return useMemo(() => {
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    cutoffDate.setHours(0, 0, 0, 0);

    const filtered = events.filter((e) => {
      // 1. Class Filter
      if (hiddenClasses.includes(e.class)) return false;

      // 2. Type Filter
      if (activeTypeFilter !== "All" && e.type !== activeTypeFilter) return false;

      // 3. Completed Filter
      if (!showCompleted && e.completed) return false;

      // 4. Date Cutoff (Don't show very old events)
      const eventDate = new Date(e.date + "T00:00:00");
      if (eventDate < cutoffDate) return false;

      // 5. Search Query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(query) ||
          e.class.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // Apply Sorting: Time > Priority > Alpha
    return filtered.sort(compareTasks);
    
  }, [events, hiddenClasses, activeTypeFilter, showCompleted, searchQuery]);
};