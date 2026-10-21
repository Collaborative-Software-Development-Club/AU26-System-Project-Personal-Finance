/**
 * Toast notifications. Thin wrapper around sonner so pages import from one
 * place and we can swap the implementation later.
 *
 *   toast.success('Account created')
 *   toast.error('Could not save', { description: err.message })
 */
import { toast as sonnerToast } from 'sonner'
import { Toaster } from '@/components/ui/sonner'

export const toast = sonnerToast

export function AppToaster() {
  return <Toaster position="bottom-right" richColors closeButton duration={4500} />
}
