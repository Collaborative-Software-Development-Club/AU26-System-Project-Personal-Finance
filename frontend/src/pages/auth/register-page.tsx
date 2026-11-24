import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { Check, Circle } from 'lucide-react'
import type { RegisterInput } from '@/api'
import { getPostLoginPath } from '@/app/auth-navigation'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormActions, FormField } from '@/components/forms'
import { FormErrorMessage, OutcomeUnknownNotice, toast } from '@/components/feedback'
import { useAsyncAction, useDocumentTitle } from '@/hooks'
import { useAuthStore } from '@/store/auth-store'
import { EMAIL_MAX_LENGTH, NAME_MAX_LENGTH, hasErrors, PASSWORD_RULES, validateRegister, type FieldErrors, type RegisterFormValues } from '@/domain'
import { cn } from '@/lib/utils'
import { PasswordInput } from './login-page'

const INITIAL: RegisterFormValues = { name: '', email: '', password: '', confirmPassword: '' }

export default function RegisterPage() {
  useDocumentTitle('Create account')
  const navigate = useNavigate()
  const location = useLocation()
  const [values, setValues] = useState<RegisterFormValues>(INITIAL)
  const [errors, setErrors] = useState<FieldErrors<keyof RegisterFormValues>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const register = useAuthStore((s) => s.register)
  const authBusy = useAuthStore((s) => s.pending !== null || s.status === 'loading')
  const createAccount = useAsyncAction(async (input: RegisterInput) => {
    await register(input)
    return true
  })

  const set = (field: keyof RegisterFormValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
    createAccount.reset()
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (createAccount.isPending || authBusy) return
    const errs = validateRegister(values)
    setErrors(errs)
    if (hasErrors(errs)) return
    const succeeded = await createAccount.run({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
    })
    if (!succeeded) return
    toast.success('Account created. Sign in to continue.')
    navigate('/login', {
      replace: true,
      state: {
        registeredEmail: values.email.trim(),
        from: getPostLoginPath(location.state),
      },
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Set up a workspace to track accounts, budgets and spending.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <form onSubmit={(e) => void onSubmit(e)} noValidate className="flex flex-col gap-4" aria-busy={createAccount.isPending}>
          <fieldset disabled={createAccount.isPending || authBusy} className="flex min-w-0 flex-col gap-4">
            <FormField label="Name" required error={errors.name ?? createAccount.fieldErrors.name}>
              <Input autoComplete="name" maxLength={NAME_MAX_LENGTH} value={values.name} onChange={(e) => set('name', e.target.value)} />
            </FormField>
            <FormField label="Email" required error={errors.email ?? createAccount.fieldErrors.email}>
              <Input type="email" autoComplete="email" inputMode="email" maxLength={EMAIL_MAX_LENGTH} value={values.email} onChange={(e) => set('email', e.target.value)} />
            </FormField>
            <FormField label="Password" required error={errors.password ?? createAccount.fieldErrors.password}>
              <PasswordInput
                value={values.password}
                onChange={(v) => set('password', v)}
                show={showPassword}
                onToggle={() => setShowPassword((s) => !s)}
                autoComplete="new-password"
              />
            </FormField>
            <PasswordRules password={values.password} />
            <FormField label="Confirm password" required error={errors.confirmPassword}>
              <PasswordInput
                value={values.confirmPassword}
                onChange={(v) => set('confirmPassword', v)}
                show={showConfirm}
                onToggle={() => setShowConfirm((s) => !s)}
                autoComplete="new-password"
              />
            </FormField>
            <FormErrorMessage message={createAccount.status === 'unknown' ? null : createAccount.error} />
            <FormActions submitLabel="Create account" pendingLabel="Creating account..." pending={createAccount.isPending} disabled={authBusy} />
          </fieldset>
          {createAccount.status === 'unknown' && (
            <OutcomeUnknownNotice
              title="Registration could not be confirmed"
              description="Your account may have been created. Try signing in before submitting another registration."
            />
          )}
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          Already have an account?{' '}
          <Link to="/login" state={location.state} className="font-medium text-primary underline-offset-4 hover:underline">
            Log in
          </Link>
        </span>
      </CardFooter>
    </Card>
  )
}

function PasswordRules({ password }: { password: string }) {
  return (
    <ul className="-mt-2 flex flex-col gap-1 text-xs" aria-label="Password requirements">
      {PASSWORD_RULES.map((rule) => {
        const met = rule.test(password)
        return (
          <li key={rule.id} className={cn('flex items-center gap-1.5', met ? 'text-success' : 'text-muted-foreground')}>
            {met ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3.5" aria-hidden="true" />}
            <span>
              {rule.label}
              <span className="sr-only">{met ? ' ? met' : ' ? not met'}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
