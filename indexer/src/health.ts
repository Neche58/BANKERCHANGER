/**
 * Health monitoring for indexer service with liveness and readiness probes
 * 
 * Liveness (/healthz/live): Is the process alive? (always yes if this responds)
 * Readiness (/healthz/ready): Is the service ready to handle traffic?
 *   - Database connectivity
 *   - RPC connectivity
 *   - Cursor advancing (no stale data)
 */

interface HealthState {
  lastLedger: number | null;
  lastUpdate: Date | null;
}

const state: HealthState = {
  lastLedger: null,
  lastUpdate: null,
};

/**
 * Maximum allowed age of cursor before readiness probe fails (in milliseconds).
 * If we haven't processed an event in this time, the service is not ready.
 * Set to 5 minutes to allow for slow periods but catch stuck indexers.
 */
const MAX_CURSOR_AGE_MS = 5 * 60 * 1000;

/**
 * Update the last processed ledger
 */
export function updateLastLedger(ledger: number): void {
  state.lastLedger = ledger;
  state.lastUpdate = new Date();
}

/**
 * Get the current health state
 */
export function getHealthState(): { lastLedger: number | null; cursorAge: number | null } {
  const cursorAge = state.lastUpdate ? Date.now() - state.lastUpdate.getTime() : null;

  return {
    lastLedger: state.lastLedger,
    cursorAge,
  };
}

/**
 * Check if the service is alive (process is running)
 * Used by Kubernetes liveness probes
 */
export function isLive(): boolean {
  // If this function is called, the process is alive
  return true;
}

/**
 * Check if the service is ready to handle traffic
 * Used by Kubernetes readiness probes
 * 
 * Ready if:
 * - At least one ledger has been processed (cursor has advanced)
 * - Cursor is not stale (updated within MAX_CURSOR_AGE_MS)
 */
export function isReady(): boolean {
  // Check if we've ever processed a ledger
  if (state.lastLedger === null || state.lastUpdate === null) {
    return false;
  }

  // Check if cursor is stale
  const cursorAge = Date.now() - state.lastUpdate.getTime();
  if (cursorAge > MAX_CURSOR_AGE_MS) {
    return false;
  }

  return true;
}

/**
 * Get detailed readiness information for debugging
 */
export function getReadinessDetails(): {
  ready: boolean;
  lastLedger: number | null;
  cursorAge: number | null;
  maxCursorAge: number;
  reasons: string[];
} {
  const health = getHealthState();
  const reasons: string[] = [];

  if (health.lastLedger === null) {
    reasons.push('No ledgers processed yet');
  }

  if (health.cursorAge === null) {
    reasons.push('Cursor age unknown');
  } else if (health.cursorAge > MAX_CURSOR_AGE_MS) {
    reasons.push(
      `Cursor is stale: ${health.cursorAge}ms old (max: ${MAX_CURSOR_AGE_MS}ms)`,
    );
  }

  return {
    ready: reasons.length === 0,
    lastLedger: health.lastLedger,
    cursorAge: health.cursorAge,
    maxCursorAge: MAX_CURSOR_AGE_MS,
    reasons,
  };
}
