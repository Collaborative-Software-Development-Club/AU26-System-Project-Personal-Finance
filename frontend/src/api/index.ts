/**
 * Single entry point for data access.
 *
 * Swap `MockFinanceApi` for an HTTP implementation when the backend exists.
 * Nothing outside `src/api` should import from `./mock`.
 */
import { MockFinanceApi } from './mock/mock-api'
import type { FinanceApi } from './types'

export const api: FinanceApi = new MockFinanceApi()

export { setSimulatedLatency, FAIL_MARKER, UNKNOWN_MARKER, SLOW_MARKER } from './mock/simulation'
export * from './errors'
export type * from './types'
