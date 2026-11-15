import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import type { LoginInput } from '@/api'
import { getPostLoginPath } from '@/app/auth-navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormActions, FormField } from '@/components/forms'
import { FormErrorMessage, OutcomeUnknownNotice, toast } from '@/components/feedback'
import { useAsyncAction, useDocumentTitle } from '@/hooks'
import { useAuthStore } from '@/store/auth-store'
import { hasErrors, validateLogin, type FieldErrors, type LoginFormValues } from '@/domain'

export default function LoginPage() {
  useDocumentTitle('Log in')
  const navigate = useNavigate()
  const location = useLocation()
  const state: unknown = location.state
  const initialEmail = typeof state === 'object' && state !== null &&
    'registeredEmail' in state && typeof state.registeredEmail === 'string'
    ? state.registeredEmail : ''
  const [values, setValues] = useState<LoginFormValues>({ email: initialEmail, password: '' })
  const [errors, setErrors] = useState<FieldErrors<keyof LoginFormValues>>({})
  const [showPassword, setShowPassword] = useState(false)
  const login = useAuthStore((s) => s.login)
  const restoreSession = useAuthStore((s) => s.restoreSession)
  const authError = useAuthStore((s) => s.error)
  const authBusy = useAuthStore((s) => s.pending !== null || s.status === 'loading')
  const signIn = useAsyncAction(async (input: LoginInput) => {
    await login(input)
    return true
  })
  const checkSession = useAsyncAction(restoreSession)

  const set = (field: keyof LoginFormValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
    signIn.reset()
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (signIn.isPending || authBusy) return
    const errs = validateLogin(values)
    setErrors(errs)
    if (hasErrors(errs)) return
    const succeeded = await signIn.run({
      email: values.email.trim(),
      password: values.password,
    })
    if (!succeeded) return
    toast.success('Signed in')
    navigate(getPostLoginPath(location.state), { replace: true })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>Welcome back. Enter your details to open your workspace.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {initialEmail && (
          <p role="status" className="text-sm text-muted-foreground">
            Your account was created. Sign in to continue.
          </p>
        )}
        <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4" aria-busy={signIn.isPending}>
          <fieldset disabled={signIn.isPending || authBusy} className="flex min-w-0 flex-col gap-4">
            <FormField label="Email" required error={errors.email ?? signIn.fieldErrors.email}>
              <Input type="email" autoComplete="username" inputMode="email" value={values.email} onChange={(e) => set('email', e.target.value)} />
            </FormField>
            <FormField label="Password" required error={errors.password ?? signIn.fieldErrors.password}>
              <PasswordInput
                value={values.password}
                onChange={(v) => set('password', v)}
                show={showPassword}
                onToggle={() => setShowPassword((s) => !s)}
                autoComplete="current-password"
              />
            </FormField>
            <FormErrorMessage message={signIn.status === 'unknown' ? null : signIn.error ?? authError} />
            <FormActions submitLabel="Log in" pendingLabel="Signing in..." pending={signIn.isPending} disabled={authBusy} />
          </fieldset>
          {signIn.status === 'unknown' && (
            <OutcomeUnknownNotice
              title="Sign-in could not be confirmed"
              description={signIn.error ?? 'Check your session before submitting again.'}
              onCheckStatus={() => void checkSession.run()}
              checking={checkSession.isPending}
            />
          )}
          <FormErrorMessage message={checkSession.error} />
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          No account yet?{' '}
          <Link to="/register" state={location.state} className="font-medium text-primary underline-offset-4 hover:underline">
            Create one
          </Link>
        </span>
      </CardFooter>
    </Card>
  )
}

/** Password input with a show/hide toggle. Shared by Login and Register (same folder). */
export function PasswordInput({
  id,
  value,
  onChange,
  show,
  onToggle,
  autoComplete,
  ...aria
}: {
  id?: string
  value: string
  onChange(value: string): void
  show: boolean
  onToggle(): void
  autoComplete: 'current-password' | 'new-password'
  'aria-invalid'?: boolean
  'aria-describedby'?: string
  'aria-required'?: boolean
}) {
  return (
    <div className="relative">
      <Input
        id={id}
        type={show ? 'text' : 'password'}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="pr-9"
        {...aria}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        onClick={onToggle}
        aria-label={show ? 'Hide password' : 'Show password'}
        aria-pressed={show}
        className="absolute top-1/2 right-0.5 -translate-y-1/2 text-muted-foreground"
      >
        {show ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
      </Button>
    </div>
  )
}
