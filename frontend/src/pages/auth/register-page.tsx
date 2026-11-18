import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { AlertCircle, Check, Circle, UserPlus } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/forms'
import { toast } from '@/components/feedback'
import { useDocumentTitle } from '@/hooks'
import { register } from '@/api/auth'
import { hasErrors, PASSWORD_RULES, validateRegister, type FieldErrors, type RegisterFormValues } from '@/domain'
import { cn } from '@/lib/utils'
import { PasswordInput } from './login-page'

const INITIAL: RegisterFormValues = { name: '', email: '', password: '', confirmPassword: '' }

export default function RegisterPage() {
  useDocumentTitle('Create account')
  const navigate = useNavigate()
  const [values, setValues] = useState<RegisterFormValues>(INITIAL)
  const [errors, setErrors] = useState<FieldErrors<keyof RegisterFormValues>>({})
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [registerError, setRegisterError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = (field: keyof RegisterFormValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    const errs = validateRegister(values)
    setErrors(errs)
    if (hasErrors(errs)) return

    setLoading(true)
    setRegisterError('')
    try {
      await register(values.name, values.email, values.password)
      toast.success('Account created', { description: 'You can log in now.' })
      navigate('/login')
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>Set up a workspace to track accounts, budgets and spending.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        {registerError && (
          <Alert variant="destructive">
            <AlertCircle aria-hidden="true" />
            <AlertDescription>{registerError}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField label="Name" required error={errors.name}>
            <Input autoComplete="name" value={values.name} onChange={(e) => set('name', e.target.value)} />
          </FormField>
          <FormField label="Email" required error={errors.email}>
            <Input type="email" autoComplete="email" inputMode="email" value={values.email} onChange={(e) => set('email', e.target.value)} />
          </FormField>
          <FormField label="Password" required error={errors.password}>
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
          <Button type="submit" className="mt-1 w-full" disabled={loading}>
            <UserPlus aria-hidden="true" />
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary underline-offset-4 hover:underline">
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
              <span className="sr-only">{met ? ' — met' : ' — not met'}</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
