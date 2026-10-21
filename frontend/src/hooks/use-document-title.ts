import { useEffect } from 'react'
import { APP_NAME } from '@/domain'

export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    const previous = document.title
    document.title = title ? `${title} · ${APP_NAME}` : APP_NAME
    return () => {
      document.title = previous
    }
  }, [title])
}
