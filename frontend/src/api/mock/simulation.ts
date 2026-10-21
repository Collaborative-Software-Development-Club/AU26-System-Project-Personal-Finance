/**
 * Deterministic failure simulation for the mock API.
 *
 * Nothing here is random — demos must be reproducible. Include one of these
 * markers in a description / name / memo to trigger a behaviour:
 *
 *   [FAIL]     → the request is rejected with a server error; nothing is saved.
 *   [UNKNOWN]  → the request IS committed, but the client receives no
 *                confirmation (OutcomeUnknownError). Use "Check status" to
 *                reconcile.
 *   [SLOW]     → the request takes ~3 seconds.
 *
 * Latency itself can be disabled in Settings → Data.
 */
import { ApiError, OutcomeUnknownError } from '../errors'

export const FAIL_MARKER = '[FAIL]'
export const UNKNOWN_MARKER = '[UNKNOWN]'
export const SLOW_MARKER = '[SLOW]'

export interface SimulationConfig {
  latencyEnabled: boolean
}

export const simulationConfig: SimulationConfig = { latencyEnabled: true }

export function setSimulatedLatency(enabled: boolean) {
  simulationConfig.latencyEnabled = enabled
}

export function hasMarker(text: string | null | undefined, marker: string): boolean {
  return !!text && text.toUpperCase().includes(marker)
}

export async function simulateLatency(text?: string | null): Promise<void> {
  if (!simulationConfig.latencyEnabled) return
  const ms = hasMarker(text, SLOW_MARKER) ? 3000 : 250 + Math.floor(Math.random() * 250)
  await new Promise((resolve) => setTimeout(resolve, ms))
}

/** Throws when the text carries the [FAIL] marker. Call BEFORE committing. */
export function failIfRequested(text?: string | null): void {
  if (hasMarker(text, FAIL_MARKER)) {
    throw new ApiError('unavailable', 'Simulated server error: the request was rejected and nothing was saved.')
  }
}

/** Throws when the text carries the [UNKNOWN] marker. Call AFTER committing. */
export function loseResponseIfRequested(text: string | null | undefined, idempotencyKey: string): void {
  if (hasMarker(text, UNKNOWN_MARKER)) {
    throw new OutcomeUnknownError(idempotencyKey)
  }
}
