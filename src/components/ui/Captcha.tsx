import { useRef, useCallback } from 'react'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'

const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

type CaptchaProps = {
  onSuccess: (token: string) => void
  onExpire?: () => void
  onError?: () => void
}

export function Captcha({ onSuccess, onExpire, onError }: CaptchaProps) {
  const ref = useRef<TurnstileInstance>(null)

  const handleExpire = useCallback(() => {
    ref.current?.reset()
    onExpire?.()
  }, [onExpire])

  if (!SITE_KEY) return null

  return (
    <Turnstile
      ref={ref}
      siteKey={SITE_KEY}
      onSuccess={onSuccess}
      onExpire={handleExpire}
      onError={onError}
      options={{
        theme: 'dark',
        size: 'flexible',
        retry: 'auto',
        refreshExpired: 'auto',
      }}
      className="mx-auto"
    />
  )
}
