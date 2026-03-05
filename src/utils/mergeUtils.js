/**
 * Field-Level Merge Utility for Optimistic Concurrency Control
 * 
 * Implements a three-way merge strategy:
 * 1. Compare local changes against the common ancestor (base version)
 * 2. Compare server changes against the same base
 * 3. If different fields were changed → merge them
 * 4. If the same field was changed → conflict (fall back to last-write-wins)
 * 
 * Since events are E2E encrypted, all merging happens client-side after decryption.
 */
import logger from "./logger";

/**
 * Fields that participate in merge conflict detection.
 * Metadata fields (id, groupId) are excluded since they should never diverge.
 */
const MERGEABLE_FIELDS = [
  "title",
  "description",
  "date",
  "time",
  "class",
  "type",
  "priority",
  "completed",
  "recurrence",
  "recurrenceEnd",
];

/**
 * Computes which fields differ between two event objects.
 * @param {Object} a - First event
 * @param {Object} b - Second event
 * @returns {string[]} Array of field names that differ
 */
const getChangedFields = (a, b) => {
  const changed = [];
  for (const field of MERGEABLE_FIELDS) {
    const valA = a[field] ?? "";
    const valB = b[field] ?? "";
    // Use strict comparison; booleans coerce to string for consistency
    if (String(valA) !== String(valB)) {
      changed.push(field);
    }
  }
  return changed;
};

/**
 * Attempts a three-way field-level merge between local and server versions of an event.
 * 
 * @param {Object} baseEvent - The common ancestor (the version both local and server started from).
 *                              If unknown, pass null to skip merge and go straight to LWW.
 * @param {Object} localEvent - The locally modified event (client's pending change)
 * @param {Object} serverEvent - The server's current version (from conflict response)
 * @returns {{ merged: Object|null, conflicts: string[], strategy: string }}
 *   - merged: The merged event object, or null if merge failed
 *   - conflicts: Array of field names that both sides changed (empty if merge succeeded)
 *   - strategy: "merge" if field-level merge succeeded,
 *               "no-base" if base was unavailable,
 *               "conflict" if conflicting fields detected
 */
export const fieldLevelMerge = (baseEvent, localEvent, serverEvent) => {
  // Without a base version, we can't do three-way merge
  if (!baseEvent) {
    logger.warn("[Merge] No base event available — cannot perform three-way merge");
    return { merged: null, conflicts: [], strategy: "no-base" };
  }

  const localChanges = getChangedFields(baseEvent, localEvent);
  const serverChanges = getChangedFields(baseEvent, serverEvent);

  // Find fields changed by BOTH sides
  const conflictingFields = localChanges.filter((f) => serverChanges.includes(f));

  // Check if conflicting fields actually converged to the same value
  const realConflicts = conflictingFields.filter((f) => {
    const localVal = String(localEvent[f] ?? "");
    const serverVal = String(serverEvent[f] ?? "");
    return localVal !== serverVal; // Both changed but to different values
  });

  if (realConflicts.length > 0) {
    // True conflict — can't auto-merge these fields
    logger.warn("[Merge] Field-level conflicts detected:", realConflicts);
    return { merged: null, conflicts: realConflicts, strategy: "conflict" };
  }

  // No conflicting fields (or they converged to the same value) — merge!
  // Start from server version, apply local-only changes on top
  const merged = { ...serverEvent };
  for (const field of localChanges) {
    // Only apply local changes for fields the server didn't also change
    // (or that converged to the same value)
    if (!serverChanges.includes(field)) {
      merged[field] = localEvent[field];
    }
    // If both changed to the same value, serverEvent already has it
  }

  // Preserve identity fields from the original
  merged.id = localEvent.id;
  if (localEvent.groupId) merged.groupId = localEvent.groupId;

  logger.log("[Merge] Field-level merge succeeded", {
    localChanges,
    serverChanges,
    applied: localChanges.filter((f) => !serverChanges.includes(f)),
  });

  return { merged, conflicts: [], strategy: "merge" };
};

/**
 * Last-Write-Wins resolution.
 * Simply returns the local event, which will be force-saved to the server.
 * 
 * @param {Object} localEvent - The local version to force
 * @param {Object} serverEvent - The server version being overwritten
 * @returns {Object} The event to save (always the local version)
 */
export const lastWriteWins = (localEvent, _serverEvent) => {
  logger.log("[Merge] Using last-write-wins fallback for event:", localEvent.id);
  return { ...localEvent };
};
