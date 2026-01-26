import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { useUI } from "../context/PlannerContext";
import { compareTasks } from "../utils/helpers";

export const useFilteredEvents = () => {
  const { events, hiddenClasses } = useData();
  const { activeTypeFilter, showCompleted, searchQuery } = useUI();

  return useMemo(() => {
    // --- OPTIMIZATION: Calculate cutoff string once ---
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    
    // Format as YYYY-MM-DD manually to respect local time (toISOString uses UTC)
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const cutoffString = `${year}-${month}-${day}`;

    const filtered = events.filter((e) => {
      // 1. Class Filter
      if (hiddenClasses.includes(e.class)) return false;

      // 2. Type Filter
      if (activeTypeFilter !== "All" && e.type !== activeTypeFilter) return false;

      // 3. Completed Filter
      if (!showCompleted && e.completed) return false;

      // 4. Date Cutoff (Don't show very old events)
      // --- OPTIMIZATION: Direct string comparison ---
      // This is significantly faster than new Date(e.date + "T00:00:00")
      if (e.date && e.date < cutoffString) return false;

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