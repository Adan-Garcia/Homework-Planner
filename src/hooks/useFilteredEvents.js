import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { useUI } from "../context/PlannerContext";
import { compareTasks } from "../utils/helpers";

export const useFilteredEvents = () => {
  const { events, hiddenClasses } = useData();
  const { activeTypeFilter, showCompleted, searchQuery } = useUI();

  return useMemo(() => {
    
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const cutoffString = `${year}-${month}-${day}`;

    const filtered = events.filter((e) => {
      
      if (hiddenClasses.includes(e.class)) return false;

      
      if (activeTypeFilter !== "All" && e.type !== activeTypeFilter) return false;

      
      if (!showCompleted && e.completed) return false;

      
      
      
      if (e.date && e.date < cutoffString) return false;

      
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(query) ||
          e.class.toLowerCase().includes(query)
        );
      }

      return true;
    });

    
    return filtered.sort(compareTasks);
    
  }, [events, hiddenClasses, activeTypeFilter, showCompleted, searchQuery]);
};