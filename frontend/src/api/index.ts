/**
 * Single entry point for data access.
 *
 * Swap `MockFinanceApi` for an HTTP implementation when the backend exists.
 * Nothing outside `src/api` should import from `./mock`.
 */
import { HttpFinanceApi } from './http-api'
import type { FinanceApi } from './types'

const httpApi = new HttpFinanceApi()

export const api: FinanceApi = httpApi

export function setFinanceUserScope(userId: string | null): void {
  httpApi.setUserScope(userId)
}

export { setSimulatedLatency, FAIL_MARKER, UNKNOWN_MARKER, SLOW_MARKER } from './mock/simulation'
export * from './errors'
export type * from './types'

export {
  loginRequest,
  getCurrentUserRequest,
  registerRequest,
  logoutRequest,
} from './auth'

export type {
  LoginInput,
  RegisterInput,
} from './auth'