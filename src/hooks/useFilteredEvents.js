import { useMemo } from "react";
import { useData } from "../context/DataContext";
import { useUI } from "../context/PlannerContext";
import { compareTasks } from "../utils/helpers";

/**
 * Custom Hook: useFilteredEvents
 * * Centralizes the logic for filtering the raw event list based on UI state.
 * * Returns a memoized array of events to be displayed.
 * * Filter Pipeline:
 * 1. Hidden Classes: Exclude tasks belonging to unchecked classes in the sidebar.
 * 2. Type Filter: Match specific task type (e.g., "Homework" or "Exam").
 * 3. Completion Status: Hide completed tasks if the toggle is off.
 * 4. Date Cutoff: Exclude events older than 1 month to keep performance high.
 * 5. Search: Text search against Title and Class name.
 * 6. Sorting: Sort by Date -> Priority -> Time -> Title.
 */
export const useFilteredEvents = () => {
  const { events, hiddenClasses } = useData();
  const { activeTypeFilter, showCompleted, searchQuery } = useUI();

  return useMemo(() => {
    
    // Performance optimization: 
    // Filter out very old events so we don't render history from years ago.
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    
    // Create cutoff string YYYY-MM-DD
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const cutoffString = `${year}-${month}-${day}`;

    const filtered = events.filter((e) => {
      // 1. Class Visibility
      if (hiddenClasses.includes(e.class)) return false;

      // 2. Type
      if (activeTypeFilter !== "All" && e.type !== activeTypeFilter) return false;

      // 3. Completed
      if (!showCompleted && e.completed) return false;

      // 4. Age Check (Keep only recent history + future)
      // Note: We only filter strictly if the event HAS a date. 
      // Undated tasks (backlog) are preserved.
      if (e.date && e.date < cutoffString) return false;

      // 5. Search
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          e.title.toLowerCase().includes(query) ||
          e.class.toLowerCase().includes(query)
        );
      }

      return true;
    });

    // 6. Sort
    return filtered.sort(compareTasks);
    
  }, [events, hiddenClasses, activeTypeFilter, showCompleted, searchQuery]);
};