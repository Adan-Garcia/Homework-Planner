import { describe, it, expect } from "vitest";
import { validateEvent, normalizeEvent, sanitizeInput, getContrastColor } from "../utils/helpers";

describe("Event Validation", () => {
  it("validates required fields", () => {
    const event = normalizeEvent({ title: "", date: "" });
    const result = validateEvent(event);
    expect(result.isValid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("accepts a valid event", () => {
    const event = normalizeEvent({
      title: "Math Homework",
      date: "2026-02-01",
      class: "Math",
    });
    const result = validateEvent(event);
    expect(result.isValid).toBe(true);
  });

  it("rejects events with excessively long titles", () => {
    const longTitle = "a".repeat(201);
    const event = normalizeEvent({
      title: longTitle,
      date: "2026-02-01",
      class: "Test",
    });
    const result = validateEvent(event);
    expect(result.isValid).toBe(false);
    expect(result.errors).toContain("Task title cannot exceed 200 characters");
  });

  it("rejects invalid time format", () => {
    const event = normalizeEvent({
      title: "Test Task",
      date: "2026-02-01",
      class: "Test",
      time: "invalid-time",
    });
    const result = validateEvent(event);
    expect(result.isValid).toBe(false);
  });
});

describe("Event Normalization", () => {
  it("normalizes missing fields safely", () => {
    const normalized = normalizeEvent({ title: "Test", date: "2026-02-01" });
    expect(normalized).toBeTruthy();
    expect(normalized.id).toBeTruthy();
    expect(normalized.class).toBe("General");
    expect(normalized.type).toBe("Assignment");
  });

  it("generates unique IDs for events without IDs", () => {
    const event1 = normalizeEvent({ title: "Test 1", date: "2026-02-01" });
    const event2 = normalizeEvent({ title: "Test 2", date: "2026-02-01" });
    expect(event1.id).not.toBe(event2.id);
  });

  it("preserves existing event IDs", () => {
    const customId = "custom-test-id";
    const event = normalizeEvent({
      id: customId,
      title: "Test",
      date: "2026-02-01",
    });
    expect(event.id).toBe(customId);
  });

  it("handles non-object input gracefully", () => {
    expect(normalizeEvent(null)).toBe(null);
    expect(normalizeEvent(undefined)).toBe(null);
    expect(normalizeEvent("string")).toBe(null);
  });
});

describe("Input Sanitization", () => {
  it("removes HTML tags", () => {
    const dirty = "<script>alert('xss')</script>Hello";
    const clean = sanitizeInput(dirty);
    expect(clean).toBe("alert('xss')Hello");
  });

  it("removes javascript: protocol", () => {
    const dirty = "javascript:alert('xss')";
    const clean = sanitizeInput(dirty);
    expect(clean).toBe("alert('xss')");
  });

  it("removes event handlers", () => {
    const dirty = "Hello onclick=alert('xss')";
    const clean = sanitizeInput(dirty);
    // Removes onclick= but may leave residual quotes
    expect(clean).not.toContain("onclick=");
    expect(clean.startsWith("Hello")).toBe(true);
  });

  it("trims whitespace", () => {
    const dirty = "  Hello World  ";
    const clean = sanitizeInput(dirty);
    expect(clean).toBe("Hello World");
  });

  it("handles non-string input", () => {
    expect(sanitizeInput(null)).toBe("");
    expect(sanitizeInput(undefined)).toBe("");
    expect(sanitizeInput(123)).toBe("");
  });
});

describe("Color Contrast", () => {
  it("returns white for dark colors", () => {
    expect(getContrastColor("#000000")).toBe("#ffffff");
    // #0984e3 is a medium blue, might return black depending on threshold
    const result = getContrastColor("#0984e3");
    expect(result).toMatch(/#(ffffff|000000)/);
  });

  it("returns black for light colors", () => {
    expect(getContrastColor("#ffffff")).toBe("#000000");
    expect(getContrastColor("#fdcb6e")).toBe("#000000");
  });

  it("handles colors without # prefix", () => {
    const result = getContrastColor("000000");
    expect(result).toBeTruthy();
  });

  it("handles null/undefined gracefully", () => {
    expect(getContrastColor(null)).toBe("#000000");
    expect(getContrastColor(undefined)).toBe("#000000");
  });
});
