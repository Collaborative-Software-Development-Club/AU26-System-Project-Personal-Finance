/**
 * Runs an async operation with the submission states every form needs:
 *
 *   idle → pending → success | error | unknown
 *
 * - Ignores calls while pending (guards against double submission in the UI;
 *   the API layer still owns real idempotency).
 * - Maps `ApiError` field details into `fieldErrors` so forms can show them
 *   inline, and `OutcomeUnknownError` into the `unknown` status so the UI
 *   never claims success or failure it cannot prove.
 */
import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { describeError, isApiError, isOutcomeUnknown } from '@/api'

export type AsyncStatus = 'idle' | 'pending' | 'success' | 'error' | 'unknown'

export interface AsyncActionState {
  status: AsyncStatus
  isPending: boolean
  error: string | null
  fieldErrors: Record<string, string>
  /** Set when status === 'unknown'. */
  idempotencyKey: string | null
}

export interface AsyncAction<Args extends unknown[], R> extends AsyncActionState {
  /** Resolves to the result, or undefined when the call failed / was ignored. */
  run(...args: Args): Promise<R | undefined>
  reset(): void
}

export function useAsyncAction<Args extends unknown[], R>(
  fn: (...args: Args) => Promise<R>,
): AsyncAction<Args, R> {
  const [state, setState] = useState<AsyncActionState>({
    status: 'idle',
    isPending: false,
    error: null,
    fieldErrors: {},
    idempotencyKey: null,
  })
  const pendingRef = useRef(false)
  const fnRef = useRef(fn)
  useLayoutEffect(() => {
    fnRef.current = fn
  })

  const run = useCallback(async (...args: Args): Promise<R | undefined> => {
    if (pendingRef.current) return undefined
    pendingRef.current = true
    setState({ status: 'pending', isPending: true, error: null, fieldErrors: {}, idempotencyKey: null })
    try {
      const result = await fnRef.current(...args)
      setState({ status: 'success', isPending: false, error: null, fieldErrors: {}, idempotencyKey: null })
      return result
    } catch (e) {
      if (isOutcomeUnknown(e)) {
        setState({ status: 'unknown', isPending: false, error: e.message, fieldErrors: {}, idempotencyKey: e.idempotencyKey })
      } else {
        setState({
          status: 'error',
          isPending: false,
          error: describeError(e),
          fieldErrors: isApiError(e) && e.details ? e.details : {},
          idempotencyKey: null,
        })
      }
      return undefined
    } finally {
      pendingRef.current = false
    }
  }, [])

  const reset = useCallback(() => {
    setState({ status: 'idle', isPending: false, error: null, fieldErrors: {}, idempotencyKey: null })
  }, [])

  return { ...state, run, reset }
}
