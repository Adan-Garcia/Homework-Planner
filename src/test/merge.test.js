import { describe, it, expect, vi, beforeEach } from "vitest";
import { fieldLevelMerge, lastWriteWins } from "../utils/mergeUtils";

// Mock the logger
vi.mock("../utils/logger", () => ({
  default: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("Field-Level Merge", () => {
  const baseEvent = {
    id: "evt-1",
    title: "Homework 1",
    description: "Read chapter 5",
    date: "2026-03-01",
    time: "14:00",
    class: "Math",
    type: "Assignment",
    priority: "Normal",
    completed: false,
  };

  it("merges when different fields were changed", () => {
    // Local changed the title
    const localEvent = { ...baseEvent, title: "Homework 1 (updated)" };
    // Server changed the description
    const serverEvent = { ...baseEvent, description: "Read chapter 5 and 6" };

    const result = fieldLevelMerge(baseEvent, localEvent, serverEvent);

    expect(result.strategy).toBe("merge");
    expect(result.merged).not.toBeNull();
    expect(result.merged.title).toBe("Homework 1 (updated)");
    expect(result.merged.description).toBe("Read chapter 5 and 6");
    expect(result.conflicts).toHaveLength(0);
  });

  it("detects conflicts when same field changed to different values", () => {
    // Both changed the title to different values
    const localEvent = { ...baseEvent, title: "My new title" };
    const serverEvent = { ...baseEvent, title: "Server new title" };

    const result = fieldLevelMerge(baseEvent, localEvent, serverEvent);

    expect(result.strategy).toBe("conflict");
    expect(result.merged).toBeNull();
    expect(result.conflicts).toContain("title");
  });

  it("auto-merges when same field changed to same value", () => {
    // Both changed the title to the SAME value
    const localEvent = { ...baseEvent, title: "Same new title" };
    const serverEvent = { ...baseEvent, title: "Same new title" };

    const result = fieldLevelMerge(baseEvent, localEvent, serverEvent);

    expect(result.strategy).toBe("merge");
    expect(result.merged).not.toBeNull();
    expect(result.merged.title).toBe("Same new title");
    expect(result.conflicts).toHaveLength(0);
  });

  it("returns no-base strategy without a base event", () => {
    const localEvent = { ...baseEvent, title: "Changed" };
    const serverEvent = { ...baseEvent, description: "Other change" };

    const result = fieldLevelMerge(null, localEvent, serverEvent);

    expect(result.strategy).toBe("no-base");
    expect(result.merged).toBeNull();
  });

  it("handles multiple non-conflicting changes", () => {
    const localEvent = {
      ...baseEvent,
      title: "Updated title",
      priority: "High",
    };
    const serverEvent = {
      ...baseEvent,
      description: "Updated desc",
      completed: true,
    };

    const result = fieldLevelMerge(baseEvent, localEvent, serverEvent);

    expect(result.strategy).toBe("merge");
    expect(result.merged.title).toBe("Updated title");
    expect(result.merged.priority).toBe("High");
    expect(result.merged.description).toBe("Updated desc");
    expect(result.merged.completed).toBe(true);
  });

  it("preserves identity fields from local event", () => {
    const localEvent = { ...baseEvent, title: "Changed", groupId: "group-1" };
    const serverEvent = { ...baseEvent, description: "Other" };

    const result = fieldLevelMerge(baseEvent, localEvent, serverEvent);

    expect(result.merged.id).toBe("evt-1");
    expect(result.merged.groupId).toBe("group-1");
  });

  it("server changes take precedence for server-only changed fields", () => {
    // Only server changed the time
    const localEvent = { ...baseEvent };
    const serverEvent = { ...baseEvent, time: "16:00" };

    const result = fieldLevelMerge(baseEvent, localEvent, serverEvent);

    expect(result.strategy).toBe("merge");
    expect(result.merged.time).toBe("16:00");
  });

  it("handles partial conflicts (some fields mergeable, some not)", () => {
    const localEvent = {
      ...baseEvent,
      title: "Local title",       // conflicts with server
      priority: "High",           // only local changed
    };
    const serverEvent = {
      ...baseEvent,
      title: "Server title",      // conflicts with local
      description: "Server desc", // only server changed
    };

    const result = fieldLevelMerge(baseEvent, localEvent, serverEvent);

    // Should report conflict because title diverged
    expect(result.strategy).toBe("conflict");
    expect(result.conflicts).toContain("title");
    expect(result.merged).toBeNull();
  });
});

describe("Last-Write-Wins", () => {
  it("always returns the local event", () => {
    const localEvent = { id: "evt-1", title: "Local version" };
    const serverEvent = { id: "evt-1", title: "Server version" };

    const result = lastWriteWins(localEvent, serverEvent);

    expect(result.title).toBe("Local version");
    expect(result.id).toBe("evt-1");
  });

  it("returns a copy, not a reference", () => {
    const localEvent = { id: "evt-1", title: "Original" };
    const result = lastWriteWins(localEvent, {});

    result.title = "Modified";
    expect(localEvent.title).toBe("Original");
  });
});
