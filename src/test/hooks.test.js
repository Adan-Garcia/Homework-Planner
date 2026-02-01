import { describe, it, expect, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useFilteredEvents } from "../hooks/useFilteredEvents";
import * as DataContext from "../context/DataContext";
import * as PlannerContext from "../context/PlannerContext";

// Mock the contexts
vi.mock("../context/DataContext");
vi.mock("../context/PlannerContext");

describe("useFilteredEvents Hook", () => {
  const mockEvents = [
    {
      id: "1",
      title: "Math Homework",
      class: "Math",
      type: "Homework",
      date: "2026-02-10",
      completed: false,
      priority: "High",
    },
    {
      id: "2",
      title: "Physics Lab",
      class: "Physics",
      type: "Lab",
      date: "2026-02-11",
      completed: true,
      priority: "Normal",
    },
    {
      id: "3",
      title: "English Essay",
      class: "English",
      type: "Homework",
      date: "2026-02-12",
      completed: false,
      priority: "Normal",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("filters by hidden classes", () => {
    DataContext.useData.mockReturnValue({
      events: mockEvents,
      hiddenClasses: ["Physics"],
    });

    PlannerContext.useUI.mockReturnValue({
      activeTypeFilter: "All",
      showCompleted: true,
      searchQuery: "",
    });

    const { result } = renderHook(() => useFilteredEvents());
    
    expect(result.current).toHaveLength(2);
    expect(result.current.find((e) => e.class === "Physics")).toBeUndefined();
  });

  it("filters by type", () => {
    DataContext.useData.mockReturnValue({
      events: mockEvents,
      hiddenClasses: [],
    });

    PlannerContext.useUI.mockReturnValue({
      activeTypeFilter: "Homework",
      showCompleted: true,
      searchQuery: "",
    });

    const { result } = renderHook(() => useFilteredEvents());
    
    expect(result.current).toHaveLength(2);
    expect(result.current.every((e) => e.type === "Homework")).toBe(true);
  });

  it("filters out completed tasks when showCompleted is false", () => {
    DataContext.useData.mockReturnValue({
      events: mockEvents,
      hiddenClasses: [],
    });

    PlannerContext.useUI.mockReturnValue({
      activeTypeFilter: "All",
      showCompleted: false,
      searchQuery: "",
    });

    const { result } = renderHook(() => useFilteredEvents());
    
    expect(result.current.every((e) => !e.completed)).toBe(true);
  });

  it("searches by title", () => {
    DataContext.useData.mockReturnValue({
      events: mockEvents,
      hiddenClasses: [],
    });

    PlannerContext.useUI.mockReturnValue({
      activeTypeFilter: "All",
      showCompleted: true,
      searchQuery: "math",
    });

    const { result } = renderHook(() => useFilteredEvents());
    
    expect(result.current).toHaveLength(1);
    expect(result.current[0].title).toBe("Math Homework");
  });

  it("searches by class name", () => {
    DataContext.useData.mockReturnValue({
      events: mockEvents,
      hiddenClasses: [],
    });

    PlannerContext.useUI.mockReturnValue({
      activeTypeFilter: "All",
      showCompleted: true,
      searchQuery: "english",
    });

    const { result } = renderHook(() => useFilteredEvents());
    
    expect(result.current).toHaveLength(1);
    expect(result.current[0].class).toBe("English");
  });
});
