import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import { Eye, EyeOff, Info, LogIn } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { FormField } from '@/components/forms'
import { useDocumentTitle } from '@/hooks'
import { DEMO_PASSWORD, DEMO_USER } from '@/data/demo-user'
import { hasErrors, validateLogin, type FieldErrors, type LoginFormValues } from '@/domain'

export default function LoginPage() {
  useDocumentTitle('Log in')
  const navigate = useNavigate()
  const [values, setValues] = useState<LoginFormValues>({ email: DEMO_USER.email, password: DEMO_PASSWORD })
  const [errors, setErrors] = useState<FieldErrors<keyof LoginFormValues>>({})
  const [showPassword, setShowPassword] = useState(false)

  const set = (field: keyof LoginFormValues, value: string) => {
    setValues((v) => ({ ...v, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    const errs = validateLogin(values)
    setErrors(errs)
    if (hasErrors(errs)) return
    // UI only: there is no authentication. Any valid submission opens the demo workspace.
    navigate('/dashboard')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Log in</CardTitle>
        <CardDescription>Welcome back. Enter your details to open your workspace.</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Alert className="border-warning/40 bg-warning/5 [&>svg]:text-warning">
          <Info aria-hidden="true" />
          <AlertTitle>Demo mode — no real authentication</AlertTitle>
          <AlertDescription>
            Credentials are pre-filled and are not checked. Any submission opens the demo workspace. Real sign-in, sessions and authorization are
            provided by the backend when it exists.
          </AlertDescription>
        </Alert>

        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          <FormField label="Email" required error={errors.email}>
            <Input type="email" autoComplete="username" inputMode="email" value={values.email} onChange={(e) => set('email', e.target.value)} />
          </FormField>
          <FormField label="Password" required error={errors.password}>
            <PasswordInput
              value={values.password}
              onChange={(v) => set('password', v)}
              show={showPassword}
              onToggle={() => setShowPassword((s) => !s)}
              autoComplete="current-password"
            />
          </FormField>
          <Button type="submit" className="mt-1 w-full">
            <LogIn aria-hidden="true" />
            Log in
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center text-sm text-muted-foreground">
        <span>
          No account yet?{' '}
          <Link to="/register" className="font-medium text-primary underline-offset-4 hover:underline">
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
