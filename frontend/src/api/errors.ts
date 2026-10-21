export type ApiErrorCode =
  | 'validation'
  | 'conflict'
  | 'not_found'
  | 'unavailable'
  | 'unknown_outcome'

export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly details: Record<string, string> | null

  constructor(code: ApiErrorCode, message: string, details: Record<string, string> | null = null) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.details = details
  }
}

/**
 * Thrown when the client cannot tell whether a mutation committed (timeout,
 * dropped connection, …). The UI must present this as "outcome unknown" and
 * offer reconciliation — never as success or failure. `idempotencyKey` is the
 * handle for looking the operation up later.
 */
export class OutcomeUnknownError extends ApiError {
  readonly idempotencyKey: string

  constructor(idempotencyKey: string, message = 'The server did not confirm whether this operation completed.') {
    super('unknown_outcome', message)
    this.name = 'OutcomeUnknownError'
    this.idempotencyKey = idempotencyKey
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

export function isOutcomeUnknown(error: unknown): error is OutcomeUnknownError {
  return error instanceof OutcomeUnknownError
}

/** Human-readable message for any thrown value. */
export function describeError(error: unknown, fallback = 'Something went wrong.'): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'string' && error) return error
  return fallback
}
