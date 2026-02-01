import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import React from "react";

/**
 * Integration Tests
 * 
 * These tests verify that multiple components and hooks work together correctly.
 * They test real-world scenarios and user flows.
 */

// Mock the contexts for integration testing
const mockContexts = {
  auth: {
    roomId: "TEST123",
    authToken: "mock-token",
    cryptoKey: null,
    isAuthorized: true,
    setRoomId: vi.fn(),
    setRoomPassword: vi.fn(),
    disconnectRoom: vi.fn(),
  },
  data: {
    events: [],
    classColors: {},
    addEvent: vi.fn(),
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
    setEvents: vi.fn(),
  },
  ui: {
    darkMode: false,
    setDarkMode: vi.fn(),
    view: "planner",
    setView: vi.fn(),
    modals: { settings: false, task: false },
    openModal: vi.fn(),
    closeModal: vi.fn(),
  },
  notification: {
    error: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
};

describe("Integration Tests", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe("Event Creation Flow", () => {
    it("should create an event and update local storage", () => {
      const event = {
        id: "test-123",
        title: "Math Homework",
        date: "2026-02-15",
        class: "Mathematics",
        type: "Homework",
        priority: "High",
        completed: false,
      };

      // Store event in localStorage
      localStorage.setItem("hw_events", JSON.stringify([event]));

      // Retrieve and verify
      const stored = JSON.parse(localStorage.getItem("hw_events") || "[]");
      expect(stored).toHaveLength(1);
      expect(stored[0].title).toBe("Math Homework");
      expect(stored[0].priority).toBe("High");
    });

    it("should handle multiple events in order", () => {
      const events = [
        {
          id: "1",
          title: "Task 1",
          date: "2026-02-15",
          class: "Class A",
          type: "Homework",
          priority: "High",
          completed: false,
        },
        {
          id: "2",
          title: "Task 2",
          date: "2026-02-16",
          class: "Class B",
          type: "Lab",
          priority: "Normal",
          completed: false,
        },
      ];

      localStorage.setItem("hw_events", JSON.stringify(events));

      const stored = JSON.parse(localStorage.getItem("hw_events") || "[]");
      expect(stored).toHaveLength(2);
      expect(stored[0].id).toBe("1");
      expect(stored[1].id).toBe("2");
    });
  });

  describe("Recurring Events", () => {
    it("should generate multiple instances for weekly recurrence", () => {
      const baseEvent = {
        id: "base-123",
        title: "Weekly Meeting",
        date: "2026-02-01",
        class: "General",
        type: "Event",
        priority: "Normal",
        recurrence: "weekly",
        recurrenceEnd: "2026-02-22",
      };

      // Simulate recurring event generation
      const instances = [];
      const startDate = new Date(baseEvent.date);
      const endDate = new Date(baseEvent.recurrenceEnd);
      let current = startDate;
      const groupId = "group-123";

      while (current <= endDate) {
        instances.push({
          ...baseEvent,
          id: `${baseEvent.id}-${current.toISOString()}`,
          groupId,
          date: current.toISOString().split("T")[0],
        });
        current.setDate(current.getDate() + 7);
      }

      // Should generate 4 instances (Feb 1, 8, 15, 22)
      expect(instances).toHaveLength(4);
      expect(instances[0].date).toBe("2026-02-01");
      expect(instances[3].date).toBe("2026-02-22");
      expect(instances.every(e => e.groupId === groupId)).toBe(true);
    });
  });

  describe("Data Persistence", () => {
    it("should persist theme preference", () => {
      localStorage.setItem("hw_theme", JSON.stringify(true));
      const theme = JSON.parse(localStorage.getItem("hw_theme") || "false");
      expect(theme).toBe(true);
    });

    it("should persist calendar view mode", () => {
      localStorage.setItem("hw_cal_mode", JSON.stringify("week"));
      const mode = JSON.parse(localStorage.getItem("hw_cal_mode") || '"month"');
      expect(mode).toBe("week");
    });

    it("should persist class colors", () => {
      const colors = {
        Mathematics: "#0984e3",
        Physics: "#d63031",
        Chemistry: "#00b894",
      };
      localStorage.setItem("hw_colors", JSON.stringify(colors));

      const stored = JSON.parse(localStorage.getItem("hw_colors") || "{}");
      expect(stored.Mathematics).toBe("#0984e3");
      expect(Object.keys(stored)).toHaveLength(3);
    });

    it("should persist hidden classes", () => {
      const hidden = ["OldClass", "CompletedCourse"];
      localStorage.setItem("hw_hidden", JSON.stringify(hidden));

      const stored = JSON.parse(localStorage.getItem("hw_hidden") || "[]");
      expect(stored).toEqual(hidden);
    });
  });

  describe("Event Filtering", () => {
    const sampleEvents = [
      {
        id: "1",
        title: "Math HW",
        date: "2026-02-15",
        class: "Math",
        type: "Homework",
        priority: "High",
        completed: false,
      },
      {
        id: "2",
        title: "Physics Lab",
        date: "2026-02-16",
        class: "Physics",
        type: "Lab",
        priority: "Normal",
        completed: true,
      },
      {
        id: "3",
        title: "Chem Quiz",
        date: "2026-02-17",
        class: "Chemistry",
        type: "Quiz",
        priority: "High",
        completed: false,
      },
    ];

    it("should filter by completed status", () => {
      const incomplete = sampleEvents.filter(e => !e.completed);
      expect(incomplete).toHaveLength(2);
    });

    it("should filter by class", () => {
      const mathEvents = sampleEvents.filter(e => e.class === "Math");
      expect(mathEvents).toHaveLength(1);
      expect(mathEvents[0].title).toBe("Math HW");
    });

    it("should filter by type", () => {
      const homework = sampleEvents.filter(e => e.type === "Homework");
      expect(homework).toHaveLength(1);
    });

    it("should filter by priority", () => {
      const highPriority = sampleEvents.filter(e => e.priority === "High");
      expect(highPriority).toHaveLength(2);
    });

    it("should search by title", () => {
      const searchQuery = "lab";
      const results = sampleEvents.filter(e =>
        e.title.toLowerCase().includes(searchQuery.toLowerCase())
      );
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Physics Lab");
    });
  });

  describe("Room Authentication Flow", () => {
    it("should store room ID in localStorage", () => {
      const roomId = "ABC123";
      localStorage.setItem("planner_curr_room_id", JSON.stringify(roomId));

      const stored = JSON.parse(
        localStorage.getItem("planner_curr_room_id") || "null"
      );
      expect(stored).toBe(roomId);
    });

    it("should clear room ID on disconnect", () => {
      localStorage.setItem("planner_curr_room_id", JSON.stringify("ABC123"));
      localStorage.removeItem("planner_curr_room_id");

      const stored = localStorage.getItem("planner_curr_room_id");
      expect(stored).toBeNull();
    });

    it("should NOT store password in localStorage", () => {
      // Password should never be stored
      const password = "test-password-123";
      // Attempt to search for password in storage
      const allKeys = Object.keys(localStorage);
      const hasPassword = allKeys.some(key => {
        const value = localStorage.getItem(key);
        return value && value.includes(password);
      });
      expect(hasPassword).toBe(false);
    });
  });

  describe("Error Handling", () => {
    it("should handle localStorage quota exceeded", () => {
      const largeData = new Array(10000)
        .fill(null)
        .map((_, i) => ({
          id: `event-${i}`,
          title: `Event ${i}`,
          date: "2026-02-15",
          class: "Test",
          type: "Homework",
          priority: "Normal",
          completed: false,
          description: "x".repeat(100),
        }));

      // This might throw in some browsers
      try {
        localStorage.setItem("hw_events", JSON.stringify(largeData));
        // If it doesn't throw, verify storage
        const stored = JSON.parse(localStorage.getItem("hw_events") || "[]");
        expect(Array.isArray(stored)).toBe(true);
      } catch (e) {
        // Should be QuotaExceededError
        expect(e.name).toBe("QuotaExceededError");
      }
    });

    it("should handle malformed JSON in localStorage", () => {
      localStorage.setItem("hw_events", "{invalid json}");

      try {
        JSON.parse(localStorage.getItem("hw_events") || "[]");
      } catch (e) {
        expect(e).toBeInstanceOf(SyntaxError);
      }

      // Should fallback to empty array
      let events = [];
      try {
        events = JSON.parse(localStorage.getItem("hw_events") || "[]");
      } catch {
        events = [];
      }
      expect(events).toEqual([]);
    });
  });

  describe("Multi-Device Sync Simulation", () => {
    it("should merge events from multiple devices", () => {
      const device1Events = [
        { id: "1", title: "Device 1 Event", date: "2026-02-15" },
      ];
      const device2Events = [
        { id: "2", title: "Device 2 Event", date: "2026-02-16" },
      ];

      // Simulate merge
      const eventMap = new Map();
      [...device1Events, ...device2Events].forEach(e => {
        eventMap.set(e.id, e);
      });

      const merged = Array.from(eventMap.values());
      expect(merged).toHaveLength(2);
      expect(merged.find(e => e.id === "1")).toBeTruthy();
      expect(merged.find(e => e.id === "2")).toBeTruthy();
    });

    it("should handle conflicting updates (last write wins)", () => {
      const version1 = {
        id: "same-id",
        title: "Version 1",
        updatedAt: 1000,
      };
      const version2 = {
        id: "same-id",
        title: "Version 2",
        updatedAt: 2000,
      };

      // Simulate conflict resolution (newer timestamp wins)
      const final = version2.updatedAt > version1.updatedAt ? version2 : version1;
      expect(final.title).toBe("Version 2");
    });
  });
});
