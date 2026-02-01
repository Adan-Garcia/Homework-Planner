import { describe, it, expect } from "vitest";
import { normalizeEvent, validateEvent } from "../utils/helpers";

describe("event helpers", () => {
  it("normalizes missing fields safely", () => {
    const normalized = normalizeEvent({ title: "Test", date: "2026-02-01" });
    expect(normalized).toBeTruthy();
    expect(normalized.id).toBeTruthy();
    expect(normalized.class).toBe("General");
    expect(normalized.type).toBe("Assignment");
  });

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
});
